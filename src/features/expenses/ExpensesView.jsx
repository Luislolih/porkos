import { useState, useEffect, useMemo } from 'react';
import { Wallet, Plus, Edit3, Trash2, ShieldCheck, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { formatCurrency, formatTime, formatDate, parseToDate } from '../../utils/formatters';
import { sanitizeText } from '../../utils/security';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/useAuth';
import {
  subscribeToExpenses,
  saveExpenseToFirestore,
  updateExpenseInFirestore,
  deleteExpenseFromFirestore,
} from '../../services/firestoreService';

const EXPENSE_CATEGORIES = [
  'Carnes & Hamburguesas',
  'Chorizos',
  'Panes',
  'Verduras',
  'Papas',
  'Bebidas & Gaseosas',
  'Cremas e Insumos',
  'Tapers & Empaques',
  'Limpieza',
  'Otros',
];

const PAYMENT_METHODS = ['Efectivo', 'Yape', 'Plin', 'Transferencia'];

export default function ExpensesView() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [expenses, setExpenses] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCategory, setNewCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('Efectivo');

  // Estado para Edición (Exclusivo Administrador)
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState('Efectivo');

  // Estado para Eliminación (Exclusivo Administrador)
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    const unsubscribe = subscribeToExpenses((remoteExpenses) => {
      setExpenses(remoteExpenses);
    });
    return () => unsubscribe();
  }, []);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Ordenar gastos cronológicamente por fecha descendente (más recientes primero)
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const timeA = parseToDate(a.date)?.getTime() || 0;
      const timeB = parseToDate(b.date)?.getTime() || 0;
      return timeB - timeA;
    });
  }, [expenses]);

  // 1. Registrar nuevo gasto
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const cleanAmount = Math.round(Math.max(0.1, parseFloat(newAmount) || 0) * 100) / 100;
    const cleanDescription = sanitizeText(newDesc, 200);
    if (!cleanAmount || !cleanDescription) return;

    const newExp = {
      id: `exp_${Date.now()}`,
      date: new Date(),
      category: newCategory,
      description: cleanDescription,
      amount: cleanAmount,
      paymentMethod: newMethod,
      registeredBy: user?.displayName || user?.email?.split('@')[0] || 'Cajero',
    };

    // Actualización optimista local
    setExpenses((prev) => [newExp, ...prev]);
    setIsAddOpen(false);
    setNewDesc('');
    setNewAmount('');

    // Guardar en Firestore
    await saveExpenseToFirestore(newExp);
  };

  // 2. Abrir modal de edición (Solo Admin)
  const handleOpenEdit = (exp) => {
    if (!isAdmin) return;
    setEditingExpense(exp);
    setEditCategory(exp.category || EXPENSE_CATEGORIES[0]);
    setEditDesc(exp.description || '');
    setEditAmount(String(exp.amount || ''));
    setEditMethod(exp.paymentMethod || 'Efectivo');
    setIsEditOpen(true);
  };

  // Guardar edición de gasto (Solo Admin)
  const handleSaveEditExpense = async (e) => {
    e.preventDefault();
    if (!isAdmin || !editingExpense) return;

    const cleanAmount = Math.round(Math.max(0.01, parseFloat(editAmount) || 0) * 100) / 100;
    const cleanDescription = sanitizeText(editDesc, 200);
    if (!cleanAmount || !cleanDescription) return;

    const updatedData = {
      category: editCategory,
      description: cleanDescription,
      amount: cleanAmount,
      paymentMethod: editMethod,
      editedBy: user?.displayName || user?.email?.split('@')[0] || 'Admin',
    };

    // Actualización optimista local
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === editingExpense.id ? { ...exp, ...updatedData } : exp))
    );
    setIsEditOpen(false);
    setEditingExpense(null);

    // Persistir en Firestore
    await updateExpenseInFirestore(editingExpense.id, updatedData);
  };

  // 3. Abrir confirmación de eliminación (Solo Admin)
  const handleOpenDelete = (exp) => {
    if (!isAdmin) return;
    setDeletingExpense(exp);
    setIsDeleteOpen(true);
  };

  // Confirmar eliminación de gasto (Solo Admin)
  const handleConfirmDelete = async () => {
    if (!isAdmin || !deletingExpense) return;

    const targetId = deletingExpense.id;

    // Actualización optimista local
    setExpenses((prev) => prev.filter((exp) => exp.id !== targetId));
    setIsDeleteOpen(false);
    setDeletingExpense(null);

    // Eliminar de Firestore
    await deleteExpenseFromFirestore(targetId);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-8">
      {/* Header */}
      <div className="bg-[var(--color-porkos-surface)] p-4 sm:p-5 rounded-2xl border border-[var(--color-porkos-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Gastos & Compras Diarias
              </h2>
              {isAdmin ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shadow-xs">
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                  Admin: Edición y Eliminación Activa
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Modo Operativo (Solo lectura para modificar)
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Control de salidas de dinero, compras de insumos e insumos de cocina
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          icon={Plus}
          size="md"
          className="text-xs sm:text-sm font-black whitespace-nowrap"
        >
          Registrar Gasto
        </Button>
      </div>

      {/* KPI Total */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 sm:p-5 rounded-2xl flex items-center justify-between max-w-sm shadow-sm">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Total Egresos Registrados:
        </span>
        <span className="text-2xl sm:text-3xl font-black text-rose-400">
          {formatCurrency(totalExpenses)}
        </span>
      </div>

      {/* Expenses Table */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl overflow-hidden shadow-sm">
        {expenses.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            <Wallet className="w-10 h-10 opacity-20 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-zinc-300">No hay gastos registrados</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Registra compras de insumos para llevar el control de caja al cierre
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-black/50 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800/80">
                <tr>
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4 text-right">Importe</th>
                  {isAdmin && <th className="py-3 px-4 text-center">Acciones Admin</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {sortedExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-300">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{formatDate(exp.date)}</span>
                        <span className="text-zinc-500 font-normal">•</span>
                        <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="text-zinc-300 font-semibold">{formatTime(exp.date)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-400">{exp.category}</td>
                    <td className="py-3.5 px-4 text-white font-semibold">{exp.description}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-[11px] font-semibold">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-400 text-sm">
                      -{formatCurrency(exp.amount)}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(exp)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-amber-500 hover:text-black text-amber-300 border border-zinc-700/80 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-xs"
                            title="Editar gasto (Solo Admin)"
                            aria-label="Editar gasto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(exp)}
                            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-500 hover:text-white text-rose-400 border border-zinc-700/80 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-xs"
                            title="Eliminar gasto (Solo Admin)"
                            aria-label="Eliminar gasto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Gasto */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Registrar Gasto o Compra"
      >
        <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Categoría</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Descripción</label>
            <input
              type="text"
              required
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Ej. 10 bolsas de papas congeladas..."
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Importe (S/)</label>
              <input
                type="number"
                step="0.10"
                required
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Método de Pago</label>
              <select
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" fullWidth size="lg">
              Guardar Gasto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Gasto (Solo Administrador) */}
      {isAdmin && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditingExpense(null);
          }}
          title="Editar Gasto Registrado"
          subtitle="Modificación protegida (Solo Administrador)"
        >
          <form onSubmit={handleSaveEditExpense} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Categoría</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Descripción</label>
              <input
                type="text"
                required
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Importe (S/)</label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-[var(--color-porkos-orange)]"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Método de Pago</label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingExpense(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" size="md" className="flex-1">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Confirmar Eliminación (Solo Administrador) */}
      {isAdmin && (
        <Modal
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setDeletingExpense(null);
          }}
          title="Eliminar Registro de Gasto"
        >
          <div className="space-y-4 text-xs">
            <div className="bg-rose-950/20 border border-rose-800/40 p-3.5 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-zinc-300">
                <p className="font-bold text-white text-sm">¿Confirmas la eliminación de este gasto?</p>
                <p>
                  Gasto de{' '}
                  <strong className="text-rose-400 font-black">
                    {formatCurrency(deletingExpense?.amount || 0)}
                  </strong>{' '}
                  en &ldquo;{deletingExpense?.description}&rdquo;.
                </p>
                <p className="text-[11px] text-zinc-400">
                  Esta acción revertirá este egreso de los totales del turno y de la base de datos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => {
                  setIsDeleteOpen(false);
                  setDeletingExpense(null);
                }}
              >
                Cancelar
              </Button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white transition-all cursor-pointer active:scale-95 touch-manipulation shadow-md shadow-rose-600/20"
              >
                Sí, Eliminar Gasto
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

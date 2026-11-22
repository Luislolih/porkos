import { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  Edit3,
  Trash2,
  ShieldCheck,
  Calendar,
  Clock,
  TrendingDown,
  CreditCard,
} from 'lucide-react';
import { formatCurrency, formatTime, formatDate, parseToDate } from '../../utils/formatters';
import { sanitizeText } from '../../utils/security';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchInput from '../../components/ui/SearchInput';
import EmptyState from '../../components/ui/EmptyState';
import Toast from '../../components/ui/Toast';
import { useAuth } from '../../context/useAuth';
import {
  subscribeToExpenses,
  saveExpenseToFirestore,
  updateExpenseInFirestore,
  deleteExpenseFromFirestore,
} from '../../services/firestoreService';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [toastMessage, setToastMessage] = useState(null);

  // Filtros por fecha
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'THIS_MONTH' | 'BY_MONTH' | 'CUSTOM'
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal Nuevo Gasto
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newCategory, setNewCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('Efectivo');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Edición (Solo Admin)
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState('Efectivo');

  // Dialog Eliminación (Solo Admin)
  const [deletingExpense, setDeletingExpense] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    const unsubscribe = subscribeToExpenses((remoteExpenses) => {
      setExpenses(remoteExpenses);
    });
    return () => unsubscribe();
  }, []);

  // Años disponibles según registros
  const availableYears = useMemo(() => {
    const yearsSet = new Set([new Date().getFullYear()]);
    expenses.forEach((e) => {
      const d = parseToDate(e.date);
      if (d) yearsSet.add(d.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [expenses]);

  // Ordenar gastos cronológicamente por fecha descendente
  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const timeA = parseToDate(a.date)?.getTime() || 0;
      const timeB = parseToDate(b.date)?.getTime() || 0;
      return timeB - timeA;
    });
  }, [expenses]);

  // Gastos filtrados por fecha, categoría y búsqueda
  const filteredExpenses = useMemo(() => {
    let result = sortedExpenses;

    // 1. Filtro por fecha
    if (dateFilterMode === 'TODAY') {
      const today = new Date();
      result = result.filter((e) => {
        const d = parseToDate(e.date);
        return (
          d &&
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        );
      });
    } else if (dateFilterMode === 'THIS_MONTH') {
      const now = new Date();
      result = result.filter((e) => {
        const d = parseToDate(e.date);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (dateFilterMode === 'BY_MONTH') {
      result = result.filter((e) => {
        const d = parseToDate(e.date);
        return d && d.getMonth() === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
      });
    } else if (dateFilterMode === 'CUSTOM') {
      const start = customStartDate ? new Date(`${customStartDate}T00:00:00`) : null;
      const end = customEndDate ? new Date(`${customEndDate}T23:59:59`) : null;
      result = result.filter((e) => {
        const d = parseToDate(e.date);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    // 2. Filtro por categoría
    if (selectedCategory !== 'TODAS') {
      result = result.filter((e) => e.category === selectedCategory);
    }

    // 3. Filtro por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.paymentMethod?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [sortedExpenses, dateFilterMode, selectedMonth, selectedYear, customStartDate, customEndDate, selectedCategory, searchQuery]);

  // Agrupar gastos filtrados por Mes y Año
  const groupedExpenses = useMemo(() => {
    const groups = [];
    const map = new Map();

    filteredExpenses.forEach((exp) => {
      const d = parseToDate(exp.date) || new Date();
      const monthIdx = d.getMonth();
      const year = d.getFullYear();
      const key = `${year}-${String(monthIdx).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[monthIdx]} ${year}`;

      if (!map.has(key)) {
        const groupObj = {
          key,
          label,
          expenses: [],
          total: 0,
        };
        map.set(key, groupObj);
        groups.push(groupObj);
      }

      const grp = map.get(key);
      grp.expenses.push(exp);
      grp.total += (exp.amount || 0);
    });

    return groups;
  }, [filteredExpenses]);

  // Cálculos para KPIs
  const totalFilteredExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const thisMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenses
      .filter((e) => {
        const d = parseToDate(e.date);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const topCategory = useMemo(() => {
    if (filteredExpenses.length === 0) return null;
    const catTotals = {};
    filteredExpenses.forEach((e) => {
      catTotals[e.category] = (catTotals[e.category] || 0) + (e.amount || 0);
    });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], total: sorted[0][1] } : null;
  }, [filteredExpenses]);

  // Registrar nuevo gasto con fecha personalizada
  const handleAddExpense = async (e) => {
    e.preventDefault();
    const cleanAmount = Math.round(Math.max(0.1, parseFloat(newAmount) || 0) * 100) / 100;
    const cleanDescription = sanitizeText(newDesc, 200);
    if (!cleanAmount || !cleanDescription) return;

    setIsSubmitting(true);
    const customDate = newDate ? new Date(`${newDate}T12:00:00`) : new Date();

    const newExp = {
      id: `exp_${Date.now()}`,
      date: customDate,
      category: newCategory,
      description: cleanDescription,
      amount: cleanAmount,
      paymentMethod: newMethod,
      registeredBy: user?.displayName || user?.email?.split('@')[0] || 'Cajero',
      createdAt: new Date(),
    };

    setExpenses((prev) => [newExp, ...prev]);
    setIsAddOpen(false);
    setNewDesc('');
    setNewAmount('');
    setIsSubmitting(false);

    setToastMessage({ type: 'success', text: `Gasto de S/ ${cleanAmount.toFixed(2)} registrado` });
    await saveExpenseToFirestore(newExp);
  };

  // Abrir modal de edición (Solo Admin)
  const handleOpenEdit = (exp) => {
    if (!isAdmin) return;
    setEditingExpense(exp);
    const parsed = parseToDate(exp.date);
    const formattedDate = parsed ? parsed.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setEditDate(formattedDate);
    setEditCategory(exp.category || EXPENSE_CATEGORIES[0]);
    setEditDesc(exp.description || '');
    setEditAmount(String(exp.amount || ''));
    setEditMethod(exp.paymentMethod || 'Efectivo');
    setIsEditOpen(true);
  };

  // Guardar edición de gasto con fecha actualizada (Solo Admin)
  const handleSaveEditExpense = async (e) => {
    e.preventDefault();
    if (!isAdmin || !editingExpense) return;

    const cleanAmount = Math.round(Math.max(0.01, parseFloat(editAmount) || 0) * 100) / 100;
    const cleanDescription = sanitizeText(editDesc, 200);
    if (!cleanAmount || !cleanDescription) return;

    const updatedDate = editDate ? new Date(`${editDate}T12:00:00`) : (parseToDate(editingExpense.date) || new Date());

    const updatedData = {
      date: updatedDate,
      category: editCategory,
      description: cleanDescription,
      amount: cleanAmount,
      paymentMethod: editMethod,
      editedBy: user?.displayName || user?.email?.split('@')[0] || 'Admin',
      updatedAt: new Date(),
    };

    setExpenses((prev) =>
      prev.map((exp) => (exp.id === editingExpense.id ? { ...exp, ...updatedData } : exp))
    );
    setIsEditOpen(false);
    setEditingExpense(null);

    setToastMessage({ type: 'success', text: `Gasto actualizado correctamente` });
    await updateExpenseInFirestore(editingExpense.id, updatedData);
  };

  // Confirmar eliminación de gasto (Solo Admin)
  const handleConfirmDelete = async () => {
    if (!isAdmin || !deletingExpense) return;

    setIsDeleting(true);
    const targetId = deletingExpense.id;

    setExpenses((prev) => prev.filter((exp) => exp.id !== targetId));
    setDeletingExpense(null);
    setIsDeleting(false);

    setToastMessage({ type: 'success', text: `Gasto eliminado de la base de datos` });
    await deleteExpenseFromFirestore(targetId);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-8">
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Top Bar: Controles rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 shadow-xs">
            {filteredExpenses.length} de {expenses.length} gastos
          </span>
          {isAdmin && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              <ShieldCheck className="w-3 h-3 text-rose-400" />
              Admin
            </span>
          )}
        </div>

        <Button
          onClick={() => {
            setNewDate(new Date().toISOString().split('T')[0]);
            setIsAddOpen(true);
          }}
          icon={Plus}
          size="sm"
          className="text-xs font-black shadow-md shadow-orange-500/20 ml-auto"
        >
          Registrar Gasto
        </Button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Egresos Período */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              {dateFilterMode === 'ALL' ? 'Total Egresos Históricos' : 'Egresos en Período'}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono mt-1 block">
              {formatCurrency(totalFilteredExpenses)}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">
              {filteredExpenses.length} compras filtradas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Egresos de Este Mes */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Egresos de Este Mes
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-1 block">
              {formatCurrency(thisMonthExpenses)}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">
              {MONTH_NAMES[new Date().getMonth()]} {new Date().getFullYear()}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Mayor Rubro */}
        <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Mayor Rubro de Gasto
            </span>
            <span className="text-base sm:text-lg font-black text-white truncate max-w-[180px] mt-1 block">
              {topCategory?.name || 'Sin registros'}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
              {topCategory ? formatCurrency(topCategory.total) : 'S/ 0.00'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtro de Fechas y Organización */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-3 space-y-2.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
              Período:
            </span>
            {[
              { id: 'ALL', label: 'Todo' },
              { id: 'TODAY', label: 'Hoy' },
              { id: 'THIS_MONTH', label: 'Este Mes' },
              { id: 'BY_MONTH', label: 'Por Mes / Año' },
              { id: 'CUSTOM', label: 'Rango' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDateFilterMode(btn.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none active:scale-95 ${
                  dateFilterMode === btn.id
                    ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-xs'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Selectores dinámicos de Mes/Año o Rango */}
          {dateFilterMode === 'BY_MONTH' && (
            <div className="flex items-center gap-2 animate-fade-in-smooth">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-[var(--color-porkos-orange)]"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold cursor-pointer focus:outline-none focus:border-[var(--color-porkos-orange)]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {dateFilterMode === 'CUSTOM' && (
            <div className="flex items-center gap-2 text-xs animate-fade-in-smooth">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                style={{ colorScheme: 'dark' }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-white font-medium focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <span className="text-zinc-500">a</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                style={{ colorScheme: 'dark' }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1 text-white font-medium focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Buscador & Filtro de Categoría */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por descripción, categoría o método de pago..."
          />
        </div>

        {/* Filtro por categoría */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('TODAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'TODAS'
                ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
            }`}
          >
            Todas ({expenses.length})
          </button>
          {EXPENSE_CATEGORIES.map((cat) => {
            const count = expenses.filter((e) => e.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[var(--color-porkos-orange)] text-black font-black shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Listado de Gastos Organizado por Mes */}
      <div className="space-y-4">
        {filteredExpenses.length === 0 ? (
          <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl overflow-hidden shadow-sm p-6">
            <EmptyState
              icon={Wallet}
              title={expenses.length === 0 ? 'No hay gastos registrados' : 'Sin resultados para la búsqueda o fecha'}
              description={
                expenses.length === 0
                  ? 'Registra compras de insumos para llevar el control de caja al cierre del turno.'
                  : 'Intenta cambiar el rango de fecha, la categoría o borrar el término de búsqueda.'
              }
              actionLabel={expenses.length === 0 ? 'Registrar Primer Gasto' : 'Restablecer Filtros'}
              onAction={() => {
                if (expenses.length === 0) {
                  setIsAddOpen(true);
                } else {
                  setSearchQuery('');
                  setSelectedCategory('TODAS');
                  setDateFilterMode('ALL');
                }
              }}
            />
          </div>
        ) : (
          groupedExpenses.map((group) => (
            <div key={group.key} className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl overflow-hidden shadow-sm">
              {/* Encabezado del Mes */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-zinc-800/80 text-xs">
                <div className="flex items-center gap-2 font-black text-zinc-200 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                  <span>{group.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-semibold">
                    {group.expenses.length} {group.expenses.length === 1 ? 'registro' : 'registros'}
                  </span>
                  <span className="font-mono font-black text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20 text-xs">
                    Total: {formatCurrency(group.total)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-black/20 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800/60 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Fecha & Hora</th>
                      <th className="py-2.5 px-4">Categoría</th>
                      <th className="py-2.5 px-4">Descripción</th>
                      <th className="py-2.5 px-4">Método</th>
                      <th className="py-2.5 px-4 text-right">Importe</th>
                      {isAdmin && <th className="py-2.5 px-4 text-center">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 font-medium">
                    {group.expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-300">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>{formatDate(exp.date)}</span>
                            <span className="text-zinc-500 font-normal">•</span>
                            <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span className="text-zinc-300 font-semibold">{formatTime(exp.date)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold text-[11px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white font-semibold max-w-xs truncate">
                          {exp.description}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/80 text-[11px] font-semibold">
                            {exp.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-rose-400 text-sm font-mono">
                          -{formatCurrency(exp.amount)}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(exp)}
                                className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-amber-500 hover:text-black text-amber-300 border border-zinc-700/80 transition-all cursor-pointer active:scale-95 touch-manipulation"
                                title="Editar gasto"
                                aria-label="Editar gasto"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingExpense(exp)}
                                className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-rose-500 hover:text-white text-rose-400 border border-zinc-700/80 transition-all cursor-pointer active:scale-95 touch-manipulation"
                                title="Eliminar gasto"
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
            </div>
          ))
        )}
      </div>

      {/* Modal Registrar Gasto (con fecha personalizable) */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Registrar Gasto o Compra"
        subtitle="Registra salidas de dinero y compra de insumos de cocina"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddExpense} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-zinc-300 font-bold mb-1">Fecha del Gasto / Compra *</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              onClick={(e) => e.target.showPicker?.()}
              style={{ colorScheme: 'dark' }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Categoría del Gasto *</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-bold mb-1">Descripción del Gasto *</label>
            <input
              type="text"
              required
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder=""
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Importe (S/) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-rose-400">S/</span>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-white font-black text-base sm:text-sm focus:outline-none focus:border-[var(--color-porkos-orange)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Método de Pago *</label>
              <select
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              className="font-black"
            >
              Guardar Gasto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Gasto (Solo Administrador, con fecha editable) */}
      {isAdmin && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setEditingExpense(null);
          }}
          title="Editar Gasto Registrado"
          subtitle="Modificación protegida para administradores"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveEditExpense} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="block text-zinc-300 font-bold mb-1">Fecha del Gasto *</label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                style={{ colorScheme: 'dark' }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-bold mb-1">Categoría</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
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
                placeholder=""
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Importe (S/)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-rose-400">S/</span>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2.5 text-white font-black text-base sm:text-sm focus:outline-none focus:border-[var(--color-porkos-orange)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-bold mb-1">Método de Pago</label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)] cursor-pointer"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingExpense(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="font-black">
                Guardar Cambios
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm Dialog: Eliminar Gasto */}
      <ConfirmDialog
        isOpen={Boolean(deletingExpense)}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar registro de gasto?"
        message={
          deletingExpense
            ? `Se eliminará el gasto de S/ ${Number(deletingExpense.amount || 0).toFixed(2)} ("${deletingExpense.description}"). Esta acción revertirá este egreso de los totales del turno.`
            : ''
        }
        confirmText="Sí, Eliminar Gasto"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

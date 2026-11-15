import { useState } from 'react';
import { Wallet, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

export default function ExpensesView() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expenses, setExpenses] = useState([
    {
      id: 'exp_1',
      date: new Date(),
      category: 'Panes',
      description: 'Panes para hamburguesas y choripanes (100 und)',
      amount: 45.00,
      paymentMethod: 'Efectivo',
      provider: 'Panadería Central',
    },
    {
      id: 'exp_2',
      date: new Date(),
      category: 'Verduras',
      description: 'Lechuga, tomate y cebolla fresca',
      amount: 28.50,
      paymentMethod: 'Yape',
      provider: 'Mercado Mayorista',
    },
  ]);

  const [newCategory, setNewCategory] = useState('Carnes');
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('Efectivo');

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newAmount || !newDesc) return;

    const newExp = {
      id: `exp_${Date.now()}`,
      date: new Date(),
      category: newCategory,
      description: newDesc.trim(),
      amount: parseFloat(newAmount) || 0,
      paymentMethod: newMethod,
    };

    setExpenses((prev) => [newExp, ...prev]);
    setIsAddOpen(false);
    setNewDesc('');
    setNewAmount('');
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Header */}
      <div className="bg-[var(--color-porkos-surface)] p-4 rounded-2xl border border-[var(--color-porkos-border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Gastos y Compras de Insumos
            </h2>
            <p className="text-xs text-[var(--color-porkos-muted)]">
              Control rápido de egresos y compras diarias
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          icon={Plus}
          size="sm"
          className="text-xs"
        >
          Registrar Gasto
        </Button>
      </div>

      {/* KPI Total */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] p-4 rounded-2xl flex items-center justify-between max-w-sm">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Total Egresos Hoy:
        </span>
        <span className="text-2xl font-black text-rose-400">
          {formatCurrency(totalExpenses)}
        </span>
      </div>

      {/* Expenses Table */}
      <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-black/40 text-zinc-400 font-bold uppercase tracking-wider border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4">Descripción</th>
              <th className="py-3 px-4">Método</th>
              <th className="py-3 px-4 text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-medium">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-bold text-amber-400">{exp.category}</td>
                <td className="py-3.5 px-4 text-white">{exp.description}</td>
                <td className="py-3.5 px-4 text-zinc-400">{exp.paymentMethod}</td>
                <td className="py-3.5 px-4 text-right font-black text-rose-400">
                  -{formatCurrency(exp.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-[var(--color-porkos-orange)]"
            >
              <option value="Carnes">Carnes & Hamburguesas</option>
              <option value="Chorizos">Chorizos</option>
              <option value="Panes">Panes</option>
              <option value="Verduras">Verduras</option>
              <option value="Papas">Papas</option>
              <option value="Bebidas">Bebidas & Gaseosas</option>
              <option value="Cremas">Cremas e Insumos</option>
              <option value="Empaques">Tapers & Empaques</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Otros">Otros</option>
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
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[var(--color-porkos-orange)]"
              >
                <option value="Efectivo">Efectivo (Caja)</option>
                <option value="Yape">Yape</option>
                <option value="Plin">Plin</option>
                <option value="Transferencia">Transferencia</option>
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
    </div>
  );
}

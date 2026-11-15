import { useState } from 'react';
import { Grid2X2, Users, Clock, Plus, CheckCircle, ShoppingBag } from 'lucide-react';
import { formatCurrency, formatElapsedTime } from '../../utils/formatters';
import QuickPaymentModal from '../sales/components/QuickPaymentModal';

export default function TablesView({
  tables = [],
  orders = [],
  onSelectTableForOrder,
  onCloseTable,
}) {
  const [closingOrder, setClosingOrder] = useState(null);

  const handleOpenCloseModal = (order) => {
    setClosingOrder(order);
  };

  const handleConfirmClosePayment = (paymentDetail) => {
    if (onCloseTable && closingOrder) {
      onCloseTable(closingOrder.tableId, closingOrder.orderNumber, paymentDetail);
    }
    setClosingOrder(null);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      {/* Header */}
      <div className="bg-[var(--color-porkos-surface)] p-4 rounded-2xl border border-[var(--color-porkos-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Grid2X2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Control de Salón — 3 Mesas
            </h2>
            <p className="text-xs text-[var(--color-porkos-muted)]">
              Mesas abiertas para consumo continuo y cierre de cuenta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-zinc-300 bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Libres: {tables.filter((t) => t.status === 'AVAILABLE').length}
          </span>
          <span className="flex items-center gap-1.5 text-zinc-300 bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700">
            <span className="w-2 h-2 rounded-full bg-[var(--color-porkos-orange)]" />
            Abiertas: {tables.filter((t) => t.status === 'OCCUPIED').length}
          </span>
        </div>
      </div>

      {/* Grid of 3 Tables */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tables.map((table) => {
          const isOccupied = table.status === 'OCCUPIED';
          const tableOrder = orders.find(
            (o) => o.tableId === table.id && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
          );

          return (
            <div
              key={table.id}
              className={`
                bg-zinc-900/90 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all
                ${
                  isOccupied
                    ? 'border-zinc-700 border-t-4 border-t-[var(--color-porkos-orange)] shadow-lg'
                    : 'border-zinc-800/90 hover:border-zinc-700'
                }
              `}
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-zinc-800">
                <div>
                  <h3 className="text-xl font-black text-white">{table.label}</h3>
                  <span className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-zinc-500" /> Capacidad: {table.capacity} personas
                  </span>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    isOccupied
                      ? 'bg-zinc-800 text-[var(--color-porkos-orange)] border-zinc-700'
                      : 'bg-zinc-800 text-emerald-400 border-zinc-700'
                  }`}
                >
                  {isOccupied ? 'ABIERTA' : 'DISPONIBLE'}
                </span>
              </div>

              {/* Order content */}
              {isOccupied && tableOrder ? (
                <div className="space-y-3">
                  <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>Pedido {tableOrder.orderNumber}</span>
                      <span className="text-base text-[var(--color-porkos-orange)] font-black">
                        {formatCurrency(tableOrder.total)}
                      </span>
                    </div>

                    {tableOrder.customerName && (
                      <p className="text-[11px] text-zinc-300 font-semibold">
                        Cliente: <strong className="text-white">{tableOrder.customerName}</strong>
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>Abierta hace: <strong className="text-zinc-200">{formatElapsedTime(tableOrder.createdAt)}</strong></span>
                    </div>
                  </div>

                  {/* Accumulated items preview */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Consumo actual ({tableOrder.items?.length}):
                    </span>
                    <div className="max-h-24 overflow-y-auto space-y-1 bg-black/30 p-2 rounded-lg border border-zinc-800/60">
                      {tableOrder.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-zinc-300 text-[11px]">
                          <span>{item.quantity}× {item.name}</span>
                          <span className="font-bold text-white">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 flex flex-col items-center justify-center space-y-1.5">
                  <ShoppingBag className="w-8 h-8 opacity-25 text-zinc-400" />
                  <p className="text-xs font-semibold text-zinc-400">Mesa libre</p>
                  <p className="text-[11px] text-zinc-600">Lista para recibir comanda</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                {isOccupied && tableOrder ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSelectTableForOrder(table)}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-zinc-700"
                    >
                      <Plus className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                      <span>Pedir más cosas (Agregar)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCloseModal(tableOrder)}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                    >
                      <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Cobrar y Cerrar Mesa ({formatCurrency(tableOrder.total)})</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectTableForOrder(table)}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Abrir Mesa</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Cobro y Cierre de Mesa */}
      {closingOrder && (
        <QuickPaymentModal
          isOpen={Boolean(closingOrder)}
          onClose={() => setClosingOrder(null)}
          total={closingOrder.total}
          onConfirmPayment={handleConfirmClosePayment}
        />
      )}
    </div>
  );
}

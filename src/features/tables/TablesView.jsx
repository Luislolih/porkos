import { useState, useEffect } from 'react';
import { Grid2X2, Clock, Plus, CheckCircle, ShoppingBag, Utensils, Edit3 } from 'lucide-react';
import { formatCurrency, formatElapsedTime } from '../../utils/formatters';
import QuickPaymentModal from '../sales/components/QuickPaymentModal';

export default function TablesView({
  tables = [],
  orders = [],
  onSelectTableForOrder,
  onCloseTable,
  onEditTableOrder,
}) {
  const [closingOrder, setClosingOrder] = useState(null);
  const [, setTick] = useState(0);

  // Re-evaluar tiempos transcurridos de mesas cada 20 segundos
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 20000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenCloseModal = (table, tableOrders, total) => {
    setClosingOrder({
      tableId: table.id,
      tableName: table.label,
      orderNumbers: tableOrders.map((o) => o.orderNumber),
      orderNumber: tableOrders.map((o) => o.orderNumber).join(', '),
      total: total,
    });
  };

  const handleConfirmClosePayment = (paymentDetail) => {
    if (onCloseTable && closingOrder) {
      onCloseTable(closingOrder.tableId, closingOrder.orderNumbers || closingOrder.orderNumber, paymentDetail);
    }
    setClosingOrder(null);
  };

  const freeCount = tables.filter((t) => t.status === 'AVAILABLE').length;
  const occupiedCount = tables.filter((t) => t.status === 'OCCUPIED').length;

  return (
    <div className="space-y-3 pb-20 lg:pb-6">
      {/* Header Compacto */}
      <div className="bg-[var(--color-porkos-surface)] p-3 sm:p-4 rounded-2xl border border-[var(--color-porkos-border)] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-zinc-800 text-[var(--color-porkos-orange)] border border-zinc-700 shrink-0">
            <Grid2X2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
              Control de Mesas
            </h2>
            <p className="text-[11px] text-[var(--color-porkos-muted)] truncate">
              {tables.length} mesas en salón
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold shrink-0">
          <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-500/30 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {freeCount} libres
          </span>
          <span className="flex items-center gap-1 text-orange-400 bg-orange-950/40 px-2 py-1 rounded-lg border border-orange-500/30 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-porkos-orange)]" />
            {occupiedCount} abiertas
          </span>
        </div>
      </div>

      {/* Grid de Mesas Compactas y Adaptadas a Móvil */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables.map((table) => {
          const tableOrders = orders.filter(
            (o) => o.tableId === table.id && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO'
          );
          const isOccupied = table.status === 'OCCUPIED' || tableOrders.length > 0;
          const tableTotal = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);
          const customerName = tableOrders.find((o) => o.customerName)?.customerName;
          const earliestTime = tableOrders.length > 0
            ? Math.min(...tableOrders.map((o) => new Date(o.createdAt || Date.now()).getTime()))
            : null;

          return (
            <div
              key={table.id}
              className={`
                bg-[#141414] border rounded-2xl p-3 sm:p-4 flex flex-col justify-between gap-3 transition-all
                ${
                  isOccupied
                    ? 'border-orange-500/40 bg-zinc-950/90 shadow-md ring-1 ring-orange-500/20'
                    : 'border-zinc-800/80 hover:border-zinc-700'
                }
              `}
            >
              {/* Top row: Label & Status */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                      isOccupied
                        ? 'bg-[var(--color-porkos-orange)] text-black'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">{table.label}</h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {isOccupied && tableOrders.length > 1 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-zinc-800 text-amber-400 border border-amber-500/30">
                      {tableOrders.length} pedidos
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      isOccupied
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isOccupied ? 'ABIERTA' : 'LIBRE'}
                  </span>
                </div>
              </div>

              {/* Order Info or Empty State */}
              {isOccupied && tableOrders.length > 0 ? (
                <div className="space-y-2">
                  <div className="bg-black/60 p-2.5 rounded-xl border border-zinc-800/80 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>
                        {tableOrders.length === 1
                          ? `Pedido ${tableOrders[0].orderNumber}`
                          : `Total Mesa (${tableOrders.map((o) => o.orderNumber).join(', ')})`}
                      </span>
                      <span className="text-sm sm:text-base text-[var(--color-porkos-orange)] font-black">
                        {formatCurrency(tableTotal)}
                      </span>
                    </div>

                    {customerName && (
                      <p className="text-[11px] text-zinc-300 font-medium truncate">
                        Cliente: <strong className="text-white">{customerName}</strong>
                      </p>
                    )}

                    {earliestTime && (
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400 pt-0.5">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>{formatElapsedTime(earliestTime)}</span>
                      </div>
                    )}
                  </div>

                  {/* Consumo compacto */}
                  {tableOrders.some((o) => o.items?.length > 0) && (
                    <div className="max-h-24 overflow-y-auto space-y-1 bg-black/40 p-2 rounded-lg border border-zinc-800/60 text-[11px]">
                      {tableOrders.map((order) =>
                        order.items?.map((item, idx) => (
                          <div key={`${order.orderNumber}-${idx}`} className="flex justify-between items-center text-zinc-300">
                            <span className="truncate pr-2">
                              {tableOrders.length > 1 && (
                                <span className="inline-block text-[9px] font-mono px-1 py-0.5 bg-zinc-800 text-[var(--color-porkos-orange)] rounded mr-1">
                                  {order.orderNumber}
                                </span>
                              )}
                              {item.quantity}× {item.name}
                            </span>
                            <span className="font-bold text-white shrink-0">{formatCurrency(item.subtotal)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-3 text-center text-zinc-500 flex items-center justify-center gap-2">
                  <ShoppingBag className="w-4 h-4 opacity-40 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-400">Mesa disponible</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-zinc-800/80">
                {isOccupied && tableOrders.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectTableForOrder(table)}
                      className="py-2 px-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center gap-1 transition-all cursor-pointer border border-zinc-700"
                      title="Añadir más productos a la comanda"
                    >
                      <Plus className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                      <span>Pedir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditTableOrder && onEditTableOrder(tableOrders[0])}
                      className="py-2 px-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-300 hover:border-amber-400 flex items-center justify-center gap-1 transition-all cursor-pointer border border-zinc-700"
                      title="Modificar última comanda abierta"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCloseModal(table, tableOrders, tableTotal)}
                      className="py-2 px-1.5 rounded-xl text-xs font-black bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Cobrar</span>
                    </button>
                  </div>
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

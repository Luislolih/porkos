import { useState, useEffect } from 'react';
import { Clock, Plus, CheckCircle, ShoppingBag, Utensils, Edit3, Package } from 'lucide-react';
import { formatCurrency, formatElapsedTime } from '../../utils/formatters';
import { isProductMarket } from '../../utils/productCategories';
import QuickPaymentModal from '../sales/components/QuickPaymentModal';

function orderRequiresKitchen(o) {
  return o.items?.some((i) => Boolean(i.requiresKitchen) && !isProductMarket(i));
}

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

  // Cargar comanda unificada de mesa para editar antes del cierre
  const handleEditTable = (table, currentTableOrders) => {
    // 1. Filtrar solo los productos que califican: entregados de esa mesa + cocina en preparación o entregados
    const qualifyingOrders = currentTableOrders.filter((o) => {
      if (o.status === 'ENTREGADO') return true;
      if (orderRequiresKitchen(o)) return true;
      return false;
    });

    if (qualifyingOrders.length === 0) {
      if (currentTableOrders.length > 0) {
        alert('Los productos solicitados para esta mesa aún están en la sección de Entregas. Una vez que se marquen como entregados, podrás editar los detalles aquí antes del cierre de mesa.');
      }
      return;
    }

    const primaryOrder = qualifyingOrders[0];
    const consolidatedItems = qualifyingOrders.flatMap((o) => (o.items ? o.items.map((i) => ({ ...i })) : []));
    const consolidatedPackagings = qualifyingOrders.flatMap((o) => (o.packagings ? o.packagings.map((p) => ({ ...p })) : []));
    const clientName = qualifyingOrders.find((o) => o.customerName)?.customerName || '';
    const generalNotes = qualifyingOrders
      .map((o) => o.generalNotes)
      .filter(Boolean)
      .join(' | ');

    const tableOrderToEdit = {
      ...primaryOrder,
      tableId: table.id,
      tableName: table.label,
      customerName: clientName,
      items: consolidatedItems,
      packagings: consolidatedPackagings,
      generalNotes,
      mergedOrderNumbers: qualifyingOrders.map((o) => o.orderNumber),
    };

    if (onEditTableOrder) {
      onEditTableOrder(tableOrderToEdit);
    }
  };

  return (
    <div className="space-y-3 pb-20 lg:pb-6">
      {/* Grid de Mesas Puestas en Salón */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables.map((table) => {
          const tableOrders = orders.filter(
            (o) => o.tableId === table.id && o.paymentStatus !== 'PAID' && o.status !== 'CANCELADO'
          );

          // 1. Productos que salen en la mesa: todos los entregados + los de cocina en preparación o entregados
          const qualifyingOrders = tableOrders.filter((o) => {
            if (o.status === 'ENTREGADO') return true;
            if (orderRequiresKitchen(o)) return true;
            return false;
          });

          // 2. Pedidos que no requieren cocina y están pendientes de entrega (solo salen tras marcarse entregado)
          const pendingDeliveryOrders = tableOrders.filter((o) => {
            return !orderRequiresKitchen(o) && o.status !== 'ENTREGADO';
          });

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

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {pendingDeliveryOrders.length > 0 && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                      title="Productos pendientes de entrega en barra/despacho"
                    >
                      <Package className="w-2.5 h-2.5 text-blue-400" />
                      <span>{pendingDeliveryOrders.length} por entregar</span>
                    </span>
                  )}
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

                  {/* Consumo de la mesa: productos entregados y platos en cocina */}
                  {qualifyingOrders.some((o) => o.items?.length > 0) ? (
                    <div className="max-h-24 overflow-y-auto space-y-1 bg-black/40 p-2 rounded-lg border border-zinc-800/60 text-[11px]">
                      {qualifyingOrders.map((order) =>
                        order.items?.map((item, idx) => (
                          <div key={`${order.orderNumber}-${idx}`} className="flex justify-between items-center text-zinc-300">
                            <span className="truncate pr-2">
                              {qualifyingOrders.length > 1 && (
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
                  ) : pendingDeliveryOrders.length > 0 ? (
                    <div className="py-2 px-2.5 rounded-lg bg-blue-950/20 border border-blue-800/30 text-[11px] text-blue-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>Esperando entrega de bebidas / market</span>
                      </div>
                      <span className="text-[10px] font-bold text-blue-400">Por entregar</span>
                    </div>
                  ) : null}
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
                      onClick={() => handleEditTable(table, tableOrders)}
                      className="py-2 px-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-amber-500 hover:text-black text-amber-300 hover:border-amber-400 flex items-center justify-center gap-1 transition-all cursor-pointer border border-zinc-700"
                      title="Modificar comanda de mesa antes del cierre"
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

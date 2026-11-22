import { useState, useEffect } from 'react';
import { Clock, Plus, CheckCircle, ShoppingBag, Utensils, Edit3, Package, ArrowRightLeft } from 'lucide-react';
import { formatCurrency, formatElapsedTime } from '../../utils/formatters';
import { isProductMarket } from '../../utils/productCategories';
import QuickPaymentModal from '../sales/components/QuickPaymentModal';
import ItemConsumptionBadge from '../../components/ui/ItemConsumptionBadge';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

function orderRequiresKitchen(o) {
  return o.items?.some((i) => Boolean(i.requiresKitchen) && !isProductMarket(i));
}

export default function TablesView({
  tables = [],
  orders = [],
  onSelectTableForOrder,
  onCloseTable,
  onEditTableOrder,
  onChangeTable,
}) {
  const [closingOrder, setClosingOrder] = useState(null);
  const [tableToMove, setTableToMove] = useState(null);
  const [selectedTargetTable, setSelectedTargetTable] = useState(null);
  const [isTransferringTable, setIsTransferringTable] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [, setTick] = useState(0);

  // Re-evaluar tiempos transcurridos de mesas cada 15 segundos
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
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
    if (!currentTableOrders || currentTableOrders.length === 0) return;

    const primaryOrder = currentTableOrders[0];
    const consolidatedItems = currentTableOrders.flatMap((o) => (o.items ? o.items.map((i) => ({ ...i })) : []));
    const consolidatedPackagings = currentTableOrders.flatMap((o) => (o.packagings ? o.packagings.map((p) => ({ ...p })) : []));
    const clientName = currentTableOrders.find((o) => o.customerName)?.customerName || '';
    const generalNotes = currentTableOrders
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
      mergedOrderNumbers: currentTableOrders.map((o) => o.orderNumber),
    };

    if (onEditTableOrder) {
      onEditTableOrder(tableOrderToEdit);
    }
  };

  const handleConfirmTableTransfer = async () => {
    if (!tableToMove || !selectedTargetTable || !onChangeTable) return;
    setIsTransferringTable(true);
    try {
      const ok = await onChangeTable(tableToMove.id, selectedTargetTable);
      if (ok) {
        setToastMessage(`Pedido transferido de ${tableToMove.label} a ${selectedTargetTable.label}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
      setTableToMove(null);
      setSelectedTargetTable(null);
    } catch (err) {
      console.error('Error transfiriendo mesa:', err);
    } finally {
      setIsTransferringTable(false);
    }
  };

  const occupiedCount = tables.filter((t) => {
    const tableOrders = orders.filter(
      (o) => o.tableId === t.id && o.paymentStatus !== 'PAID' && o.status !== 'CANCELADO'
    );
    return t.status === 'OCCUPIED' || tableOrders.length > 0;
  }).length;

  return (
    <div className="space-y-4 pb-20 lg:pb-6">
      <PageHeader
        title="Control de Salón y Mesas"
        subtitle="Visualiza la ocupación en vivo, abre pedidos y cobra comandas de mesa."
        icon={Utensils}
        badge={
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
            {occupiedCount} ocupadas / {tables.length} totales
          </span>
        }
      />

      {tables.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No hay mesas configuradas"
          description="Ve a Ajustes > Mesas para agregar mesas al salón del restaurante."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
          {tables.map((table) => {
            const tableOrders = orders.filter(
              (o) => o.tableId === table.id && o.paymentStatus !== 'PAID' && o.status !== 'CANCELADO'
            );

            const qualifyingOrders = tableOrders.filter((o) => {
              if (o.status === 'ENTREGADO') return true;
              if (orderRequiresKitchen(o)) return true;
              return false;
            });

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
                  bg-[#121216] border-2 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between gap-3.5 transition-all shadow-md select-none
                  ${
                    isOccupied
                      ? 'border-[var(--color-porkos-orange)]/50 ring-1 ring-orange-500/20'
                      : 'border-[var(--color-porkos-border)] hover:border-zinc-700'
                  }
                `}
              >
                {/* Header de la Mesa */}
                <div className="flex items-center justify-between pb-2.5 border-b border-[var(--color-porkos-border)]">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isOccupied
                          ? 'bg-[var(--color-porkos-orange)] text-zinc-950 shadow-xs'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Utensils className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                        {table.label}
                      </h3>
                      {table.capacity && (
                        <span className="text-[10px] text-zinc-400 font-bold block">
                          Capacidad: {table.capacity}p
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {pendingDeliveryOrders.length > 0 && (
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                        title="Productos pendientes de entrega"
                      >
                        <Package className="w-3 h-3 text-blue-400" />
                        <span>{pendingDeliveryOrders.length}</span>
                      </span>
                    )}
                    {isOccupied && tableOrders.length > 1 && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-zinc-800 text-amber-300 border border-amber-500/30">
                        {tableOrders.length} peds
                      </span>
                    )}
                    {isOccupied && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTableToMove(table);
                          setSelectedTargetTable(null);
                        }}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-300 border border-zinc-700/80 hover:border-amber-500/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
                        title="Cambiar comanda de esta mesa a otra mesa"
                      >
                        <ArrowRightLeft className="w-3 h-3 text-[var(--color-porkos-orange)]" />
                        <span>Cambiar Mesa</span>
                      </button>
                    )}
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        isOccupied
                          ? 'bg-orange-500/15 text-[var(--color-porkos-orange)] border-orange-500/35'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                      }`}
                    >
                      {isOccupied ? 'ABIERTA' : 'LIBRE'}
                    </span>
                  </div>
                </div>

                {/* Info de Consumo o Estado Libre */}
                {isOccupied && tableOrders.length > 0 ? (
                  <div className="space-y-2">
                    <div className="bg-[#0C0C0F] p-3 rounded-2xl border border-[var(--color-porkos-border)] space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span className="text-zinc-400 truncate pr-2">
                          {tableOrders.length === 1
                            ? `Pedido ${tableOrders[0].orderNumber}`
                            : `Consolidado (${tableOrders.length})`}
                        </span>
                        <span className="text-base sm:text-lg text-[var(--color-porkos-orange)] font-black tracking-tight shrink-0">
                          {formatCurrency(tableTotal)}
                        </span>
                      </div>

                      {customerName && (
                        <p className="text-[11px] text-zinc-300 font-semibold truncate">
                          Cliente: <strong className="text-white">{customerName}</strong>
                        </p>
                      )}

                      {earliestTime && (
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 pt-0.5 font-medium">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>Abierta hace {formatElapsedTime(earliestTime)}</span>
                        </div>
                      )}
                    </div>

                    {/* Lista rápida de productos de la mesa */}
                    {qualifyingOrders.some((o) => o.items?.length > 0) ? (
                      <div className="max-h-28 overflow-y-auto space-y-1 bg-[#0C0C0F] p-2.5 rounded-xl border border-[var(--color-porkos-border)] text-xs scrollbar-none">
                        {qualifyingOrders.map((order) =>
                          order.items?.map((item, idx) => (
                            <div
                              key={`${order.orderNumber}-${idx}`}
                              className="flex justify-between items-center gap-2 text-zinc-300"
                            >
                              <span className="truncate pr-1 flex items-center gap-1.5 min-w-0">
                                {qualifyingOrders.length > 1 && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 bg-zinc-800 text-[var(--color-porkos-orange)] rounded shrink-0">
                                    {order.orderNumber}
                                  </span>
                                )}
                                <span className="truncate font-medium">
                                  {item.quantity}× {item.name}
                                </span>
                                <ItemConsumptionBadge item={item} orderModality={order.modality} />
                              </span>
                              <span className="font-bold text-white shrink-0">
                                {formatCurrency(item.subtotal)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    ) : pendingDeliveryOrders.length > 0 ? (
                      <div className="py-2.5 px-3 rounded-xl bg-blue-950/20 border border-blue-800/30 text-xs text-blue-300 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-4 h-4 text-blue-400 shrink-0" />
                          <span>Esperando entrega de bebidas</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-400 uppercase">En barra</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="py-6 text-center text-zinc-500 flex flex-col items-center justify-center gap-1.5">
                    <ShoppingBag className="w-6 h-6 opacity-30 text-zinc-400" />
                    <span className="text-xs font-bold text-zinc-400">Mesa disponible para comanda</span>
                  </div>
                )}

                {/* Acciones */}
                <div className="pt-2 border-t border-[var(--color-porkos-border)]">
                  {isOccupied && tableOrders.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectTableForOrder(table)}
                        className="py-2.5 px-2 min-h-[44px] rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-zinc-800 active:scale-95 touch-manipulation shadow-xs"
                        title="Añadir más productos a la comanda"
                      >
                        <Plus className="w-3.5 h-3.5 text-[var(--color-porkos-orange)] stroke-[2.5]" />
                        <span>Pedir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditTable(table, tableOrders)}
                        className="py-2.5 px-2 min-h-[44px] rounded-xl text-xs font-bold bg-zinc-900 hover:bg-amber-500 hover:text-zinc-950 active:bg-amber-400 text-amber-300 border border-zinc-800 hover:border-amber-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-xs"
                        title="Modificar comanda antes del cobro"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCloseModal(table, tableOrders, tableTotal)}
                        className="py-2.5 px-2 min-h-[44px] rounded-xl text-xs font-black bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-orange-500/20 active:scale-95 touch-manipulation"
                      >
                        <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Cobrar</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectTableForOrder(table)}
                      className="w-full py-3 px-3 min-h-[44px] rounded-xl text-xs sm:text-sm font-black bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-500/20 active:scale-97 touch-manipulation"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Abrir Mesa</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cobro y Cierre de Mesa */}
      {closingOrder && (
        <QuickPaymentModal
          isOpen={Boolean(closingOrder)}
          onClose={() => setClosingOrder(null)}
          total={closingOrder.total}
          onConfirmPayment={handleConfirmClosePayment}
        />
      )}

      {/* Notificación Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black font-black text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal para Cambiar / Mover de Mesa */}
      {tableToMove && (
        <Modal
          isOpen={Boolean(tableToMove)}
          onClose={() => {
            setTableToMove(null);
            setSelectedTargetTable(null);
          }}
          title={`Cambiar de Mesa • ${tableToMove.label}`}
          subtitle="Selecciona la nueva mesa a la que se transferirá el pedido"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-black/40 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-zinc-400">Mesa actual:</span>
              <span className="font-black text-amber-400 text-sm">{tableToMove.label}</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                Selecciona la Nueva Mesa de Destino:
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1 scrollbar-thin">
                {tables
                  .filter((t) => t.id !== tableToMove.id)
                  .map((t) => {
                    const isSelected = selectedTargetTable?.id === t.id;
                    const isOccupied = t.status === 'OCCUPIED';
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTargetTable(t)}
                        className={`
                          p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none active:scale-95
                          ${
                            isSelected
                              ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-md shadow-orange-500/20'
                              : isOccupied
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-400'
                              : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:border-zinc-600'
                          }
                        `}
                      >
                        <span className="text-xs font-black">{t.label}</span>
                        <span className="text-[10px] font-bold opacity-80">
                          {isOccupied ? 'Ocupada' : 'Libre'}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {selectedTargetTable && (
              <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs space-y-1">
                <p className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                  <span>Mover pedido de <strong>{tableToMove.label}</strong> a <strong>{selectedTargetTable.label}</strong></span>
                </p>
                {selectedTargetTable.status === 'OCCUPIED' && (
                  <p className="text-amber-400 text-[11px] font-medium">
                    ⚠️ {selectedTargetTable.label} ya tiene comanda abierta. Los consumos se consolidarán bajo esa mesa.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setTableToMove(null);
                  setSelectedTargetTable(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={!selectedTargetTable || isTransferringTable}
                isLoading={isTransferringTable}
                onClick={handleConfirmTableTransfer}
                className="flex-1 font-black bg-[var(--color-porkos-orange)] text-zinc-950"
              >
                Confirmar Cambio
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Plus,
  CheckCircle,
  ShoppingBag,
  Utensils,
  Edit3,
  Package,
  ArrowRightLeft,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatCurrency, formatElapsedTime } from '../../utils/formatters';
import { isProductMarket } from '../../utils/productCategories';
import QuickPaymentModal from '../sales/components/QuickPaymentModal';
import ItemConsumptionBadge from '../../components/ui/ItemConsumptionBadge';
import EmptyState from '../../components/ui/EmptyState';
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
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'OCCUPIED' | 'AVAILABLE'
  const [expandedTableIds, setExpandedTableIds] = useState({});
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

  // Enriquecer mesas con sus órdenes activas y totales calculados una sola vez
  const enrichedTables = useMemo(() => {
    return tables.map((table) => {
      const tableOrders = orders.filter(
        (o) => o.tableId === table.id && o.paymentStatus !== 'PAID' && o.status !== 'CANCELADO'
      );
      const qualifyingOrders = tableOrders.filter((o) => {
        if (o.status === 'ENTREGADO') return true;
        if (orderRequiresKitchen(o)) return true;
        return false;
      });
      const pendingDeliveryOrders = tableOrders.filter(
        (o) => !orderRequiresKitchen(o) && o.status !== 'ENTREGADO'
      );
      const isOccupied = table.status === 'OCCUPIED' || tableOrders.length > 0;
      const tableTotal = Math.round(tableOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0) * 100) / 100;
      const customerName = tableOrders.find((o) => o.customerName)?.customerName;
      const earliestTime = tableOrders.length > 0
        ? Math.min(...tableOrders.map((o) => new Date(o.createdAt || Date.now()).getTime()))
        : null;

      return {
        table,
        tableOrders,
        qualifyingOrders,
        pendingDeliveryOrders,
        isOccupied,
        tableTotal,
        customerName,
        earliestTime,
      };
    });
  }, [tables, orders]);

  const salonSummary = useMemo(() => {
    const occupied = enrichedTables.filter((t) => t.isOccupied);
    const availableCount = enrichedTables.length - occupied.length;
    const totalPendingAmount = Math.round(
      occupied.reduce((sum, t) => sum + t.tableTotal, 0) * 100
    ) / 100;
    const totalCapacity = enrichedTables.reduce((sum, t) => sum + (Number(t.table.capacity) || 0), 0);

    return {
      total: enrichedTables.length,
      occupiedCount: occupied.length,
      availableCount,
      totalPendingAmount,
      totalCapacity,
    };
  }, [enrichedTables]);

  const filteredTables = useMemo(() => {
    if (statusFilter === 'OCCUPIED') return enrichedTables.filter((t) => t.isOccupied);
    if (statusFilter === 'AVAILABLE') return enrichedTables.filter((t) => !t.isOccupied);
    return enrichedTables;
  }, [enrichedTables, statusFilter]);

  // Grid adaptativo en desktop: evita columnas vacías cuando hay pocas mesas o tarjetas estrechas en pantallas anchas
  const desktopGridColsClass = useMemo(() => {
    const count = filteredTables.length;
    if (count === 1) return 'grid-cols-1 max-w-lg mx-auto';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
  }, [filteredTables.length]);

  const nowMs = Date.now();

  return (
    <div className="space-y-3 sm:space-y-4 pb-20 lg:pb-8">
      {/* Barra Superior Compacta: una sola línea en mobile y desktop */}
      {tables.length > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121216] border border-[var(--color-porkos-border)] font-black text-zinc-200 tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-porkos-orange)]" />
              <span>{salonSummary.occupiedCount}/{salonSummary.total}</span>
              <span className="text-zinc-400 font-bold hidden sm:inline">ocupadas</span>
            </span>

            {salonSummary.totalPendingAmount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 font-black text-[var(--color-porkos-orange)] tabular-nums">
                <span className="hidden sm:inline text-zinc-400 font-semibold">Salón:</span>
                <span>{formatCurrency(salonSummary.totalPendingAmount)}</span>
              </span>
            )}
          </div>

          {/* Filtros Rápidos Compactos */}
          <div className="flex items-center gap-1 bg-[#121216] p-0.5 rounded-xl border border-[var(--color-porkos-border)]">
            {[
              { id: 'ALL', label: 'Todas', count: salonSummary.total },
              { id: 'OCCUPIED', label: 'Ocupadas', count: salonSummary.occupiedCount },
              { id: 'AVAILABLE', label: 'Libres', count: salonSummary.availableCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  statusFilter === tab.id
                    ? 'bg-[var(--color-porkos-orange)] text-zinc-950 font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label} <span className="opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tables.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No hay mesas configuradas"
          description="Ve a Ajustes > Mesas para agregar mesas al salón del restaurante."
        />
      ) : filteredTables.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title={statusFilter === 'OCCUPIED' ? 'No hay mesas ocupadas' : 'No hay mesas libres en este momento'}
          description="Cambia el filtro superior para ver todas las mesas del salón."
          action={{
            label: 'Ver todas las mesas',
            onClick: () => setStatusFilter('ALL'),
          }}
        />
      ) : (
        <div className={`grid ${desktopGridColsClass} gap-4 lg:gap-5 items-stretch`}>
          {filteredTables.map(({
            table,
            tableOrders,
            qualifyingOrders,
            pendingDeliveryOrders,
            isOccupied,
            tableTotal,
            customerName,
            earliestTime,
          }) => {
            const elapsedMinutes = earliestTime ? Math.floor((nowMs - earliestTime) / 60000) : 0;
            const timeBadgeColor =
              elapsedMinutes >= 60
                ? 'text-rose-400 bg-rose-500/10 border-rose-500/25'
                : elapsedMinutes >= 35
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/25'
                : 'text-zinc-400 bg-zinc-900 border-zinc-800';

            return (
              <div
                key={table.id}
                className={`
                  relative overflow-hidden rounded-2xl sm:rounded-3xl flex flex-col justify-between transition-all duration-200 select-none lg:min-h-[260px]
                  ${
                    isOccupied
                      ? 'bg-gradient-to-b from-[#171516] via-[#131317] to-[#101014] border-2 border-[var(--color-porkos-orange)]/55 shadow-lg shadow-orange-950/20 hover:border-[var(--color-porkos-orange)]/80'
                      : 'bg-gradient-to-b from-[#15151A] to-[#101014] border border-[var(--color-porkos-border)] hover:border-zinc-700 hover:shadow-xl hover:shadow-black/40'
                  }
                `}
              >
                {/* Franja superior de estado */}
                <div
                  className={`h-1.5 w-full ${
                    isOccupied
                      ? 'bg-gradient-to-r from-[var(--color-porkos-orange)] via-amber-400 to-orange-500'
                      : 'bg-gradient-to-r from-emerald-500/70 via-emerald-400/50 to-teal-500/40'
                  }`}
                />

                <div className={`flex-1 flex flex-col justify-between ${isOccupied ? 'p-3 sm:p-4 gap-2.5 sm:gap-3' : 'p-3 sm:p-4 gap-2.5 sm:gap-3'}`}>
                  {/* Header de la Mesa: Limpio, sin desbordes ni saltos de línea */}
                  <div className="space-y-2.5">
                    <div className={`flex items-center justify-between gap-2 ${isOccupied ? 'pb-2.5 sm:pb-3 border-b border-zinc-800/80' : 'pb-0 sm:pb-3 sm:border-b sm:border-zinc-800/80'}`}>
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 transition-colors ${
                            isOccupied
                              ? 'bg-[var(--color-porkos-orange)] text-zinc-950 shadow-md shadow-orange-500/20'
                              : 'bg-zinc-800/90 text-zinc-300 border border-zinc-700/70'
                          }`}
                        >
                          {table.number || <Utensils className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-lg font-black text-white leading-tight truncate">
                            {table.label}
                          </h3>
                          {table.capacity && (
                            <span className="text-[10px] sm:text-[11px] text-zinc-400 font-semibold flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3 text-zinc-500" />
                              <span>{table.capacity} personas</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border shrink-0 flex items-center gap-1.5 tracking-wide ${
                          isOccupied
                            ? 'bg-orange-500/15 text-[var(--color-porkos-orange)] border-orange-500/40'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOccupied ? 'bg-[var(--color-porkos-orange)] animate-pulse' : 'bg-emerald-400'
                          }`}
                        />
                        {isOccupied ? 'ABIERTA' : 'LIBRE'}
                      </span>
                    </div>

                    {/* Sub-barra de estado operativo y transferencia (solo mesas abiertas) */}
                    {isOccupied && (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {earliestTime && (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${timeBadgeColor}`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>Hace {formatElapsedTime(earliestTime)}</span>
                            </span>
                          )}
                          {tableOrders.length > 1 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-zinc-800 text-amber-300 border border-amber-500/30">
                              {tableOrders.length} comandas
                            </span>
                          )}
                          {pendingDeliveryOrders.length > 0 && (
                            <span
                              className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                              title="Productos pendientes de entrega en barra"
                            >
                              <Package className="w-3 h-3 text-blue-400" />
                              <span>{pendingDeliveryOrders.length} barra</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTableToMove(table);
                            setSelectedTargetTable(null);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-amber-500/15 text-zinc-300 hover:text-amber-300 border border-zinc-800 hover:border-amber-500/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95 ml-auto shrink-0"
                          title="Cambiar comanda de esta mesa a otra mesa"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-[var(--color-porkos-orange)]" />
                          <span>Cambiar</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo Central: Consumo o Estado Libre */}
                  {isOccupied && tableOrders.length > 0 ? (
                    <div className="space-y-2.5 flex-1 flex flex-col">
                      {/* Resumen del Total de la Mesa */}
                      <div className="bg-[#0B0B0E] px-3.5 py-2.5 rounded-2xl border border-zinc-800/90 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                            {tableOrders.length === 1
                              ? `Pedido ${tableOrders[0].orderNumber}`
                              : `Cuenta Consolidada (${tableOrders.length})`}
                          </span>
                          {customerName ? (
                            <p className="text-xs text-zinc-200 font-bold truncate mt-0.5">
                              {customerName}
                            </p>
                          ) : (
                            <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                              Consumo en salón
                            </p>
                          )}
                        </div>
                        <span className="text-xl font-black text-[var(--color-porkos-orange)] tracking-tight tabular-nums shrink-0">
                          {formatCurrency(tableTotal)}
                        </span>
                      </div>

                      {/* Lista rápida de productos de la mesa */}
                      {qualifyingOrders.some((o) => o.items?.length > 0) ? (() => {
                        const flattenedItems = qualifyingOrders.flatMap((order) =>
                          (order.items || []).map((item, idx) => ({
                            key: `${order.orderNumber}-${idx}`,
                            orderNumber: order.orderNumber,
                            orderModality: order.modality,
                            item,
                          }))
                        );
                        const isExpanded = Boolean(expandedTableIds[table.id]);
                        const COLLAPSE_LIMIT = 4;
                        const hiddenCount = Math.max(0, flattenedItems.length - COLLAPSE_LIMIT);
                        const visibleItems = isExpanded
                          ? flattenedItems
                          : flattenedItems.slice(0, COLLAPSE_LIMIT);

                        return (
                          <div className="flex-1 bg-[#0B0B0E]/80 px-2.5 py-2 rounded-2xl border border-zinc-800/80 text-xs flex flex-col justify-between gap-1.5">
                            <div className="divide-y divide-zinc-800/50">
                              {visibleItems.map(({ key, orderNumber, orderModality, item }) => (
                                <div
                                  key={key}
                                  className="flex justify-between items-center gap-2 py-1 first:pt-0 last:pb-0 text-zinc-300"
                                >
                                  <span className="truncate pr-1 flex items-center gap-1.5 min-w-0">
                                    {qualifyingOrders.length > 1 && (
                                      <span className="text-[9px] font-mono px-1 py-0.2 bg-zinc-800 text-[var(--color-porkos-orange)] rounded shrink-0">
                                        {orderNumber}
                                      </span>
                                    )}
                                    <span className="font-black text-white shrink-0">{item.quantity}×</span>
                                    <span className="truncate font-medium">{item.name}</span>
                                    <ItemConsumptionBadge item={item} orderModality={orderModality} />
                                  </span>
                                  <span className="font-bold text-zinc-200 tabular-nums shrink-0">
                                    {formatCurrency(item.subtotal)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {hiddenCount > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedTableIds((prev) => ({
                                    ...prev,
                                    [table.id]: !prev[table.id],
                                  }));
                                }}
                                className="w-full py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-bold text-zinc-300 hover:text-white flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    <span>Mostrar menos</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    <span>+ Ver {hiddenCount} más</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })() : pendingDeliveryOrders.length > 0 ? (
                        <div className="flex-1 py-3 px-3.5 rounded-2xl bg-blue-950/20 border border-blue-800/30 text-xs text-blue-300 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>Esperando entrega de bebidas</span>
                          </div>
                          <span className="text-[10px] font-black text-blue-400 uppercase">En barra</span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="hidden sm:flex flex-1 flex-col items-center justify-center py-5 px-3 rounded-2xl bg-[#0B0B0E]/60 border border-dashed border-zinc-800/90 text-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400/80">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-zinc-200 block">
                          Mesa disponible
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className={isOccupied ? 'pt-2.5 sm:pt-3 border-t border-zinc-800/80' : 'sm:pt-3 sm:border-t sm:border-zinc-800/80'}>
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
                        className="w-full py-2.5 sm:py-3 px-4 min-h-[40px] sm:min-h-[44px] rounded-xl text-xs sm:text-sm font-black bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-500/20 active:scale-[0.98] touch-manipulation"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Abrir Mesa</span>
                      </button>
                    )}
                  </div>
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

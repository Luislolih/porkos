import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Users,
  Bike,
  ShoppingBag,
  Package,
  Check,
  ArrowRight,
  Flame,
  LayoutGrid,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { formatTime, formatElapsedTime, isOrderDelayed } from '../../utils/formatters';
import { getItemTicketDetails } from '../../utils/ticketFormatter';
import ProductThumbnail from '../../components/ui/ProductThumbnail';
import ItemConsumptionBadge from '../../components/ui/ItemConsumptionBadge';
import EmptyState from '../../components/ui/EmptyState';
import { isProductBeverage, isProductMarket } from '../../utils/productCategories';
import { useCatalog } from '../../context/useCatalog';

export default function KitchenView({ orders = [], onUpdateOrderStatus }) {
  const { products = [] } = useCatalog();
  const [mainMode, setMainMode] = useState('COCINA'); // 'COCINA' | 'ENTREGAS'
  const [activeTab, setActiveTab] = useState('PENDIENTE'); // 'PENDIENTE' | 'PREPARANDO' | 'LISTO' | 'KANBAN'
  const [showBatchSummary, setShowBatchSummary] = useState(false);
  const [, setTick] = useState(0);

  const getItemThumbnail = (item) => {
    if (item?.thumbnailUrl) return item.thumbnailUrl;
    if (item?.image) return item.image;
    if (!products || products.length === 0) return null;
    const match = products.find(
      (p) =>
        (item?.productId && p.id === item.productId) ||
        (item?.name && p.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    return match?.thumbnailUrl || match?.image || null;
  };

  // Actualizar tiempos transcurridos en tiempo real cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const isBeverageItem = (item) => isProductBeverage(item);

  const sortByArrival = (orderList) => {
    return [...orderList].sort((a, b) => {
      const timeA = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
      if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
        return timeA - timeB;
      }
      return (a.orderNumber || '').localeCompare(b.orderNumber || '', undefined, { numeric: true });
    });
  };

  const orderRequiresKitchen = (o) => {
    return o.items?.some((i) => Boolean(i.requiresKitchen) && !isProductMarket(i));
  };

  // Pedidos activos que requieren cocina
  const activeKitchenOrders = orders.filter((o) => {
    return orderRequiresKitchen(o) && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO';
  });

  // Pedidos activos que NO requieren cocina (Solo Entrega / Despacho)
  const pendingDeliveries = sortByArrival(
    orders.filter((o) => {
      return !orderRequiresKitchen(o) && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO';
    })
  );

  const pendientes = sortByArrival(activeKitchenOrders.filter((o) => o.status === 'PENDIENTE'));
  const preparando = sortByArrival(activeKitchenOrders.filter((o) => o.status === 'PREPARANDO'));
  const listos = sortByArrival(activeKitchenOrders.filter((o) => o.status === 'LISTO'));

  // Resumen consolidado de platos para la pestaña actual (facilita agrupar cocción en hora punta)
  const batchProductionSummary = useMemo(() => {
    if (activeTab !== 'PENDIENTE' && activeTab !== 'PREPARANDO' && activeTab !== 'LISTO') {
      return [];
    }
    const counts = {};
    orders.forEach((order) => {
      if (order.status !== activeTab) return;
      const items = order.items || [];
      if (!items.some((i) => Boolean(i.requiresKitchen) && !isProductMarket(i))) return;
      items.forEach((item) => {
        if (!item.requiresKitchen || isProductMarket(item)) return;
        const name = (item.name || '').trim();
        if (!name) return;
        counts[name] = (counts[name] || 0) + Math.max(1, parseInt(item.quantity, 10) || 1);
      });
    });
    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty);
  }, [activeTab, orders]);

  const scrollToOrderCard = (orderNumber) => {
    const el = document.getElementById(`kitchen-order-${orderNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getTicketChipStyle = (type) => {
    switch (type) {
      case 'salad':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
      case 'papas':
        return 'bg-amber-500/10 text-amber-200 border-amber-500/25';
      case 'creams':
        return 'bg-orange-500/10 text-orange-200 border-orange-500/25';
      case 'packaging':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/25';
      case 'temp':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25';
      default:
        return 'bg-zinc-800/80 text-zinc-200 border-zinc-700/80';
    }
  };

  const getTicketChipPrefix = (line) => {
    switch (line.type) {
      case 'salad':
        return '🥗';
      case 'papas':
        return '🍟';
      case 'creams':
        return '🧴';
      case 'packaging':
        return '📦';
      case 'temp':
        return '';
      default:
        return `${line.label}:`;
    }
  };

  const getModalityIcon = (mod) => {
    switch (mod) {
      case 'MESA':
        return Users;
      case 'DELIVERY':
        return Bike;
      case 'PARA_LLEVAR':
        return ShoppingBag;
      case 'CONSUMO_EXTERNO':
        return Package;
      default:
        return Package;
    }
  };

  // Renderizador de Ticket de Cocina Compacto y de Alta Densidad (sin scroll interno atrapado)
  const renderOrderCard = (order, currentStatus, queueIndex) => {
    const ModalityIcon = getModalityIcon(order.modality);
    const isDelayed = isOrderDelayed(order.createdAt, 12);
    const isCritical = isOrderDelayed(order.createdAt, 18);
    const kitchenItems = order.items?.filter((item) => Boolean(item.requiresKitchen) && !isProductMarket(item)) || [];
    const beverageItems = order.items?.filter((item) => !kitchenItems.includes(item) && isBeverageItem(item)) || [];
    const otherItems = order.items?.filter((item) => !kitchenItems.includes(item) && !beverageItems.includes(item)) || [];

    return (
      <div
        id={`kitchen-order-${order.orderNumber}`}
        key={order.orderNumber}
        className={`
          scroll-mt-20 bg-[#121216] border border-l-4 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between gap-2 shadow-lg transition-colors select-none
          ${
            isCritical
              ? 'border-rose-500/50 border-l-rose-500'
              : isDelayed
              ? 'border-amber-500/45 border-l-amber-400'
              : currentStatus === 'PREPARANDO'
              ? 'border-zinc-800 border-l-[var(--color-porkos-orange)]'
              : currentStatus === 'LISTO'
              ? 'border-zinc-800 border-l-emerald-500'
              : 'border-[var(--color-porkos-border)] border-l-zinc-500 hover:border-zinc-700'
          }
        `}
      >
        {/* Cabecera Compacta en 1 línea (+ dirección si es Delivery) */}
        <div className="space-y-1.5 pb-2 border-b border-[var(--color-porkos-border)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {queueIndex !== undefined && (
                <span className="text-[11px] font-black px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                  #{queueIndex}
                </span>
              )}
              <span className="text-lg sm:text-xl font-black text-white tracking-tight shrink-0">
                {order.orderNumber}
              </span>

              {order.modality === 'PARA_LLEVAR' ? (
                <span className="text-[10px] bg-amber-500/15 text-amber-300 px-1.5 py-0.5 rounded-md font-black flex items-center gap-1 border border-amber-500/30 shrink-0">
                  <ShoppingBag className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>LLEVAR</span>
                </span>
              ) : order.modality === 'DELIVERY' ? (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded-md font-black flex items-center gap-1 border border-emerald-500/30 shrink-0">
                  <Bike className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>DELIVERY</span>
                </span>
              ) : order.modality === 'CONSUMO_EXTERNO' ? (
                <span className="text-[10px] bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded-md font-black flex items-center gap-1 border border-purple-500/30 shrink-0">
                  <Package className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>AL PASO</span>
                </span>
              ) : (
                <span className="text-[10px] bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded-md font-black flex items-center gap-1 border border-zinc-700 shrink-0">
                  <ModalityIcon className="w-3 h-3 text-[var(--color-porkos-orange)] shrink-0" />
                  <span>{order.tableName || order.modality}</span>
                </span>
              )}

              {(order.customerName || order.customer?.name) && (
                <span className="text-[11px] font-bold text-zinc-300 truncate max-w-[120px] sm:max-w-[140px]">
                  • {order.customerName || order.customer?.name}
                </span>
              )}
            </div>

            {/* Temporizador compacto */}
            <div
              className={`flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                isCritical
                  ? 'bg-rose-950/60 text-rose-300 border-rose-700 animate-pulse'
                  : isDelayed
                  ? 'bg-amber-950/50 text-amber-300 border-amber-700'
                  : 'bg-[#18181D] text-zinc-300 border-zinc-800'
              }`}
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>{formatElapsedTime(order.createdAt)}</span>
              <span className="text-zinc-500 font-normal text-[10px] hidden sm:inline">
                ({formatTime(order.createdAt)})
              </span>
            </div>
          </div>

          {/* Dirección compacta en caso de Delivery */}
          {order.modality === 'DELIVERY' && order.customer?.address && (
            <div className="text-[10px] text-emerald-200 bg-emerald-950/20 px-2 py-1 rounded-lg border border-emerald-800/40 truncate">
              📍 <span className="font-bold">{order.customer.address}</span>
              {order.customer.reference && (
                <span className="text-emerald-400/80 italic"> • Ref: {order.customer.reference}</span>
              )}
            </div>
          )}
        </div>

        {/* Lista Unificada de Platos Preparados (sin scroll interno, lectura compacta) */}
        <div className="space-y-1.5">
          {kitchenItems.length > 0 && (
            <div className="bg-[#0C0C0F] rounded-xl border border-[var(--color-porkos-border)] divide-y divide-zinc-800/70 px-2.5">
              {kitchenItems.map((item, idx) => {
                const ticketLines = getItemTicketDetails(item.customization, item).filter(
                  (line) => line.type !== 'takeout' && line.type !== 'external'
                );
                const prepChips = ticketLines.filter((l) => l.type !== 'extras' && l.type !== 'note');
                const extraLines = ticketLines.filter((l) => l.type === 'extras');
                const noteLine = ticketLines.find((l) => l.type === 'note');

                return (
                  <div key={idx} className="py-2 flex gap-2 items-start">
                    <ProductThumbnail
                      src={item.image}
                      thumbnailUrl={getItemThumbnail(item)}
                      name={item.name}
                      isBeverage={isProductBeverage(item)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0 mt-0.5"
                      iconSize="w-4 h-4"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-zinc-800 text-white border border-zinc-700 px-1.5 py-0.2 rounded-md text-xs font-black shrink-0">
                          {item.quantity}×
                        </span>
                        <h5 className="font-black text-xs sm:text-sm text-zinc-100 leading-tight">
                          {item.name}
                        </h5>
                        <ItemConsumptionBadge item={item} orderModality={order.modality} />
                      </div>

                      {/* Preparación base inline */}
                      {prepChips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          {prepChips.map((line, lIdx) => {
                            const prefix = getTicketChipPrefix(line);
                            return (
                              <span
                                key={lIdx}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-extrabold leading-none ${getTicketChipStyle(line.type)}`}
                              >
                                {prefix && <span>{prefix}</span>}
                                <span>{line.value}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Extras y Nota destacados en 1 flujo compacto */}
                      {(extraLines.length > 0 || noteLine) && (
                        <div className="flex flex-wrap items-center gap-1">
                          {extraLines.map((ext, eIdx) => (
                            <span
                              key={eIdx}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/40 text-[10px] font-black leading-none"
                            >
                              + {ext.value}
                            </span>
                          ))}
                          {noteLine && (
                            <span className="inline-flex items-center bg-amber-500/15 text-amber-300 border border-amber-500/35 px-1.5 py-0.5 rounded-md text-[10px] font-bold italic leading-tight">
                              &ldquo;{noteLine.value}&rdquo;
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bebidas asociadas a la comanda en filas compactas */}
          {beverageItems.length > 0 && (
            <div className="bg-[#0C0C0F] rounded-xl border border-cyan-900/35 divide-y divide-zinc-800/60 px-2.5">
              <div className="py-1 flex items-center gap-1 text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                <span>🥤</span>
                <span>Bebidas ({beverageItems.reduce((acc, b) => acc + (b.quantity || 1), 0)})</span>
              </div>
              {beverageItems.map((bev, bIdx) => {
                const tempBadge =
                  bev.customization?.temperature === 'HELADA'
                    ? '❄️ Helada'
                    : bev.customization?.temperature === 'SIN_HELAR'
                    ? '🌡️ Sin Helar'
                    : null;

                return (
                  <div key={bIdx} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ProductThumbnail
                        src={bev.image}
                        thumbnailUrl={getItemThumbnail(bev)}
                        name={bev.name}
                        isBeverage={true}
                        className="w-7 h-7 rounded-md shrink-0"
                        iconSize="w-3.5 h-3.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="bg-cyan-950/70 text-cyan-300 border border-cyan-800/50 px-1.5 py-0.2 rounded font-black text-[11px] shrink-0">
                            {bev.quantity}×
                          </span>
                          <span className="font-bold text-white text-xs truncate">
                            {bev.name}
                          </span>
                          <ItemConsumptionBadge item={bev} orderModality={order.modality} />
                        </div>
                        {bev.customization?.itemNotes && (
                          <p className="text-[10px] text-amber-300 italic truncate">
                            &ldquo;{bev.customization.itemNotes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {tempBadge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/80">
                          {tempBadge}
                        </span>
                      )}
                      {bev.customization?.packaging && bev.customization.packaging.price > 0 && (
                        <span className="text-[10px] text-blue-300 font-semibold">
                          📦 {bev.customization.packaging.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Otros ítems en filas compactas */}
          {otherItems.length > 0 && (
            <div className="bg-[#0C0C0F] rounded-xl border border-[var(--color-porkos-border)] divide-y divide-zinc-800/60 px-2.5">
              <div className="py-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Otros artículos ({otherItems.reduce((acc, o) => acc + (o.quantity || 1), 0)})
              </div>
              {otherItems.map((ot, otIdx) => (
                <div key={otIdx} className="py-1.5 flex items-center gap-2 text-xs">
                  <ProductThumbnail
                    src={ot.image}
                    thumbnailUrl={getItemThumbnail(ot)}
                    name={ot.name}
                    className="w-7 h-7 rounded-md shrink-0"
                    iconSize="w-3.5 h-3.5"
                  />
                  <span className="bg-zinc-800 text-zinc-200 border border-zinc-700 px-1.5 py-0.2 rounded font-black text-[11px] shrink-0">
                    {ot.quantity}×
                  </span>
                  <span className="font-bold text-white text-xs truncate">{ot.name}</span>
                  <ItemConsumptionBadge item={ot} orderModality={order.modality} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empaques / Nota de comanda */}
        {(order.packagings?.length > 0 || order.generalNotes) && (
          <div className="text-[10px] bg-[#0C0C0F] px-2.5 py-1.5 rounded-xl border border-[var(--color-porkos-border)] flex flex-wrap gap-x-3 gap-y-0.5 text-zinc-300">
            {order.packagings?.length > 0 && (
              <div>
                <strong className="text-zinc-500 uppercase">Tapers: </strong>
                <span className="font-bold text-white">
                  {order.packagings.map((p) => `${p.quantity}x ${p.name}`).join(', ')}
                </span>
              </div>
            )}
            {order.generalNotes && (
              <div className="text-amber-300">
                <strong className="text-zinc-500 uppercase">Nota: </strong>
                {order.generalNotes}
              </div>
            )}
          </div>
        )}

        {/* Botones de Cambio de Estado Táctiles Compactos */}
        <div className="pt-1.5 border-t border-[var(--color-porkos-border)] flex items-center gap-1.5">
          {currentStatus === 'PENDIENTE' && (
            <>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'PREPARANDO')}
                className="flex-1 py-2.5 px-3 min-h-[42px] rounded-xl text-xs sm:text-sm font-black bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-orange-500/20 active:scale-95 touch-manipulation"
              >
                <Flame className="w-4 h-4 fill-current shrink-0" />
                <span>Iniciar Preparación</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
                className="py-2.5 px-3 min-h-[42px] rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
                title="Despachar directamente"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>
            </>
          )}

          {currentStatus === 'PREPARANDO' && (
            <>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'LISTO')}
                className="flex-1 py-2.5 px-3 min-h-[42px] rounded-xl text-xs sm:text-sm font-black bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-sm"
              >
                <Check className="w-4 h-4 stroke-[3] text-emerald-400 shrink-0" />
                <span>Marcar como Listo</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
                className="py-2.5 px-3 min-h-[42px] rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
                title="Despachar directamente"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>
            </>
          )}

          {currentStatus === 'LISTO' && (
            <button
              type="button"
              onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
              className="w-full py-2.5 px-3 min-h-[42px] rounded-xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 touch-manipulation"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Despachar / Entregado</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Renderizador Compacto de Tarjeta de Despacho Directo (Market, Bebidas solas)
  const renderDeliveryCard = (order, queueIndex) => {
    const isDelayed = isOrderDelayed(order.createdAt, 10);
    const items = order.items || [];

    return (
      <div
        id={`kitchen-order-${order.orderNumber}`}
        key={order.orderNumber}
        className={`
          scroll-mt-20 bg-[#121216] border border-l-4 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between gap-2 shadow-lg transition-colors select-none
          ${isDelayed ? 'border-amber-500/45 border-l-amber-400' : 'border-blue-500/35 border-l-blue-500 hover:border-blue-500/60'}
        `}
      >
        {/* Cabecera Compacta */}
        <div className="space-y-1.5 pb-2 border-b border-[var(--color-porkos-border)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {queueIndex !== undefined && (
                <span className="text-[11px] font-black px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                  #{queueIndex}
                </span>
              )}
              <span className="text-lg sm:text-xl font-black text-white tracking-tight shrink-0">
                {order.orderNumber}
              </span>
              <span className="text-[10px] bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded-md font-black flex items-center gap-1 border border-blue-500/30 shrink-0">
                <Package className="w-3 h-3 text-blue-400" />
                <span>BARRA</span>
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded-md font-bold border border-zinc-700 shrink-0">
                {order.tableName || order.modality}
              </span>
              {(order.customerName || order.customer?.name) && (
                <span className="text-[11px] font-bold text-zinc-300 truncate max-w-[120px]">
                  • {order.customerName || order.customer?.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 shrink-0">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>{formatElapsedTime(order.createdAt)}</span>
            </div>
          </div>

          {order.modality === 'DELIVERY' && order.customer?.address && (
            <div className="text-[10px] text-emerald-200 bg-emerald-950/20 px-2 py-1 rounded-lg border border-emerald-800/40 truncate">
              📍 <span className="font-bold">{order.customer.address}</span>
              {order.customer.phone && <span className="text-emerald-400/80"> • Tel: {order.customer.phone}</span>}
            </div>
          )}
        </div>

        {/* Productos a Entregar (sin scroll interno) */}
        <div className="bg-[#0C0C0F] rounded-xl border border-zinc-800 divide-y divide-zinc-800/60 px-2.5">
          {items.map((item, idx) => (
            <div key={idx} className="py-1.5 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <ProductThumbnail
                  src={item.image}
                  thumbnailUrl={getItemThumbnail(item)}
                  name={item.name}
                  isBeverage={isProductBeverage(item)}
                  className="w-7 h-7 rounded-md shrink-0"
                  iconSize="w-3.5 h-3.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-black text-[11px] shrink-0">
                      {item.quantity}×
                    </span>
                    <span className="font-bold text-white text-xs truncate">
                      {item.name}
                    </span>
                    <ItemConsumptionBadge item={item} orderModality={order.modality} />
                  </div>
                  {item.customization?.itemNotes && (
                    <p className="text-[10px] text-amber-300 italic truncate">
                      &ldquo;{item.customization.itemNotes}&rdquo;
                    </p>
                  )}
                </div>
              </div>
              {item.customization?.temperature && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                  {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                </span>
              )}
            </div>
          ))}
        </div>

        {order.generalNotes && (
          <p className="text-[10px] text-amber-300 bg-amber-950/20 px-2.5 py-1.5 rounded-xl border border-amber-800/30 italic">
            Nota: {order.generalNotes}
          </p>
        )}

        {/* Botón de Despacho */}
        <div className="pt-1.5 border-t border-[var(--color-porkos-border)]">
          <button
            type="button"
            onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
            className="w-full py-2.5 px-3 min-h-[42px] rounded-xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 touch-manipulation"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>Marcar Entregado</span>
          </button>
        </div>
      </div>
    );
  };

  const currentTabOrders =
    mainMode === 'ENTREGAS'
      ? pendingDeliveries
      : activeTab === 'PENDIENTE'
      ? pendientes
      : activeTab === 'PREPARANDO'
      ? preparando
      : activeTab === 'LISTO'
      ? listos
      : [];

  return (
    <div className="space-y-3 pb-24 lg:pb-8 flex flex-col">
      {/* Barra Superior de Despacho */}
      <div className="bg-[#121215] p-2 sm:p-2.5 rounded-2xl border border-[var(--color-porkos-border)] flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-sm">
        {/* Selector de Modo Principal: Cocina vs Entregas */}
        <div className="flex items-center gap-1.5 bg-[#0C0C0F] p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setMainMode('COCINA')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap active:scale-95 touch-manipulation ${
              mainMode === 'COCINA'
                ? 'bg-[var(--color-porkos-orange)] text-zinc-950 shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 shrink-0" />
            <span>Cocina</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                mainMode === 'COCINA' ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {activeKitchenOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainMode('ENTREGAS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap active:scale-95 touch-manipulation ${
              mainMode === 'ENTREGAS'
                ? 'bg-blue-500 text-zinc-950 shadow-md shadow-blue-500/20'
                : pendingDeliveries.length > 0
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Entregas Barra</span>
            {pendingDeliveries.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  mainMode === 'ENTREGAS' ? 'bg-zinc-950 text-white' : 'bg-blue-500 text-zinc-950'
                }`}
              >
                {pendingDeliveries.length}
              </span>
            )}
          </button>
        </div>

        {/* Pestañas de Cocina */}
        {mainMode === 'COCINA' && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('PENDIENTE')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border active:scale-95 touch-manipulation ${
                activeTab === 'PENDIENTE'
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Pendientes</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-zinc-700 text-white">
                {pendientes.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PREPARANDO')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border active:scale-95 touch-manipulation ${
                activeTab === 'PREPARANDO'
                  ? 'bg-zinc-800 text-white border-[var(--color-porkos-orange)] shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
              <span>Preparando</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-[var(--color-porkos-orange)] text-zinc-950">
                {preparando.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('LISTO')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border active:scale-95 touch-manipulation ${
                activeTab === 'LISTO'
                  ? 'bg-zinc-800 text-white border-emerald-500 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
              <span>Listos</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-500/30 text-emerald-300">
                {listos.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('KANBAN')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border active:scale-95 touch-manipulation ${
                activeTab === 'KANBAN'
                  ? 'bg-zinc-800 text-white border-zinc-600'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
              }`}
              title="Vista en 3 columnas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tablero KDS</span>
            </button>
          </div>
        )}

        {/* Resumen Total */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Total en curso:</span>
          <strong className="text-white bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-lg font-black">
            {activeKitchenOrders.length + pendingDeliveries.length}
          </strong>
        </div>
      </div>

      {/* Tira rápida: Resumen de Producción + Salto directo entre comandas */}
      {(batchProductionSummary.length > 0 || currentTabOrders.length >= 3) && (
        <div className="bg-[#121215] px-2.5 py-2 rounded-xl border border-[var(--color-porkos-border)] space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {currentTabOrders.length >= 2 && (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
                  Ir a:
                </span>
                {currentTabOrders.map((o, idx) => (
                  <button
                    key={o.orderNumber}
                    type="button"
                    onClick={() => scrollToOrderCard(o.orderNumber)}
                    className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-[11px] font-black text-zinc-200 whitespace-nowrap shrink-0 cursor-pointer active:scale-95 transition-all"
                  >
                    <span className="text-zinc-500 mr-1">#{idx + 1}</span>
                    <span>{o.orderNumber}</span>
                    {o.tableName && (
                      <span className="text-[10px] text-[var(--color-porkos-orange)] ml-1 font-bold">
                        ({o.tableName})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {batchProductionSummary.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBatchSummary((v) => !v)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-bold text-zinc-300 hover:text-white cursor-pointer shrink-0 ml-auto"
              >
                <Layers className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                <span>Resumen platos ({batchProductionSummary.reduce((a, b) => a + b.qty, 0)})</span>
                {showBatchSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {showBatchSummary && batchProductionSummary.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-zinc-800/80">
              {batchProductionSummary.map((item) => (
                <span
                  key={item.name}
                  className="inline-flex items-center gap-1 bg-[#0C0C0F] border border-zinc-800 px-2 py-1 rounded-lg text-[11px]"
                >
                  <strong className="text-[var(--color-porkos-orange)] font-black">{item.qty}×</strong>
                  <span className="text-zinc-200 font-bold">{item.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contenido Principal (scroll único fluido del viewport) */}
      <div>
        {mainMode === 'COCINA' && (
          <>
            {/* PENDIENTES */}
            {activeTab === 'PENDIENTE' && (
              <div>
                {pendientes.length === 0 ? (
                  <EmptyState
                    icon={ChefHat}
                    title="No hay comandas pendientes"
                    description="Los nuevos pedidos registrados desde Ventas aparecerán aquí ordenados por llegada."
                    className="my-12 max-w-lg mx-auto"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-start">
                    {pendientes.map((order, idx) => renderOrderCard(order, 'PENDIENTE', idx + 1))}
                  </div>
                )}
              </div>
            )}

            {/* PREPARANDO */}
            {activeTab === 'PREPARANDO' && (
              <div>
                {preparando.length === 0 ? (
                  <EmptyState
                    icon={Flame}
                    title="No hay pedidos en preparación"
                    description="Selecciona una comanda de 'Pendientes' para iniciar su preparación en cocina."
                    className="my-12 max-w-lg mx-auto"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-start">
                    {preparando.map((order, idx) => renderOrderCard(order, 'PREPARANDO', idx + 1))}
                  </div>
                )}
              </div>
            )}

            {/* LISTOS */}
            {activeTab === 'LISTO' && (
              <div>
                {listos.length === 0 ? (
                  <EmptyState
                    icon={Check}
                    title="No hay platos listos esperando despacho"
                    description="Al terminar una preparación, márcala como lista para despacharla al salón o empaque."
                    className="my-12 max-w-lg mx-auto"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-start">
                    {listos.map((order, idx) => renderOrderCard(order, 'LISTO', idx + 1))}
                  </div>
                )}
              </div>
            )}

            {/* TABLERO KANBAN */}
            {activeTab === 'KANBAN' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                <div className="bg-[#121215] border border-[var(--color-porkos-border)] rounded-2xl flex flex-col">
                  <div className="p-3 border-b border-[var(--color-porkos-border)] flex items-center justify-between bg-[#15151A] rounded-t-2xl sticky top-14 z-10">
                    <span className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" /> Pendientes ({pendientes.length})
                    </span>
                  </div>
                  <div className="p-2.5 space-y-2.5">
                    {pendientes.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-10 italic">Sin comandas pendientes</p>
                    ) : (
                      pendientes.map((order, idx) => renderOrderCard(order, 'PENDIENTE', idx + 1))
                    )}
                  </div>
                </div>

                <div className="bg-[#121215] border border-[var(--color-porkos-border)] rounded-2xl flex flex-col">
                  <div className="p-3 border-b border-[var(--color-porkos-border)] flex items-center justify-between bg-[#15151A] rounded-t-2xl sticky top-14 z-10">
                    <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" /> Preparando ({preparando.length})
                    </span>
                  </div>
                  <div className="p-2.5 space-y-2.5">
                    {preparando.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-10 italic">Sin comandas en preparación</p>
                    ) : (
                      preparando.map((order, idx) => renderOrderCard(order, 'PREPARANDO', idx + 1))
                    )}
                  </div>
                </div>

                <div className="bg-[#121215] border border-[var(--color-porkos-border)] rounded-2xl flex flex-col">
                  <div className="p-3 border-b border-[var(--color-porkos-border)] flex items-center justify-between bg-[#15151A] rounded-t-2xl sticky top-14 z-10">
                    <span className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> Listos ({listos.length})
                    </span>
                  </div>
                  <div className="p-2.5 space-y-2.5">
                    {listos.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-10 italic">Sin comandas listas</p>
                    ) : (
                      listos.map((order, idx) => renderOrderCard(order, 'LISTO', idx + 1))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODO 2: ENTREGAS BARRA */}
        {mainMode === 'ENTREGAS' && (
          <div>
            {pendingDeliveries.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No hay entregas pendientes"
                description="Los pedidos directos de bebidas, postres y snacks que no requieren cocina aparecerán aquí para entrega inmediata."
                className="my-12 max-w-lg mx-auto"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-start">
                {pendingDeliveries.map((order, idx) => renderDeliveryCard(order, idx + 1))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

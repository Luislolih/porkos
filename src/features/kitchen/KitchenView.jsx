import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { formatTime, formatElapsedTime, isOrderDelayed } from '../../utils/formatters';
import { getItemTicketDetails } from '../../utils/ticketFormatter';
import ProductThumbnail from '../../components/ui/ProductThumbnail';
import ItemConsumptionBadge from '../../components/ui/ItemConsumptionBadge';
import EmptyState from '../../components/ui/EmptyState';
import { isProductBeverage, isProductMarket } from '../../utils/productCategories';

export default function KitchenView({ orders = [], onUpdateOrderStatus }) {
  const [mainMode, setMainMode] = useState('COCINA'); // 'COCINA' | 'ENTREGAS'
  const [activeTab, setActiveTab] = useState('PENDIENTE'); // 'PENDIENTE' | 'PREPARANDO' | 'LISTO' | 'KANBAN'
  const [, setTick] = useState(0);

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

  // Renderizador de Ticket de Cocina de Alta Visibilidad
  const renderOrderCard = (order, currentStatus, queueIndex) => {
    const ModalityIcon = getModalityIcon(order.modality);
    const isDelayed = isOrderDelayed(order.createdAt, 12);
    const isCritical = isOrderDelayed(order.createdAt, 18);
    const kitchenItems = order.items?.filter((item) => Boolean(item.requiresKitchen) && !isProductMarket(item)) || [];
    const beverageItems = order.items?.filter((item) => !kitchenItems.includes(item) && isBeverageItem(item)) || [];
    const otherItems = order.items?.filter((item) => !kitchenItems.includes(item) && !beverageItems.includes(item)) || [];

    return (
      <div
        key={order.orderNumber}
        className={`
          bg-[#121216] border-2 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between gap-3.5 shadow-xl transition-all select-none
          ${
            isCritical
              ? 'border-rose-500/80 ring-2 ring-rose-500/30'
              : isDelayed
              ? 'border-amber-500/70 ring-2 ring-amber-500/20'
              : currentStatus === 'PREPARANDO'
              ? 'border-[var(--color-porkos-orange)]/60 ring-1 ring-orange-500/20'
              : currentStatus === 'LISTO'
              ? 'border-emerald-500/60 ring-1 ring-emerald-500/20'
              : 'border-[var(--color-porkos-border)] hover:border-zinc-700'
          }
        `}
      >
        {/* Cabecera del Ticket: Turno, Código y Cronómetro */}
        <div className="space-y-2 pb-2.5 border-b border-[var(--color-porkos-border)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {queueIndex !== undefined && (
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                  #{queueIndex}
                </span>
              )}
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                {order.orderNumber}
              </span>
            </div>

            {/* Temporizador */}
            <div
              className={`flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-xl border shrink-0 ${
                isCritical
                  ? 'bg-rose-950/60 text-rose-300 border-rose-700 animate-pulse'
                  : isDelayed
                  ? 'bg-amber-950/50 text-amber-300 border-amber-700'
                  : 'bg-[#18181D] text-zinc-300 border-zinc-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{formatElapsedTime(order.createdAt)}</span>
              <span className="text-zinc-500 font-normal text-[10px] ml-0.5 hidden sm:inline">
                ({formatTime(order.createdAt)})
              </span>
            </div>
          </div>

          {/* Modalidad y Nombre de Cliente */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {order.modality === 'PARA_LLEVAR' ? (
              <span className="text-xs bg-amber-500/15 text-amber-300 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-amber-500/30">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>PARA LLEVAR</span>
              </span>
            ) : order.modality === 'DELIVERY' ? (
              <span className="text-xs bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-emerald-500/30">
                <Bike className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>DELIVERY</span>
              </span>
            ) : order.modality === 'CONSUMO_EXTERNO' ? (
              <span className="text-xs bg-purple-500/15 text-purple-300 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-purple-500/30">
                <Package className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>IR COMIENDO</span>
              </span>
            ) : (
              <span className="text-xs bg-zinc-800 text-zinc-100 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-zinc-700">
                <ModalityIcon className="w-3.5 h-3.5 text-[var(--color-porkos-orange)] shrink-0" />
                <span>{order.tableName || order.modality}</span>
              </span>
            )}

            {(order.customerName || order.customer?.name) && (
              <span className="text-xs font-extrabold text-zinc-300 truncate max-w-[150px]">
                {order.customerName || order.customer?.name}
              </span>
            )}
          </div>

          {/* Dirección en caso de Delivery */}
          {order.modality === 'DELIVERY' && order.customer?.address && (
            <div className="text-[11px] text-emerald-200 bg-emerald-950/20 px-2.5 py-1 rounded-xl border border-emerald-800/40 space-y-0.5">
              <div className="font-bold flex items-center gap-1 truncate">
                <span>📍</span>
                <span className="truncate">{order.customer.address}</span>
              </div>
              {order.customer.reference && (
                <div className="text-[10px] text-emerald-400/80 italic truncate">
                  Ref: {order.customer.reference}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista de Platos Preparados */}
        <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-0.5 scrollbar-none">
          {kitchenItems.map((item, idx) => {
            const ticketLines = getItemTicketDetails(item.customization);

            return (
              <div
                key={idx}
                className="bg-[#0C0C0F] p-3 rounded-2xl border border-[var(--color-porkos-border)] flex gap-3 items-start"
              >
                <ProductThumbnail
                  src={item.image}
                  name={item.name}
                  isBeverage={isProductBeverage(item)}
                  className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl"
                  iconSize="w-6 h-6"
                />

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-zinc-800 text-white border border-zinc-700 px-2 py-0.5 rounded-lg text-xs sm:text-sm font-black shrink-0">
                      {item.quantity}×
                    </span>
                    <h5 className="font-black text-sm sm:text-base text-zinc-100 leading-snug truncate">
                      {item.name}
                    </h5>
                    <ItemConsumptionBadge item={item} orderModality={order.modality} />
                  </div>

                  {ticketLines.length > 0 && (
                    <div className="space-y-1 pt-1 text-xs leading-snug">
                      {ticketLines.map((line, lIdx) => (
                        <div key={lIdx} className="flex items-baseline gap-1.5 text-zinc-300">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">
                            {line.label}:
                          </span>
                          {line.type === 'note' ? (
                            <span className="inline-block bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md text-[11px] font-bold italic">
                              &ldquo;{line.value}&rdquo;
                            </span>
                          ) : (
                            <span className="font-extrabold text-zinc-100 text-xs">
                              {line.value}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bebidas asociadas a la comanda */}
          {beverageItems.length > 0 && (
            <div className="space-y-1.5 bg-[#0C0C0F] p-2.5 rounded-2xl border border-[var(--color-porkos-border)]">
              <span className="text-[10px] font-black text-cyan-300 uppercase tracking-wider block">
                Bebidas del Pedido
              </span>

              <div className="space-y-1.5">
                {beverageItems.map((bev, bIdx) => {
                  const tempBadge =
                    bev.customization?.temperature === 'HELADA'
                      ? '❄️ Helada'
                      : bev.customization?.temperature === 'SIN_HELAR'
                      ? '🌡️ Sin Helar'
                      : null;

                  return (
                    <div
                      key={bIdx}
                      className="bg-[#141418] p-2 rounded-xl border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="bg-zinc-800 text-white border border-zinc-700 px-1.5 py-0.2 rounded font-black text-xs shrink-0">
                          {bev.quantity}×
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate text-xs">
                            {bev.name}
                          </p>
                          {bev.customization?.itemNotes && (
                            <p className="text-[10px] text-amber-300 italic truncate">
                              &ldquo;{bev.customization.itemNotes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {tempBadge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/80">
                            {tempBadge}
                          </span>
                        )}
                        {bev.customization?.packaging && bev.customization.packaging.price > 0 && (
                          <span className="text-[10px] text-zinc-400 font-medium">
                            📦 {bev.customization.packaging.name}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Otros ítems */}
          {otherItems.length > 0 && (
            <div className="p-2.5 rounded-xl bg-[#0C0C0F] border border-[var(--color-porkos-border)] space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                Otros artículos a entregar:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {otherItems.map((ot, otIdx) => (
                  <span
                    key={otIdx}
                    className="text-xs bg-zinc-900 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-md font-bold"
                  >
                    {ot.quantity}× {ot.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empaques / Nota de comanda */}
        {(order.packagings?.length > 0 || order.generalNotes) && (
          <div className="text-[11px] bg-[#0C0C0F] p-2.5 rounded-xl border border-[var(--color-porkos-border)] space-y-1 text-zinc-300">
            {order.packagings?.length > 0 && (
              <div>
                <strong className="text-zinc-500 uppercase text-[10px]">Tapers: </strong>
                <span className="font-bold text-white">
                  {order.packagings.map((p) => `${p.quantity}x ${p.name}`).join(', ')}
                </span>
              </div>
            )}
            {order.generalNotes && (
              <div className="text-amber-300">
                <strong className="text-zinc-500 uppercase text-[10px]">Nota: </strong> {order.generalNotes}
              </div>
            )}
          </div>
        )}

        {/* Botones de Cambio de Estado Táctiles */}
        <div className="pt-2 border-t border-[var(--color-porkos-border)] flex items-center gap-2">
          {currentStatus === 'PENDIENTE' && (
            <>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'PREPARANDO')}
                className="flex-1 py-3.5 px-3 min-h-[48px] rounded-xl text-xs sm:text-sm font-black bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-500/20 active:scale-95 touch-manipulation"
              >
                <Flame className="w-4 h-4 fill-current shrink-0" />
                <span>Iniciar Preparación</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
                className="py-3 px-3.5 min-h-[48px] rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
                title="Despachar directamente"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </button>
            </>
          )}

          {currentStatus === 'PREPARANDO' && (
            <>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'LISTO')}
                className="flex-1 py-3.5 px-3 min-h-[48px] rounded-xl text-xs sm:text-sm font-black bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-sm"
              >
                <Check className="w-4 h-4 stroke-[3] text-emerald-400 shrink-0" />
                <span>Marcar como Listo</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
                className="py-3 px-3.5 min-h-[48px] rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
                title="Despachar directamente"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </button>
            </>
          )}

          {currentStatus === 'LISTO' && (
            <button
              type="button"
              onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
              className="w-full py-3.5 px-3 min-h-[48px] rounded-xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 touch-manipulation"
            >
              <CheckCircle2 className="w-5 h-5 stroke-[2.5] shrink-0" />
              <span>Despachar / Entregado</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Renderizador de Tarjeta de Despacho Directo (Market, Bebidas solas)
  const renderDeliveryCard = (order, queueIndex) => {
    const isDelayed = isOrderDelayed(order.createdAt, 10);
    const items = order.items || [];

    return (
      <div
        key={order.orderNumber}
        className={`
          bg-[#121216] border-2 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between gap-3.5 shadow-xl transition-all select-none
          ${isDelayed ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-blue-500/40 hover:border-blue-500/70'}
        `}
      >
        {/* Cabecera del Ticket */}
        <div className="space-y-2 pb-2.5 border-b border-[var(--color-porkos-border)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {queueIndex !== undefined && (
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                  #{queueIndex}
                </span>
              )}
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                {order.orderNumber}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 shrink-0">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatElapsedTime(order.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs bg-blue-500/15 text-blue-300 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-blue-500/30">
                <Package className="w-3.5 h-3.5 text-blue-400" />
                <span>SOLO ENTREGA</span>
              </span>
              <span className="text-xs bg-zinc-800 text-zinc-200 px-2.5 py-1 rounded-lg font-bold border border-zinc-700">
                {order.tableName || order.modality}
              </span>
            </div>

            {(order.customerName || order.customer?.name) && (
              <span className="text-xs font-bold text-zinc-300 truncate max-w-[150px]">
                {order.customerName || order.customer?.name}
              </span>
            )}
          </div>

          {order.modality === 'DELIVERY' && order.customer?.address && (
            <div className="text-[11px] text-emerald-200 bg-emerald-950/20 px-2.5 py-1 rounded-xl border border-emerald-800/40">
              <div className="font-bold truncate">📍 {order.customer.address}</div>
              {order.customer.phone && <div className="text-[10px] text-emerald-400/80">Tel: {order.customer.phone}</div>}
            </div>
          )}
        </div>

        {/* Productos a Entregar */}
        <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-0.5 scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
            Artículos para entregar al cliente:
          </span>
          <div className="space-y-1.5">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#0C0C0F] p-2.5 rounded-xl border border-zinc-800 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-black text-xs shrink-0">
                    {item.quantity}×
                  </span>
                  <span className="font-bold text-white text-xs truncate">
                    {item.name}
                  </span>
                  <ItemConsumptionBadge item={item} orderModality={order.modality} />
                </div>
                {item.customization?.temperature && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
                    {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                  </span>
                )}
              </div>
            ))}
          </div>
          {order.generalNotes && (
            <p className="text-[11px] text-amber-300 bg-amber-950/20 p-2.5 rounded-xl border border-amber-800/30 italic">
              Nota: {order.generalNotes}
            </p>
          )}
        </div>

        {/* Botón de Despacho */}
        <div className="pt-2 border-t border-[var(--color-porkos-border)]">
          <button
            type="button"
            onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
            className="w-full py-3.5 px-3 min-h-[48px] rounded-xl text-xs sm:text-sm font-black bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95 touch-manipulation"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5] shrink-0" />
            <span>Marcar Entregado</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 pb-20 lg:pb-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Barra Superior de Despacho */}
      <div className="bg-[#121215] p-2.5 sm:p-3 rounded-2xl border border-[var(--color-porkos-border)] flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-sm">
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

      {/* Contenido Principal */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {mainMode === 'COCINA' && (
          <>
            {/* PENDIENTES */}
            {activeTab === 'PENDIENTE' && (
              <div className="h-full">
                {pendientes.length === 0 ? (
                  <EmptyState
                    icon={ChefHat}
                    title="No hay comandas pendientes"
                    description="Los nuevos pedidos registrados desde Ventas aparecerán aquí ordenados por llegada."
                    className="my-12 max-w-lg mx-auto"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 items-start">
                    {pendientes.map((order, idx) => renderOrderCard(order, 'PENDIENTE', idx + 1))}
                  </div>
                )}
              </div>
            )}

            {/* PREPARANDO */}
            {activeTab === 'PREPARANDO' && (
              <div className="h-full">
                {preparando.length === 0 ? (
                  <EmptyState
                    icon={Flame}
                    title="No hay pedidos en preparación"
                    description="Selecciona una comanda de 'Pendientes' para iniciar su preparación en cocina."
                    className="my-12 max-w-lg mx-auto"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 items-start">
                    {preparando.map((order, idx) => renderOrderCard(order, 'PREPARANDO', idx + 1))}
                  </div>
                )}
              </div>
            )}

            {/* LISTOS */}
            {activeTab === 'LISTO' && (
              <div className="h-full">
                {listos.length === 0 ? (
                  <EmptyState
                    icon={Check}
                    title="No hay platos listos esperando despacho"
                    description="Al terminar una preparación, márcala como lista para despacharla al salón o empaque."
                    className="my-12 max-w-lg mx-auto"
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 items-start">
                    {listos.map((order, idx) => renderOrderCard(order, 'LISTO', idx + 1))}
                  </div>
                )}
              </div>
            )}

            {/* TABLERO KANBAN */}
            {activeTab === 'KANBAN' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 h-full items-start">
                <div className="bg-[#121215] border border-[var(--color-porkos-border)] rounded-2xl flex flex-col max-h-full">
                  <div className="p-3.5 border-b border-[var(--color-porkos-border)] flex items-center justify-between bg-[#15151A] rounded-t-2xl">
                    <span className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" /> Pendientes ({pendientes.length})
                    </span>
                  </div>
                  <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-none">
                    {pendientes.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-10 italic">Sin comandas pendientes</p>
                    ) : (
                      pendientes.map((order, idx) => renderOrderCard(order, 'PENDIENTE', idx + 1))
                    )}
                  </div>
                </div>

                <div className="bg-[#121215] border border-[var(--color-porkos-border)] rounded-2xl flex flex-col max-h-full">
                  <div className="p-3.5 border-b border-[var(--color-porkos-border)] flex items-center justify-between bg-[#15151A] rounded-t-2xl">
                    <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" /> Preparando ({preparando.length})
                    </span>
                  </div>
                  <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-none">
                    {preparando.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-10 italic">Sin comandas en preparación</p>
                    ) : (
                      preparando.map((order, idx) => renderOrderCard(order, 'PREPARANDO', idx + 1))
                    )}
                  </div>
                </div>

                <div className="bg-[#121215] border border-[var(--color-porkos-border)] rounded-2xl flex flex-col max-h-full">
                  <div className="p-3.5 border-b border-[var(--color-porkos-border)] flex items-center justify-between bg-[#15151A] rounded-t-2xl">
                    <span className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> Listos ({listos.length})
                    </span>
                  </div>
                  <div className="p-3 overflow-y-auto space-y-3 flex-1 scrollbar-none">
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
          <div className="h-full">
            {pendingDeliveries.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No hay entregas pendientes"
                description="Los pedidos directos de bebidas, postres y snacks que no requieren cocina aparecerán aquí para entrega inmediata."
                className="my-12 max-w-lg mx-auto"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 items-start">
                {pendingDeliveries.map((order, idx) => renderDeliveryCard(order, idx + 1))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

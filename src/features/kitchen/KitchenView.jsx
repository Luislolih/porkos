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
} from 'lucide-react';
import { formatTime, formatElapsedTime, isOrderDelayed } from '../../utils/formatters';
import { getItemTicketDetails } from '../../utils/ticketFormatter';
import ProductThumbnail from '../../components/ui/ProductThumbnail';
import { isProductBeverage } from '../../utils/productCategories';

export default function KitchenView({ orders = [], onUpdateOrderStatus }) {
  const [activeTab, setActiveTab] = useState('PENDIENTE');
  const [, setTick] = useState(0);

  // Actualizar tiempos transcurridos en tiempo real cada 15 segundos
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(timer);
  }, []);

  // Identificador de bebidas / refrescos para entrega en cocina y despacho
  const isBeverageItem = (item) => isProductBeverage(item);

  // Filtrar pedidos que tengan productos que requieran cocina y no estén cancelados ni entregados
  const activeKitchenOrders = orders.filter((o) => {
    const hasKitchenItems = o.items?.some((i) => i.requiresKitchen);
    return hasKitchenItems && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO';
  });

  // Ordenar comandas de cocina por orden de llegada (FIFO: Primero en llegar, primero en atender)
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

  // Renderizador de cada ticket de cocina con indicación clara del turno de llegada
  const renderOrderCard = (order, currentStatus, queueIndex) => {
    const ModalityIcon = getModalityIcon(order.modality);
    const isDelayed = isOrderDelayed(order.createdAt, 12);
    const kitchenItems = order.items?.filter((item) => item.requiresKitchen) || [];
    const beverageItems = order.items?.filter((item) => !item.requiresKitchen && isBeverageItem(item)) || [];
    const otherItems = order.items?.filter((item) => !item.requiresKitchen && !isBeverageItem(item)) || [];

    return (
      <div
        key={order.orderNumber}
        className={`
          bg-[#141414] border rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-3 shadow-lg transition-all
          ${
            currentStatus === 'PREPARANDO'
              ? 'border-amber-500/40 ring-1 ring-amber-500/20'
              : currentStatus === 'LISTO'
              ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
              : isDelayed
              ? 'border-rose-500/40 ring-1 ring-rose-500/20'
              : 'border-zinc-800/90 hover:border-zinc-700'
          }
        `}
      >
        {/* Cabecera del Ticket: Turno en cola, Código de Comanda y Tiempo */}
        <div className="space-y-2 pb-2.5 border-b border-zinc-800/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {queueIndex !== undefined && (
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/80 shrink-0">
                  #{queueIndex}
                </span>
              )}
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {order.orderNumber}
              </span>
            </div>

            {/* Temporizador */}
            <div
              className={`flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
                isDelayed
                  ? 'bg-rose-950/40 text-rose-300 border-rose-800/80'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatElapsedTime(order.createdAt)}</span>
              <span className="text-zinc-500 font-normal text-[10px] ml-0.5 hidden sm:inline">
                ({formatTime(order.createdAt)})
              </span>
            </div>
          </div>

          {/* Modalidad y Nombre de Cliente */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {order.modality === 'PARA_LLEVAR' ? (
              <span className="text-xs bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-amber-500/30">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>PARA LLEVAR</span>
              </span>
            ) : order.modality === 'DELIVERY' ? (
              <span className="text-xs bg-emerald-500/10 text-emerald-300 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-emerald-500/30">
                <Bike className="w-3.5 h-3.5 text-emerald-400" />
                <span>DELIVERY</span>
              </span>
            ) : order.modality === 'CONSUMO_EXTERNO' ? (
              <span className="text-xs bg-purple-500/10 text-purple-300 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-purple-500/30">
                <Package className="w-3.5 h-3.5 text-purple-400" />
                <span>IR COMIENDO</span>
              </span>
            ) : (
              <span className="text-xs bg-zinc-800 text-zinc-200 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-zinc-700">
                <ModalityIcon className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                <span>{order.tableName || order.modality}</span>
              </span>
            )}

            {(order.customerName || order.customer?.name) && (
              <span className="text-xs font-bold text-zinc-300 truncate max-w-[150px]">
                {order.customerName || order.customer?.name}
              </span>
            )}
          </div>

          {/* Dirección en caso de Delivery */}
          {order.modality === 'DELIVERY' && order.customer?.address && (
            <div className="text-[11px] text-emerald-200 bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-800/40 space-y-0.5">
              <div className="font-semibold flex items-center gap-1">
                <span>📍</span>
                <span className="truncate">{order.customer.address}</span>
              </div>
              {order.customer.reference && (
                <div className="text-[10px] text-emerald-400/80 italic">
                  Ref: {order.customer.reference} {order.customer.phone ? `• Tel: ${order.customer.phone}` : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista de Productos y Bebidas */}
        <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-0.5">
          {/* 1. Platos preparados en cocina */}
          {kitchenItems.map((item, idx) => {
            const ticketLines = getItemTicketDetails(item.customization);

            return (
              <div
                key={idx}
                className="bg-black/40 p-2.5 rounded-xl border border-zinc-800/80 flex gap-3 items-start"
              >
                {/* Vista Previa Visual del Producto */}
                <ProductThumbnail
                  src={item.image}
                  name={item.name}
                  isBeverage={isProductBeverage(item)}
                  className="w-13 h-13 sm:w-14 sm:h-14"
                  iconSize="w-6 h-6"
                />

                {/* Nombre y Especificaciones Limpias (1º Ensalada, 2º Papas, 3º Cremas) */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="bg-zinc-800 text-white border border-zinc-700 px-1.5 py-0.2 rounded text-xs font-black shrink-0">
                      {item.quantity}×
                    </span>
                    <h5 className="font-extrabold text-sm text-white leading-tight truncate">
                      {item.name}
                    </h5>
                  </div>

                  {ticketLines.length > 0 && (
                    <div className="space-y-1 pt-1 text-xs leading-snug">
                      {ticketLines.map((line, lIdx) => (
                        <div key={lIdx} className="flex items-baseline gap-1.5 text-zinc-300">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">
                            {line.label}:
                          </span>
                          {line.type === 'note' ? (
                            <span className="inline-block bg-amber-500/10 text-amber-300/90 border border-amber-500/20 px-1.5 py-0.2 rounded text-[11px] font-medium italic">
                              &ldquo;{line.value}&rdquo;
                            </span>
                          ) : (
                            <span className="font-bold text-zinc-100 text-xs">
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

          {/* 2. Bebidas a Entregar (Coordinación de despacho para cocina / salón) */}
          {beverageItems.length > 0 && (
            <div className="space-y-1.5 bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Bebidas
                </span>
              </div>

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
                      className="bg-black/60 p-2 rounded-lg border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="bg-zinc-800 text-white border border-zinc-700 px-1.5 py-0.2 rounded font-black text-xs shrink-0">
                          {bev.quantity}×
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-white truncate text-xs leading-tight">
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
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/80">
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

          {/* 3. Otros artículos de market o acompañamientos */}
          {otherItems.length > 0 && (
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1">
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
          <div className="text-[11px] bg-black/40 p-2 rounded-xl border border-zinc-800/80 space-y-0.5 text-zinc-300">
            {order.packagings?.length > 0 && (
              <div>
                <strong className="text-zinc-500">Tapers: </strong>
                <span className="font-semibold text-white">
                  {order.packagings.map((p) => `${p.quantity}x ${p.name}`).join(', ')}
                </span>
              </div>
            )}
            {order.generalNotes && (
              <div className="text-amber-300">
                <strong>Nota general:</strong> {order.generalNotes}
              </div>
            )}
          </div>
        )}

        {/* Botón de Avance de Estado */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
          {currentStatus === 'PENDIENTE' && (
            <>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'PREPARANDO')}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>Iniciar Preparación</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-98"
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
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <Check className="w-4 h-4 stroke-[3] text-emerald-400" />
                <span>Marcar como Listo</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.orderNumber, 'ENTREGADO')}
                className="py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-all cursor-pointer active:scale-98"
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
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer border border-zinc-700 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Despachar / Entregado</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 pb-20 lg:pb-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Barra Superior de Cocina: Pestañas de Estado con Contadores Discretos */}
      <div className="bg-[var(--color-porkos-surface)] p-2 rounded-2xl border border-[var(--color-porkos-border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {/* PENDIENTES */}
          <button
            type="button"
            onClick={() => setActiveTab('PENDIENTE')}
            className={`
              flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border
              ${
                activeTab === 'PENDIENTE'
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
              }
            `}
          >
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>PENDIENTES</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'PENDIENTE' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {pendientes.length}
            </span>
          </button>

          {/* PREPARANDO */}
          <button
            type="button"
            onClick={() => setActiveTab('PREPARANDO')}
            className={`
              flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border
              ${
                activeTab === 'PREPARANDO'
                  ? 'bg-zinc-800 text-white border-[var(--color-porkos-orange)] shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
              }
            `}
          >
            <Flame className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
            <span>EN PREPARACIÓN</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'PREPARANDO'
                  ? 'bg-[var(--color-porkos-orange)] text-black'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {preparando.length}
            </span>
          </button>

          {/* LISTOS */}
          <button
            type="button"
            onClick={() => setActiveTab('LISTO')}
            className={`
              flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border
              ${
                activeTab === 'LISTO'
                  ? 'bg-zinc-800 text-white border-emerald-500/60 shadow-sm'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
              }
            `}
          >
            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
            <span>LISTOS PARA DESPACHO</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === 'LISTO' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {listos.length}
            </span>
          </button>

          {/* VISTA KANBAN */}
          <button
            type="button"
            onClick={() => setActiveTab('KANBAN')}
            className={`
              hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap border
              ${
                activeTab === 'KANBAN'
                  ? 'bg-zinc-800 text-white border-zinc-600'
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-white border-zinc-800'
              }
            `}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Ver Tablero 3 Columnas</span>
          </button>
        </div>

        {/* Resumen */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
          <span>En cocina:</span>
          <strong className="text-white bg-zinc-800 px-2 py-0.5 rounded font-bold">
            {activeKitchenOrders.length} pedidos
          </strong>
        </div>
      </div>

      {/* Contenido Principal con Máximo Espacio Vertical */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* VISTA POR PESTAÑA: PENDIENTES */}
        {activeTab === 'PENDIENTE' && (
          <div className="h-full">
            {pendientes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-16">
                <Clock className="w-10 h-10 mb-2 opacity-30 text-zinc-400" />
                <h4 className="font-bold text-sm text-zinc-300">No hay comandas pendientes</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Los nuevos pedidos de comida aparecerán aquí</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 items-start">
                {pendientes.map((order, idx) => renderOrderCard(order, 'PENDIENTE', idx + 1))}
              </div>
            )}
          </div>
        )}

        {/* VISTA POR PESTAÑA: EN PREPARACIÓN */}
        {activeTab === 'PREPARANDO' && (
          <div className="h-full">
            {preparando.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-16">
                <Flame className="w-10 h-10 mb-2 opacity-30 text-zinc-400" />
                <h4 className="font-bold text-sm text-zinc-300">No hay pedidos en preparación</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Selecciona una comanda de &quot;Pendientes&quot; para iniciarla</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 items-start">
                {preparando.map((order, idx) => renderOrderCard(order, 'PREPARANDO', idx + 1))}
              </div>
            )}
          </div>
        )}

        {/* VISTA POR PESTAÑA: LISTOS */}
        {activeTab === 'LISTO' && (
          <div className="h-full">
            {listos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 py-16">
                <Check className="w-10 h-10 mb-2 opacity-30 text-zinc-400 stroke-[3]" />
                <h4 className="font-bold text-sm text-zinc-300">No hay platos listos esperando despacho</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Al marcar una comanda como lista, se mostrará aquí</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 items-start">
                {listos.map((order, idx) => renderOrderCard(order, 'LISTO', idx + 1))}
              </div>
            )}
          </div>
        )}

        {/* VISTA TABLERO COMPLETO (3 COLUMNAS SIMULTÁNEAS) */}
        {activeTab === 'KANBAN' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 h-full items-start">
            {/* Columna Pendientes */}
            <div className="bg-[var(--color-porkos-surface)] border border-zinc-800 rounded-2xl flex flex-col max-h-full">
              <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-black/40 rounded-t-2xl">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" /> Pendientes ({pendientes.length})
                </span>
              </div>
              <div className="p-2.5 overflow-y-auto space-y-3 flex-1">
                {pendientes.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-8">Sin comandas</p>
                ) : (
                  pendientes.map((order, idx) => renderOrderCard(order, 'PENDIENTE', idx + 1))
                )}
              </div>
            </div>

            {/* Columna Preparando */}
            <div className="bg-[var(--color-porkos-surface)] border border-zinc-800 rounded-2xl flex flex-col max-h-full">
              <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-black/40 rounded-t-2xl">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" /> Preparando ({preparando.length})
                </span>
              </div>
              <div className="p-2.5 overflow-y-auto space-y-3 flex-1">
                {preparando.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-8">Sin comandas</p>
                ) : (
                  preparando.map((order, idx) => renderOrderCard(order, 'PREPARANDO', idx + 1))
                )}
              </div>
            </div>

            {/* Columna Listos */}
            <div className="bg-[var(--color-porkos-surface)] border border-zinc-800 rounded-2xl flex flex-col max-h-full">
              <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-black/40 rounded-t-2xl">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" /> Listos ({listos.length})
                </span>
              </div>
              <div className="p-2.5 overflow-y-auto space-y-3 flex-1">
                {listos.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-8">Sin comandas</p>
                ) : (
                  listos.map((order, idx) => renderOrderCard(order, 'LISTO', idx + 1))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
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

export default function KitchenView({ orders = [], onUpdateOrderStatus }) {
  const [activeTab, setActiveTab] = useState('PENDIENTE');

  // Identificador de bebidas / refrescos para entrega en cocina y despacho
  const isBeverageItem = (item) => {
    return Boolean(
      item.marketSubtype === 'BEBIDA' ||
      item.line === 'BEBIDAS_MARKET' ||
      item.categoryId === 'cat_bebidas' ||
      item.customization?.temperature ||
      item.name?.toLowerCase().includes('jugo') ||
      item.name?.toLowerCase().includes('gaseosa') ||
      item.name?.toLowerCase().includes('refresco') ||
      item.name?.toLowerCase().includes('chicha') ||
      item.name?.toLowerCase().includes('agua') ||
      item.name?.toLowerCase().includes('cerveza') ||
      item.name?.toLowerCase().includes('cola') ||
      item.name?.toLowerCase().includes('inka')
    );
  };

  // Filtrar pedidos que tengan productos que requieran cocina o bebidas y no estén cancelados ni entregados
  const activeKitchenOrders = orders.filter((o) => {
    const hasKitchenItems = o.items?.some((i) => i.requiresKitchen);
    const hasBeverages = o.items?.some((i) => isBeverageItem(i));
    return (hasKitchenItems || hasBeverages) && o.status !== 'ENTREGADO' && o.status !== 'CANCELADO';
  });

  const pendientes = activeKitchenOrders.filter((o) => o.status === 'PENDIENTE');
  const preparando = activeKitchenOrders.filter((o) => o.status === 'PREPARANDO');
  const listos = activeKitchenOrders.filter((o) => o.status === 'LISTO');

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

  // Renderizador de cada ticket de cocina
  const renderOrderCard = (order, currentStatus) => {
    const ModalityIcon = getModalityIcon(order.modality);
    const isDelayed = isOrderDelayed(order.createdAt, 12);
    const kitchenItems = order.items?.filter((item) => item.requiresKitchen) || [];
    const beverageItems = order.items?.filter((item) => !item.requiresKitchen && isBeverageItem(item)) || [];
    const otherItems = order.items?.filter((item) => !item.requiresKitchen && !isBeverageItem(item)) || [];

    return (
      <div
        key={order.orderNumber}
        className={`
          bg-zinc-900/90 border rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-3 shadow-lg transition-all
          ${
            currentStatus === 'PREPARANDO'
              ? 'border-zinc-700 border-t-4 border-t-[var(--color-porkos-orange)]'
              : currentStatus === 'LISTO'
              ? 'border-zinc-700 border-t-4 border-t-emerald-500'
              : 'border-zinc-800 border-t-4 border-t-zinc-600'
          }
        `}
      >
        {/* Cabecera del Ticket */}
        <div className="space-y-1.5 pb-2.5 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {order.orderNumber}
              </span>

              {/* Distintivo de Modalidad Destacado */}
              {order.modality === 'PARA_LLEVAR' ? (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-amber-500/40 shadow-sm">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  <span>PARA LLEVAR</span>
                </span>
              ) : order.modality === 'DELIVERY' ? (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 border border-emerald-500/40 shadow-sm">
                  <Bike className="w-3.5 h-3.5 text-emerald-400" />
                  <span>DELIVERY</span>
                </span>
              ) : (
                <span className="text-xs bg-zinc-800/90 text-zinc-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 border border-zinc-700/60">
                  <ModalityIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{order.tableName || order.modality}</span>
                </span>
              )}
            </div>

            {/* Temporizador */}
            <div
              className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-lg border ${
                isDelayed
                  ? 'bg-rose-950/60 text-rose-300 border-rose-800/80'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700/60'
              }`}
            >
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>{formatElapsedTime(order.createdAt)}</span>
              <span className="text-zinc-500 font-normal text-[10px] ml-0.5 hidden sm:inline">
                ({formatTime(order.createdAt)})
              </span>
            </div>
          </div>

          {/* Nombre de cliente & Datos de entrega */}
          {(order.customerName || order.customer?.name) && (
            <div className="text-xs font-medium text-zinc-300 bg-black/40 px-2.5 py-1.5 rounded-lg border border-zinc-800/60 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500 text-[10px] uppercase font-bold">Cliente:</span>
                <span className="text-white font-extrabold text-xs">{order.customerName || order.customer?.name}</span>
              </div>
              {order.modality === 'PARA_LLEVAR' && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                  Recojo en barra
                </span>
              )}
            </div>
          )}

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
                    <div className="space-y-0.5 pt-0.5 text-[11px] leading-tight">
                      {ticketLines.map((line, lIdx) => (
                        <div key={lIdx} className="flex items-baseline gap-1 text-zinc-300">
                          <span className="text-[10px] font-black text-zinc-500 shrink-0">
                            {line.label}:
                          </span>
                          <span
                            className={`font-bold ${
                              line.type === 'creams'
                                ? 'text-[var(--color-porkos-orange)]'
                                : line.type === 'extras'
                                ? 'text-emerald-400'
                                : line.type === 'salad'
                                ? 'text-emerald-300'
                                : line.type === 'papas'
                                ? 'text-amber-300'
                                : line.type === 'note'
                                ? 'text-amber-300 italic'
                                : 'text-zinc-200'
                            }`}
                          >
                            {line.value}
                          </span>
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
            <div className="space-y-1.5 bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-800/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🥤</span> Bebidas a Entregar ({beverageItems.reduce((sum, b) => sum + (b.quantity || 1), 0)})
                </span>
                <span className="text-[10px] font-bold text-cyan-400/90 bg-cyan-900/50 px-1.5 py-0.2 rounded border border-cyan-700/50">
                  Despacho
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
                      className="bg-black/50 p-2 rounded-lg border border-cyan-900/60 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="bg-cyan-900/80 text-cyan-100 border border-cyan-700/80 px-1.5 py-0.2 rounded font-black text-xs shrink-0">
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
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-900/80 text-cyan-200 border border-cyan-600/60">
                            {tempBadge}
                          </span>
                        )}
                        {bev.customization?.packaging && bev.customization.packaging.price > 0 && (
                          <span className="text-[10px] text-blue-300 font-bold">
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
        <div className="pt-2 border-t border-zinc-800">
          {currentStatus === 'PENDIENTE' && (
            <button
              type="button"
              onClick={() => onUpdateOrderStatus(order.orderNumber, 'PREPARANDO')}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <Flame className="w-4 h-4 fill-current" />
              <span>Iniciar Preparación</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {currentStatus === 'PREPARANDO' && (
            <button
              type="button"
              onClick={() => onUpdateOrderStatus(order.orderNumber, 'LISTO')}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4 stroke-[3] text-emerald-400" />
              <span>Marcar como Listo</span>
            </button>
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
                {pendientes.map((order) => renderOrderCard(order, 'PENDIENTE'))}
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
                {preparando.map((order) => renderOrderCard(order, 'PREPARANDO'))}
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
                {listos.map((order) => renderOrderCard(order, 'LISTO'))}
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
                  pendientes.map((order) => renderOrderCard(order, 'PENDIENTE'))
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
                  preparando.map((order) => renderOrderCard(order, 'PREPARANDO'))
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
                  listos.map((order) => renderOrderCard(order, 'LISTO'))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

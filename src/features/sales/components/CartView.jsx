import { useState } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Flame,
  User,
  Store,
  Bike,
  Package,
  CreditCard,
  Phone,
  MapPin,
  Navigation,
  Utensils,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { useCart } from '../../../context/useCart';
import { formatCurrency } from '../../../utils/formatters';
import { isProductMarket } from '../../../utils/productCategories';
import { resolveItemConsumptionType } from '../../../types/constants';
import Button from '../../../components/ui/Button';
import ProductThumbnail from '../../../components/ui/ProductThumbnail';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

function getPapasText(customization) {
  const papasMod = customization?.selectedModifiers?.find(
    (m) =>
      m?.groupId === 'mod_papas' ||
      m?.groupId === 'mod_corte_papas' ||
      m?.groupName?.toLowerCase()?.includes('papa')
  );
  if (!papasMod || !papasMod.optionName) return null;
  const opt = papasMod.optionName.toLowerCase();
  if (opt.includes('hilo')) return 'AL HILO';
  if (opt.includes('sin')) return 'SIN PAPAS';
  if (opt.includes('frita')) return 'FRITAS';
  return papasMod.optionName.toUpperCase();
}

export default function CartView({
  onSendToKitchen,
  onCheckout,
  onEditItem,
  isMarketMode = false,
  tables = [],
  onSaveEditedOrder,
  onCancelEditing,
  onCloseMobileCart,
  isSubmitting = false,
}) {
  const {
    items,
    updateItemQuantity,
    setItemQuantity,
    updateItemConsumptionType,
    removeItem,
    clearCart,
    itemsSubtotal,
    packagingsTotal,
    deliveryFee,
    total,
    itemCount,
    modality,
    selectedTable,
    setSelectedTable,
    customerName,
    setCustomerName,
    customer,
    setCustomer,
    packagings: orderPackagings,
    removePackaging,
    generalNotes,
    setGeneralNotes,
    editingOrder,
    cancelEditingOrder,
  } = useCart();
  const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const hasKitchenItems = items.some((item) => Boolean(item.requiresKitchen) && !isProductMarket(item));
  const isTableOccupied = selectedTable?.status === 'OCCUPIED';
  const isTakeout = modality === 'PARA_LLEVAR';
  const isDelivery = modality === 'DELIVERY';
  const isIrComiendo = modality === 'CONSUMO_EXTERNO';

  return (
    <div className="bg-[#121215] border border-[var(--color-porkos-border)] rounded-2xl sm:rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-[var(--color-porkos-border)] flex items-center justify-between bg-[#15151A] shrink-0">
        <div className="flex items-center gap-2">
          {isMarketMode ? (
            <Store className="w-5 h-5 text-blue-400 shrink-0" />
          ) : (
            <ShoppingBag className="w-5 h-5 text-[var(--color-porkos-orange)] shrink-0" />
          )}
          <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
            {isMarketMode ? 'Caja Market' : 'Comanda Actual'}
          </h3>
          <span
            className={`font-black text-xs px-2.5 py-0.5 rounded-full ${
              isMarketMode
                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                : 'bg-zinc-800 text-zinc-200 border border-zinc-700/80'
            }`}
          >
            {itemCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer active:scale-95"
              title="Vaciar comanda"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Vaciar</span>
            </button>
          )}

          {onCloseMobileCart && (
            <button
              type="button"
              onClick={onCloseMobileCart}
              className="lg:hidden p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Cerrar comanda"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Target status bar: Mesa / Para Llevar / Delivery / Cliente (SOLO en Restaurante) */}
      {!isMarketMode && (
        <div className="px-3.5 py-2.5 bg-[#0D0D10] border-b border-[var(--color-porkos-border)] space-y-2 shrink-0">
          {/* Banner de Edición de Comanda Activa */}
          {editingOrder && (
            <div className="space-y-1.5 animate-fade-in-smooth">
              <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold min-w-0">
                  <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">Editando: <strong>{editingOrder.orderNumber}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cancelEditingOrder();
                    if (onCancelEditing) onCancelEditing();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 cursor-pointer active:scale-95 shrink-0"
                >
                  Cancelar
                </button>
              </div>

              {onCloseMobileCart && (
                <button
                  type="button"
                  onClick={onCloseMobileCart}
                  className="w-full py-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-700/80 hover:border-[var(--color-porkos-orange)] text-[var(--color-porkos-orange)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Añadir más productos de la carta</span>
                </button>
              )}
            </div>
          )}

          {/* Selector de mesa con botones cuadrados (un solo clic) */}
          {modality === 'MESA' && (
            <div className="bg-[#121216] p-2.5 rounded-xl border border-[var(--color-porkos-border)] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Utensils className="w-3.5 h-3.5 text-[var(--color-porkos-orange)]" />
                  <span>Mesa: <strong className={selectedTable ? 'text-[var(--color-porkos-orange)] font-black' : 'text-zinc-400'}>{selectedTable ? selectedTable.label : 'Elige una mesa'}</strong></span>
                </span>
                {selectedTable && (
                  <button
                    type="button"
                    onClick={() => setSelectedTable(null)}
                    className="text-[10px] text-zinc-400 hover:text-rose-400 font-bold underline cursor-pointer"
                  >
                    Quitar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {tables.length === 0 ? (
                  <span className="text-xs text-zinc-500 italic">No hay mesas configuradas</span>
                ) : (
                  tables.map((t) => {
                    const isSelected = selectedTable?.id === t.id;
                    const isOccupied = t.status === 'OCCUPIED';
                    const matchNum = t.label?.match(/\d+/);
                    const shortText = matchNum ? `M${matchNum[0]}` : (t.label?.length > 4 ? t.label.slice(0, 4) : t.label);

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTable(isSelected ? null : t)}
                        title={`${t.label} • ${isOccupied ? 'Ocupada' : 'Libre'}`}
                        className={`
                          w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 flex flex-col items-center justify-center transition-all cursor-pointer border active:scale-90 select-none relative touch-manipulation
                          ${
                            isSelected
                              ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-[var(--color-porkos-orange)] font-black shadow-md shadow-orange-500/20 ring-1 ring-[var(--color-porkos-orange)]'
                              : isOccupied
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:border-amber-400'
                              : 'bg-zinc-900 text-zinc-200 border-zinc-800 hover:border-zinc-700'
                          }
                        `}
                      >
                        <span className="text-[11px] font-black leading-tight">{shortText}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isSelected ? 'bg-zinc-950' : isOccupied ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                          }`}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Barra de Modalidad y Mesa */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">Modalidad:</span>
              <span className="font-bold px-2 py-0.5 rounded-lg text-[11px] bg-zinc-800 text-zinc-200 border border-zinc-700/60">
                {isTakeout ? 'Para Llevar' : isDelivery ? 'Delivery' : isIrComiendo ? 'Ir Comiendo' : 'Mesa'}
              </span>
            </div>

            {selectedTable && (
              <span className={`font-bold px-2 py-0.5 rounded-lg text-[11px] border ${
                isTableOccupied
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700/60'
              }`}>
                {selectedTable.label} {isTableOccupied ? '(Abierta)' : '(Libre)'}
              </span>
            )}
          </div>

          {/* Nombre de cliente: siempre editable directamente */}
          <div className="relative flex items-center">
            <User className="w-3.5 h-3.5 absolute left-3 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={customerName || customer.name || ''}
              onChange={(e) => {
                const val = e.target.value;
                setCustomerName(val);
                setCustomer((prev) => ({ ...prev, name: val }));
              }}
              placeholder="Nombre del cliente..."
              className="w-full bg-[#121216] border border-zinc-800 hover:border-zinc-700 focus:border-[var(--color-porkos-orange)] rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder-zinc-500 font-semibold focus:outline-none transition-colors"
            />
            {(customerName || customer.name) && (
              <button
                type="button"
                onClick={() => {
                  setCustomerName('');
                  setCustomer((prev) => ({ ...prev, name: '' }));
                }}
                className="absolute right-2 text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
                title="Borrar nombre"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Empaques agregados a nivel comanda */}
          {orderPackagings && orderPackagings.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {orderPackagings.map((pkg) => (
                <span
                  key={pkg.packagingId}
                  className="bg-zinc-800 text-zinc-200 border border-zinc-700 text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1.5"
                >
                  <Package className="w-3 h-3 text-zinc-400" />
                  <span>{pkg.quantity}x {pkg.name} (+{formatCurrency(pkg.total)})</span>
                  <button
                    type="button"
                    onClick={() => removePackaging(pkg.packagingId)}
                    className="hover:text-rose-400 text-zinc-400 font-black cursor-pointer ml-0.5"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-2.5 overscroll-contain">
        {items.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            {isMarketMode ? (
              <Store className="w-10 h-10 mb-2 opacity-30 text-blue-400" />
            ) : (
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30 text-[var(--color-porkos-orange)]" />
            )}
            <p className="text-xs sm:text-sm font-bold text-zinc-300">
              {isMarketMode ? 'Caja sin productos' : 'Comanda vacía'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
              {isMarketMode
                ? 'Toca cualquier producto del catálogo para cobrarlo al instante'
                : 'Selecciona productos de la carta para añadirlos a la comanda'}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isCustomizable = Boolean(onEditItem);
            const isMarketItem = isMarketMode || !item.requiresKitchen;
            const showCreams = !isMarketItem && item.customization?.creamsSummary && item.customization.creamsSummary !== 'SIN CREMAS';
            const itemConsumption = resolveItemConsumptionType(item, modality);

            const hasDetails = Boolean(
              item.customization?.saladSummary ||
              getPapasText(item.customization) ||
              showCreams ||
              (item.customization?.selectedExtras && item.customization.selectedExtras.length > 0) ||
              (item.customization?.packaging && item.customization.packaging.price > 0) ||
              item.customization?.temperature ||
              item.customization?.itemNotes
            );

            return (
              <div
                key={item.itemId}
                className="bg-[#0E0E12] border border-[var(--color-porkos-border)] hover:border-zinc-700/80 rounded-2xl p-3 space-y-2.5 transition-colors"
              >
                {/* Main row: Thumbnail, Title, Unit price, Total */}
                <div
                  onClick={() => isCustomizable && onEditItem && onEditItem(item)}
                  className={`flex items-start justify-between gap-2.5 ${
                    isCustomizable ? 'cursor-pointer group' : ''
                  }`}
                >
                  <div className="shrink-0 transition-transform group-hover:scale-105 active:scale-95">
                    <ProductThumbnail
                      src={item.image}
                      thumbnailUrl={item.thumbnailUrl || item.image}
                      name={item.name}
                      className="w-12 h-12 rounded-xl"
                      iconSize="w-5 h-5"
                    />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      {item.requiresKitchen && (
                        <Flame className="w-3.5 h-3.5 text-[var(--color-porkos-orange)] shrink-0" />
                      )}
                      <h5 className={`font-bold text-xs sm:text-sm text-zinc-100 leading-snug truncate ${isCustomizable ? 'group-hover:text-[var(--color-porkos-orange)]' : ''}`}>
                        {item.name}
                      </h5>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {formatCurrency(item.unitPrice)} c/u
                      </span>
                    </div>
                  </div>

                  <span className="font-black text-sm text-white shrink-0 pt-0.5">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>

                {/* Destino del ítem (Mesa / Ir comiendo / Llevar) */}
                {!isMarketMode && modality !== 'DELIVERY' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 bg-[#141418] p-1 rounded-xl border border-zinc-800/80 w-fit touch-manipulation"
                  >
                    <button
                      type="button"
                      onClick={() => updateItemConsumptionType(item.itemId, 'MESA')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                        itemConsumption === 'MESA'
                          ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400/50'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                      title="Para comer en mesa / salón"
                    >
                      <Utensils className="w-3 h-3 text-blue-300 shrink-0" />
                      <span>Mesa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateItemConsumptionType(item.itemId, 'CONSUMO_EXTERNO')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                        itemConsumption === 'CONSUMO_EXTERNO'
                          ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400/50'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                      title="Para ir comiendo al paso"
                    >
                      <Package className="w-3 h-3 text-purple-300 shrink-0" />
                      <span>Ir comiendo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateItemConsumptionType(item.itemId, 'PARA_LLEVAR')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation ${
                        itemConsumption === 'PARA_LLEVAR'
                          ? 'bg-amber-500 text-zinc-950 shadow-xs ring-1 ring-amber-400/50'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                      }`}
                      title="Para llevar"
                    >
                      <ShoppingBag className="w-3 h-3 text-amber-950 shrink-0" />
                      <span>Llevar</span>
                    </button>

                    {item.quantity > 1 && (
                      <span className="text-[9px] text-zinc-500 pl-1 select-none">
                        (x{item.quantity})
                      </span>
                    )}
                  </div>
                )}

                {/* Detalles de Personalización */}
                {hasDetails && (
                  <div
                    onClick={() => isCustomizable && onEditItem && onEditItem(item)}
                    className="text-xs space-y-1 bg-[#141418] p-2 sm:p-2.5 rounded-xl border border-zinc-800/70 hover:border-zinc-700 transition-colors cursor-pointer group"
                  >
                    {/* 1. Ensalada */}
                    {item.customization?.saladSummary && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Ensalada:
                        </span>
                        <span className="font-bold text-zinc-200">
                          {item.customization.saladSummary}
                        </span>
                      </div>
                    )}

                    {/* 2. Papas */}
                    {getPapasText(item.customization) && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Papas:
                        </span>
                        <span className="font-bold text-zinc-200">
                          {getPapasText(item.customization)}
                        </span>
                      </div>
                    )}

                    {/* 3. Cremas */}
                    {showCreams && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Cremas:
                        </span>
                        <span className="font-bold text-zinc-200">
                          {item.customization.creamsSummary}
                        </span>
                      </div>
                    )}

                    {/* 4. Extras */}
                    {item.customization?.selectedExtras?.length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        {item.customization.selectedExtras.map((e, eIdx) => {
                          const clean = (e?.name || e?.label || (typeof e === 'string' ? e : '') || 'Extra').replace(/^Extra\s+/i, '');
                          const qty = e?.quantity || 1;
                          const totalPrice = (e?.unitPrice || e?.price || 0) * qty;
                          return (
                            <div
                              key={e?.id || `cart_extra_${eIdx}`}
                              className="flex items-center justify-between text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20"
                            >
                              <span className="flex items-center gap-1.5 min-w-0 truncate">
                                <span className="bg-amber-400 text-zinc-950 px-1.5 py-0.2 rounded text-[10px] font-black shrink-0">
                                  {qty}x
                                </span>
                                <span className="truncate">{clean}</span>
                              </span>
                              <span className="text-[10px] text-amber-200/90 font-black shrink-0 ml-2">
                                +{formatCurrency(totalPrice)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 5. Empaque */}
                    {item.customization?.packaging && item.customization.packaging.price > 0 && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Empaque:
                        </span>
                        <span className="font-bold text-zinc-200">
                          {item.customization.packaging.name || 'Empaque'} (+{formatCurrency(item.customization.packaging.price || 0)})
                        </span>
                      </div>
                    )}

                    {/* 6. Temperatura */}
                    {item.customization?.temperature && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Temperatura:
                        </span>
                        <span className="font-bold text-zinc-200">
                          {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                        </span>
                      </div>
                    )}

                    {/* 7. Nota Especial */}
                    {item.customization?.itemNotes && (
                      <div className="pt-1 mt-1 border-t border-zinc-800">
                        <span className="inline-block bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[11px] font-semibold italic">
                          &ldquo;{item.customization.itemNotes}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Controles: Eliminar y Selector de Cantidad */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => removeItem(item.itemId)}
                    className="p-2 min-w-[38px] min-h-[38px] text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-xl transition-all cursor-pointer active:scale-90 flex items-center justify-center touch-manipulation"
                    title="Eliminar de la comanda"
                    aria-label="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1.5 bg-[#141418] p-1 rounded-xl border border-zinc-800 shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.itemId, -1)}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center cursor-pointer font-bold active:scale-90 transition-transform touch-manipulation"
                      aria-label="Disminuir cantidad"
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        if (raw === '') {
                          setItemQuantity(item.itemId, 1);
                        } else {
                          const val = parseInt(raw, 10);
                          if (val > 0) {
                            setItemQuantity(item.itemId, val);
                          }
                        }
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-8 sm:w-9 text-center font-black text-sm text-white bg-transparent border-0 focus:outline-none focus:bg-zinc-800 rounded py-0.5 select-all"
                      aria-label="Cantidad del producto"
                      title="Toca para cambiar la cantidad manualmente"
                    />
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.itemId, 1)}
                      className="w-8 h-8 rounded-lg bg-[var(--color-porkos-orange)]/20 hover:bg-[var(--color-porkos-orange)] text-[var(--color-porkos-orange)] hover:text-zinc-950 flex items-center justify-center cursor-pointer font-bold active:scale-90 transition-transform touch-manipulation"
                      aria-label="Aumentar cantidad"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Datos de Envío a Domicilio (DELIVERY) */}
        {isDelivery && (
          <div className="bg-[#0E0E12] border border-[var(--color-porkos-border)] p-3 rounded-2xl space-y-2 text-xs shadow-md mt-2">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-200 font-bold text-xs">
                <div className="p-1.5 rounded-lg bg-zinc-800 text-emerald-400">
                  <Bike className="w-4 h-4" />
                </div>
                <span>Datos de Envío a Domicilio</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-800 px-2.5 py-1 rounded-lg text-[11px] font-bold text-zinc-300">
                <span className="text-zinc-400 font-normal">Envío:</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
            </div>

            {/* Teléfono */}
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="tel"
                value={customer.phone || ''}
                onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Teléfono / Celular"
                className="w-full bg-[#141418] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-medium"
              />
            </div>

            {/* Dirección */}
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={customer.address || ''}
                onChange={(e) => setCustomer((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Dirección exacta"
                className="w-full bg-[#141418] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-medium"
              />
            </div>

            {/* Referencia y Costo de Envío */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Navigation className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={customer.reference || ''}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, reference: e.target.value }))}
                  placeholder="Referencia de llegada"
                  className="w-full bg-[#141418] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3 text-zinc-400 text-xs font-black">S/</span>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={customer.deliveryFee ?? ''}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, deliveryFee: e.target.value }))}
                  placeholder="Costo envío"
                  className="w-full bg-[#141418] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-bold placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* Nota general de la comanda */}
        {!isMarketMode && items.length > 0 && (
          <div className="pt-1">
            <input
              type="text"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Nota general de la comanda..."
              className="w-full bg-[#0E0E12] border border-[var(--color-porkos-border)] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)] transition-colors"
            />
          </div>
        )}
      </div>

      {/* Totals & Sticky Actions Footer */}
      <div className="p-3.5 sm:p-4 bg-[#15151A] border-t border-[var(--color-porkos-border)] space-y-3 shrink-0">
        {/* Desglose de Precios */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal platos:</span>
            <span className="font-semibold">{formatCurrency(itemsSubtotal)}</span>
          </div>
          {!isMarketMode && packagingsTotal > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Empaques / Tápers:</span>
              <span className="font-semibold">{formatCurrency(packagingsTotal)}</span>
            </div>
          )}
          {!isMarketMode && deliveryFee > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Costo Delivery:</span>
              <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-white font-black text-base sm:text-lg pt-1.5 border-t border-zinc-800">
            <span>Total:</span>
            <span className={isMarketMode ? 'text-blue-400' : 'text-[var(--color-porkos-orange)]'}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="space-y-2">
          {editingOrder ? (
            /* MODO EDICIÓN DE COMANDA */
            <div className="space-y-2">
              <Button
                onClick={onSaveEditedOrder}
                disabled={isSubmitting || items.length === 0 || (modality === 'MESA' && !selectedTable)}
                isLoading={isSubmitting}
                variant="primary"
                size="lg"
                icon={Check}
                fullWidth
                className="text-xs sm:text-sm font-black py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20"
              >
                {isSubmitting
                  ? 'Guardando cambios...'
                  : `Guardar Comanda ${editingOrder.orderNumber} • ${formatCurrency(total)}`}
              </Button>
              <Button
                onClick={() => {
                  cancelEditingOrder();
                  if (onCancelEditing) onCancelEditing();
                }}
                disabled={isSubmitting}
                variant="secondary"
                size="sm"
                fullWidth
                className="text-xs font-bold py-2"
              >
                Cancelar y Volver
              </Button>
            </div>
          ) : isMarketMode ? (
            /* MODO MARKET DIRECTO */
            <Button
              onClick={onCheckout}
              disabled={isSubmitting || items.length === 0}
              isLoading={isSubmitting}
              variant="primary"
              size="lg"
              fullWidth
              className="text-sm sm:text-base font-black bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 py-3.5"
            >
              {isSubmitting ? 'Procesando...' : `Cobrar ${formatCurrency(total)}`}
            </Button>
          ) : isTableOccupied && selectedTable ? (
            /* EN MESA ABIERTA */
            <Button
              onClick={onSendToKitchen}
              disabled={isSubmitting || items.length === 0}
              isLoading={isSubmitting}
              variant="primary"
              size="lg"
              fullWidth
              icon={hasKitchenItems ? Flame : Package}
              className="text-xs sm:text-sm font-black py-3.5 shadow-lg shadow-orange-500/20"
            >
              {isSubmitting
                ? 'Enviando comanda...'
                : hasKitchenItems
                ? `Mandar a Cocina (${selectedTable.label}) • ${formatCurrency(total)}`
                : `Enviar a Entregas (${selectedTable.label}) • ${formatCurrency(total)}`}
            </Button>
          ) : (
            /* EN MESA LIBRE, PARA LLEVAR O DELIVERY */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={() => {
                  if (modality === 'MESA' && !selectedTable) {
                    setIsTablePickerOpen(true);
                  } else {
                    onSendToKitchen();
                  }
                }}
                disabled={isSubmitting || items.length === 0}
                isLoading={isSubmitting}
                variant="primary"
                size="md"
                icon={hasKitchenItems ? Flame : Package}
                className={`text-xs sm:text-sm font-black py-3 ${
                  modality === 'MESA' && !selectedTable
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                    : 'bg-[var(--color-porkos-orange)] text-zinc-950 shadow-md shadow-orange-500/20'
                }`}
              >
                {isSubmitting
                  ? 'Enviando...'
                  : modality === 'MESA' && !selectedTable
                  ? 'Elegir mesa para enviar'
                  : selectedTable
                  ? (hasKitchenItems ? `Abrir (${selectedTable.label})` : `Enviar a ${selectedTable.label}`)
                  : hasKitchenItems
                  ? 'Mandar a Cocina'
                  : 'Enviar a Entregas'}
              </Button>

              <Button
                onClick={onCheckout}
                disabled={isSubmitting || items.length === 0}
                variant="secondary"
                size="md"
                icon={CreditCard}
                className="text-xs font-bold py-3"
              >
                {isSubmitting ? 'Procesando...' : `Cobrar (${formatCurrency(total)})`}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal interactivo para seleccionar mesa */}
      <Modal
        isOpen={isTablePickerOpen}
        onClose={() => setIsTablePickerOpen(false)}
        title="Seleccionar Mesa"
        subtitle="Elige la mesa del salón para esta comanda"
        maxWidth="max-w-md"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto p-1">
            {tables.map((t) => {
              const isOccupied = t.status === 'OCCUPIED';
              const isSelected = selectedTable?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTable(t);
                    setIsTablePickerOpen(false);
                  }}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between gap-2.5 cursor-pointer active:scale-98 touch-manipulation ${
                    isSelected
                      ? 'bg-[var(--color-porkos-orange)] text-zinc-950 border-transparent shadow-lg shadow-orange-500/20 font-black'
                      : isOccupied
                      ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60 text-white'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-sm ${isSelected ? 'text-zinc-950' : 'text-white'}`}>
                      {t.label}
                    </span>
                    <Utensils className={`w-3.5 h-3.5 ${isSelected ? 'text-zinc-950' : isOccupied ? 'text-amber-400' : 'text-zinc-500'}`} />
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-black px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-black/20 text-zinc-950'
                          : isOccupied
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {isOccupied ? 'Ocupada' : 'Libre'}
                    </span>
                    {t.capacity && (
                      <span className={isSelected ? 'text-zinc-950 font-bold' : 'text-zinc-500 font-semibold'}>
                        {t.capacity}p
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedTable && (
            <button
              type="button"
              onClick={() => {
                setSelectedTable(null);
                setIsTablePickerOpen(false);
              }}
              className="w-full text-center text-xs text-rose-400 hover:text-rose-300 py-1.5 font-bold cursor-pointer"
            >
              Quitar mesa seleccionada
            </button>
          )}
        </div>
      </Modal>

      {/* Confirmación para Vaciar Comanda */}
      <ConfirmDialog
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={() => {
          clearCart();
          setIsConfirmClearOpen(false);
        }}
        title="¿Vaciar la comanda actual?"
        message="Se eliminarán todos los productos y personalizaciones agregados en esta orden."
        confirmText="Sí, vaciar comanda"
        cancelText="Conservar comanda"
        variant="danger"
      />
    </div>
  );
}

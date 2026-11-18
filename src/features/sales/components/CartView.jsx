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
} from 'lucide-react';
import { useCart } from '../../../context/useCart';
import { useCatalog } from '../../../context/useCatalog';
import { formatCurrency } from '../../../utils/formatters';
import Button from '../../../components/ui/Button';

function getPapasText(customization) {
  const papasMod = customization?.selectedModifiers?.find(
    (m) =>
      m.groupId === 'mod_papas' ||
      m.groupId === 'mod_corte_papas' ||
      m.groupName?.toLowerCase().includes('papa')
  );
  if (!papasMod) return null;
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
}) {
  const {
    items,
    updateItemQuantity,
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
    addPackaging,
    removePackaging,
    generalNotes,
    setGeneralNotes,
    editingOrder,
    cancelEditingOrder,
  } = useCart();
  const { packagings: catalogPackagings } = useCatalog();

  const availablePackagings = (catalogPackagings || []).filter((p) => p.active && p.id !== 'pkg_ninguno');
  const hasKitchenItems = items.some((item) => item.requiresKitchen);
  const isTableOccupied = selectedTable?.status === 'OCCUPIED';
  const isTakeout = modality === 'PARA_LLEVAR';
  const isDelivery = modality === 'DELIVERY';
  const isIrComiendo = modality === 'CONSUMO_EXTERNO';

  return (
    <div className="bg-[var(--color-porkos-surface)] border border-[var(--color-porkos-border)] rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--color-porkos-border)] flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-2">
          {isMarketMode ? (
            <Store className="w-5 h-5 text-blue-400" />
          ) : (
            <ShoppingBag className="w-5 h-5 text-[var(--color-porkos-orange)]" />
          )}
          <h3 className="font-bold text-sm sm:text-base text-white">
            {isMarketMode ? 'Caja Market' : 'Comanda Restaurante'}
          </h3>
          <span className={`font-extrabold text-xs px-2 py-0.5 rounded-full ${isMarketMode ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-zinc-800 text-zinc-300'}`}>
            {itemCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-zinc-400 hover:text-rose-400 font-medium transition-colors cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Target status bar: Mesa / Para Llevar / Delivery / Cliente (SOLO en Restaurante) */}
      {!isMarketMode && (
        <div className="px-3.5 py-2.5 bg-black/40 border-b border-[var(--color-porkos-border)] space-y-2.5">
          {/* Banner de Edición de Comanda Activa */}
          {editingOrder && (
            <div className="bg-amber-500/15 border border-amber-500/40 p-2.5 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <Edit3 className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span>Editando Comanda: <strong>{editingOrder.orderNumber}</strong></span>
                  <span className="block text-[10px] text-zinc-400 font-normal">Modifica los ítems y guarda los cambios</span>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelEditingOrder}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold border border-zinc-700 cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Exigir número de mesa obligatorio si modalidad es MESA */}
          {modality === 'MESA' && !selectedTable && (
            <div className="bg-amber-950/40 border border-amber-500/50 p-2.5 rounded-xl space-y-1.5 text-xs animate-pulse">
              <div className="flex items-center gap-1.5 text-amber-300 font-extrabold text-[11px]">
                <Utensils className="w-3.5 h-3.5 text-amber-400" />
                <span>⚠️ Mesa Requerida: Selecciona la mesa para continuar *</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTable(t)}
                    className="py-1.5 px-2 rounded-lg text-xs font-bold bg-zinc-900 hover:bg-amber-500 hover:text-black text-white border border-zinc-700 hover:border-amber-400 transition-all cursor-pointer text-center"
                  >
                    <span>{t.label}</span>
                    <span className="block text-[9px] font-normal text-zinc-400">
                      {t.status === 'OCCUPIED' ? '(Abierta)' : '(Libre)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 font-medium">Modalidad:</span>
              <span
                className={`font-black px-2 py-0.5 rounded-md text-[10px] uppercase border ${
                  isTakeout
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : isDelivery
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isIrComiendo
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                }`}
              >
                {isTakeout ? '📦 Para Llevar' : isDelivery ? '🛵 Delivery' : isIrComiendo ? '🍽️ Ir Comiendo' : '🍽️ Mesa'}
              </span>
            </div>

            {selectedTable && (
              <span
                className={`font-black px-2 py-0.5 rounded-md text-[11px] border ${
                  isTableOccupied
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                }`}
              >
                {selectedTable.label} ({isTableOccupied ? 'Mesa Abierta' : 'Libre'})
              </span>
            )}
          </div>

          {/* Banner y atajos para PARA LLEVAR (Empaques dinámicos de BD) */}
          {isTakeout && availablePackagings.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-500/30 p-2 rounded-xl flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-bold">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Empaque para recojo:</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {availablePackagings.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => addPackaging({ id: pkg.id, name: pkg.name, price: pkg.price })}
                    className="px-2 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-200 border border-zinc-700 cursor-pointer active:scale-95"
                  >
                    + {pkg.name} ({formatCurrency(pkg.price)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formulario mejorado para DELIVERY */}
          {isDelivery ? (
            <div className="bg-gradient-to-b from-emerald-950/30 to-black/60 border border-emerald-500/40 p-3 rounded-2xl space-y-2 text-xs shadow-lg shadow-emerald-950/20">
              <div className="flex items-center justify-between pb-1.5 border-b border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-xs">
                  <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300">
                    <Bike className="w-3.5 h-3.5" />
                  </div>
                  <span>Datos de Envío a Domicilio</span>
                </div>
                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg text-[11px] font-black text-emerald-300">
                  <span className="text-zinc-400 font-normal">Envío:</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              </div>

              {/* Nombre del Cliente & Teléfono / Celular */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={customerName || customer.name || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerName(val);
                      setCustomer((prev) => ({ ...prev, name: val }));
                    }}
                    placeholder="Nombre del cliente *"
                    className="w-full bg-black/70 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="tel"
                    value={customer.phone || ''}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Celular / WhatsApp *"
                    className="w-full bg-black/70 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>

              {/* Dirección exacta de entrega */}
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={customer.address || ''}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Dirección exacta de entrega (calle, número, dpto) *"
                  className="w-full bg-black/70 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Referencia de entrega & Monto editable de delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <div className="relative">
                  <Navigation className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={customer.reference || ''}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, reference: e.target.value }))}
                    placeholder="Referencia (frente al parque, etc.)"
                    className="w-full bg-black/70 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-zinc-400 text-xs font-bold">S/</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={customer.deliveryFee ?? ''}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, deliveryFee: e.target.value }))}
                    placeholder="Costo envío"
                    className="w-full bg-black/70 border border-zinc-800 rounded-xl pl-8 pr-14 py-1.5 text-xs text-emerald-300 font-black placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-2.5 text-[10px] text-zinc-500 font-medium pointer-events-none">
                    Editable
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Input del Nombre del Cliente para Mesa / Llevar / Ir Comiendo */
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerName(val);
                  setCustomer((prev) => ({ ...prev, name: val }));
                }}
                placeholder={
                  isTakeout
                    ? 'Nombre del cliente para el recojo *'
                    : 'Nombre del comensal / mesa...'
                }
                className="w-full bg-black/60 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)] font-semibold"
              />
            </div>
          )}

          {/* Empaques agregados a nivel comanda */}
          {orderPackagings && orderPackagings.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {orderPackagings.map((pkg) => (
                <span
                  key={pkg.packagingId}
                  className="bg-blue-950/40 border border-blue-500/40 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1.5"
                >
                  <Package className="w-3 h-3 text-blue-400" />
                  <span>{pkg.quantity}x {pkg.name} (+{formatCurrency(pkg.total)})</span>
                  <button
                    type="button"
                    onClick={() => removePackaging(pkg.packagingId)}
                    className="hover:text-rose-400 text-zinc-400 font-extrabold cursor-pointer"
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
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 overscroll-contain">
        {items.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-500">
            {isMarketMode ? (
              <Store className="w-10 h-10 mb-2 opacity-30 text-blue-400" />
            ) : (
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
            )}
            <p className="text-xs font-semibold">
              {isMarketMode ? 'Caja sin productos' : 'Comanda vacía'}
            </p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              {isMarketMode
                ? 'Toca cualquier producto para cobrarlo al instante'
                : 'Toca un producto para comandar (da clic sobre él para cambiar opciones)'}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isCustomizable = Boolean(onEditItem);
            const isMarketItem = isMarketMode || !item.requiresKitchen;
            const showCreams = !isMarketItem && item.customization?.creamsSummary && item.customization.creamsSummary !== 'SIN CREMAS';

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
                className="bg-black/40 border border-zinc-800/80 rounded-xl p-2.5 space-y-2 transition-all hover:border-zinc-700"
              >
                {/* Main row: Title, quantity, price */}
                <div
                  onClick={() => isCustomizable && onEditItem && onEditItem(item)}
                  className={`flex items-start justify-between gap-2 ${
                    isCustomizable ? 'cursor-pointer group' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.requiresKitchen && (
                        <Flame className="w-3.5 h-3.5 text-[var(--color-porkos-orange)] shrink-0" />
                      )}
                      <h5 className={`font-bold text-xs sm:text-sm text-white leading-tight truncate ${isCustomizable ? 'group-hover:text-[var(--color-porkos-orange)]' : ''}`}>
                        {item.name}
                      </h5>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {formatCurrency(item.unitPrice)} c/u
                      </span>
                    </div>
                  </div>

                  <span className="font-extrabold text-xs sm:text-sm text-white shrink-0">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>

                {/* Customization Details - Formato Gastronómico Interactivo */}
                {hasDetails && (
                  <div
                    onClick={() => isCustomizable && onEditItem && onEditItem(item)}
                    className="text-[11px] space-y-1 bg-black/60 p-2.5 rounded-xl border border-zinc-800 hover:border-[var(--color-porkos-orange)]/60 transition-all cursor-pointer group"
                  >
                    {/* 1. ENSALADA (PRIMERO EN COMANDA Y VENTA) */}
                    {item.customization?.saladSummary && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-emerald-400 text-[10px] tracking-wider">
                          ENSALADA:
                        </span>
                        <span className="font-bold text-zinc-200">
                          {item.customization.saladSummary}
                        </span>
                      </div>
                    )}

                    {/* 2. PAPAS (LUEGO DE ENSALADA) */}
                    {getPapasText(item.customization) && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-orange-400 text-[10px] tracking-wider">
                          PAPAS:
                        </span>
                        <span className="font-bold text-zinc-200">
                          {getPapasText(item.customization)}
                        </span>
                      </div>
                    )}

                    {/* 3. CREMAS (SOLO EN RESTAURANTE, NUNCA EN MARKET) */}
                    {showCreams && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-orange-400 text-[10px] tracking-wider">
                          CREMAS:
                        </span>
                        <span className="font-bold text-zinc-200">
                          {item.customization.creamsSummary}
                        </span>
                      </div>
                    )}

                    {/* 4. EXTRAS */}
                    {item.customization?.selectedExtras?.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-amber-400 text-[10px] tracking-wider">
                          EXTRAS:
                        </span>
                        <span className="font-bold text-amber-200">
                          {item.customization.selectedExtras
                            .map((e) => {
                              const clean = e.name.replace(/^Extra\s+/i, '');
                              return `${clean}${e.unitPrice ? ` (+${formatCurrency(e.unitPrice)})` : ''}`;
                            })
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {/* 5. EMPAQUE INDIVIDUAL */}
                    {item.customization?.packaging && item.customization.packaging.price > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-blue-400 text-[10px] tracking-wider">
                          EMPAQUE:
                        </span>
                        <span className="font-bold text-blue-300">
                          {item.customization.packaging.name} (+{formatCurrency(item.customization.packaging.price)})
                        </span>
                      </div>
                    )}

                    {/* 6. TEMPERATURA */}
                    {item.customization?.temperature && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-cyan-400 text-[10px] tracking-wider">
                          TEMP:
                        </span>
                        <span className="font-bold text-cyan-300">
                          {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                        </span>
                      </div>
                    )}

                    {/* 7. NOTA */}
                    {item.customization?.itemNotes && (
                      <div className="flex items-start gap-1.5 pt-0.5 border-t border-zinc-800/80">
                        <span className="font-extrabold text-zinc-400 text-[10px] tracking-wider">
                          NOTA:
                        </span>
                        <span className="font-semibold text-amber-300 italic">
                          &ldquo;{item.customization.itemNotes}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Controls: Delete & Quantity */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => removeItem(item.itemId)}
                      className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Eliminar de la comanda"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.itemId, -1)}
                      className="text-zinc-400 hover:text-white p-1 cursor-pointer font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-xs text-white min-w-[16px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.itemId, 1)}
                      className="text-zinc-400 hover:text-white p-1 cursor-pointer font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* General Notes for Order (SOLO en Restaurante) */}
        {!isMarketMode && items.length > 0 && (
          <div className="pt-2">
            <input
              type="text"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Nota general del pedido..."
              className="w-full bg-black/40 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>
        )}
      </div>

      {/* Totals & Actions */}
      <div className="p-3.5 bg-black/60 border-t border-[var(--color-porkos-border)] space-y-3">
        {/* Price Breakdown */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal:</span>
            <span>{formatCurrency(itemsSubtotal)}</span>
          </div>
          {!isMarketMode && packagingsTotal > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Empaques / Tapers:</span>
              <span>{formatCurrency(packagingsTotal)}</span>
            </div>
          )}
          {!isMarketMode && deliveryFee > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Costo Delivery:</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-white font-extrabold text-base pt-1 border-t border-zinc-800">
            <span>Total:</span>
            <span className={isMarketMode ? 'text-blue-400' : 'text-[var(--color-porkos-orange)]'}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Actions diferenciadas para Market vs Restaurante vs Modo Edición */}
        <div className="space-y-2">
          {editingOrder ? (
            /* EN MODO EDICIÓN DE COMANDA EXISTENTE */
            <div className="space-y-2">
              <Button
                onClick={onSaveEditedOrder}
                disabled={items.length === 0 || (modality === 'MESA' && !selectedTable)}
                variant="primary"
                size="lg"
                icon={Check}
                className="w-full text-xs sm:text-sm font-black py-3.5 bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Guardar Cambios Comanda {editingOrder.orderNumber} ({formatCurrency(total)})
              </Button>
              <Button
                onClick={cancelEditingOrder}
                variant="secondary"
                size="sm"
                className="w-full text-xs font-bold py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 cursor-pointer"
              >
                Cancelar Edición
              </Button>
            </div>
          ) : isMarketMode ? (
            /* EN MODO MARKET: Acción directa y limpia de COBRAR */
            <Button
              onClick={onCheckout}
              disabled={items.length === 0}
              variant="primary"
              size="lg"
              className="w-full text-sm sm:text-base font-black bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 py-3.5 cursor-pointer"
            >
              Cobrar {formatCurrency(total)}
            </Button>
          ) : isTableOccupied && selectedTable ? (
            /* EN MESA ABIERTA: Al añadir productos, debe añadir y sumar a la mesa, no cerrar ni cobrar */
            <Button
              onClick={onSendToKitchen}
              disabled={items.length === 0}
              variant="primary"
              size="lg"
              icon={Plus}
              className="w-full text-xs sm:text-sm font-black py-3.5 bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black shadow-lg shadow-orange-500/20 cursor-pointer active:scale-98"
            >
              Añadir y Sumar a {selectedTable.label} (+{formatCurrency(total)})
            </Button>
          ) : (
            /* EN MESA LIBRE, PARA LLEVAR O DELIVERY */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={onSendToKitchen}
                disabled={items.length === 0}
                variant="primary"
                size="md"
                icon={Flame}
                className={`text-xs sm:text-sm font-black py-3 ${
                  modality === 'MESA' && !selectedTable
                    ? 'bg-amber-600 hover:bg-amber-500 text-black border border-amber-400 animate-pulse'
                    : 'bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                }`}
              >
                {modality === 'MESA' && !selectedTable
                  ? '⚠️ Elegir Mesa para Enviar'
                  : selectedTable
                  ? `Abrir comanda (${selectedTable.label})`
                  : hasKitchenItems
                  ? 'Mandar a Cocina'
                  : 'Enviar Pedido'}
              </Button>

              <Button
                onClick={onCheckout}
                disabled={items.length === 0}
                variant="secondary"
                size="md"
                icon={CreditCard}
                className="text-xs font-bold py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer"
              >
                Cobrar en Caja ({formatCurrency(total)})
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

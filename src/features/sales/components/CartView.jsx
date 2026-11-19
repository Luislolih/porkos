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
import ProductThumbnail from '../../../components/ui/ProductThumbnail';

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
        <div className="px-3.5 py-2.5 bg-black/40 border-b border-[var(--color-porkos-border)] space-y-2">
          {/* Banner de Edición de Comanda Activa */}
          {editingOrder && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
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

          {/* Selector de mesa limpio y sobrio sin advertencias visuales */}
          {modality === 'MESA' && !selectedTable && (
            <div className="flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold text-xs">
                <Utensils className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span>Mesa:</span>
              </div>
              <select
                value=""
                onChange={(e) => {
                  const t = tables.find((item) => item.id === e.target.value);
                  if (t) setSelectedTable(t);
                }}
                className="bg-black border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-zinc-500 cursor-pointer"
              >
                <option value="">Seleccionar mesa...</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.status === 'OCCUPIED' ? 'Ocupada' : 'Libre'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Barra de Modalidad y Mesa con alto contraste sin colores fosforescentes */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 font-medium text-[11px] uppercase tracking-wider">Modalidad:</span>
              <span className="font-bold px-2 py-0.5 rounded-md text-[11px] bg-zinc-800 text-zinc-200 border border-zinc-700/70">
                {isTakeout ? '📦 Para Llevar' : isDelivery ? '🛵 Delivery' : isIrComiendo ? '🍽️ Ir Comiendo' : '🍽️ Mesa'}
              </span>
            </div>

            {selectedTable && (
              <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] border ${
                isTableOccupied
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700/70'
              }`}>
                {selectedTable.label} {isTableOccupied ? '(Abierta)' : '(Libre)'}
              </span>
            )}
          </div>

          {/* Atajos para PARA LLEVAR (Empaques dinámicos) */}
          {isTakeout && availablePackagings.length > 0 && (
            <div className="bg-zinc-900/80 border border-zinc-800 p-2 rounded-xl flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-300 font-semibold">
                <ShoppingBag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
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

          {/* Nombre de cliente: indicador compacto si ya está definido en la barra superior o input estilizado */}
          {(customerName || customer.name) ? (
            <div className="flex items-center justify-between text-xs bg-zinc-900/60 px-2.5 py-1 rounded-lg border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-400 min-w-0">
                <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-[11px]">Cliente:</span>
                <span className="text-white font-bold truncate">{customerName || customer.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomerName('');
                  setCustomer((prev) => ({ ...prev, name: '' }));
                }}
                className="text-zinc-500 hover:text-zinc-300 text-[10px] font-bold shrink-0 ml-2"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={customerName || customer.name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerName(val);
                  setCustomer((prev) => ({ ...prev, name: val }));
                }}
                placeholder={
                  isDelivery
                    ? 'Nombre del cliente (Delivery) *'
                    : isTakeout
                    ? 'Nombre del cliente (Recojo) *'
                    : 'Nombre del comensal (opcional)...'
                }
                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-medium"
              />
            </div>
          )}

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
                    className="hover:text-rose-400 text-zinc-400 font-extrabold cursor-pointer ml-0.5"
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
                className="bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-3 space-y-2 transition-colors"
              >
                {/* Main row: Thumbnail, Title, quantity, price */}
                <div
                  onClick={() => isCustomizable && onEditItem && onEditItem(item)}
                  className={`flex items-start justify-between gap-2.5 ${
                    isCustomizable ? 'cursor-pointer group' : ''
                  }`}
                >
                  {/* Miniatura visual interactiva del plato */}
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
                        <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      )}
                      <h5 className={`font-bold text-sm text-zinc-100 leading-snug truncate ${isCustomizable ? 'group-hover:text-[var(--color-porkos-orange)]' : ''}`}>
                        {item.name}
                      </h5>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {formatCurrency(item.unitPrice)} c/u
                      </span>
                    </div>
                  </div>

                  <span className="font-extrabold text-sm text-white shrink-0 pt-0.5">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>

                {/* Customization Details - Formato Gastronómico Limpio y de Alto Contraste */}
                {hasDetails && (
                  <div
                    onClick={() => isCustomizable && onEditItem && onEditItem(item)}
                    className="text-xs space-y-1 bg-black/50 p-2 rounded-lg border border-zinc-800/70 hover:border-zinc-700 transition-colors cursor-pointer group"
                  >
                    {/* 1. ENSALADA */}
                    {item.customization?.saladSummary && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Ensalada:
                        </span>
                        <span className="font-semibold text-zinc-200">
                          {item.customization.saladSummary}
                        </span>
                      </div>
                    )}

                    {/* 2. PAPAS */}
                    {getPapasText(item.customization) && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Papas:
                        </span>
                        <span className="font-semibold text-zinc-200">
                          {getPapasText(item.customization)}
                        </span>
                      </div>
                    )}

                    {/* 3. CREMAS */}
                    {showCreams && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Cremas:
                        </span>
                        <span className="font-semibold text-zinc-200">
                          {item.customization.creamsSummary}
                        </span>
                      </div>
                    )}

                    {/* 4. EXTRAS */}
                    {item.customization?.selectedExtras?.length > 0 && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Extras:
                        </span>
                        <span className="font-semibold text-zinc-200">
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
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Empaque:
                        </span>
                        <span className="font-semibold text-zinc-200">
                          {item.customization.packaging.name} (+{formatCurrency(item.customization.packaging.price)})
                        </span>
                      </div>
                    )}

                    {/* 6. TEMPERATURA */}
                    {item.customization?.temperature && (
                      <div className="flex items-baseline gap-1.5 leading-tight">
                        <span className="font-bold text-zinc-400 text-[10px] uppercase tracking-wider shrink-0">
                          Temp:
                        </span>
                        <span className="font-semibold text-zinc-200">
                          {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                        </span>
                      </div>
                    )}

                    {/* 7. NOTA ESPECIAL */}
                    {item.customization?.itemNotes && (
                      <div className="pt-1 mt-1 border-t border-zinc-800/80">
                        <span className="inline-block bg-amber-500/10 text-amber-300/90 border border-amber-500/20 px-2 py-0.5 rounded text-[11px] font-medium italic">
                          &ldquo;{item.customization.itemNotes}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Controls: Delete & Quantity */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => removeItem(item.itemId)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Eliminar de la comanda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2 bg-zinc-800/80 px-2 py-1 rounded-lg border border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.itemId, -1)}
                      className="text-zinc-400 hover:text-white p-0.5 cursor-pointer font-bold active:scale-95"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-extrabold text-xs text-white min-w-[18px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(item.itemId, 1)}
                      className="text-zinc-400 hover:text-white p-0.5 cursor-pointer font-bold active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Formulario optimizado para DELIVERY al final de los pedidos */}
        {isDelivery && (
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl space-y-2 text-xs shadow-md mt-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
              <div className="flex items-center gap-1.5 text-zinc-200 font-bold text-xs">
                <div className="p-1 rounded-lg bg-zinc-800 text-zinc-300">
                  <Bike className="w-3.5 h-3.5" />
                </div>
                <span>Datos de Envío a Domicilio</span>
              </div>
              <div className="flex items-center gap-1 bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 rounded-lg text-[11px] font-bold text-zinc-300">
                <span className="text-zinc-400 font-normal">Envío:</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
            </div>

            {/* Teléfono / Celular */}
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="tel"
                value={customer.phone || ''}
                onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Celular / WhatsApp *"
                className="w-full bg-black/60 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-medium"
              />
            </div>

            {/* Dirección exacta de entrega */}
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={customer.address || ''}
                onChange={(e) => setCustomer((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Dirección exacta de entrega (calle, número, dpto) *"
                className="w-full bg-black/60 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-medium"
              />
            </div>

            {/* Referencia de entrega & Monto editable de delivery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="relative">
                <Navigation className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={customer.reference || ''}
                  onChange={(e) => setCustomer((prev) => ({ ...prev, reference: e.target.value }))}
                  placeholder="Referencia (frente al parque...)"
                  className="w-full bg-black/60 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
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
                  className="w-full bg-black/60 border border-zinc-800 rounded-lg pl-8 pr-14 py-1.5 text-xs text-zinc-200 font-bold placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                />
                <span className="absolute right-2.5 text-[10px] text-zinc-500 font-medium pointer-events-none">
                  Editable
                </span>
              </div>
            </div>
          </div>
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
            /* EN MESA ABIERTA: Cada pedido se envía individual a cocina o se suma a la mesa */
            <Button
              onClick={onSendToKitchen}
              disabled={items.length === 0}
              variant="primary"
              size="lg"
              icon={hasKitchenItems ? Flame : Plus}
              className="w-full text-xs sm:text-sm font-black py-3.5 bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black shadow-lg shadow-orange-500/20 cursor-pointer active:scale-98"
            >
              {hasKitchenItems
                ? `Mandar a Cocina (${selectedTable.label}) • ${formatCurrency(total)}`
                : `Añadir a ${selectedTable.label} • ${formatCurrency(total)}`}
            </Button>
          ) : (
            /* EN MESA LIBRE, PARA LLEVAR O DELIVERY */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={onSendToKitchen}
                disabled={items.length === 0}
                variant="primary"
                size="md"
                icon={hasKitchenItems ? Flame : Plus}
                className={`text-xs sm:text-sm font-black py-3 ${
                  modality === 'MESA' && !selectedTable
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                    : 'bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                }`}
              >
                {modality === 'MESA' && !selectedTable
                  ? 'Elegir mesa para enviar'
                  : selectedTable
                  ? (hasKitchenItems ? `Abrir comanda (${selectedTable.label})` : `Añadir a ${selectedTable.label}`)
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

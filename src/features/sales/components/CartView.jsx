import { Plus, Minus, Trash2, ShoppingBag, Flame, User, SlidersHorizontal, CheckCircle, Store } from 'lucide-react';
import { useCart } from '../../../context/useCart';
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
  onSettleTable,
  onEditItem,
  isMarketMode = false,
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
    customerName,
    setCustomerName,
    generalNotes,
    setGeneralNotes,
  } = useCart();

  const hasKitchenItems = items.some((item) => item.requiresKitchen);
  const isTableOccupied = selectedTable?.status === 'OCCUPIED';

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
            {isMarketMode ? 'Venta Market (Caja Rápida)' : 'Comanda Actual'}
          </h3>
          <span className="bg-zinc-800 text-zinc-300 font-extrabold text-xs px-2 py-0.5 rounded-full">
            {itemCount}
          </span>
        </div>

        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-zinc-400 hover:text-rose-400 font-medium transition-colors cursor-pointer"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Target status bar: Mesa / Cliente / Modalidad (SOLO en Restaurante) */}
      {!isMarketMode && (
        <div className="px-3.5 py-2.5 bg-black/30 border-b border-[var(--color-porkos-border)] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Modalidad: <strong className="text-white">{modality}</strong></span>
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

          {/* Input del Nombre del Cliente en Comanda Regular */}
          <div className="relative">
            <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente o comensal..."
              className="w-full bg-black/60 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--color-porkos-orange)]"
            />
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {items.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-500">
            {isMarketMode ? (
              <Store className="w-10 h-10 mb-2 opacity-30 text-blue-400" />
            ) : (
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
            )}
            <p className="text-xs font-semibold">
              {isMarketMode ? 'Venta vacía' : 'Comanda vacía'}
            </p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              {isMarketMode
                ? 'Toca un producto para cobrarlo al instante'
                : 'Toca un producto para añadirlo a la comanda'}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.itemId}
              className="bg-black/40 border border-zinc-800/80 rounded-xl p-2.5 space-y-2 transition-all hover:border-zinc-700"
            >
              {/* Main row: Title, quantity, price */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.requiresKitchen && (
                      <Flame className="w-3.5 h-3.5 text-[var(--color-porkos-orange)] shrink-0" />
                    )}
                    <h5 className="font-bold text-xs sm:text-sm text-white leading-tight truncate">
                      {item.name}
                    </h5>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {formatCurrency(item.unitPrice)} c/u
                  </span>
                </div>

                <span className="font-extrabold text-xs sm:text-sm text-white shrink-0">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>

              {/* Customization Details - Formato Gastronómico Interactivo (SOLO si requiere cocina y no es market) */}
              {!isMarketMode && item.requiresKitchen && item.customization && (
                <div
                  onClick={() => onEditItem && onEditItem(item)}
                  className="text-[11px] space-y-1 bg-black/60 p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer group"
                  title="Toca para editar opciones de este producto"
                >
                  {/* PAPAS */}
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

                  {/* CREMAS */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-orange-400 text-[10px] tracking-wider">
                      CREMAS:
                    </span>
                    <span className="font-bold text-zinc-200">
                      {item.customization.creamsSummary || 'SIN CREMAS'}
                    </span>
                  </div>

                  {/* ENSALADA */}
                  {item.customization.saladSummary && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-emerald-400 text-[10px] tracking-wider">
                        ENSALADA:
                      </span>
                      <span className="font-bold text-zinc-200">
                        {item.customization.saladSummary}
                      </span>
                    </div>
                  )}

                  {/* EXTRAS */}
                  {item.customization.selectedExtras?.length > 0 && (
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

                  {/* EMPAQUE INDIVIDUAL */}
                  {item.customization.packaging && item.customization.packaging.price > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-blue-400 text-[10px] tracking-wider">
                        EMPAQUE:
                      </span>
                      <span className="font-bold text-blue-300">
                        {item.customization.packaging.name} (+{formatCurrency(item.customization.packaging.price)})
                      </span>
                    </div>
                  )}

                  {/* TEMPERATURA */}
                  {item.customization.temperature && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-cyan-400 text-[10px] tracking-wider">
                        TEMP:
                      </span>
                      <span className="font-bold text-cyan-300">
                        {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                      </span>
                    </div>
                  )}

                  {/* NOTA */}
                  {item.customization.itemNotes && (
                    <div className="flex items-start gap-1.5 pt-0.5 border-t border-zinc-800/80">
                      <span className="font-extrabold text-zinc-400 text-[10px] tracking-wider">
                        NOTA:
                      </span>
                      <span className="font-semibold text-amber-300 italic">
                        &ldquo;{item.customization.itemNotes}&rdquo;
                      </span>
                    </div>
                  )}

                  {/* Indicador de edición interactiva */}
                  <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-900 group-hover:text-zinc-400">
                    <span>Toca para editar opciones</span>
                    <span className="text-[var(--color-porkos-orange)] font-bold flex items-center gap-1">
                      <SlidersHorizontal className="w-3 h-3" /> Modificar
                    </span>
                  </div>
                </div>
              )}

              {/* Controls: Edit customization, quantity, remove */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeItem(item.itemId)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Eliminar de la venta"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Botón para editar la personalización de este producto */}
                  {!isMarketMode && item.requiresKitchen && onEditItem && (
                    <button
                      onClick={() => onEditItem(item)}
                      className="flex items-center gap-1 text-[10px] font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded-md border border-zinc-700 transition-all cursor-pointer"
                      title="Editar cremas, papas, ensalada, extras o empaque"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-[var(--color-porkos-orange)]" />
                      <span>Modificar</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => updateItemQuantity(item.itemId, -1)}
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-xs text-white min-w-[16px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateItemQuantity(item.itemId, 1)}
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
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
            <span>Total a Cobrar:</span>
            <span className={isMarketMode ? 'text-blue-400' : 'text-[var(--color-porkos-orange)]'}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <div className={`grid gap-2 ${isMarketMode || !hasKitchenItems ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {!isMarketMode && hasKitchenItems && (
              <Button
                onClick={onSendToKitchen}
                disabled={items.length === 0}
                variant="secondary"
                size="md"
                icon={Flame}
                className="text-xs font-bold"
              >
                {selectedTable ? 'Mandar a Cocina (Mesa abierta)' : 'Comanda Cocina'}
              </Button>
            )}

            <Button
              onClick={onCheckout}
              disabled={items.length === 0}
              variant={isMarketMode ? 'primary' : 'primary'}
              size="md"
              className={`text-xs font-black py-3 ${isMarketMode || !hasKitchenItems ? 'w-full text-sm sm:text-base' : ''}`}
            >
              {isMarketMode ? `Cobrar ${formatCurrency(total)} (Venta Rápida)` : `Cobrar ${formatCurrency(total)}`}
            </Button>
          </div>

          {/* Si la mesa está ocupada y se quiere cerrar directamente desde aquí */}
          {!isMarketMode && selectedTable && isTableOccupied && onSettleTable && (
            <Button
              onClick={() => onSettleTable(selectedTable)}
              variant="success"
              size="md"
              fullWidth
              icon={CheckCircle}
              className="text-xs font-black"
            >
              Cobrar y Cerrar Mesa {selectedTable.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

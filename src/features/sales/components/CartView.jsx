import { Plus, Minus, Trash2, ShoppingBag, Flame, Box, User, CheckCircle, SlidersHorizontal } from 'lucide-react';
import { useCart } from '../../../context/useCart';
import { formatCurrency } from '../../../utils/formatters';
import { DEFAULT_PACKAGINGS } from '../../../types/defaultCatalog';
import Button from '../../../components/ui/Button';

export default function CartView({ onSendToKitchen, onCheckout, onSettleTable, onEditItem }) {
  const {
    items,
    updateItemQuantity,
    removeItem,
    clearCart,
    packagings,
    addPackaging,
    removePackaging,
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
          <ShoppingBag className="w-5 h-5 text-[var(--color-porkos-orange)]" />
          <h3 className="font-bold text-sm sm:text-base text-white">
            Comanda Actual
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

      {/* Target status bar: Mesa / Cliente / Modalidad */}
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
        {modality !== 'MARKET' && (
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
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {items.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-zinc-500">
            <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs font-semibold">Comanda vacía</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              Toca un producto para añadirlo
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
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    {item.requiresKitchen && (
                      <Flame className="w-3.5 h-3.5 text-[var(--color-porkos-orange)] shrink-0" />
                    )}
                    <h5 className="font-bold text-xs sm:text-sm text-white leading-tight">
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

              {/* Customization Details */}
              {item.customization && (
                <div className="text-[10px] space-y-0.5 bg-black/60 p-2 rounded-lg border border-zinc-900">
                  {/* Cremas */}
                  {item.customization.creamsSummary && (
                    <div className="flex items-center gap-1 text-zinc-300">
                      <span className="text-zinc-500 font-bold">Cremas:</span>
                      <span className="font-semibold text-orange-300">
                        {item.customization.creamsSummary}
                      </span>
                    </div>
                  )}

                  {/* Ensalada */}
                  {item.customization.saladSummary && (
                    <div className="flex items-center gap-1 text-zinc-300">
                      <span className="text-zinc-500 font-bold">Ensalada:</span>
                      <span className="font-semibold text-emerald-400">
                        {item.customization.saladSummary}
                      </span>
                    </div>
                  )}

                  {/* Temperatura de bebida */}
                  {item.customization.temperature && (
                    <div className="flex items-center gap-1 text-zinc-300">
                      <span className="text-zinc-500 font-bold">Temp:</span>
                      <span className="font-semibold text-cyan-300">
                        {item.customization.temperature === 'HELADA' ? '❄️ Helada' : '🌡️ Sin Helar'}
                      </span>
                    </div>
                  )}

                  {/* Modificadores (Papas) */}
                  {item.customization.selectedModifiers?.map((m) => (
                    <div key={m.groupId} className="text-zinc-400">
                      • {m.optionName}
                    </div>
                  ))}

                  {/* Extras */}
                  {item.customization.selectedExtras?.map((e) => (
                    <div key={e.id} className="text-emerald-400 font-medium">
                      + {e.name} ({formatCurrency(e.unitPrice)})
                    </div>
                  ))}

                  {/* Ingredientes retirados */}
                  {item.customization.removedIngredients?.map((ing) => (
                    <div key={ing} className="text-rose-400 line-through">
                      Sin {ing}
                    </div>
                  ))}

                  {/* Nota */}
                  {item.customization.itemNotes && (
                    <div className="text-amber-400/90 italic">
                      Nota: &quot;{item.customization.itemNotes}&quot;
                    </div>
                  )}
                </div>
              )}

              {/* Controls: Edit customization, quantity, remove */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeItem(item.itemId)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Eliminar de comanda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Botón para editar la personalización de este producto específico */}
                  {item.requiresKitchen && onEditItem && (
                    <button
                      onClick={() => onEditItem(item)}
                      className="flex items-center gap-1 text-[10px] font-bold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded-md border border-zinc-700 transition-all cursor-pointer"
                      title="Editar cremas, papas, ensalada o extras de este ítem"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-[var(--color-porkos-orange)]" />
                      <span>Modificar</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">
                  <button
                    onClick={() => updateItemQuantity(item.itemId, -1)}
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-xs text-white min-w-[16px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateItemQuantity(item.itemId, 1)}
                    className="text-zinc-400 hover:text-white p-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Tapers & Empaques */}
        {items.length > 0 && (
          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-bold flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-zinc-400" /> Tapers & Empaques
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {DEFAULT_PACKAGINGS.map((pkg) => {
                const added = packagings.find((p) => p.packagingId === pkg.id);
                return (
                  <button
                    key={pkg.id}
                    onClick={() => (added ? removePackaging(pkg.id) : addPackaging(pkg))}
                    className={`
                      p-1.5 rounded-lg border text-[11px] font-semibold text-left transition-all flex items-center justify-between cursor-pointer
                      ${
                        added
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                          : 'bg-black/30 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }
                    `}
                  >
                    <span className="truncate">{pkg.name}</span>
                    <span className="shrink-0 font-bold ml-1">
                      {added ? `${added.quantity}x` : `+${formatCurrency(pkg.price)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* General Notes for Order */}
        {items.length > 0 && (
          <div className="pt-2">
            <input
              type="text"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              placeholder="Nota general del pedido (ej. Cliente espera afuera)..."
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
            <span>Subtotal Productos:</span>
            <span>{formatCurrency(itemsSubtotal)}</span>
          </div>
          {packagingsTotal > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Empaques / Tapers:</span>
              <span>{formatCurrency(packagingsTotal)}</span>
            </div>
          )}
          {deliveryFee > 0 && (
            <div className="flex justify-between text-zinc-400">
              <span>Costo Delivery:</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between text-white font-extrabold text-base pt-1 border-t border-zinc-800">
            <span>Total a Cobrar:</span>
            <span className="text-[var(--color-porkos-orange)]">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {hasKitchenItems && (
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
              variant="primary"
              size="md"
              className={`text-xs font-black ${!hasKitchenItems ? 'col-span-2' : ''}`}
            >
              Cobrar {formatCurrency(total)}
            </Button>
          </div>

          {/* Si la mesa está ocupada y se quiere cerrar directamente desde aquí */}
          {selectedTable && isTableOccupied && onSettleTable && (
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

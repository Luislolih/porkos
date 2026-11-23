import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import { isProductBeverage, isProductDessert } from '../../../utils/productCategories';
import ProductThumbnail from '../../../components/ui/ProductThumbnail';

export default function ProductCard({
  product,
  onQuickAdd,
  priority = false,
  isReorderMode = false,
  orderIndex = 0,
  totalItems = 0,
  onMoveUp,
  onMoveDown,
  isPlaceholder = false,
  onPointerDown,
}) {
  const isBeverage = isProductBeverage(product);
  const isDessert = isProductDessert(product);

  const handleClick = (e) => {
    if (isReorderMode) return;
    if (e.target.closest('button')) return;
    onQuickAdd?.(product);
  };

  const handleKeyDown = (e) => {
    if (isReorderMode) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onQuickAdd?.(product);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={isReorderMode ? onPointerDown : undefined}
      data-product-card="true"
      data-product-id={product.id}
      data-reorder-index={orderIndex}
      className={`group relative bg-[#121216] rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 select-none ${
        isPlaceholder
          ? 'border-2 border-dashed border-orange-500/70 bg-orange-500/10 opacity-50 scale-95'
          : isReorderMode
          ? 'cursor-grab active:cursor-grabbing border-2 border-orange-500/40 hover:border-orange-500 hover:shadow-orange-500/15 hover:shadow-lg touch-none'
          : 'border border-[var(--color-porkos-border)] hover:border-zinc-700 hover:ring-1 hover:ring-[var(--color-porkos-orange)]/35 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 active:scale-[0.99] cursor-pointer touch-manipulation'
      }`}
      title={
        isReorderMode
          ? `Arrastra para desplazar o usa las flechas para mover "${product.name}"`
          : `Toca para añadir "${product.name}" a la comanda`
      }
    >
      {/* Badge de posición en modo reordenar */}
      {isReorderMode && (
        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-lg bg-zinc-950/95 border border-orange-500/50 text-[var(--color-porkos-orange)] font-black text-xs shadow-md backdrop-blur-xs select-none pointer-events-none">
          #{orderIndex + 1}
        </div>
      )}

      {/* Handle de arrastre táctil en modo reordenar */}
      {isReorderMode && (
        <div
          className="absolute top-2 right-2 z-20 w-8 h-8 rounded-xl bg-zinc-950/95 border border-orange-500/50 text-[var(--color-porkos-orange)] shadow-md flex items-center justify-center backdrop-blur-xs select-none pointer-events-none"
          title="Arrastra para mover de posición"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Placeholder visual durante el arrastre */}
      {isPlaceholder && (
        <div className="absolute inset-0 z-30 bg-orange-500/15 border-2 border-dashed border-orange-500/80 rounded-2xl flex items-center justify-center pointer-events-none backdrop-blur-[1px]">
          <span className="bg-zinc-950/95 text-[var(--color-porkos-orange)] border border-orange-500/60 font-black text-xs px-2.5 py-1 rounded-xl shadow-lg">
            Moviendo #{orderIndex + 1}
          </span>
        </div>
      )}

      {/* Product Image Area */}
      <div className="relative h-28 sm:h-34 w-full overflow-hidden bg-zinc-950 flex items-center justify-center">
        <ProductThumbnail
          src={product.image}
          thumbnailUrl={product.thumbnailUrl}
          name={product.name}
          isBeverage={isBeverage}
          isDessert={isDessert}
          priority={priority}
          className="w-full h-full object-cover rounded-none transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          iconSize="w-8 h-8 sm:w-10 sm:h-10"
        />
      </div>

      {/* Info inferior: Solo nombre y abajo su precio */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between gap-1.5 bg-[#121216]">
        <h4 className="font-bold text-xs sm:text-sm text-zinc-100 line-clamp-2 group-hover:text-[var(--color-porkos-orange)] transition-colors duration-250 ease-out leading-snug">
          {product.name}
        </h4>

        {/* Precio en la parte inferior y botones de mover si está en modo reordenar */}
        <div className="pt-1 border-t border-zinc-800/60 flex items-center justify-between gap-1">
          <span className="text-[var(--color-porkos-orange)] font-black text-xs sm:text-sm">
            {formatCurrency(product.price)}
          </span>

          {/* Botones rápidos de subir/bajar en modo reordenar */}
          {isReorderMode && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp?.();
                }}
                disabled={orderIndex === 0}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 disabled:pointer-events-none text-zinc-200 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-zinc-700/80 active:scale-95"
                title="Mover arriba / antes en la carta"
                aria-label="Mover arriba"
              >
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown?.();
                }}
                disabled={orderIndex === totalItems - 1}
                className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-20 disabled:pointer-events-none text-zinc-200 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-zinc-700/80 active:scale-95"
                title="Mover abajo / después en la carta"
                aria-label="Mover abajo"
              >
                <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

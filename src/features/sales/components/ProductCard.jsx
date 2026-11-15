import { Plus, SlidersHorizontal, Flame } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import ProductThumbnail from '../../../components/ui/ProductThumbnail';

export default function ProductCard({
  product,
  onQuickAdd,
  onCustomize,
  isMarketMode = false,
}) {
  const hasCustomizations =
    !isMarketMode &&
    (product.creamsConfig?.enabled ||
      product.temperatureConfig?.enabled ||
      product.modifiers?.length > 0 ||
      product.availableExtraIds?.length > 0 ||
      product.saladConfig?.enabled);

  return (
    <div className="group relative bg-[#141414] border border-zinc-800/80 hover:border-zinc-700 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-lg active:scale-[0.99]">
      {/* Product Image */}
      <div
        className="relative h-28 sm:h-32 w-full overflow-hidden bg-zinc-900 cursor-pointer"
        onClick={() => (hasCustomizations ? onCustomize(product) : onQuickAdd(product))}
      >
        <ProductThumbnail
          src={product.image}
          name={product.name}
          className="w-full h-full object-cover rounded-none transition-transform duration-300 group-hover:scale-105"
          iconSize="w-9 h-9"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />

        {/* Badges on image */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {product.requiresKitchen && (
            <span className="bg-black/80 text-zinc-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-zinc-700/60 flex items-center gap-1">
              <Flame className="w-3 h-3 text-[var(--color-porkos-orange)]" /> Cocina
            </span>
          )}
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-2 right-2 bg-black/85 px-2 py-0.5 rounded-lg border border-zinc-800">
          <span className="text-white font-extrabold text-xs sm:text-sm">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <div>
          <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1 group-hover:text-[var(--color-porkos-orange)] transition-colors">
            {product.name}
          </h4>
          {product.description && (
            <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
              {product.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          {/* Quick Add Button */}
          <button
            onClick={() => onQuickAdd(product)}
            className="flex-1 bg-[var(--color-porkos-orange)] hover:bg-orange-500 text-black font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Añadir con opciones predeterminadas"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{isMarketMode ? 'Añadir' : 'Directo'}</span>
          </button>

          {/* Customize Button if it has options */}
          {hasCustomizations && (
            <button
              onClick={() => onCustomize(product)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white p-2 rounded-xl border border-zinc-700/80 transition-all active:scale-95 cursor-pointer"
              title="Personalizar cremas, papas, ensalada o extras"
              aria-label="Personalizar"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { Flame, Plus } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import { isProductBeverage, isProductDessert } from '../../../utils/productCategories';
import ProductThumbnail from '../../../components/ui/ProductThumbnail';

export default function ProductCard({
  product,
  onQuickAdd,
  isMarketMode = false,
}) {
  const isMarketItem = isMarketMode || product.type === 'MARKET' || product.line === 'MARKET';
  const isBeverage = isProductBeverage(product);
  const isDessert = isProductDessert(product);

  const handleClick = () => {
    onQuickAdd(product);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onQuickAdd(product);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group relative bg-[#141414] border border-zinc-800/80 hover:border-[var(--color-porkos-orange)]/60 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-lg active:scale-[0.98] cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[var(--color-porkos-orange)]/50"
      title={`Toca para añadir "${product.name}"`}
    >
      {/* Product Image */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-zinc-900">
        <ProductThumbnail
          src={product.image}
          thumbnailUrl={product.thumbnailUrl}
          name={product.name}
          isBeverage={isBeverage}
          isDessert={isDessert}
          className="w-full h-full object-cover rounded-none transition-transform duration-300 group-hover:scale-105"
          iconSize="w-9 h-9"
        />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />

        {/* Badges on image */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          {product.requiresKitchen && !isMarketItem && (
            <span className="bg-black/80 text-zinc-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-zinc-700/60 flex items-center gap-1 shadow-sm">
              <Flame className="w-3 h-3 text-[var(--color-porkos-orange)]" /> Cocina
            </span>
          )}
          {isBeverage && (
            <span className="bg-black/80 text-cyan-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1 shadow-sm">
              ❄️ Bebida
            </span>
          )}
          {isDessert && (
            <span className="bg-black/80 text-pink-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-pink-500/40 flex items-center gap-1 shadow-sm">
              🍰 Postre
            </span>
          )}
        </div>

        {/* Quick Add floating pill icon */}
        <div className="absolute top-2 right-2 w-7 h-7 rounded-xl bg-black/75 group-hover:bg-[var(--color-porkos-orange)] text-zinc-300 group-hover:text-black flex items-center justify-center transition-colors shadow-md border border-zinc-800 group-hover:border-[var(--color-porkos-orange)]">
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </div>

        {/* Price Tag */}
        <div className="absolute bottom-2 right-2 bg-black/85 px-2 py-0.5 rounded-lg border border-zinc-800 shadow-sm">
          <span className="text-white font-extrabold text-xs sm:text-sm">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-2.5 flex-1 flex flex-col justify-between gap-1.5">
        <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2 group-hover:text-[var(--color-porkos-orange)] transition-colors leading-tight">
          {product.name}
        </h4>
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
          <span>{isMarketItem ? 'Venta Market' : 'Toca para pedir'}</span>
          <span className="text-[var(--color-porkos-orange)] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            + Añadir
          </span>
        </div>
      </div>
    </div>
  );
}

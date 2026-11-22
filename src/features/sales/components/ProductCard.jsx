import { Flame, Plus } from 'lucide-react';
import { formatCurrency } from '../../../utils/formatters';
import { isProductBeverage, isProductDessert } from '../../../utils/productCategories';
import ProductThumbnail from '../../../components/ui/ProductThumbnail';

export default function ProductCard({
  product,
  onQuickAdd,
  isMarketMode = false,
  priority = false,
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
      className="group relative bg-[#121216] border border-[var(--color-porkos-border)] hover:border-zinc-700 hover:ring-1 hover:ring-[var(--color-porkos-orange)]/35 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 active:scale-[0.99] active:duration-100 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[var(--color-porkos-orange)]/50 touch-manipulation"
      title={`Toca para añadir "${product.name}" a la comanda`}
    >
      {/* Product Image Area */}
      <div className="relative h-26 sm:h-32 w-full overflow-hidden bg-zinc-950">
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

        {/* Gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

        {/* Badges superiores */}
        <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap pointer-events-none">
          {product.requiresKitchen && !isMarketItem && (
            <span className="bg-black/85 text-zinc-200 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-zinc-700/60 flex items-center gap-1 shadow-xs">
              <Flame className="w-3 h-3 text-[var(--color-porkos-orange)]" /> Cocina
            </span>
          )}
          {isBeverage && (
            <span className="bg-black/85 text-cyan-300 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-cyan-500/40 flex items-center gap-1 shadow-xs">
              Bebida
            </span>
          )}
          {isDessert && (
            <span className="bg-black/85 text-pink-300 text-[10px] font-black px-1.5 py-0.5 rounded-md border border-pink-500/40 flex items-center gap-1 shadow-xs">
              Postre
            </span>
          )}
        </div>

        {/* Botón flotante para añadir rápido */}
        <div className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black/80 group-hover:bg-[var(--color-porkos-orange)] text-zinc-300 group-hover:text-zinc-950 flex items-center justify-center transition-all duration-250 ease-out group-hover:scale-105 shadow-md border border-zinc-800 group-hover:border-[var(--color-porkos-orange)]">
          <Plus className="w-4 h-4 stroke-[3]" />
        </div>

        {/* Precio destacado */}
        <div className="absolute bottom-2 right-2 bg-black/90 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-zinc-800 shadow-sm pointer-events-none">
          <span className="text-white font-black text-xs sm:text-sm tracking-tight">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>

      {/* Info inferior */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between gap-1.5 bg-[#121216]">
        <h4 className="font-bold text-xs sm:text-sm text-zinc-100 line-clamp-2 group-hover:text-[var(--color-porkos-orange)] transition-colors duration-250 ease-out leading-snug">
          {product.name}
        </h4>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5 font-medium">
          <span className="truncate">{isMarketItem ? 'Venta directa' : 'Personalizable'}</span>
          <span className="text-[var(--color-porkos-orange)] font-black text-[11px] opacity-0 group-hover:opacity-100 transition-all duration-250 ease-out group-hover:translate-x-0.5">
            + Añadir
          </span>
        </div>
      </div>
    </div>
  );
}

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
      <div className="relative h-28 sm:h-34 w-full overflow-hidden bg-zinc-950">
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

        {/* Gradiente suave solo en el borde inferior para contraste del precio */}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

        {/* Badges superiores - VISIBLES SIEMPRE ENCIMA DE LA FOTO (z-20) */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1 flex-wrap pointer-events-none">
          {product.requiresKitchen && !isMarketItem && (
            <span className="bg-zinc-950/95 text-orange-200 text-[10px] font-black px-2 py-0.5 rounded-lg border border-orange-500/40 flex items-center gap-1 shadow-md backdrop-blur-xs">
              <Flame className="w-3 h-3 text-[var(--color-porkos-orange)]" />
              <span>Cocina</span>
            </span>
          )}
          {isBeverage && (
            <span className="bg-zinc-950/95 text-cyan-200 text-[10px] font-black px-2 py-0.5 rounded-lg border border-cyan-500/40 flex items-center gap-1 shadow-md backdrop-blur-xs">
              Bebida
            </span>
          )}
          {isDessert && (
            <span className="bg-zinc-950/95 text-pink-200 text-[10px] font-black px-2 py-0.5 rounded-lg border border-pink-500/40 flex items-center gap-1 shadow-md backdrop-blur-xs">
              Postre
            </span>
          )}
        </div>

        {/* Botón flotante para añadir rápido (z-20) */}
        <div className="absolute top-2 right-2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black/80 group-hover:bg-[var(--color-porkos-orange)] text-zinc-300 group-hover:text-zinc-950 flex items-center justify-center transition-all duration-250 ease-out group-hover:scale-105 shadow-md border border-zinc-700/80 group-hover:border-[var(--color-porkos-orange)]">
          <Plus className="w-4 h-4 stroke-[3]" />
        </div>

        {/* Precio destacado SOBRE LA FOTO (z-20, nunca tapado ni escondido) */}
        <div className="absolute bottom-2 right-2 z-20 bg-zinc-950/95 px-2.5 py-1 rounded-xl border border-zinc-700/80 shadow-lg pointer-events-none backdrop-blur-xs">
          <span className="text-[var(--color-porkos-orange)] font-black text-xs sm:text-sm tracking-tight">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>

      {/* Info inferior */}
      <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between gap-1.5 bg-[#121216]">
        <h4 className="font-bold text-xs sm:text-sm text-zinc-100 line-clamp-2 group-hover:text-[var(--color-porkos-orange)] transition-colors duration-250 ease-out leading-snug">
          {product.name}
        </h4>

        {/* Precio y acción en la parte inferior (sin personalizable / sin venta directa) */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 font-medium">
          <span className="text-white font-black text-xs sm:text-sm">
            {formatCurrency(product.price)}
          </span>
          <span className="text-[var(--color-porkos-orange)] font-black text-[11px] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            + Añadir
          </span>
        </div>
      </div>
    </div>
  );
}

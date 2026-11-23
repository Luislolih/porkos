import { formatCurrency } from '../../../utils/formatters';
import { isProductBeverage, isProductDessert } from '../../../utils/productCategories';
import ProductThumbnail from '../../../components/ui/ProductThumbnail';

export default function ProductCard({
  product,
  onQuickAdd,
  priority = false,
}) {
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
      {/* Product Image Area - Totalmente limpio sin etiquetas ni gradientes para PNGs transparentes */}
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

        {/* Precio en la parte inferior */}
        <div className="pt-1 border-t border-zinc-800/60 flex items-center justify-between">
          <span className="text-[var(--color-porkos-orange)] font-black text-xs sm:text-sm">
            {formatCurrency(product.price)}
          </span>
        </div>
      </div>
    </div>
  );
}

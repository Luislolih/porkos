import { useState } from 'react';
import { UtensilsCrossed, CupSoda, Cake } from 'lucide-react';
import { isProductBeverage, isProductDessert } from '../../utils/productCategories';

/**
 * Componente de miniatura gastronómica de ultra-alto rendimiento:
 * - Si no hay imagen o falla al cargar: muestra el ícono temático correspondiente (bebida, postre, comida).
 * - Si hay imagen: la renderiza nítida y directamente como bloque, sin divs superpuestos que la oculten.
 */
export default function ProductThumbnail({
  src,
  thumbnailUrl,
  alt = '',
  name = '',
  isBeverage,
  isDessert,
  className = 'w-14 h-14',
  iconSize = 'w-6 h-6',
  priority = false,
}) {
  const effectiveSrc = thumbnailUrl || src;
  const [hasError, setHasError] = useState(false);

  const isDrink =
    isBeverage !== undefined
      ? Boolean(isBeverage)
      : isProductBeverage({ name: name || alt });

  const isCake =
    isDessert !== undefined
      ? Boolean(isDessert)
      : isProductDessert({ name: name || alt });

  const roundedClass = className.includes('rounded') ? '' : 'rounded-xl';

  // Si no hay URL o si la carga falló, mostrar el ícono de respaldo temático
  if (!effectiveSrc || hasError) {
    return (
      <div
        className={`${className} ${roundedClass} border flex flex-col items-center justify-center shrink-0 shadow-inner transition-colors ${
          isDrink
            ? 'bg-zinc-900/90 text-sky-400 border-sky-500/25'
            : isCake
            ? 'bg-zinc-900/90 text-pink-400 border-pink-500/25'
            : 'bg-zinc-900/90 text-amber-400/90 border-amber-500/20'
        }`}
      >
        {isDrink ? (
          <CupSoda className={iconSize} />
        ) : isCake ? (
          <Cake className={iconSize} />
        ) : (
          <UtensilsCrossed className={iconSize} />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className} ${roundedClass} shrink-0 overflow-hidden bg-zinc-950 border border-zinc-800/80 shadow-md`}>
      <img
        src={effectiveSrc}
        alt={alt || name}
        onError={() => setHasError(true)}
        className="w-full h-full object-cover block"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="auto"
      />
    </div>
  );
}

import { useState } from 'react';
import { UtensilsCrossed, CupSoda, Cake } from 'lucide-react';
import { isProductBeverage, isProductDessert } from '../../utils/productCategories';

/**
 * Componente de miniatura gastronómica optimizada:
 * - Prioriza la URL de miniatura ligera (240px, ~15KB) antes que la imagen completa de 640px.
 * - Carga perezosa (loading="lazy") y decodificación asíncrona (decoding="async").
 * - Manejo robusto de errores con fallback armónico de categoría (Bebida / Postre / Comida).
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
}) {
  const effectiveSrc = thumbnailUrl || src;
  const [failedSrc, setFailedSrc] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasError = Boolean(effectiveSrc && failedSrc === effectiveSrc);

  const isDrink =
    isBeverage !== undefined
      ? Boolean(isBeverage)
      : isProductBeverage({ name: name || alt });

  const isCake =
    isDessert !== undefined
      ? Boolean(isDessert)
      : isProductDessert({ name: name || alt });

  const roundedClass = className.includes('rounded') ? '' : 'rounded-xl';

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
    <div className={`relative ${className} ${roundedClass} shrink-0 overflow-hidden bg-zinc-900 border border-zinc-800/80 shadow-md`}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          {isDrink ? (
            <CupSoda className={`${iconSize} text-sky-400/30`} />
          ) : isCake ? (
            <Cake className={`${iconSize} text-pink-400/30`} />
          ) : (
            <UtensilsCrossed className={`${iconSize} text-amber-400/30`} />
          )}
        </div>
      )}
      <img
        src={effectiveSrc}
        alt={alt || name}
        onLoad={() => setIsLoaded(true)}
        onError={() => setFailedSrc(effectiveSrc)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

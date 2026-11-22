import { useState } from 'react';
import { UtensilsCrossed, CupSoda, Cake } from 'lucide-react';
import { isProductBeverage, isProductDessert } from '../../utils/productCategories';

/**
 * Componente de miniatura gastronómica de ultra-alto rendimiento:
 * - Renderizado nativo directo e instantáneo (0ms): No oculta la imagen con opacity-0 ni bloquea con estados React.
 * - Capa de fondo con ícono de categoría armónico: actúa de respaldo visual si la red demora o la imagen falla.
 * - Manejo robusto de errores: ante fallas de red, remueve la imagen y deja visible el ícono de la categoría.
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
  const [failedSrc, setFailedSrc] = useState(null);
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
      {/* Respaldo visual en capa de fondo con ícono de categoría */}
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 pointer-events-none">
        {isDrink ? (
          <CupSoda className={`${iconSize} text-sky-400/25`} />
        ) : isCake ? (
          <Cake className={`${iconSize} text-pink-400/25`} />
        ) : (
          <UtensilsCrossed className={`${iconSize} text-amber-400/25`} />
        )}
      </div>

      {/* Imagen directa de alto rendimiento sin retrasos de estado React ni parpadeos */}
      <img
        src={effectiveSrc}
        alt={alt || name}
        onError={() => setFailedSrc(effectiveSrc)}
        className="relative z-1 w-full h-full object-cover"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="auto"
      />
    </div>
  );
}

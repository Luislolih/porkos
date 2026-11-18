import { useState } from 'react';
import { UtensilsCrossed, CupSoda } from 'lucide-react';
import { isProductBeverage } from '../../utils/productCategories';

export default function ProductThumbnail({
  src,
  alt = '',
  name = '',
  isBeverage,
  className = 'w-14 h-14',
  iconSize = 'w-6 h-6',
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const hasError = Boolean(src && failedSrc === src);

  // Solo 2 estados limpios y armónicos: Bebida o Comida (evita marear la vista con múltiples íconos dispares)
  const isDrink =
    isBeverage !== undefined
      ? Boolean(isBeverage)
      : isProductBeverage({ name: name || alt });

  if (!src || hasError) {
    return (
      <div
        className={`${className} rounded-xl border flex flex-col items-center justify-center shrink-0 shadow-inner transition-colors ${
          isDrink
            ? 'bg-zinc-900/90 text-sky-400 border-sky-500/25'
            : 'bg-zinc-900/90 text-amber-400/90 border-amber-500/20'
        }`}
      >
        {isDrink ? (
          <CupSoda className={iconSize} />
        ) : (
          <UtensilsCrossed className={iconSize} />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name}
      onError={() => setFailedSrc(src)}
      className={`${className} rounded-xl object-cover shrink-0 border border-zinc-800/80 shadow-md bg-zinc-900`}
      loading="lazy"
    />
  );
}

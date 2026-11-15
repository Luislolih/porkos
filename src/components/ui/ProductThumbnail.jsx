import { useState } from 'react';
import { Beef, Flame, UtensilsCrossed, CupSoda, Cookie, Utensils } from 'lucide-react';

export default function ProductThumbnail({
  src,
  alt = '',
  name = '',
  className = 'w-14 h-14',
  iconSize = 'w-6 h-6',
}) {
  const [hasError, setHasError] = useState(false);

  // Fallback icon según el tipo de producto
  const getFallbackIcon = () => {
    const lower = (name || alt).toLowerCase();
    if (lower.includes('burger') || lower.includes('hamburguesa') || lower.includes('carne')) {
      return { Icon: Beef, bg: 'bg-amber-950/40 text-amber-400 border-amber-800/40' };
    }
    if (lower.includes('chori') || lower.includes('parrill')) {
      return { Icon: Flame, bg: 'bg-orange-950/40 text-[var(--color-porkos-orange)] border-orange-800/40' };
    }
    if (lower.includes('salchi') || lower.includes('papa')) {
      return { Icon: UtensilsCrossed, bg: 'bg-yellow-950/40 text-yellow-400 border-yellow-800/40' };
    }
    if (lower.includes('kola') || lower.includes('coca') || lower.includes('bebida') || lower.includes('agua') || lower.includes('chicha')) {
      return { Icon: CupSoda, bg: 'bg-cyan-950/40 text-cyan-400 border-cyan-800/40' };
    }
    if (lower.includes('snack') || lower.includes('postre') || lower.includes('brownie')) {
      return { Icon: Cookie, bg: 'bg-stone-900 text-stone-300 border-stone-800' };
    }
    return { Icon: Utensils, bg: 'bg-zinc-900 text-zinc-400 border-zinc-800' };
  };

  const { Icon, bg } = getFallbackIcon();

  if (!src || hasError) {
    return (
      <div
        className={`${className} rounded-xl border flex flex-col items-center justify-center shrink-0 shadow-inner ${bg}`}
      >
        <Icon className={iconSize} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name}
      onError={() => setHasError(true)}
      className={`${className} rounded-xl object-cover shrink-0 border border-zinc-800/80 shadow-md bg-zinc-900`}
      loading="lazy"
    />
  );
}

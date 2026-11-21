import { Loader2 } from 'lucide-react';

export default function IconButton({
  icon: Icon,
  onClick,
  title,
  ariaLabel,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  isLoading = false,
  className = '',
  type = 'button',
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-xl transition-all duration-120 active:scale-[0.94] cursor-pointer select-none disabled:opacity-40 disabled:pointer-events-none touch-manipulation focus:outline-none focus:ring-2 focus:ring-[var(--color-porkos-orange)]/40';

  const sizeClasses = {
    xs: 'w-8 h-8 p-1 text-xs',
    sm: 'w-9 h-9 p-1.5 text-xs',
    md: 'w-11 h-11 p-2.5 text-sm min-h-[44px] min-w-[44px]',
    lg: 'w-12 h-12 p-3 text-base min-h-[48px] min-w-[48px]',
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    ghost:
      'bg-transparent hover:bg-white/5 active:bg-white/10 text-zinc-400 hover:text-white',
    subtle:
      'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80',
    secondary:
      'bg-[var(--color-porkos-surface)] hover:bg-[var(--color-porkos-surface-hover)] active:bg-[var(--color-porkos-surface-active)] text-zinc-200 border border-[var(--color-porkos-border)]',
    primary:
      'bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-zinc-950 shadow-md shadow-orange-500/15',
    danger:
      'bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 text-rose-300 border border-rose-500/30',
  };

  const label = ariaLabel || title || 'Acción';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      title={title}
      aria-label={label}
      className={`
        ${baseClasses}
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.ghost}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes[size] || 'w-5 h-5'} animate-spin shrink-0`} />
      ) : (
        Icon && <Icon className={`${iconSizes[size] || 'w-5 h-5'} shrink-0`} />
      )}
    </button>
  );
}

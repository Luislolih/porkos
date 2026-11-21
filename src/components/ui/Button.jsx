import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  isLoading = false,
  type = 'button',
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-120 active:scale-[0.97] select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 gap-2 touch-manipulation focus:outline-none focus:ring-2 focus:ring-[var(--color-porkos-orange)]/40 focus:ring-offset-1 focus:ring-offset-black';

  const sizeClasses = {
    sm: 'text-xs px-3 py-2 min-h-[38px]',
    md: 'text-sm px-4 py-2.5 min-h-[44px]',
    lg: 'text-base px-5 py-3.5 min-h-[50px]',
    icon: 'p-2.5 min-h-[44px] min-w-[44px]',
  };

  const variantClasses = {
    primary:
      'bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] active:bg-[var(--color-porkos-orange-active)] text-zinc-950 font-black shadow-md shadow-orange-500/15',
    secondary:
      'bg-[var(--color-porkos-surface)] hover:bg-[var(--color-porkos-surface-hover)] active:bg-[var(--color-porkos-surface-active)] text-zinc-100 border border-[var(--color-porkos-border)]',
    outline:
      'bg-transparent hover:bg-white/5 active:bg-white/10 text-zinc-200 border border-[var(--color-porkos-border)] hover:border-zinc-700',
    ghost:
      'bg-transparent hover:bg-white/5 active:bg-white/10 text-[var(--color-porkos-muted)] hover:text-white',
    danger:
      'bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/35 text-rose-300 border border-rose-500/30 hover:border-rose-500/50',
    success:
      'bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50',
    activeTab:
      'bg-[var(--color-porkos-orange)] text-zinc-950 font-black shadow-md shadow-orange-500/20',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.primary}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
      )}
      <span>{children}</span>
      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
      )}
    </button>
  );
}

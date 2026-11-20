export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  icon: Icon,
  fullWidth = false,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-120 active:scale-[0.97] select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 gap-2 touch-manipulation';

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-2 min-h-[40px]',
    md: 'text-sm px-4 py-2.5 min-h-[44px]',
    lg: 'text-base px-5 py-3.5 min-h-[50px]',
    icon: 'p-2.5 min-h-[44px] min-w-[44px]',
  };

  const variantClasses = {
    primary:
      'bg-[var(--color-porkos-orange)] hover:bg-[var(--color-porkos-orange-hover)] text-black shadow-lg shadow-orange-500/10 font-bold',
    secondary:
      'bg-[var(--color-porkos-surface)] hover:bg-[var(--color-porkos-surface-hover)] text-white border border-[var(--color-porkos-border)]',
    outline:
      'bg-transparent hover:bg-white/5 text-[var(--color-porkos-light)] border border-[var(--color-porkos-border)]',
    ghost:
      'bg-transparent hover:bg-white/5 text-[var(--color-porkos-muted)] hover:text-white',
    danger:
      'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30',
    success:
      'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30',
    activeTab:
      'bg-[var(--color-porkos-orange)] text-black font-bold shadow-md shadow-orange-500/20',
  };

  return (
    <button
      type={type}
      disabled={disabled}
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
      {Icon && <Icon className="w-5 h-5 shrink-0" />}
      {children}
    </button>
  );
}

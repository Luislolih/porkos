export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon,
}) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-bold',
  };

  const variantClasses = {
    default: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    orange: 'bg-orange-500/20 text-[var(--color-porkos-orange)] border border-orange-500/40',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
    danger: 'bg-rose-500/20 text-rose-400 border border-rose-500/40',
    blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.default}
        ${className}
      `}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      {children}
    </span>
  );
}

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon,
  dot = false,
}) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-bold',
    md: 'text-xs px-2.5 py-1 font-bold',
    lg: 'text-sm px-3 py-1.5 font-black',
  };

  const variantClasses = {
    default: 'bg-zinc-800 text-zinc-300 border border-zinc-700/80',
    neutral: 'bg-zinc-900/90 text-zinc-300 border border-zinc-800',
    orange: 'bg-orange-500/15 text-[var(--color-porkos-orange)] border border-orange-500/35',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/35',
    warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/35',
    danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/35',
    blue: 'bg-blue-500/15 text-blue-300 border border-blue-500/35',
    purple: 'bg-purple-500/15 text-purple-300 border border-purple-500/35',
    outline: 'bg-transparent text-zinc-300 border border-zinc-700',
  };

  const dotClasses = {
    default: 'bg-zinc-400',
    neutral: 'bg-zinc-400',
    orange: 'bg-[var(--color-porkos-orange)]',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
    outline: 'bg-zinc-400',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border tracking-wide uppercase select-none shrink-0
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.default}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[variant] || 'bg-zinc-400'}`}
        />
      )}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

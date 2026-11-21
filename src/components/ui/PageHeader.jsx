export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  className = '',
}) {
  return (
    <div
      className={`
        flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4
        pb-4 mb-4 border-b border-[var(--color-porkos-border)]
        ${className}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[var(--color-porkos-orange)] shadow-xs shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 truncate max-w-xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

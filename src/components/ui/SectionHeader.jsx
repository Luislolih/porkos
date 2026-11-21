export default function SectionHeader({
  title,
  subtitle,
  badge,
  action,
  className = '',
}) {
  return (
    <div className={`flex items-center justify-between gap-3 pb-2.5 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
            {title}
          </h2>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {subtitle && (
          <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

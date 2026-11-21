import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center p-8 sm:p-12
        rounded-3xl border border-dashed border-[var(--color-porkos-border)]
        bg-[var(--color-porkos-surface)]/40 space-y-3.5 ${className}
      `}
    >
      {Icon && (
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shadow-inner">
          <Icon className="w-7 h-7 sm:w-8 sm:h-8" />
        </div>
      )}

      <div className="space-y-1 max-w-sm">
        <h4 className="text-base sm:text-lg font-black text-zinc-200 tracking-tight">
          {title}
        </h4>
        {description && (
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="pt-2">
          {action.render ? (
            action.render()
          ) : (
            <Button
              type="button"
              variant={action.variant || 'primary'}
              size={action.size || 'sm'}
              onClick={action.onClick}
              icon={action.icon}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

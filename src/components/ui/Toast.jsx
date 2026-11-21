import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({
  message,
  type = 'success', // 'success' | 'error' | 'warning' | 'info'
  onClose,
  duration = 2600,
  action,
}) {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      Icon: CheckCircle2,
      border: 'border-emerald-500/50',
      bg: 'bg-[#101F18]',
      iconColor: 'text-emerald-400',
      textColor: 'text-emerald-200',
    },
    error: {
      Icon: AlertCircle,
      border: 'border-rose-500/50',
      bg: 'bg-[#221215]',
      iconColor: 'text-rose-400',
      textColor: 'text-rose-200',
    },
    warning: {
      Icon: AlertTriangle,
      border: 'border-amber-500/50',
      bg: 'bg-[#221A10]',
      iconColor: 'text-amber-400',
      textColor: 'text-amber-200',
    },
    info: {
      Icon: Info,
      border: 'border-blue-500/50',
      bg: 'bg-[#101824]',
      iconColor: 'text-blue-400',
      textColor: 'text-blue-200',
    },
  }[type] || {
    Icon: CheckCircle2,
    border: 'border-emerald-500/50',
    bg: 'bg-[#101F18]',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-200',
  };

  const { Icon, border, bg, iconColor, textColor } = config;

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm w-full animate-fade-in-smooth pointer-events-auto"
    >
      <div
        className={`
          flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md
          ${border} ${bg}
        `}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
          <p className={`text-xs sm:text-sm font-bold truncate ${textColor}`}>
            {message}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="text-xs font-black px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              {action.label}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

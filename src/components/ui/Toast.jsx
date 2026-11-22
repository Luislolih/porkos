import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({
  message,
  type = 'success', // 'success' | 'error' | 'warning' | 'info'
  onClose,
  duration = 1400,
  action,
  position = 'top', // 'top' | 'bottom'
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
      border: 'border-emerald-500/40',
      bg: 'bg-[#101F18]/95',
      iconColor: 'text-emerald-400',
      textColor: 'text-emerald-200',
    },
    error: {
      Icon: AlertCircle,
      border: 'border-rose-500/40',
      bg: 'bg-[#221215]/95',
      iconColor: 'text-rose-400',
      textColor: 'text-rose-200',
    },
    warning: {
      Icon: AlertTriangle,
      border: 'border-amber-500/40',
      bg: 'bg-[#221A10]/95',
      iconColor: 'text-amber-400',
      textColor: 'text-amber-200',
    },
    info: {
      Icon: Info,
      border: 'border-blue-500/40',
      bg: 'bg-[#101824]/95',
      iconColor: 'text-blue-400',
      textColor: 'text-blue-200',
    },
  }[type] || {
    Icon: CheckCircle2,
    border: 'border-emerald-500/40',
    bg: 'bg-[#101F18]/95',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-200',
  };

  const { Icon, border, bg, iconColor, textColor } = config;

  if (!message) return null;

  const isTop = position === 'top';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed ${
        isTop ? 'top-4 left-1/2 -translate-x-1/2' : 'bottom-6 right-4 sm:right-6'
      } z-50 max-w-sm sm:max-w-md w-auto pointer-events-auto transition-all animate-fade-in-smooth px-3`}
    >
      <div
        className={`
          flex items-center justify-between gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full border shadow-xl backdrop-blur-md
          ${border} ${bg}
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
          <p className={`text-xs sm:text-sm font-black truncate ${textColor}`}>
            {message}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="text-xs font-black px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              {action.label}
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-0.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { AlertTriangle, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Confirmar acción?',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  isLoading = false,
}) {
  const iconConfig = {
    danger: {
      Icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/15 border-rose-500/30',
      btnVariant: 'danger',
    },
    warning: {
      Icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15 border-amber-500/30',
      btnVariant: 'primary',
    },
    info: {
      Icon: Info,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15 border-blue-500/30',
      btnVariant: 'primary',
    },
  }[variant] || {
    Icon: AlertTriangle,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15 border-rose-500/30',
    btnVariant: 'danger',
  };

  const { Icon, color, bg, btnVariant } = iconConfig;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? undefined : onClose}
      maxWidth="max-w-md"
      showClose={!isLoading}
    >
      <div className="text-center space-y-4 pt-1 pb-2">
        <div
          className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border shadow-lg ${bg}`}
        >
          <Icon className={`w-7 h-7 ${color}`} />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-white tracking-tight">{title}</h3>
          {message && (
            <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full text-xs font-bold py-2.5"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={btnVariant}
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-full text-xs font-black py-2.5"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

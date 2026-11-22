import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-lg',
  showClose = true,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal_title' : undefined}
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
    >
      {/* Backdrop con desenfoque suave */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-200 touch-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor del Modal */}
      <div
        className={`
          relative w-full ${maxWidth} bg-[#121215]
          border border-[var(--color-porkos-border)] shadow-2xl shadow-black/95
          rounded-2xl sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[88vh]
          z-10 my-auto animate-modal-enter overflow-hidden
        `}
      >
        {/* Cabecera del Modal */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--color-porkos-border)] bg-[#15151A] shrink-0">
            <div className="min-w-0 pr-3">
              {title && (
                <h3
                  id="modal_title"
                  className="text-base sm:text-lg font-black text-white tracking-tight truncate"
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Contenido / Campos con scroll fluido */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 overscroll-contain flex-1">
          {children}
        </div>

        {/* Footer sticky opcional */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 border-t border-[var(--color-porkos-border)] bg-[#15151A] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';
import { scrollIntoViewCenter } from '../../utils/scrollIntoViewHelper';

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
  const contentRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    lockScroll();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Auto-scroll al elemento activo para asegurar visibilidad en móviles y pantallas medianas
    const container = contentRef.current;
    const handleFocusIn = (e) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        scrollIntoViewCenter(target, 80);
        scrollIntoViewCenter(target, 240);
      }
    };

    if (container) {
      container.addEventListener('focusin', handleFocusIn);
    }

    return () => {
      unlockScroll();
      window.removeEventListener('keydown', handleKeyDown);
      if (container) {
        container.removeEventListener('focusin', handleFocusIn);
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal_title' : undefined}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
    >
      {/* Backdrop con desenfoque suave */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-200 touch-none z-0"
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
        <div ref={contentRef} className="p-4 sm:p-6 overflow-y-auto space-y-4 overscroll-contain flex-1">
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

  if (typeof document !== 'undefined') {
    return createPortal(modalNode, document.body);
  }
  return modalNode;
}

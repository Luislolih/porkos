import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  showClose = true,
}) {
  useEffect(() => {
    if (!isOpen) return;

    // Prevenir scroll en el fondo mientras el modal está abierto
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Cerrar modal al presionar Escape
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop con desenfoque suave y color mate */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor del Formulario / Modal */}
      <div
        className={`
          relative w-full ${maxWidth} bg-[#141414]
          border border-zinc-800/90 shadow-2xl shadow-black/95
          rounded-2xl sm:rounded-3xl flex flex-col max-h-[92vh] sm:max-h-[88vh]
          z-10 my-auto animate-modal-enter overflow-hidden
        `}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800/90 bg-[#161616] shrink-0">
          <div className="min-w-0 pr-3">
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
              {title}
            </h3>
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

        {/* Contenido / Campos del formulario con scroll fluido y contenido */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

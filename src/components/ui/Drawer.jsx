import { useEffect } from 'react';
import { X } from 'lucide-react';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  position = 'bottom', // 'bottom' | 'right'
  className = '',
}) {
  useEffect(() => {
    if (!isOpen) return;

    lockScroll();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unlockScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {position === 'bottom' ? (
        /* Bottom Sheet (Mobile First) */
        <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col max-h-[92vh] bg-[#121215] border-t border-[var(--color-porkos-border)] rounded-t-3xl shadow-2xl animate-drawer-bottom overflow-hidden">
          {/* Drag handle */}
          <div
            className="w-full pt-3 pb-1 flex justify-center cursor-pointer select-none"
            onClick={onClose}
          >
            <div className="w-12 h-1.5 bg-zinc-700/80 rounded-full" />
          </div>

          {/* Header */}
          {(title || onClose) && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-[var(--color-porkos-border)] shrink-0">
              <div className="min-w-0 pr-3">
                {title && (
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className={`p-4 sm:p-6 overflow-y-auto space-y-4 overscroll-contain flex-1 ${className}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t border-[var(--color-porkos-border)] bg-[#15151A] shrink-0">
              {footer}
            </div>
          )}
        </div>
      ) : (
        /* Right Slide-over */
        <div className="fixed inset-y-0 right-0 z-10 flex flex-col w-full max-w-md bg-[#121215] border-l border-[var(--color-porkos-border)] shadow-2xl animate-fade-in-smooth overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-porkos-border)] bg-[#15151A] shrink-0">
            <div className="min-w-0 pr-3">
              {title && (
                <h3 className="text-lg font-black text-white tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className={`p-5 overflow-y-auto space-y-4 overscroll-contain flex-1 ${className}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="p-4 border-t border-[var(--color-porkos-border)] bg-[#15151A] shrink-0">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

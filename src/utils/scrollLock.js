/**
 * Utilidad global segura para gestión de scroll del body en presencia de múltiples modales/drawers.
 * Implementa conteo de referencias para evitar que un modal que se cierre antes o en transición
 * restaure indebidamente un estado bloqueado 'hidden' o 'touchAction: none'.
 */

let lockCount = 0;

export function lockScroll() {
  if (typeof document === 'undefined') return;
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }
}

export function unlockScroll() {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('touch-action');
  }
}

export function forceUnlockScroll() {
  if (typeof document === 'undefined') return;
  lockCount = 0;
  document.body.style.removeProperty('overflow');
  document.body.style.removeProperty('touch-action');
}

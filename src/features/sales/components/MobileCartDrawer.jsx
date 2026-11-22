import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * MobileCartDrawer — Deslizador táctil de comanda optimizado con Leyes UX:
 * 
 * - Ley de Fitts: Zona táctil superior amplia y ergonómica (40px) fácil de interactuar en móviles.
 * - Ley de Continuidad: Animación de entrada y salida orgánica sin saltos abruptos.
 * - Manipulación Directa y Física:
 *    • Arrastre 1:1 en tiempo real acelerado por hardware (GPU).
 *    • Amortiguación elástica tipo rubber-banding al intentar arrastrar hacia arriba.
 *    • Inercia y detección de velocidad (flick/swipe hacia abajo para cerrar rápido).
 *    • Snap-back elástico si el arrastre no supera el umbral.
 * - Umbral de Doherty: Respuesta táctil inmediata (< 50ms) sin caídas de frames.
 * - Persistencia DOM: Mantiene el contenido caliente en memoria para apertura instantánea (0ms) sin recargar fotos.
 * - Feedback Háptico: Micro-vibración táctil al cruzar el umbral de cierre.
 */
export default function MobileCartDrawer({ isOpen, onClose, children }) {
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const sheetRef = useRef(null);
  const touchStateRef = useRef({
    startY: 0,
    startX: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
    isDragging: false,
    directionDecided: false,
    isVertical: false,
    hapticFired: false,
  });

  const handleTriggerClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    // Animar hacia abajo antes de ocultar
    setDragY(typeof window !== 'undefined' ? window.innerHeight : 600);
    setTimeout(() => {
      setIsClosing(false);
      setDragY(0);
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  // Prevenir scroll en el fondo (body) mientras la comanda esté abierta
  const isCurrentlyOpen = isOpen && !isClosing;
  useEffect(() => {
    if (!isCurrentlyOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleTriggerClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCurrentlyOpen, handleTriggerClose]);

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0 || isClosing) return;
    const touch = e.touches[0];
    const now = Date.now();

    touchStateRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      lastY: touch.clientY,
      lastTime: now,
      velocity: 0,
      isDragging: true,
      directionDecided: false,
      isVertical: false,
      hapticFired: false,
    };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    const state = touchStateRef.current;
    if (!state.isDragging || !e.touches || e.touches.length === 0 || isClosing) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const currentX = touch.clientX;
    const deltaY = currentY - state.startY;
    const deltaX = currentX - state.startX;
    const now = Date.now();

    // Determinar dirección inicial para no interferir con deslizamientos horizontales
    if (!state.directionDecided) {
      if (Math.abs(deltaY) > 4 || Math.abs(deltaX) > 4) {
        state.directionDecided = true;
        state.isVertical = Math.abs(deltaY) > Math.abs(deltaX);
      }
      if (!state.isVertical) return;
    }

    if (!state.isVertical) return;

    // Calcular velocidad instantánea (px / ms)
    const dt = now - state.lastTime;
    if (dt > 0) {
      state.velocity = (currentY - state.lastY) / dt;
    }
    state.lastY = currentY;
    state.lastTime = now;

    // Física de manipulación directa:
    // Si deltaY > 0 (deslizando hacia abajo): traslación 1:1
    // Si deltaY < 0 (intentando deslizar hacia arriba): resistencia elástica tipo rubber-banding
    if (deltaY > 0) {
      setDragY(deltaY);

      // Micro-vibración háptica al superar el umbral donde soltar cerrará la comanda
      const closeThreshold = 100;
      if (!state.hapticFired && (deltaY > closeThreshold || state.velocity > 0.45)) {
        state.hapticFired = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch {
            // Ignorar si el navegador no permite vibración
          }
        }
      } else if (state.hapticFired && deltaY < closeThreshold - 30) {
        state.hapticFired = false;
      }
    } else {
      // Amortiguación logarítmica elástica (Apple-style rubber banding)
      const damped = -Math.pow(Math.abs(deltaY), 0.72);
      setDragY(damped);
    }
  };

  const handleTouchEnd = () => {
    const state = touchStateRef.current;
    if (!state.isDragging || isClosing) return;
    state.isDragging = false;
    setIsDragging(false);

    const sheetHeight = sheetRef.current?.offsetHeight || 600;
    const currentDragY = dragY;
    const velocity = state.velocity;

    // Criterios ergonómicos de cierre según Leyes UX:
    // 1. Gesto rápido de barrido (flick/swipe hacia abajo con velocidad > 0.45 px/ms y recorrido mínimo > 25px)
    // 2. O arrastre pausado que supere 110px o el 20% de la altura de la comanda
    const isFlickClose = velocity > 0.45 && currentDragY > 25;
    const isDistanceClose = currentDragY > 110 || currentDragY > sheetHeight * 0.20;

    if (isFlickClose || isDistanceClose) {
      handleTriggerClose();
    } else {
      // Snap-back elástico natural a la posición de apertura
      setDragY(0);
    }
  };

  const handleTouchCancel = () => {
    touchStateRef.current.isDragging = false;
    setIsDragging(false);
    setDragY(0);
  };

  // Opacidad del fondo oscuro sincronizada suavemente con el desplazamiento
  const backdropOpacity = Math.max(0, Math.min(1, 1 - dragY / 320));
  const isThresholdPassed = dragY > 100;

  return (
    <div
      className={`lg:hidden fixed inset-0 z-50 flex flex-col justify-end overscroll-contain transition-[visibility] duration-200 ${
        isCurrentlyOpen || isClosing ? 'visible' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!isCurrentlyOpen}
    >
      {/* Fondo con desenfoque y desvanecimiento progresivo */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm touch-none transition-opacity duration-200"
        style={{
          opacity: isCurrentlyOpen ? backdropOpacity : 0,
          pointerEvents: isCurrentlyOpen ? 'auto' : 'none',
          transition: isDragging ? 'none' : 'opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={handleTriggerClose}
        aria-hidden="true"
      />

      {/* Contenedor de la Comanda Desplegable */}
      <div
        ref={sheetRef}
        className="relative z-10 max-h-[90vh] h-full flex flex-col bg-[var(--color-porkos-surface)] rounded-t-3xl border-t border-[var(--color-porkos-border)] shadow-2xl overflow-hidden overscroll-contain will-change-transform pb-[env(safe-area-inset-bottom)]"
        style={{
          transform: isCurrentlyOpen
            ? `translateY(${dragY}px)`
            : 'translateY(100%)',
          transition: isDragging
            ? 'none'
            : 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Barra superior de arrastre ergonómica (Touch Target Ley de Fitts: 38px) */}
        <div
          className="w-full py-3 px-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shrink-0 touch-none bg-black/45 border-b border-zinc-800/80 group select-none active:bg-black/60 transition-colors"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onClick={() => {
            // Si fue un tap limpio en la barra sin arrastre, ofrecer cierre intuitivo
            if (Math.abs(dragY) < 6) {
              handleTriggerClose();
            }
          }}
          title="Desliza hacia abajo para cerrar la comanda"
        >
          {/* Indicador visual / tirador táctil dinámico */}
          <div
            className={`h-1.5 rounded-full transition-all duration-150 ${
              isDragging
                ? isThresholdPassed
                  ? 'w-20 bg-[var(--color-porkos-orange)] shadow-md shadow-orange-500/40 ring-2 ring-orange-500/30'
                  : 'w-18 bg-zinc-300'
                : 'w-14 bg-zinc-500 group-hover:bg-zinc-300'
            }`}
          />
          <span
            className={`text-[10px] font-bold tracking-wider uppercase mt-1 transition-opacity duration-150 ${
              isDragging && isThresholdPassed
                ? 'text-[var(--color-porkos-orange)] opacity-100'
                : 'text-zinc-500 opacity-60'
            }`}
          >
            {isDragging && isThresholdPassed ? 'Suelta para cerrar' : 'Desliza para cerrar'}
          </span>
        </div>

        {/* Contenido de la Comanda (CartView persistente en memoria) */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

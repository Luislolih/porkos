/**
 * Utilidades ergonómicas para redirigir la vista y asegurar que el usuario
 * siempre vea lo que escribe al hacer foco en un input o textarea.
 * 
 * Funciona de forma inteligente tanto en escritorio como en dispositivos móviles,
 * dando un pequeño margen de tiempo para que el teclado virtual se despliegue
 * y el viewport se recalcule sin saltos bruscos.
 */

/**
 * Desplaza suavemente un elemento hacia el centro visible de su contenedor con scroll.
 * @param {HTMLElement} element - El elemento que recibió foco.
 * @param {number} delay - Milisegundos de espera para el despliegue del teclado virtual.
 */
export function scrollIntoViewCenter(element, delay = 160) {
  if (!element || typeof element.scrollIntoView !== 'function') return;

  const performScroll = () => {
    try {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    } catch {
      try {
        element.scrollIntoView(false);
      } catch {
        // Fallback silencioso si el navegador no soporta scrollIntoView
      }
    }
  };

  if (delay > 0) {
    setTimeout(performScroll, delay);
  } else {
    performScroll();
  }
}

/**
 * Handler directo para pasar a onFocus en inputs y textareas.
 * @param {React.FocusEvent} e 
 * @param {number} delay 
 */
export function handleInputFocusScroll(e, delay = 160) {
  const target = e?.currentTarget || e?.target;
  if (!target) return;

  // Ejecución inmediata ligera y segunda ejecución tras animación del teclado móvil
  scrollIntoViewCenter(target, 50);
  scrollIntoViewCenter(target, delay);
}

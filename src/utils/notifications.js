/**
 * Utilidad de Notificaciones PWA para PORKOAPP.
 * Gestiona permisos del navegador/sistema operativo y emisión de alertas de comandas.
 * Soporta Service Worker showNotification y fallback nativo para todos los navegadores.
 */

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isSecureContextEnvironment() {
  return typeof window !== 'undefined' ? Boolean(window.isSecureContext) : true;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Obtiene el ServiceWorkerRegistration de manera confiable y sin bloqueos agresivos.
 */
async function getActiveSWRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    // 1. Obtener registro existente de inmediato si ya está disponible
    let reg = await navigator.serviceWorker.getRegistration();
    if (reg && (reg.active || reg.installing || reg.waiting)) {
      return reg;
    }

    // 2. Esperar a que esté listo con timeout de 3.5s
    reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 3500)),
    ]);
    return reg;
  } catch {
    // 3. Intentar registrar de inmediato si aún no existía
    try {
      return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (e) {
      console.warn('No se pudo registrar ServiceWorker para notificaciones:', e);
      return null;
    }
  }
}

/**
 * Solicita permisos de notificación al usuario al estilo PWA.
 * Debe ejecutarse dentro de un evento de interacción del usuario (ej: clic).
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return {
      status: 'unsupported',
      message: 'Las notificaciones no están soportadas en este navegador o requiere agregar la app a la Pantalla de Inicio en iOS.',
    };
  }

  try {
    let permission;
    // Soporte para navegadores basados en Promesas y basados en Callback
    if (typeof Notification.requestPermission === 'function') {
      const res = Notification.requestPermission();
      if (res && typeof res.then === 'function') {
        permission = await res;
      } else {
        permission = await new Promise((resolve) => Notification.requestPermission(resolve));
      }
    }

    if (permission === 'granted') {
      await sendTestNotification();
      return {
        status: 'granted',
        message: '¡Permisos concedidos! Se envió una notificación de prueba a tu dispositivo.',
      };
    } else if (permission === 'denied') {
      return {
        status: 'denied',
        message: 'Las notificaciones fueron bloqueadas en el navegador.',
      };
    } else {
      return {
        status: 'default',
        message: 'Solicitud de permisos pospuesta.',
      };
    }
  } catch (error) {
    console.error('Error solicitando permisos de notificación:', error);
    return {
      status: 'error',
      message: 'Error al solicitar permisos: ' + (error?.message || error),
    };
  }
}

/**
 * Emite una notificación de prueba para verificar que el sistema operativo la muestre.
 */
export async function sendTestNotification() {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false;

  const title = '🔥 PORKOAPP — Notificaciones Activas';
  const options = {
    body: 'Tu dispositivo está listo para recibir alertas de nuevas comandas de cocina.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    tag: 'porko-test-notification',
    renotify: true,
    data: { url: '/' },
  };

  // Vibrar en dispositivos móviles compatibles
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {
      void e;
    }
  }

  // 1. Intentar primero mediante Service Worker (imprescindible en Android Chrome y PWA)
  const reg = await getActiveSWRegistration();
  if (reg && typeof reg.showNotification === 'function') {
    try {
      await reg.showNotification(title, options);
      return true;
    } catch (e) {
      console.warn('Fallback tras error en reg.showNotification:', e);
    }
  }

  // 2. Fallback directo a la API nativa de Notification (Desktop / Safari macOS)
  if (typeof Notification === 'function') {
    try {
      const notif = new Notification(title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn('Error mostrando notificación nativa directa:', e);
    }
  }

  return false;
}

/**
 * Emite una notificación del sistema cuando ingresa una nueva comanda.
 */
export async function sendOrderNotification(order) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false;
  if (!order || !order.orderNumber) return false;

  try {
    const modalityLabel =
      order.modality === 'PARA_LLEVAR'
        ? 'Para Llevar'
        : order.modality === 'DELIVERY'
        ? 'Delivery'
        : order.modality === 'CONSUMO_EXTERNO'
        ? 'Ir Comiendo'
        : order.tableName || 'Mesa';

    const customer = order.customerName || order.customer?.name ? ` • ${order.customerName || order.customer?.name}` : '';
    const itemsCount =
      order.items?.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0) || order.items?.length || 0;

    const itemsSummary =
      order.items
        ?.slice(0, 3)
        .map((i) => `${i.quantity || 1}x ${i.name}`)
        .join(', ') || '';

    const title = `🔔 Comanda #${order.orderNumber} (${modalityLabel})`;
    const body = `${itemsCount} producto${itemsCount > 1 ? 's' : ''}${customer}\n${itemsSummary}`;

    const options = {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: `order-${order.orderNumber}`,
      renotify: true,
      vibrate: [250, 100, 250, 100, 250],
      data: {
        url: '/',
        orderNumber: order.orderNumber,
      },
      actions: [
        { action: 'open', title: 'Ver en Cocina' },
      ],
    };

    // Vibración táctil en móvil
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([250, 100, 250, 100, 250]);
      } catch (e) {
        void e;
      }
    }

    // 1. Intentar mediante Service Worker (requerido en Android Chrome)
    const reg = await getActiveSWRegistration();
    if (reg && typeof reg.showNotification === 'function') {
      try {
        await reg.showNotification(title, options);
        return true;
      } catch (e) {
        console.warn('Fallback a notificación directa para comanda:', e);
      }
    }

    // 2. Fallback directo a la API nativa (Desktop Chrome / Safari / Edge)
    if (typeof Notification === 'function') {
      try {
        const notif = new Notification(title, {
          body: options.body,
          icon: options.icon,
          tag: options.tag,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        return true;
      } catch (err) {
        console.warn('Error mostrando notificación nativa:', err);
      }
    }

    return false;
  } catch (error) {
    console.warn('Error emitiendo notificación de comanda:', error);
    return false;
  }
}

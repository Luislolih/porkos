import { useState, useEffect, useCallback } from 'react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  sendOrderNotification,
} from '../utils/notifications';

/**
 * Hook para gestionar permisos y emisión de notificaciones PWA.
 */
export function useNotifications() {
  const [supported] = useState(() => isNotificationSupported());
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Escuchar si el permiso cambia en el documento cuando el usuario lo modifica
  useEffect(() => {
    if (!supported) return;

    const checkPermission = () => {
      setPermission(getNotificationPermission());
    };

    window.addEventListener('focus', checkPermission);
    return () => {
      window.removeEventListener('focus', checkPermission);
    };
  }, [supported]);

  const request = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await requestNotificationPermission();
      setPermission(res.status);
      setMessage(res.message);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const test = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await sendTestNotification();
      if (!ok) {
        setMessage('No se pudo emitir la notificación. Revisa los permisos.');
      }
      return ok;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    supported,
    permission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
    loading,
    message,
    requestPermission: request,
    sendTestNotification: test,
    sendOrderNotification,
    clearMessage: () => setMessage(null),
  };
}

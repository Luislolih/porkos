import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Comprobador activo de nueva versión desplegada (evita que celulares queden en versiones viejas)
async function checkForAppVersion() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.version) return;

    const stored = localStorage.getItem('porkos_build_version');
    if (!stored) {
      localStorage.setItem('porkos_build_version', data.version);
    } else if (stored !== data.version) {
      console.log(`[PORKOAPP] Nueva versión detectada (${data.version} vs ${stored}). Actualizando caché...`);
      localStorage.setItem('porkos_build_version', data.version);
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((k) => caches.delete(k)));
      }
      window.location.reload();
    }
  } catch {
    // Modo offline: ignorar
  }
}

// Registrar Service Worker para modo offline y Notificaciones PWA con actualización inmediata
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let isReloading = false;

  // 1. Cuando un nuevo Service Worker toma el control, recargar para servir los nuevos bundles de Vite
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!isReloading) {
      isReloading = true;
      window.location.reload();
    }
  });

  const registerSW = async () => {
    try {
      // updateViaCache: 'none' obliga al navegador a saltarse la caché HTTP al verificar sw.js
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      // Forzar verificación de actualización de inmediato al cargar la app
      reg.update().catch(() => {});
      checkForAppVersion();

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });

      // 2. Comprobación periódica cada 3 minutos en segundo plano
      setInterval(() => {
        reg.update().catch(() => {});
        checkForAppVersion();
      }, 3 * 60 * 1000);

      // 3. Cuando el usuario desbloquea el celular o vuelve a la pestaña, comprobar actualización
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
          checkForAppVersion();
        }
      });

      window.addEventListener('focus', () => {
        reg.update().catch(() => {});
        checkForAppVersion();
      });
    } catch (err) {
      console.warn('Registro de Service Worker:', err?.message);
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

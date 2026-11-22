// PORKOAPP Service Worker - Modo Fuera de Línea
const CACHE_NAME = 'porkoapp-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.svg',
];

// 1. Instalación: precargar shell de la aplicación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: limpiar caches antiguas y tomar control de clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Estrategia de Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo interceptar peticiones GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // No interceptar llamadas a la API de Firebase ni WebSockets de Firestore
  // (Firestore maneja su propia persistencia en IndexedDB)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('firebasestorage.app')
  ) {
    return;
  }

  // A. Peticiones de navegación (cargar la página HTML)
  // Estrategia: Red primero, fallback a caché de index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // B. Archivos estáticos locales (JS, CSS, imágenes, fuentes)
  // Estrategia: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Manejador de Notificaciones Push entrantes (Web Push API)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'PORKOAPP', body: event.data.text() };
    }
  }

  const title = data.title || '🔔 Nueva Comanda en PORKOAPP';
  const options = {
    body: data.body || 'Se ha registrado una nueva comanda para cocina.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [250, 100, 250, 100, 250],
    tag: data.tag || 'porko-order',
    renotify: true,
    data: {
      url: data.url || '/',
      orderNumber: data.orderNumber,
    },
    actions: [
      { action: 'open', title: 'Abrir Cocina' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Clic en la Notificación (Traer la app al frente o abrirla)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// PORKOAPP Service Worker - Modo Fuera de Línea con Auto-Actualización
const BUILD_ID = '__BUILD_ID__';
const CACHE_NAME = `porkoapp-cache-${BUILD_ID}`;

// NUNCA precachear index.html estáticamente: index.html debe ser siempre Network-First
// para garantizar que los celulares carguen inmediatamente los scripts de la nueva versión
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.png',
  '/favicon.png?v=2',
  '/apple-touch-icon.png',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/pwa-icon-maskable.png',
];

// Permitir forzar activación inmediata mediante mensajes
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 1. Instalación: precargar activos estáticos mínimos y forzar activación inmediata
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación: limpiar de inmediato caches antiguas de la aplicación
// NOTA UX: Conservar IMAGE_CACHE_NAME para que las imágenes de productos carguen al instante (0ms)
const IMAGE_CACHE_NAME = 'porkoapp-images-v2';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== IMAGE_CACHE_NAME) {
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

  // NUNCA interceptar sw.js ni version.json para que el navegador siempre compruebe si hay nueva versión
  if (
    url.pathname.endsWith('/sw.js') ||
    url.pathname.endsWith('/version.json') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/version.json'
  ) {
    return;
  }

  // En desarrollo local (Vite HMR, módulos /src/, localhost, puerto 5173),
  // NUNCA interceptar con caché para garantizar cambios inmediatos sin contenido estancado
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.port === '5173' ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.includes('node_modules') ||
    url.search.includes('t=')
  ) {
    return;
  }

  // 1. Filtrar peticiones a las APIs de datos de Firebase (Firestore, Auth, Functions)
  // Dejamos que Firestore maneje su propia persistencia en IndexedDB
  const isFirebaseDataApi =
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com');

  if (isFirebaseDataApi) {
    return;
  }

  // 2. Caché de Alto Rendimiento para IMÁGENES (Firebase Storage, fotos de catálogo, comandas)
  // Estrategia: Cache-First con Stale-While-Revalidate (0ms de latencia percibida)
  const isImageRequest =
    request.destination === 'image' ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('firebasestorage.app') ||
    /\.(webp|png|jpg|jpeg|svg|gif|avif)$/i.test(url.pathname);

  if (isImageRequest) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // A. Peticiones de navegación (cargar la página HTML)
  // Estrategia: ESTRICTAMENTE Red Primero (Network-First con no-cache)
  // Solo usa la copia en caché si el celular está completamente fuera de línea (sin internet)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // B. Archivos estáticos con hash de Vite (JS, CSS, imágenes)
  // Estrategia: Cache-First con revalidación y purga automática
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
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

const CACHE_NAME = 'actas-dti-v37';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css?v=37',
  './brand/css/variables.css?v=15',
  './brand/css/typography.css?v=15',
  './brand/css/buttons.css?v=15',
  './brand/css/forms.css?v=15',
  './js/app.js?v=37',
  './js/html2pdf.bundle.min.js',
  './js/signature.js',
  './brand/pwa-icon-192.png',
  './brand/pwa-icon-512.png',
  './brand/apple-touch-icon.png',
  './brand/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Some assets could not be precached:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar peticiones API, Cloud DB o GAS Proxy (siempre a la red)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('restful-api.dev') || url.hostname.includes('script.google.com')) {
    return;
  }

  // Network-first para scripts, estilos y HTML (siempre el código más reciente, con fallback offline)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html') || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : null)))
    );
    return;
  }

  // Stale-while-revalidate para imágenes y fuentes estáticas
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});


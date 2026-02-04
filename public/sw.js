/* public/sw.js - LMRA Pro v9.8 Sentinel */

// Let op: De versie wordt automatisch geüpdatet door je build script, 
// maar het is goed om hier vast de structuur correct te hebben.
const CACHE_NAME = 'lmra-sentinel-v9.8.8';

const ASSETS_TO_CACHE = [
  '/',                // De landingspagina (Voor marketing offline)
  '/index.html',      // Expliciete verwijzing naar landing
  '/app.html',        // <--- CRUCIAAL: DE APPLICATIE ZELF (Dit ontbrak!)
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
  // Vite assets (JS/CSS) worden automatisch gecached door de 'fetch' handler hieronder
];

// 1. Installatie: Cache de basis bestanden (Nu inclusief app.html!)
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forceer direct activeren
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching core assets (Landing + App)');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activatie: Ruim oude caches op
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 3. Fetch: Network First, falling back to Cache
self.addEventListener('fetch', (event) => {
  // Negeer API calls naar Supabase
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Als we online zijn: return response EN update de cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Als we offline zijn: probeer de cache
        return caches.match(event.request);
      })
  );
});
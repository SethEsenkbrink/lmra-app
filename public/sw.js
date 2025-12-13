/* public/sw.js - LMRA Pro v9.8 Sentinel */

const CACHE_NAME = 'lmra-sentinel-v9.8.4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
  // Vite bouwt de JS/CSS bestanden met hash-namen (bv index-a1b2.js).
  // De 'fetch' handler hieronder zal die automatisch cachen zodra ze bezocht worden.
];

// 1. Installatie: Cache de basis bestanden
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forceer direct activeren
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activatie: Ruim oude caches op (Cruciaal voor versie updates!)
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

// 3. Fetch: Network First, falling back to Cache (Veiligste voor updates)
self.addEventListener('fetch', (event) => {
  // Negeer API calls naar Supabase (die moeten live zijn of via database.ts queue gaan)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Als we online zijn: return response EN stop hem in de cache voor later
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
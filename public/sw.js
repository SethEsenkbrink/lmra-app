/* public/sw.js - LMRA Pro v9.8 Sentinel */

// Let op: De versie wordt automatisch geüpdatet door je build script, 
// maar het is goed om hier vast de structuur correct te hebben.
const CACHE_NAME = 'lmra-sentinel-v9.8.10';

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

// 3. Fetch: Stale-While-Revalidate voor assets, Network-First voor navigatie
self.addEventListener('fetch', (event) => {
  // Negeer API calls naar Supabase of browser extensies
  if (event.request.url.includes('supabase.co') || event.request.url.startsWith('chrome-extension')) {
    return;
  }

  // Voor HTML navigatie (index.html, app.html) behouden we Network-First zodat gebruikers altijd de laatste versie krijgen als ze online zijn
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-While-Revalidate voor alle andere bestanden (JS, CSS, images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Haal in de achtergrond altijd een nieuwe op
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        // Negeer netwerkfouten tijdens background update
      });

      // Geef direct cache terug als we die hebben, anders wacht op netwerk
      return cachedResponse || fetchPromise;
    })
  );
});
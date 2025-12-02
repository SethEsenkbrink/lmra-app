/* sw.js - Service Worker voor LMRA Pro v8.0 */
const CACHE_NAME = 'lmra-pro-v8-0-cache';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  /* Externe bibliotheken cachen voor offline snelheid */
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js'
];

/* 1. Installatie: Cache de bestanden */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching files');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

/* 2. Activatie: Oude caches opruimen bij updates */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

/* 3. Fetch: Serveer uit cache als internet weg is, anders haal van netwerk */
self.addEventListener('fetch', (event) => {
  // Alleen GET requests cachen (POST/PUT naar API moet altijd live)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Is het in de cache? Geef dat terug. Zo niet? Haal van internet.
      return cachedResponse || fetch(event.request);
    })
  );
});
/* sw.js - Service Worker voor LMRA Pro v8.2 */
const CACHE_NAME = 'lmra-pro-v8-2-cache'; // AANGEPAST NAAR v8-2
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html', // Toegevoegd voor offline support van admin
  '/style.css',
  '/app.js',
  '/manifest.json',
  /* Externe bibliotheken cachen voor offline snelheid */
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js',
  'https://identity.netlify.com/v1/netlify-identity-widget.js' // Identity widget cachen
];

/* 1. Installatie: Cache de bestanden */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching files v8.2');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Forceer direct actief worden
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

  // Netlify functies en Identity NOOIT cachen
  if (event.request.url.includes('/.netlify/') || event.request.url.includes('identity.netlify.com')) {
      return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Netwerk eerst strategie voor HTML (zodat updates direct zichtbaar zijn), fallback naar cache
      if (event.request.headers.get('accept').includes('text/html')) {
          return fetch(event.request)
            .catch(() => cachedResponse || caches.match('/index.html'));
      }
      
      // Voor assets: Cache eerst, dan netwerk
      return cachedResponse || fetch(event.request);
    })
  );
});
/* sw.js - Service Worker voor LMRA Pro v8.2 (Patch 1) */
// We voegen '-patch' toe om browsers te dwingen de nieuwe regels te laden
const CACHE_NAME = 'lmra-pro-v8-2-patch-cache'; 

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  // '/admin.html',  <-- VERWIJDERD! Admin moet altijd live zijn voor beveiliging
  '/style.css',
  '/app.js',
  '/manifest.json',
  /* Externe bibliotheken cachen voor offline snelheid */
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js',
  'https://identity.netlify.com/v1/netlify-identity-widget.js'
];

/* 1. Installatie */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching files v8.2 Patch');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/* 2. Activatie: Oude caches opruimen */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          // Verwijder alles wat niet de huidige patch is
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

/* 3. Fetch */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // NEGEER: Netlify functies, Identity EN de Admin pagina
  if (url.includes('/.netlify/') || url.includes('identity.netlify.com') || url.includes('/admin.html')) {
      return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (event.request.headers.get('accept').includes('text/html')) {
          return fetch(event.request)
            .catch(() => cachedResponse || caches.match('/index.html'));
      }
      return cachedResponse || fetch(event.request);
    })
  );
});
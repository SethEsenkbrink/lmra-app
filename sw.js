/* sw.js - Service Worker v8.2 (Sentinel Clean) */
const CACHE_NAME = 'lmra-pro-v8.2-clean'; 

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/tailwind.config.js',
  '/manifest.json',
  /* Externe libs - GEEN Identity Widget meer */
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.4/purify.min.js'
];

/* 1. Installatie */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching files (Clean Version)');
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

/* 3. Fetch Strategie */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Negeer API calls en Netlify interne calls
  if (url.includes('/.netlify/')) {
      return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Netwerk-eerst voor HTML (altijd de nieuwste versie)
      if (event.request.headers.get('accept').includes('text/html')) {
          return fetch(event.request)
            .catch(() => cachedResponse || caches.match('/index.html'));
      }
      // Cache-eerst voor assets (css, js, images)
      return cachedResponse || fetch(event.request);
    })
  );
});
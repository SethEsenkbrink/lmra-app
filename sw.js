/* sw.js - Service Worker v9.0 (Sentinel Safe) */
const CACHE_NAME = 'lmra-sentinel-v9.0'; 

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/tailwind.config.js',
  '/manifest.json',
  /* Externe libs (CDN) - Worden gecached voor offline gebruik */
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.4/purify.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

/* 1. Installatie */
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forceer direct de nieuwe versie
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching v9.0 Sentinel assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
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
  // Alleen GET requests
  if (event.request.method !== 'GET') return;
  
  // Supabase API calls niet cachen (altijd live data)
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Netwerk-eerst voor HTML (altijd de nieuwste versie proberen)
      if (event.request.headers.get('accept').includes('text/html')) {
          return fetch(event.request)
            .catch(() => cachedResponse || caches.match('/index.html'));
      }
      // Cache-eerst voor assets (snelheid)
      return cachedResponse || fetch(event.request);
    })
  );
});
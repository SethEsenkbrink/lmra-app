/* sw.js - Service Worker v8.2 (Sentinel Final) */
const CACHE_NAME = 'lmra-pro-v8.2-sentinel-final'; 

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  // '/admin.html', <-- Admin nooit cachen (veiligheid)
  '/style.css',
  '/app.js',
  '/tailwind.config.js', // NIEUW: Styling config
  '/manifest.json',
  /* Externe libs */
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.2.4/purify.min.js', // NIEUW: Versie 3.2.4
  'https://identity.netlify.com/v1/netlify-identity-widget.js'
];

/* 1. Installatie */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching files Sentinel Final');
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
  // Alleen GET verzoeken
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // NEGEER: Netlify functies, Identity, Admin pagina en Admin logica
  if (
      url.includes('/.netlify/') || 
      url.includes('identity.netlify.com') || 
      url.includes('/admin.html') ||
      url.includes('/admin.js') // Admin JS ook niet cachen
  ) {
      return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Netwerk-eerst voor HTML (zodat updates snel zichtbaar zijn), fallback naar cache
      if (event.request.headers.get('accept').includes('text/html')) {
          return fetch(event.request)
            .catch(() => cachedResponse || caches.match('/index.html'));
      }
      // Cache-eerst voor assets
      return cachedResponse || fetch(event.request);
    })
  );
});
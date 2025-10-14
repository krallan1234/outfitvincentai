// Service Worker for PWA offline support with safe updates
const VERSION = 'v3-2025-10-14';
const CACHE_STATIC = `outfit-ai-static-${VERSION}`;
const CACHE_RUNTIME = `outfit-ai-runtime-${VERSION}`;
const CACHE_IMAGES = `outfit-ai-images-${VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/apple-touch-icon.png',
];

// Cache size limits
const MAX_RUNTIME_CACHE = 50;
const MAX_IMAGE_CACHE = 100;

self.addEventListener('install', (event) => {
  // Activate new SW immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (![CACHE_STATIC, CACHE_RUNTIME, CACHE_IMAGES].includes(key)) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Always network-first for navigations/HTML to avoid stale pages
  const acceptsHTML = request.headers.get('accept')?.includes('text/html');
  if (request.mode === 'navigate' || acceptsHTML) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          // Optionally cache the latest index.html
          const copy = response.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(url.pathname === '/' ? '/' : request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((res) => res || caches.match('/index.html')))
    );
    return;
  }

  // API requests - Network first with cache fallback
  if (url.pathname.includes('/functions/') || url.pathname.includes('/rest/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_RUNTIME).then((cache) => {
              cache.put(request, clone);
              trimCache(CACHE_RUNTIME, MAX_RUNTIME_CACHE);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Images - Network first to surface updates immediately
  if (request.destination === 'image' || url.pathname.startsWith('/images/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_IMAGES).then((cache) => {
              cache.put(request, clone);
              trimCache(CACHE_IMAGES, MAX_IMAGE_CACHE);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Other static assets - Cache first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      );
    })
  );
});

// Trim cache to size limit
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxItems);
  }
}

// Optional background sync placeholder
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outfits') {
    event.waitUntil((async () => console.log('Syncing outfits...'))());
  }
});


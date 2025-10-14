// Service Worker for PWA offline support
const CACHE_NAME = 'outfit-ai-v2';
const RUNTIME_CACHE = 'outfit-ai-runtime-v2';
const IMAGE_CACHE = 'outfit-ai-images-v2';

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

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event - Network first for API, Cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API requests - Network first with cache fallback
  if (url.pathname.includes('/functions/') || url.pathname.includes('/rest/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
              trimCache(RUNTIME_CACHE, MAX_RUNTIME_CACHE);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Images - Cache first with network fallback
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(IMAGE_CACHE).then(cache => {
              cache.put(request, responseClone);
              trimCache(IMAGE_CACHE, MAX_IMAGE_CACHE);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Other requests - Cache first
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      return cachedResponse || fetch(request).then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => caches.match('/'))
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

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!validCaches.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Background sync for offline outfit generation
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outfits') {
    event.waitUntil(syncOutfits());
  }
});

async function syncOutfits() {
  // Handle background sync for saved outfits
  console.log('Syncing outfits...');
}

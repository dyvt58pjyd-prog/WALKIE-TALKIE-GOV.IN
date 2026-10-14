// BHARAT-COM Tactical Radio Service Worker // Anti-Cache & Live Sync
const CURRENT_VERSION = 'bharat-com-v-live-2026';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map(key => {
          console.log('[SW] Purging stale tactical cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Let WebSocket and non-GET requests pass directly through
  if (event.request.method !== 'GET' || event.request.url.startsWith('ws')) {
    return;
  }

  // Always fetch fresh from network to guarantee zero stale credential leakage
  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => {
      return caches.match(event.request);
    })
  );
});

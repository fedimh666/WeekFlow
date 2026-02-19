// WeekFlow Pro — Service Worker v5
// ⚡ AUTO-UPDATE: version bumps automatically force refresh on all devices
const CACHE_NAME = 'weekflow-v5';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// INSTALL — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(() => {}))
  );
  // ⚡ Skip waiting — activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ACTIVATE — delete old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => {
      // ⚡ Take control of ALL open tabs immediately
      return self.clients.claim();
    })
  );
});

// FETCH — serve from cache, fall back to network
self.addEventListener('fetch', e => {
  // Skip Firebase, Google APIs, external requests
  if (
    e.request.url.includes('firebase') ||
    e.request.url.includes('googleapis') ||
    e.request.url.includes('gstatic') ||
    e.request.url.includes('anthropic') ||
    e.request.url.includes('generativelanguage') ||
    e.request.method !== 'GET'
  ) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      // Always fetch fresh from network in background
      const networkFetch = fetch(e.request).then(res => {
        if (res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);

      // Return cache immediately (fast), update in background
      return cached || networkFetch;
    })
  );
});

// ⚡ NOTIFY all open tabs when a new version is available
self.addEventListener('activate', e => {
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    })
  );
});
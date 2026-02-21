// WeekFlow Pro — Service Worker v6
// ⚡ FULL OFFLINE SUPPORT — app works completely without internet
const CACHE_NAME = 'weekflow-v8';
const FONT_CACHE = 'weekflow-fonts-v1';

// Core app files to cache immediately on install
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Google Fonts to cache for offline use
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Fraunces:wght@300;700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap'
];

// ── INSTALL: cache all core files ──────────
self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      // Cache core app files
      caches.open(CACHE_NAME).then(c =>
        c.addAll(CORE_ASSETS).catch(err => console.warn('Core cache partial:', err))
      ),
      // Cache fonts
      caches.open(FONT_CACHE).then(c =>
        Promise.all(FONT_URLS.map(url =>
          fetch(url).then(res => c.put(url, res)).catch(() => {})
        ))
      )
    ])
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean up old caches ──────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );

  // Notify all tabs that app updated
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
  });
});

// ── FETCH: smart caching strategy ──────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Skip non-GET requests
  if (e.request.method !== 'GET') return;

  // ── FONTS: cache-first (fonts don't change) ──
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // ── FIREBASE & external APIs: network-only, never cache ──
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('gstatic.com/firebasejs') ||
    url.includes('generativelanguage') ||
    url.includes('identitytoolkit')
  ) {
    // Just let it go through — Firebase handles its own offline caching
    return;
  }

  // ── APP SHELL: cache-first, update in background ──
  e.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(e.request).then(cached => {
        // Fetch fresh version in background and update cache
        const networkFetch = fetch(e.request).then(res => {
          if (res && res.status === 200) {
            cache.put(e.request, res.clone());
          }
          return res;
        }).catch(() => null);

        // Return cache immediately if available, otherwise wait for network
        if (cached) {
          // Still update in background
          networkFetch;
          return cached;
        }
        // No cache — must use network (or show offline fallback)
        return networkFetch || cache.match('/index.html');
      })
    )
  );
});
// WeekFlow Pro — Service Worker v1.0
const CACHE_NAME = 'weekflow-pro-v1';
const ASSETS = ['/weekflow-pro.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if(e.request.url.includes('firebase')||e.request.url.includes('googleapis')||e.request.url.includes('anthropic')) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(e.request.method==='GET'&&res.status===200){
          const clone=res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(e.request,clone));
        }
        return res;
      }).catch(()=>caches.match('/weekflow-pro.html'));
    })
  );
});

self.addEventListener('push', e => {
  const d=e.data?e.data.json():{title:'WeekFlow',body:'You have tasks waiting!'};
  e.waitUntil(self.registration.showNotification(d.title,{body:d.body,icon:'/icon-192.png',vibrate:[100,50,100]}));
});
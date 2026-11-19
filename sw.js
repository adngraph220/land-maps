// Land Maps service worker — app shell precache + per-city packs in Cache Storage
const SHELL = 'shell-v2';
const SHELL_FILES = ['./', './index.html', './leaflet.js', './leaflet.css', './manifest.json',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

// Strategy: cache-first for everything under our scope (shell + city packs).
// cities/index.json → network-first so new cities appear; falls back to cache offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('cities/index.json')) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(SHELL).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    // opportunistically cache shell files; city files are cached explicitly by the page
    if (SHELL_FILES.some(f => url.pathname.endsWith(f.replace('./', '/')))) { const copy = r.clone(); caches.open(SHELL).then(c => c.put(e.request, copy)); }
    return r;
  })));
});

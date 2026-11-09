const CACHE_NAME = 'djaco-pwa-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass service worker untuk folder /admin (agar Basic Auth htaccess dan data admin tidak terganggu/tercache)
  if (url.pathname.startsWith('/admin')) {
    return;
  }

  // Apps Script dan QRIS dinamis harus tetap network-first agar data transaksi/stock tidak basi.
  if (url.hostname.includes('script.google.com') || url.hostname.includes('quickchart.io')) {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html').then(res => res || caches.match('/offline.html'))));
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    }).catch(() => caches.match('/offline.html')))
  );
});

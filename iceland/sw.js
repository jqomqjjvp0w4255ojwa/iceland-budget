const CACHE_NAME = 'iceland-budget-v19.3';

const ASSETS = [
  '/iceland-budget/iceland/',
  '/iceland-budget/iceland/index.html',
  '/iceland-budget/iceland/manifest.json',
  '/iceland-budget/iceland/app.js',
  '/iceland-budget/iceland/sprites.js',
  '/iceland-budget/iceland/render.js',
  '/iceland-budget/iceland/render-cards.js',
  '/iceland-budget/iceland/render-info.js',
  '/iceland-budget/iceland/render-ledger.js',
  '/iceland-budget/iceland/scene.js',
  '/iceland-budget/iceland/forms.js',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((cache) => {
        if (cache !== CACHE_NAME) return caches.delete(cache);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
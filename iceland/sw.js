const CACHE_NAME = 'iceland-budget-v19.8';

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

// Stale-while-revalidate：快取優先，背景更新
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Google Sheets API 和天氣 API：永遠走網路
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('open-meteo.com') ||
      url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // 靜態資源：快取優先，背景更新
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request).then((res) => {
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});
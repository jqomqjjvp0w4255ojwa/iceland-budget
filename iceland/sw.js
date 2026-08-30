
const CACHE_NAME = 'iceland-budget-v23.90'

const ASSETS = [
  '/iceland-budget/iceland/',
  '/iceland-budget/iceland/index.html',
  '/iceland-budget/iceland/manifest.json',
  '/iceland-budget/iceland/config.js',
  '/iceland-budget/iceland/app.js',
  '/iceland-budget/iceland/sprites.js',
  '/iceland-budget/iceland/render.js',
  '/iceland-budget/iceland/render-cards.js',
  '/iceland-budget/iceland/render-info.js',
  '/iceland-budget/iceland/render-ledger.js',
  '/iceland-budget/iceland/scene.js',
  '/iceland-budget/iceland/forms.js',
  '/iceland-budget/iceland/map.html',
  '/iceland-budget/shared/pixelpad.js',
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
  const url = new URL(event.request.url);

  // API 請求（GAS、天氣）：有網路就走網路，沒網路就算了
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('open-meteo.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // 靜態檔案：有網路走網路，沒網路用快取
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

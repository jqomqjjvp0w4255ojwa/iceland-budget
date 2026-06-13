// 台灣版 service worker
// ⚠ CACHE_NAME 與快取路徑都是 taiwan 專用，與 iceland 版完全分開，
//   兩個 PWA 同時安裝也不會互相打架。
const CACHE_NAME = 'taiwan-diary-v2.0'

const ASSETS = [
  '/iceland-budget/taiwan/',
  '/iceland-budget/taiwan/index.html',
  '/iceland-budget/taiwan/stats.html',
  '/iceland-budget/taiwan/manifest.json',
  '/iceland-budget/taiwan/config.js',
  '/iceland-budget/taiwan/sprites.js',
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
        // 只清掉 taiwan 自己的舊版快取，不碰 iceland 的
        if (cache !== CACHE_NAME && cache.startsWith('taiwan-')) return caches.delete(cache);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API 請求：有網路就走網路，沒網路就算了
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('workers.dev') ||
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

// 每次你修改了 index.html 內容，請順便把這個版本號往上加
const CACHE_NAME = 'iceland-budget-v13.2';

const ASSETS = [
  '/iceland-budget/iceland/',
  '/iceland-budget/iceland/index.html',
  '/iceland-budget/iceland/manifest.json',
  '/iceland-budget/iceland/app.js',
  '/iceland-budget/iceland/sprites.js'
];

// 安裝時強制跳過等待
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 激活時立刻接管網頁，並刪除舊快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 網路請求攔截（維持離線瀏覽功能）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

const CACHE_NAME = "iceland-budget-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

// Install: cache static files
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Google Sheets API → Network first, fall back to cache
// - Everything else → Cache first, fall back to network
self.addEventListener("fetch", (e) => {
  const url = e.request.url;

  if (url.includes("docs.google.com/spreadsheets")) {
    // Network first for live data
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache first for static assets
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
  }
});

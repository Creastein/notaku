const CACHE_NAME = "notaku-cache-v2";

// Precache offline page + core assets
const urlsToCache = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/icon-maskable-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Don't cache API requests or Next.js hot-reloading
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/_next/webpack-hmr")) {
    return;
  }

  // Network First, fallback to cache, then offline page
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // On network error, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Navigation requests → branded offline page
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }
          return new Response("Network error happened", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
          });
        });
      })
  );
});

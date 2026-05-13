const CACHE_NAME = "notaku-cache-v1";

// Add basic files to cache for offline fallback
const urlsToCache = [
  "/",
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

  // Network First, fallback to cache
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
          // If not in cache and navigating to a page, return offline fallback if we had one
          // Since it's a SPA-like app, returning the root might work, or just let it fail
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Network error happened", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
          });
        });
      })
  );
});

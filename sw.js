/* sw.js — v16 (simple, reliable cache for GitHub Pages) */
const CACHE_NAME = "cc-v16";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Network-first for HTML (so updates show quickly)
    const accept = req.headers.get("accept") || "";
    const isHTML = accept.includes("text/html");

    if (isHTML) {
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(req);
        return cached || caches.match("./index.html");
      }
    }

    // Cache-first for everything else
    const cached = await cache.match(req);
    if (cached) return cached;

    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  })());
});

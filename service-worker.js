const CACHE_NAME = "clara-stories-v2-bg";
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./story.html",
  "./styles.css?v=20260506-bg",
  "./stories.js",
  "./script.js?v=20260506-bg",
  "./story.js?v=20260506-bg",
  "./narration-assets.js",
  "./manifest.json",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }

        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) {
            return cached;
          }

          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return Response.error();
        })
      )
  );
});

const VERSION = "20260602-listen-filter-1";
const STATIC_CACHE = `clara-static-${VERSION}`;
const CONTENT_CACHE = `clara-content-${VERSION}`;
const RUNTIME_CACHE = `clara-runtime-${VERSION}`;
const CURRENT_CACHES = new Set([STATIC_CACHE, CONTENT_CACHE, RUNTIME_CACHE]);

const appUrl = (path) => new URL(path, self.registration.scope).toString();

const APP_SHELL = [
  "./",
  "./index.html",
  "./stories.html",
  "./about.html",
  "./story.html",
  "./styles.css?v=20260602-listen-filter-1",
  "./stories.js?v=20260602-listen-filter-1",
  "./narration-assets.js?v=20260602-listen-filter-1",
  "./install.js?v=20260602-listen-filter-1",
  "./script.js?v=20260602-listen-filter-1",
  "./story.js?v=20260602-listen-filter-1",
  "./about.js?v=20260602-listen-filter-1",
  "./manifest.webmanifest",
  "./manifest.json",
  "./site.webmanifest",
  "./favicon.ico",
  "./images/marcus-clara.jpeg",
  "./icons/clara-logo.svg",
  "./icons/icon-180.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-192.png",
  "./icons/maskable-512.png"
].map(appUrl);

const STATIC_DESTINATIONS = new Set(["audio", "font", "image", "manifest", "script", "style", "worker"]);
const STATIC_EXTENSIONS = /\.(?:avif|css|gif|ico|jpe?g|js|json|mjs|mp3|png|svg|webmanifest|webp|woff2?)$/i;

function canCache(response) {
  return Boolean(response && (response.ok || response.type === "opaque"));
}

function isStaticRequest(request) {
  const url = new URL(request.url);
  return STATIC_DESTINATIONS.has(request.destination) || STATIC_EXTENSIONS.test(url.pathname);
}

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function offlineStoryFallbackResponse() {
  return new Response(
    `<!DOCTYPE html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Story not saved offline | Clara's Stories</title>
    <meta name="theme-color" content="#fbf6e8" />
    <link rel="stylesheet" href="./styles.css?v=20260602-listen-filter-1" />
  </head>
  <body class="story-shell">
    <main class="story-page">
      <a class="back-link" href="./stories.html">Back to stories</a>
      <section class="reader-hero">
        <div>
          <p class="kicker">Offline mode</p>
          <h1>This story is not saved yet.</h1>
          <p class="reader-summary">Open it once while online, and Clara's Stories will keep it ready for later offline reading.</p>
        </div>
      </section>
      <p class="connection-status is-visible" data-connection-status data-status-mode="offline">Offline mode</p>
    </main>
  </body>
</html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

async function putIfCacheable(cacheName, request, response) {
  if (!canCache(response)) {
    return;
  }

  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  await putIfCacheable(STATIC_CACHE, request, response);
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      await putIfCacheable(CONTENT_CACHE, request, response);
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  return (await refresh) || Response.error();
}

async function navigationResponse(request) {
  const url = new URL(request.url);
  const isStoryNavigation = url.pathname.endsWith("/story.html");
  const isStoriesNavigation = url.pathname.endsWith("/stories.html");
  const cached = await caches.match(request);
  const fallbackPage = isStoryNavigation
    ? "./story.html"
    : isStoriesNavigation
      ? "./stories.html"
      : "./index.html";
  const fallback = await caches.match(appUrl(fallbackPage));
  const refresh = fetch(request)
    .then(async (response) => {
      await putIfCacheable(CONTENT_CACHE, request, response);
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const response = await refresh;

  if (response) {
    return response;
  }

  if (isStoryNavigation && url.searchParams.has("id")) {
    return offlineStoryFallbackResponse();
  }

  return fallback || Response.error();
}

async function cacheStoryResources(data = {}) {
  const storyId = String(data.storyId ?? "").trim();
  const resources = Array.isArray(data.resources) ? data.resources : [];
  const cache = await caches.open(CONTENT_CACHE);
  const storyShell = await caches.match(appUrl("./story.html"));

  if (storyId && storyShell) {
    await cache.put(appUrl(`./story.html?id=${encodeURIComponent(storyId)}`), storyShell.clone());
  }

  await Promise.allSettled(
    resources
      .map((resource) => String(resource ?? "").trim())
      .filter(Boolean)
      .map(async (resource) => {
        const url = new URL(resource, self.registration.scope);
        const request =
          url.origin === self.location.origin
            ? new Request(url)
            : new Request(url, { mode: "no-cors" });
        const response = await fetch(request);

        if (canCache(response)) {
          await cache.put(request, response);
        }
      })
  );
}

async function activateUpdatedServiceWorker() {
  const keys = await caches.keys();
  const oldCacheKeys = keys.filter((key) => key.startsWith("clara-") && !CURRENT_CACHES.has(key));

  await Promise.all(oldCacheKeys.map((key) => caches.delete(key)));
  await self.clients.claim();

  if (!oldCacheKeys.length) {
    return;
  }

  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(
    clients.map((client) => {
      if (!("navigate" in client) || new URL(client.url).origin !== self.location.origin) {
        return null;
      }

      return client.navigate(client.url).catch(() => null);
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(activateUpdatedServiceWorker());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_STORY_RESOURCES") {
    event.waitUntil(cacheStoryResources(event.data));
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (new URL(request.url).searchParams.has("online-check")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (isStaticRequest(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

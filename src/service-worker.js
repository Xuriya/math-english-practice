const CACHE_PREFIX = "math-english-reading-drill";
const CACHE_VERSION = "__CACHE_VERSION__";
const PRECACHE_PATHS = __PRECACHE_PATHS__;
const CACHE_NAMESPACE = `${CACHE_PREFIX}:${self.registration.scope}`;
const CACHE_NAME = `${CACHE_NAMESPACE}:${CACHE_VERSION}`;
const APP_ROOT = new URL("./", self.registration.scope);
const PRECACHE_URLS = PRECACHE_PATHS.map((path) => new URL(path, APP_ROOT).href);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(
        PRECACHE_URLS.map((url) => new Request(url, { cache: "reload" })),
      ))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith(`${CACHE_NAMESPACE}:`) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request, { ignoreSearch: true });
    if (cachedResponse) return cachedResponse;

    try {
      return await fetch(request);
    } catch (error) {
      if (request.mode === "navigate") {
        const appShell = await cache.match(new URL("index.html", APP_ROOT));
        if (appShell) return appShell;
      }
      throw error;
    }
  })());
});

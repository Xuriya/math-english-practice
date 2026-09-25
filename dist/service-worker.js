const CACHE_PREFIX = "math-english-reading-drill";
const CACHE_VERSION = "a8a4137431f18fcf";
const PRECACHE_PATHS = [
  "app.js",
  "data/what-to-say.json",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg",
  "index.html",
  "manifest.webmanifest",
  "styles.css",
  "vendor/fonts/KaTeX_AMS-Regular.ttf",
  "vendor/fonts/KaTeX_AMS-Regular.woff",
  "vendor/fonts/KaTeX_AMS-Regular.woff2",
  "vendor/fonts/KaTeX_Caligraphic-Bold.ttf",
  "vendor/fonts/KaTeX_Caligraphic-Bold.woff",
  "vendor/fonts/KaTeX_Caligraphic-Bold.woff2",
  "vendor/fonts/KaTeX_Caligraphic-Regular.ttf",
  "vendor/fonts/KaTeX_Caligraphic-Regular.woff",
  "vendor/fonts/KaTeX_Caligraphic-Regular.woff2",
  "vendor/fonts/KaTeX_Fraktur-Bold.ttf",
  "vendor/fonts/KaTeX_Fraktur-Bold.woff",
  "vendor/fonts/KaTeX_Fraktur-Bold.woff2",
  "vendor/fonts/KaTeX_Fraktur-Regular.ttf",
  "vendor/fonts/KaTeX_Fraktur-Regular.woff",
  "vendor/fonts/KaTeX_Fraktur-Regular.woff2",
  "vendor/fonts/KaTeX_Main-Bold.ttf",
  "vendor/fonts/KaTeX_Main-Bold.woff",
  "vendor/fonts/KaTeX_Main-Bold.woff2",
  "vendor/fonts/KaTeX_Main-BoldItalic.ttf",
  "vendor/fonts/KaTeX_Main-BoldItalic.woff",
  "vendor/fonts/KaTeX_Main-BoldItalic.woff2",
  "vendor/fonts/KaTeX_Main-Italic.ttf",
  "vendor/fonts/KaTeX_Main-Italic.woff",
  "vendor/fonts/KaTeX_Main-Italic.woff2",
  "vendor/fonts/KaTeX_Main-Regular.ttf",
  "vendor/fonts/KaTeX_Main-Regular.woff",
  "vendor/fonts/KaTeX_Main-Regular.woff2",
  "vendor/fonts/KaTeX_Math-BoldItalic.ttf",
  "vendor/fonts/KaTeX_Math-BoldItalic.woff",
  "vendor/fonts/KaTeX_Math-BoldItalic.woff2",
  "vendor/fonts/KaTeX_Math-Italic.ttf",
  "vendor/fonts/KaTeX_Math-Italic.woff",
  "vendor/fonts/KaTeX_Math-Italic.woff2",
  "vendor/fonts/KaTeX_SansSerif-Bold.ttf",
  "vendor/fonts/KaTeX_SansSerif-Bold.woff",
  "vendor/fonts/KaTeX_SansSerif-Bold.woff2",
  "vendor/fonts/KaTeX_SansSerif-Italic.ttf",
  "vendor/fonts/KaTeX_SansSerif-Italic.woff",
  "vendor/fonts/KaTeX_SansSerif-Italic.woff2",
  "vendor/fonts/KaTeX_SansSerif-Regular.ttf",
  "vendor/fonts/KaTeX_SansSerif-Regular.woff",
  "vendor/fonts/KaTeX_SansSerif-Regular.woff2",
  "vendor/fonts/KaTeX_Script-Regular.ttf",
  "vendor/fonts/KaTeX_Script-Regular.woff",
  "vendor/fonts/KaTeX_Script-Regular.woff2",
  "vendor/fonts/KaTeX_Size1-Regular.ttf",
  "vendor/fonts/KaTeX_Size1-Regular.woff",
  "vendor/fonts/KaTeX_Size1-Regular.woff2",
  "vendor/fonts/KaTeX_Size2-Regular.ttf",
  "vendor/fonts/KaTeX_Size2-Regular.woff",
  "vendor/fonts/KaTeX_Size2-Regular.woff2",
  "vendor/fonts/KaTeX_Size3-Regular.ttf",
  "vendor/fonts/KaTeX_Size3-Regular.woff",
  "vendor/fonts/KaTeX_Size3-Regular.woff2",
  "vendor/fonts/KaTeX_Size4-Regular.ttf",
  "vendor/fonts/KaTeX_Size4-Regular.woff",
  "vendor/fonts/KaTeX_Size4-Regular.woff2",
  "vendor/fonts/KaTeX_Typewriter-Regular.ttf",
  "vendor/fonts/KaTeX_Typewriter-Regular.woff",
  "vendor/fonts/KaTeX_Typewriter-Regular.woff2",
  "vendor/katex.min.css",
  "vendor/katex.mjs",
  "service-worker.js"
];
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

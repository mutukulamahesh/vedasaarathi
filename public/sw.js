/* VedaSaarathi service worker — offline support for the installed web app.
 *
 * WHAT WORKS OFFLINE (after the first online run that fetches each asset):
 *   - the app shell (HTML, JS, CSS)
 *   - every bundled instruction + mantra MP3 under /audio/v1/
 *   - app icons and the web manifest
 *   - all user data: participants, lineage, saved location, puja progress,
 *     Sankalpam inputs, and the Panchanga results for the current session are
 *     kept in the browser's own localStorage by the app (no server, no account)
 *
 * WHAT NEEDS CONNECTIVITY:
 *   - the FIRST load of the app and the first play of each audio file (they are
 *     cached as they are fetched; a one-time full walk-through primes everything)
 *   - recalculating Panchanga / the next festival for a NEW date or a NEW saved
 *     location (mhah-panchang is a bundled chunk, so it works offline once
 *     cached, but a brand-new location the app has never computed will still
 *     compute fine offline — only truly new code chunks need the network)
 *
 * Strategy: cache-first for immutable assets (content-hashed JS/CSS, bundled
 * MP3s, icons); network-first with a cached-shell fallback for navigations;
 * stale-while-revalidate for everything else same-origin.
 */

const VERSION = "vs-v1-2026-09-09";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const AUDIO_CACHE = `${VERSION}-audio`;

const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Best-effort: a missing optional URL must not fail the install.
      Promise.allSettled(SHELL_URLS.map((u) => cache.add(new Request(u, { cache: "reload" })))),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isAudio(url) {
  return url.pathname.startsWith("/audio/") && url.pathname.endsWith(".mp3");
}

function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.svg" ||
    /\.(?:js|css|woff2?|ttf|png|svg|json)$/.test(url.pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true, ignoreSearch: false });
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok && res.status === 200) {
    cache.put(request, res.clone());
  }
  return res;
}

async function audioStrategy(request, url) {
  const cache = await caches.open(AUDIO_CACHE);
  // A media element often asks with a Range header. The Cache API cannot store
  // a 206, so key on the URL without range and hand back the full 200 body —
  // the browser slices what it needs.
  const keyRequest = new Request(url.href, { headers: {} });
  const cached = await cache.match(keyRequest);
  if (cached) return cached;
  try {
    const full = await fetch(url.href);
    if (full && full.ok && full.status === 200) {
      cache.put(keyRequest, full.clone());
    }
    // If the caller wanted a range, still return what we have; the element copes.
    return full;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok && res.status === 200) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

async function navigationStrategy(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      // Keep the latest shell for offline navigations.
      cache.put("/", res.clone());
      return res;
    }
    throw new Error(`bad status ${res && res.status}`);
  } catch {
    const shell = (await cache.match("/")) || (await cache.match(request));
    if (shell) return shell;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Offline</title>" +
        "<body style='font:16px system-ui;padding:2rem;color:#2e201a;background:#f5f0e8'>" +
        "<h1>You're offline</h1><p>Open VedaSaarathi once while connected, then it will work offline.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  if (request.mode === "navigate") {
    event.respondWith(navigationStrategy(request));
    return;
  }
  if (isAudio(url)) {
    event.respondWith(audioStrategy(request, url));
    return;
  }
  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, url.pathname.startsWith("/audio/") ? AUDIO_CACHE : ASSET_CACHE));
    return;
  }
  event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
});

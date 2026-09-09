/* VedaSaarathi service worker — offline support for the installed web app.
 *
 * WHAT WORKS OFFLINE (after the first online run that fetches each asset, OR
 * immediately after the explicit "Download for offline use" action):
 *   - the app shell (HTML, JS, CSS)
 *   - every bundled instruction + mantra MP3 under /audio/v1/
 *   - app icons and the web manifest
 *   - all user data: participants, lineage, saved location, puja progress,
 *     Sankalpam inputs/choices, and the Panchanga results for the current
 *     session are kept in the browser's own localStorage (no server, no account)
 *
 * TWO caches feed offline reads:
 *   - the versioned SW caches (vs-v1-…-{shell,assets,audio}), filled lazily as
 *     pages fetch things and network-first for navigations
 *   - the explicit OFFLINE cache (vs-offline-v1), filled by the "Download for
 *     offline use" button (lib/offline/download.ts) and checked FIRST here so a
 *     downloaded copy serves even with no network at all.
 */

const VERSION = "vs-v1-2026-09-09";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const AUDIO_CACHE = `${VERSION}-audio`;
/** Not version-prefixed on purpose: an explicit download survives deploys and
 * is only removed by the user (or a bump of this name). */
const OFFLINE_CACHE = "vs-offline-v1";

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
      Promise.allSettled(SHELL_URLS.map((u) => cache.add(new Request(u, { cache: "reload" })))),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== OFFLINE_CACHE && !k.startsWith(VERSION))
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

/** The URL an audio range request is stored under (Cache API can't hold a 206). */
const audioKey = (url) => new Request(url.href, { headers: {} });

/** Try the explicit offline download first. Returns a Response or null. */
async function fromOfflineDownload(url, { navigation = false } = {}) {
  const cache = await caches.open(OFFLINE_CACHE);
  if (navigation) {
    return (await cache.match("/")) || (await cache.match(url.href)) || null;
  }
  if (isAudio(url)) return (await cache.match(audioKey(url))) || null;
  return (await cache.match(url.href)) || (await cache.match(url.pathname)) || null;
}

async function cacheFirst(request, cacheName) {
  const url = new URL(request.url);
  const offline = await fromOfflineDownload(url);
  if (offline) return offline;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok && res.status === 200) cache.put(request, res.clone());
  return res;
}

async function audioStrategy(request, url) {
  const offline = await fromOfflineDownload(url);
  if (offline) return offline;
  const cache = await caches.open(AUDIO_CACHE);
  const key = audioKey(url);
  const cached = await cache.match(key);
  if (cached) return cached;
  try {
    const full = await fetch(url.href);
    if (full && full.ok && full.status === 200) cache.put(key, full.clone());
    return full;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const url = new URL(request.url);
  const offline = await fromOfflineDownload(url);
  const cache = await caches.open(cacheName);
  const cached = offline || (await cache.match(request));
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok && res.status === 200) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

async function navigationStrategy(request) {
  const url = new URL(request.url);
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      cache.put("/", res.clone());
      return res;
    }
    throw new Error(`bad status ${res && res.status}`);
  } catch {
    const offline = await fromOfflineDownload(url, { navigation: true });
    if (offline) return offline;
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

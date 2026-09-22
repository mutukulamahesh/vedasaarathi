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
 *   - the versioned SW caches (vs-v2-…-{shell,assets,audio}), filled lazily as
 *     pages fetch things and network-first for navigations
 *   - the explicit OFFLINE caches (vs-offline-<build version>), filled by the
 *     "Download for offline use" button (lib/offline/download.ts) and checked
 *     FIRST here so a downloaded copy serves even with no network at all.
 *
 * CACHE-BYPASS CONTRACT (fixes a real defect: an update check or a
 * re-download could silently return an OLD cached response with zero network
 * calls). lib/offline/download.ts always asks for a genuinely fresh copy by
 * setting the fetch cache mode - `{ cache: "no-store" }` for the manifest
 * check, `{ cache: "reload" }` for every downloaded file. A service worker's
 * fetch handler intercepts those requests just like any other, and
 * `Request.cache` still reflects the mode the page asked for, so every
 * cache-reading strategy below checks `bypassesCache(request)` FIRST and, if
 * true, skips straight to the network - never the offline-download cache,
 * never the regular browsing cache. This is what actually makes "check for
 * updates" and "re-download" see a byte that changed after the previous
 * offline download; without it, `cacheFirst`/`audioStrategy` would keep
 * answering from whatever was cached before, however the request was made.
 */

// Bumped for this change (cache-bypass fix + Range/206 audio support): the
// regular browsing caches from an older service worker may hold Range-naive
// entries or predate the bypass fix, so they are evicted on activate exactly
// like any other real behavior change to this file.
const VERSION = "vs-v3-2026-09-22";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const AUDIO_CACHE = `${VERSION}-audio`;
/** Prefix, not a fixed name: an explicit download is keyed by the build's
 * content version (vs-offline-<version>). Every such cache survives deploys and
 * is only removed by the user or by a completed re-download (safe swap). */
const OFFLINE_PREFIX = "vs-offline-";

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
          .filter((k) => !k.startsWith(OFFLINE_PREFIX) && !k.startsWith(VERSION))
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

/** True when the page explicitly asked to bypass any cache for this fetch -
 * an update check (`cache: "no-store"`) or an offline re-download
 * (`cache: "reload"`) - see the CACHE-BYPASS CONTRACT note above. Honoring
 * this is the fix for the reported defect. */
function bypassesCache(request) {
  return request.cache === "no-store" || request.cache === "reload";
}

/** The URL an audio range request is stored under (Cache API can't hold a 206). */
const audioKey = (url) => new Request(url.href, { headers: {} });

/** Try the explicit offline download(s) first. Returns a Response or null.
 * There is normally exactly one vs-offline-<version> cache; a re-download in
 * progress can briefly leave two, so every prefix-matched cache is checked. */
async function fromOfflineDownload(url, { navigation = false } = {}) {
  const names = (await caches.keys()).filter((k) => k.startsWith(OFFLINE_PREFIX));
  for (const name of names) {
    const cache = await caches.open(name);
    if (navigation) {
      const hit = (await cache.match("/")) || (await cache.match(url.href));
      if (hit) return hit;
      continue;
    }
    if (isAudio(url)) {
      const hit = await cache.match(audioKey(url));
      if (hit) return hit;
      continue;
    }
    const hit = (await cache.match(url.href)) || (await cache.match(url.pathname));
    if (hit) return hit;
  }
  return null;
}

/** Fetch fresh, ignoring both the offline-download cache and the regular
 * browsing cache, for a request whose cache mode demands it (see
 * `bypassesCache`). "reload" still means "refresh the cache after reading
 * past it", per the standard fetch cache-mode semantics `download.ts` relies
 * on, so a successful response is stored into `cacheName` for normal
 * (non-bypassing) requests to benefit from; "no-store" means neither read
 * NOR write any cache, so nothing is stored. */
async function networkOnly(request, cacheName) {
  const res = await fetch(request);
  if (request.cache === "reload" && res && res.ok && res.status === 200 && cacheName) {
    const cache = await caches.open(cacheName);
    cache.put(request, res.clone());
  }
  return res;
}

async function cacheFirst(request, cacheName) {
  const url = new URL(request.url);
  if (bypassesCache(request)) return networkOnly(request, cacheName);
  const offline = await fromOfflineDownload(url);
  if (offline) return offline;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok && res.status === 200) cache.put(request, res.clone());
  return res;
}

/** Build a proper 206 Partial Content response for a byte-range request from
 * a complete, already-fetched response. Supports "bytes=start-end",
 * "bytes=start-" (open-ended) and "bytes=-suffixLength" (a suffix range).
 * A malformed Range header is ignored (RFC 7233 permits serving the whole
 * resource in that case); an unsatisfiable one gets 416 with
 * Content-Range: bytes * / <size>. iOS Safari requires real 206 responses to
 * seek within <audio>; a 200 with the whole body can silently fail there. */
async function rangedResponse(full, rangeHeader) {
  const buf = await full.clone().arrayBuffer();
  const size = buf.byteLength;
  // Every caller of this function already knows the resource is one of this
  // app's .mp3 files (only isAudio() URLs reach it) - the type is fixed, not
  // read from the upstream response. See withAudioContentType() for why that
  // matters (this app's own origin mislabels .mp3 as application/octet-stream).
  const contentType = AUDIO_CONTENT_TYPE;
  const m = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || "");
  if (!m || (m[1] === "" && m[2] === "")) {
    return new Response(buf, {
      status: 200,
      headers: { "Content-Type": contentType, "Content-Length": String(size), "Accept-Ranges": "bytes" },
    });
  }
  let start;
  let end;
  if (m[1] === "") {
    const suffixLength = Number(m[2]);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start < 0 || size === 0 || start >= size) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Type": contentType, "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
    });
  }
  const slice = buf.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(slice.byteLength),
      "Accept-Ranges": "bytes",
    },
  });
}

const AUDIO_CONTENT_TYPE = "audio/mpeg";

/** This app's own origin serves .mp3 files as application/octet-stream - its
 * static-file server has no .mp3 -> audio/mpeg mapping. Most browsers play
 * audio regardless, but a correct Content-Type is the honest, standards-
 * correct thing to send, worth fixing now that this app also sends
 * X-Content-Type-Options: nosniff (a defensive precaution against relying on
 * MIME-sniffing leniency for anything, media included). Every response this
 * touches is already known to be a .mp3 (only isAudio() URLs reach
 * audioStrategy), so the header is corrected here instead of trusted from
 * upstream - streamed through unchanged otherwise, no buffering. */
function withAudioContentType(res) {
  if (res.headers.get("Content-Type") === AUDIO_CONTENT_TYPE) return res;
  const headers = new Headers(res.headers);
  headers.set("Content-Type", AUDIO_CONTENT_TYPE);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** Full-body response -> what the browser actually asked for (the whole
 * thing, or a Range slice of it). */
function toRequestedForm(full, rangeHeader) {
  return rangeHeader ? rangedResponse(full, rangeHeader) : withAudioContentType(full);
}

async function audioStrategy(request, url) {
  const range = request.headers.get("Range");
  if (bypassesCache(request)) {
    const full = await fetch(url.href);
    if (request.cache === "reload" && full && full.ok && full.status === 200) {
      const cache = await caches.open(AUDIO_CACHE);
      cache.put(audioKey(url), full.clone());
    }
    return toRequestedForm(full, range);
  }
  const offline = await fromOfflineDownload(url);
  if (offline) return toRequestedForm(offline, range);
  const cache = await caches.open(AUDIO_CACHE);
  const key = audioKey(url);
  const cached = await cache.match(key);
  if (cached) return toRequestedForm(cached, range);
  try {
    // Always fetch the full body (never forward the incoming Range) so what
    // gets cached is the complete file; the requested slice is served from it.
    const full = await fetch(url.href);
    if (full && full.ok && full.status === 200) cache.put(key, full.clone());
    return toRequestedForm(full, range);
  } catch (err) {
    if (cached) return toRequestedForm(cached, range);
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const url = new URL(request.url);
  if (bypassesCache(request)) return networkOnly(request, cacheName);
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

// "Download Vinayaka Puja for offline use".
//
// Populates a dedicated, VERSIONED Cache (vs-offline-<build version>, matched
// by public/sw.js by prefix) with EVERY file the build says is required —
// app shell, all JS/CSS chunks (including lazy ones the current page has not
// imported yet), icons, and every bundled audio file — reporting progress.
//
// "Downloaded" means 100% of the required files are cached AND the cached copy
// is the current build. A newer deployment flips the status to
// `updateAvailable`; the user must re-download (a safe swap — the new cache is
// filled completely before the old one is dropped).
//
// Everything is device-local. No account, no server.

import { AUDIO_MANIFEST } from "@/lib/audio/manifest";

/** Offline caches are named `${OFFLINE_CACHE_PREFIX}${version}`. public/sw.js
 * matches this prefix and preserves every such cache across deploys. */
export const OFFLINE_CACHE_PREFIX = "vs-offline-";
/** The pre-versioned fixed name. Still cleaned up on re-download / remove so an
 * older install does not linger. */
export const OFFLINE_CACHE_NAME = "vs-offline-v1";

const MANIFEST_URL = "/offline-manifest.json";
/** The cache key the download's own metadata (version, byte total, timestamp)
 * is stored under. Exported for tests. */
export const OFFLINE_META_KEY = "/__offline_meta__";
const META_KEY = OFFLINE_META_KEY;

const SHELL_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/sw.js",
];

function hasCaches(): boolean {
  return typeof caches !== "undefined" && typeof fetch !== "undefined";
}

/** Same-origin JS/CSS the current document pulled in (content-hashed, immutable).
 * Only used as a FALLBACK when the build manifest is not served (e.g. the Vite
 * dev server). It cannot see lazy chunks — that is exactly why the build
 * manifest exists. */
function assetsFromDocument(): string[] {
  if (typeof document === "undefined") return [];
  const urls = new Set<string>();
  const add = (v: string | null) => {
    if (!v) return;
    try {
      const u = new URL(v, location.href);
      if (u.origin === location.origin && /\.(?:js|css|woff2?|ttf)$/.test(u.pathname)) {
        urls.add(u.pathname + u.search);
      }
    } catch {
      /* ignore */
    }
  };
  document.querySelectorAll("script[src]").forEach((s) => add(s.getAttribute("src")));
  document
    .querySelectorAll('link[rel="stylesheet"],link[rel="modulepreload"],link[rel="preload"]')
    .forEach((l) => add(l.getAttribute("href")));
  return [...urls];
}

/** Every audio file the app hosts (per-step EN/TE, mantra candidates, reviewer
 * samples, and the family Sankalpam clips). */
export function offlineAudioUrls(): string[] {
  return [...new Set(AUDIO_MANIFEST.filter((a) => a.status !== "PLANNED").map((a) => a.src))];
}

/** The FALLBACK URL list (shell + document-scraped assets + audio), used only
 * when the build manifest is unavailable. */
export function offlineUrlList(): string[] {
  return [...new Set([...SHELL_URLS, ...assetsFromDocument(), ...offlineAudioUrls()])];
}

export interface OfflinePlan {
  /** Content version of the build (or "fallback" when the manifest is absent). */
  version: string;
  urls: string[];
  source: "build-manifest" | "fallback";
}

async function loadBuildManifest(): Promise<{ version: string; urls: string[] } | null> {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { version?: unknown; urls?: unknown };
    if (typeof j.version !== "string" || !j.version) return null;
    if (!Array.isArray(j.urls) || j.urls.length === 0) return null;
    const urls = [...new Set(j.urls.filter((u): u is string => typeof u === "string" && u.length > 0))];
    if (urls.length === 0) return null;
    return { version: j.version, urls };
  } catch {
    return null;
  }
}

/** What a download will actually cache: the build manifest when it is served,
 * otherwise the legacy shell + scraped-assets + audio list. */
export async function resolveOfflinePlan(): Promise<OfflinePlan> {
  const m = await loadBuildManifest();
  if (m) return { version: m.version, urls: m.urls, source: "build-manifest" };
  return { version: "fallback", urls: offlineUrlList(), source: "fallback" };
}

export interface OfflineProgress {
  done: number;
  total: number;
  failed: number;
  currentUrl: string;
}

export interface OfflineResult {
  cached: number;
  total: number;
  failed: string[];
  bytes: number;
  version: string;
}

export interface OfflineStatus {
  supported: boolean;
  /** 100% of the current build's required files are cached AND verified. */
  downloaded: boolean;
  cached: number;
  expected: number;
  bytes: number;
  at: string | null;
  /** Version of the cached copy, or null when nothing is downloaded. */
  version: string | null;
  /** A newer build is deployed than the one that was downloaded. */
  updateAvailable: boolean;
}

interface OfflineMeta {
  version?: unknown;
  bytes?: unknown;
  at?: unknown;
  total?: unknown;
}

/** Expected file count when we have NOT been to the network for the build
 * manifest: the app shell + document-scraped assets + audio, or just the shell
 * when there is no document. */
function fallbackExpected(): number {
  return typeof document !== "undefined" ? offlineUrlList().length : SHELL_URLS.length;
}

/** Every offline cache currently present (prefix-matched), plus the legacy
 * fixed name. */
async function offlineCacheNames(): Promise<string[]> {
  const keys = await caches.keys();
  return keys.filter((k) => k.startsWith(OFFLINE_CACHE_PREFIX) || k === OFFLINE_CACHE_NAME);
}

/** Populate the offline cache for the current build. `onProgress` fires after
 * each file. On a fully successful download, older offline caches are removed
 * (a safe swap: the new copy is complete before the old one goes). */
export async function downloadForOffline(
  onProgress?: (p: OfflineProgress) => void,
): Promise<OfflineResult> {
  if (!hasCaches()) throw new Error("The Cache API is not available in this browser.");
  const plan = await resolveOfflinePlan();
  const urls = plan.urls;
  const cacheName = OFFLINE_CACHE_PREFIX + plan.version;
  const cache = await caches.open(cacheName);
  const failed: string[] = [];
  let bytes = 0;
  let done = 0;

  for (const url of urls) {
    try {
      // Range-safe: always fetch the full body with no Range header, store it
      // under the plain URL key (public/sw.js reads it the same way).
      const res = await fetch(url, { cache: "reload" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.clone().arrayBuffer();
      bytes += body.byteLength;
      await cache.put(url, new Response(body, { headers: res.headers, status: 200 }));
    } catch {
      failed.push(url);
    }
    done += 1;
    onProgress?.({ done, total: urls.length, failed: failed.length, currentUrl: url });
  }

  const meta = {
    version: plan.version,
    source: plan.source,
    total: urls.length,
    cached: urls.length - failed.length,
    bytes,
    at: new Date().toISOString(),
  };
  await cache.put(
    META_KEY,
    new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }),
  );

  // Safe swap: only once THIS cache holds every file do we drop older ones.
  if (failed.length === 0) {
    for (const name of await offlineCacheNames()) {
      if (name !== cacheName) await caches.delete(name);
    }
  }

  return { cached: meta.cached, total: meta.total, failed, bytes, version: plan.version };
}

async function readMeta(
  cache: Cache,
): Promise<{ bytes: number; at: string | null; version: string | null; total: number | null }> {
  const res = await cache.match(META_KEY);
  if (!res) return { bytes: 0, at: null, version: null, total: null };
  try {
    const m = (await res.json()) as OfflineMeta;
    const total = Number(m.total);
    return {
      bytes: Number(m.bytes) || 0,
      at: typeof m.at === "string" ? m.at : null,
      version: typeof m.version === "string" ? m.version : null,
      total: Number.isFinite(total) && total > 0 ? total : null,
    };
  } catch {
    return { bytes: 0, at: null, version: null, total: null };
  }
}

export interface OfflineStatusOptions {
  /** Go to the network for the current build manifest to work out whether a
   * newer build has shipped since the offline copy was saved. OFF by default:
   * the mount-time status read must never make a network request (a page that
   * only shows the puja must not fire surprise requests). Turn it on only for
   * an explicit "check for updates" gesture, or after a download when a copy
   * already exists. */
  checkForUpdate?: boolean;
}

/** The pathname a cache key is stored under, for URL-level presence checks. */
function keyPath(url: string): string {
  try {
    return new URL(url, "https://x.invalid/").pathname;
  } catch {
    return url;
  }
}

/** How complete — and how current — the offline copy is. Reads the Cache API
 * only, unless `checkForUpdate` asks for a manifest fetch.
 *
 * When the current BUILD manifest is available, completeness is verified
 * URL-by-URL against the selected cache — a matching file COUNT is never taken
 * as proof, because an obsolete extra file can mask a missing required one. */
export async function offlineStatus(opts: OfflineStatusOptions = {}): Promise<OfflineStatus> {
  const rawPlan = opts.checkForUpdate ? await resolveOfflinePlan().catch(() => null) : null;
  // Only an actual build manifest is an authoritative list; the DOM-scrape
  // fallback is not, so it never drives the version or the URL check.
  const plan = rawPlan && rawPlan.source === "build-manifest" ? rawPlan : null;
  const liveVersion = plan?.version ?? null;
  const requiredUrls = plan?.urls ?? null;

  if (!hasCaches()) {
    return {
      supported: false, downloaded: false, cached: 0,
      expected: plan?.urls.length ?? fallbackExpected(),
      bytes: 0, at: null, version: null, updateAvailable: false,
    };
  }

  const names = await offlineCacheNames();
  if (names.length === 0) {
    return {
      supported: true, downloaded: false, cached: 0,
      expected: plan?.urls.length ?? fallbackExpected(),
      bytes: 0, at: null, version: null, updateAvailable: false,
    };
  }

  // Prefer the cache that matches the live build; otherwise the most recent.
  let best:
    | {
        name: string; cached: number; bytes: number;
        at: string | null; version: string | null; total: number | null;
      }
    | null = null;
  let anyOtherVersion: string | null = null;
  for (const name of names) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    const cached = keys.filter((k) => !k.url.endsWith(META_KEY)).length;
    const { bytes, at, version, total } = await readMeta(cache);
    const cand = { name, cached, bytes, at, version, total };
    if (liveVersion && version && version !== liveVersion) anyOtherVersion = version;
    if (!best) {
      best = cand;
    } else if (liveVersion && cand.version === liveVersion && best.version !== liveVersion) {
      best = cand;
    } else if (
      !(liveVersion && best.version === liveVersion) &&
      (cand.at ?? "") > (best.at ?? "")
    ) {
      best = cand;
    }
  }
  best = best ?? { name: "", cached: 0, bytes: 0, at: null, version: null, total: null };

  // With no manifest fetch, the count the download itself recorded (meta.total)
  // is the source of truth for how many files should be present.
  const expected = requiredUrls?.length ?? best.total ?? fallbackExpected();
  // With a live build manifest, a cache is "current" ONLY if its recorded
  // version is EXACTLY the live one. A missing / malformed / unknown cached
  // version (best.version === null) is never accepted as current.
  const versionMatches = !liveVersion || best.version === liveVersion;

  let downloaded: boolean;
  if (requiredUrls && best.name) {
    // Authoritative check: EVERY required URL must be present in the selected
    // cache. File count parity is not enough.
    const cache = await caches.open(best.name);
    const present = new Set((await cache.keys()).map((k) => keyPath(k.url)));
    const missing = requiredUrls.filter((u) => !present.has(keyPath(u)));
    downloaded = missing.length === 0 && versionMatches;
  } else {
    downloaded =
      best.cached >= expected && (best.total === null || best.cached >= best.total) && versionMatches;
  }

  const updateAvailable = Boolean(
    liveVersion &&
      ((best.version && best.version !== liveVersion) ||
        (best.version === null && anyOtherVersion !== null)),
  );

  return {
    supported: true,
    downloaded,
    cached: best.cached,
    expected,
    bytes: best.bytes,
    at: best.at,
    version: best.version,
    updateAvailable,
  };
}

/** Remove every downloaded offline copy. */
export async function removeOffline(): Promise<void> {
  if (!hasCaches()) return;
  for (const name of await offlineCacheNames()) await caches.delete(name);
}

export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

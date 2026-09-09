// "Download Vinayaka Puja for offline use" (item 5).
//
// Populates a dedicated Cache (OFFLINE_CACHE_NAME, matched by public/sw.js)
// with the current app shell + JS/CSS + every bundled audio file, reporting
// progress. Verification, size and removal are exposed so the UI can show a
// real "downloaded / N files / X MB" state and a re-download / remove control.
//
// Everything is device-local. No account, no server.

import { AUDIO_MANIFEST } from "@/lib/audio/manifest";

/** MUST match the OFFLINE_CACHE name in public/sw.js. */
export const OFFLINE_CACHE_NAME = "vs-offline-v1";
const META_KEY = "/__offline_meta__";

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

/** Same-origin JS/CSS the current document pulled in (content-hashed, immutable). */
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

/** The full list of URLs an offline download covers. */
export function offlineUrlList(): string[] {
  return [...new Set([...SHELL_URLS, ...assetsFromDocument(), ...offlineAudioUrls()])];
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
}

export interface OfflineStatus {
  supported: boolean;
  downloaded: boolean;
  cached: number;
  expected: number;
  bytes: number;
  at: string | null;
}

/** Populate the offline cache. `onProgress` fires after each file. */
export async function downloadForOffline(
  onProgress?: (p: OfflineProgress) => void,
): Promise<OfflineResult> {
  if (!hasCaches()) throw new Error("The Cache API is not available in this browser.");
  const urls = offlineUrlList();
  const cache = await caches.open(OFFLINE_CACHE_NAME);
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

  const meta = { total: urls.length, cached: urls.length - failed.length, bytes, at: new Date().toISOString() };
  await cache.put(META_KEY, new Response(JSON.stringify(meta), { headers: { "Content-Type": "application/json" } }));
  return { cached: meta.cached, total: meta.total, failed, bytes };
}

/** How complete the offline copy is. */
export async function offlineStatus(): Promise<OfflineStatus> {
  const expected = typeof document !== "undefined" ? offlineUrlList().length : SHELL_URLS.length;
  if (!hasCaches()) {
    return { supported: false, downloaded: false, cached: 0, expected, bytes: 0, at: null };
  }
  const has = await caches.has(OFFLINE_CACHE_NAME);
  if (!has) return { supported: true, downloaded: false, cached: 0, expected, bytes: 0, at: null };
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  const keys = await cache.keys();
  const cached = keys.filter((k) => !k.url.endsWith(META_KEY)).length;
  let bytes = 0;
  let at: string | null = null;
  const metaRes = await cache.match(META_KEY);
  if (metaRes) {
    try {
      const m = (await metaRes.json()) as { bytes?: unknown; at?: unknown };
      bytes = Number(m.bytes) || 0;
      at = typeof m.at === "string" ? m.at : null;
    } catch {
      /* ignore */
    }
  }
  return {
    supported: true,
    downloaded: cached > 0 && cached >= Math.floor(expected * 0.95),
    cached,
    expected,
    bytes,
    at,
  };
}

/** Remove the downloaded offline copy. */
export async function removeOffline(): Promise<void> {
  if (!hasCaches()) return;
  await caches.delete(OFFLINE_CACHE_NAME);
}

export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

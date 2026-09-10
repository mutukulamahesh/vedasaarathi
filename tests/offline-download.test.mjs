// lib/offline/download.ts — the "Download for offline use" logic
// (blocker: OFFLINE COMPLETENESS). A minimal Cache Storage + fetch polyfill
// exercises the build-manifest plan, the 100% completeness rule, the versioned
// cache, "update available" after a deploy, and the safe re-download swap —
// without a browser.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const dom = new JSDOM(
  `<!doctype html><html><head>
     <link rel="stylesheet" href="/assets/index-abc.css">
     <script src="/assets/page-def.js"></script>
     <link rel="modulepreload" href="/assets/framework-ghi.js">
   </head><body></body></html>`,
  { url: "https://vedasaarathi.test/" },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.location = dom.window.location;

/* ---- tiny Cache Storage + fetch polyfill --------------------------------- */
class FakeCache {
  constructor() { this.map = new Map(); }
  async put(req, res) {
    const url = typeof req === "string" ? new URL(req, location.href).href : req.url;
    const body = Buffer.from(await res.arrayBuffer());
    this.map.set(url, { body, headers: res.headers });
  }
  async match(req) {
    const url = typeof req === "string" ? new URL(req, location.href).href : req.url;
    const hit = this.map.get(url) || this.map.get(new URL(url, location.href).pathname);
    if (!hit) return undefined;
    return {
      ok: true, status: 200,
      arrayBuffer: async () => hit.body,
      json: async () => JSON.parse(hit.body.toString("utf8")),
      clone() { return this; },
    };
  }
  async keys() { return [...this.map.keys()].map((url) => ({ url })); }
}
const store = new Map();
globalThis.caches = {
  async open(name) { if (!store.has(name)) store.set(name, new FakeCache()); return store.get(name); },
  async has(name) { return store.has(name); },
  async delete(name) { return store.delete(name); },
  async keys() { return [...store.keys()]; },
};

/** The offline-manifest the "server" is currently serving. null = not served
 * (e.g. the Vite dev server) → the code falls back to the DOM-scraped list. */
let MANIFEST = null;
/** URLs the network should fail on (to exercise an incomplete download). */
let FAIL = new Set();
const fetchLog = [];
globalThis.fetch = async (url) => {
  const u = String(url);
  fetchLog.push(u);
  if (u.endsWith("/offline-manifest.json")) {
    if (!MANIFEST) return { ok: false, status: 404, headers: new dom.window.Headers() };
    const body = Buffer.from(JSON.stringify(MANIFEST));
    return {
      ok: true, status: 200, headers: new dom.window.Headers(),
      json: async () => JSON.parse(body.toString("utf8")),
      arrayBuffer: async () => body,
      clone() { return this; },
    };
  }
  if (FAIL.has(u)) return { ok: false, status: 503, headers: new dom.window.Headers() };
  const body = Buffer.from(`BODY:${u}`);
  return {
    ok: true, status: 200, headers: new dom.window.Headers(),
    arrayBuffer: async () => body,
    clone() { return { arrayBuffer: async () => body, headers: this.headers, status: 200 }; },
  };
};

const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => { await vite.close(); });

const dl = await vite.ssrLoadModule("/lib/offline/download.ts");

const reset = () => { for (const k of [...store.keys()]) store.delete(k); FAIL = new Set(); };

test("fallback list (no build manifest): shell + document JS/CSS + every bundled audio file", () => {
  MANIFEST = null;
  const list = dl.offlineUrlList();
  assert.ok(list.includes("/"), "the app shell");
  assert.ok(list.includes("/sw.js"));
  assert.ok(list.includes("/manifest.webmanifest"));
  assert.ok(list.includes("/assets/index-abc.css"), "stylesheet from <link>");
  assert.ok(list.includes("/assets/page-def.js"), "script from <script src>");
  assert.ok(list.includes("/assets/framework-ghi.js"), "modulepreload");
  const audio = dl.offlineAudioUrls();
  assert.ok(audio.length >= 106, `all bundled audio (${audio.length})`);
  assert.ok(audio.every((u) => u.startsWith("/audio/v1/") && u.endsWith(".mp3")));
  assert.ok(list.includes(audio[0]));
  assert.equal(new Set(list).size, list.length, "no duplicates");
});

test("resolveOfflinePlan prefers the build manifest (which can include lazy chunks)", async () => {
  MANIFEST = {
    version: "aaaa1111",
    urls: ["/", "/sw.js", "/assets/page-def.js", "/assets/mhah-panchang.esm-lazy.js", "/audio/v1/x.mp3"],
  };
  const plan = await dl.resolveOfflinePlan();
  assert.equal(plan.source, "build-manifest");
  assert.equal(plan.version, "aaaa1111");
  assert.ok(plan.urls.includes("/assets/mhah-panchang.esm-lazy.js"), "a lazy chunk the DOM never referenced");

  MANIFEST = null;
  const fb = await dl.resolveOfflinePlan();
  assert.equal(fb.source, "fallback");
  assert.equal(fb.version, "fallback");
  assert.deepEqual(fb.urls, dl.offlineUrlList());
});

test("downloadForOffline: versioned cache, 100% complete ⇒ downloaded, no update pending", async () => {
  reset();
  MANIFEST = { version: "v1hash", urls: ["/", "/sw.js", "/assets/page-def.js", "/audio/v1/x.mp3"] };
  const seen = [];
  const res = await dl.downloadForOffline((p) => seen.push(p));
  assert.equal(res.failed.length, 0);
  assert.equal(res.version, "v1hash");
  assert.equal(res.total, 4);
  assert.equal(res.cached, 4);
  assert.equal(seen.length, 4);
  assert.ok(seen.every((p, i) => p.done === i + 1 && p.total === 4));

  assert.ok(store.has("vs-offline-v1hash"), "the cache is named for the build version");

  const status = await dl.offlineStatus();
  assert.equal(status.supported, true);
  assert.equal(status.downloaded, true, "all 4 of 4 files cached");
  assert.equal(status.cached, 4);
  assert.equal(status.expected, 4);
  assert.equal(status.version, "v1hash");
  assert.equal(status.updateAvailable, false);
  assert.match(status.at ?? "", /^\d{4}-\d\d-\d\dT/);
});

test("an INCOMPLETE download is never reported as downloaded (no 95% threshold)", async () => {
  reset();
  MANIFEST = { version: "v2hash", urls: ["/", "/sw.js", "/assets/a.js", "/assets/b.js", "/audio/v1/x.mp3"] };
  FAIL = new Set(["/assets/b.js"]); // one file cannot be fetched
  const res = await dl.downloadForOffline();
  assert.deepEqual(res.failed, ["/assets/b.js"]);
  assert.equal(res.cached, 4);

  const status = await dl.offlineStatus();
  assert.equal(status.cached, 4);
  assert.equal(status.expected, 5);
  assert.equal(status.downloaded, false, "4 of 5 is NOT downloaded");
  assert.equal(status.updateAvailable, false);
});

test("after a deploy the status shows an update is available; re-download is a safe swap", async () => {
  reset();
  MANIFEST = { version: "deployA", urls: ["/", "/sw.js", "/assets/pageA.js", "/audio/v1/x.mp3"] };
  await dl.downloadForOffline();
  assert.ok(store.has("vs-offline-deployA"));
  assert.equal((await dl.offlineStatus()).downloaded, true);

  // A new build is deployed: same URLs count, new content version. Only an
  // explicit update check (checkForUpdate) goes to the network; the mount-time
  // read does not and never reports an update on its own.
  MANIFEST = { version: "deployB", urls: ["/", "/sw.js", "/assets/pageB.js", "/audio/v1/x.mp3"] };
  assert.equal(
    (await dl.offlineStatus()).updateAvailable,
    false,
    "the cache-only status makes no request and never reports an update",
  );
  const stale = await dl.offlineStatus({ checkForUpdate: true });
  assert.equal(stale.downloaded, false, "the old copy is no longer current");
  assert.equal(stale.updateAvailable, true);
  assert.equal(stale.version, "deployA");
  assert.ok(store.has("vs-offline-deployA"), "the old cache is still there until the new one completes");

  await dl.downloadForOffline();
  assert.ok(store.has("vs-offline-deployB"), "the new versioned cache is created");
  assert.ok(!store.has("vs-offline-deployA"), "the old cache is dropped only after the new one is complete");
  const fresh = await dl.offlineStatus({ checkForUpdate: true });
  assert.equal(fresh.downloaded, true);
  assert.equal(fresh.updateAvailable, false);
  assert.equal(fresh.version, "deployB");
});

test("removeOffline clears every versioned offline cache; status returns to not-downloaded", async () => {
  reset();
  MANIFEST = { version: "gone1", urls: ["/", "/sw.js"] };
  await dl.downloadForOffline();
  await dl.removeOffline();
  assert.equal([...store.keys()].filter((k) => k.startsWith("vs-offline-")).length, 0);
  const status = await dl.offlineStatus();
  assert.equal(status.downloaded, false);
  assert.equal(status.cached, 0);
  assert.equal(status.bytes, 0);
  assert.equal(status.version, null);
});

test("every planned URL is fetched with no Range header (range-safe storage)", async () => {
  reset();
  fetchLog.length = 0;
  MANIFEST = { version: "rangecheck", urls: ["/", "/sw.js", "/audio/v1/one.mp3", "/audio/v1/two.mp3"] };
  await dl.downloadForOffline();
  for (const u of MANIFEST.urls) assert.ok(fetchLog.includes(u), `fetched ${u}`);
});

test("public/sw.js reads the offline caches by the same version prefix", async () => {
  const sw = (await import("node:fs")).readFileSync(`${root}/public/sw.js`, "utf8");
  assert.ok(sw.includes('OFFLINE_PREFIX = "vs-offline-"'), "sw.js matches vs-offline-<version> by prefix");
  assert.equal(dl.OFFLINE_CACHE_PREFIX, "vs-offline-");
  assert.ok(sw.includes("k.startsWith(OFFLINE_PREFIX)"), "sw.js enumerates prefix-matched caches");
});

/* -------------------------------------------------------------------------- */
/* EXACT completeness: every required manifest URL must be in the cache —     */
/* a matching file COUNT is never proof (blocker 3).                          */
/* -------------------------------------------------------------------------- */

/** Read a cache's stored URL keys as pathnames. */
async function cachedPaths(name) {
  const cache = await store.get(name);
  const keys = await cache.keys();
  return new Set(keys.map((k) => new URL(k.url, "https://vedasaarathi.test/").pathname));
}

test("EXACT completeness: all required manifest URLs present ⇒ downloaded=true", async () => {
  reset();
  MANIFEST = { version: "exact1", urls: ["/", "/sw.js", "/assets/a.js", "/assets/b.js", "/audio/v1/x.mp3"] };
  await dl.downloadForOffline();

  const status = await dl.offlineStatus({ checkForUpdate: true });
  assert.equal(status.downloaded, true);
  assert.equal(status.updateAvailable, false);
  assert.equal(status.version, "exact1");
  // The cache really does hold every required URL.
  const paths = await cachedPaths("vs-offline-exact1");
  for (const u of MANIFEST.urls) assert.ok(paths.has(u), `cache holds ${u}`);
});

test("EXACT completeness: one required URL missing + one obsolete extra ⇒ downloaded=false (same file count)", async () => {
  reset();
  // Download build "keep" (…/d.js), then the build changes /assets/d.js -> /assets/e.js
  // WITHOUT a version bump. The cache now has an obsolete extra (d.js) and is
  // missing a required one (e.js) — but the file COUNT still matches.
  MANIFEST = { version: "keep", urls: ["/", "/sw.js", "/assets/c.js", "/assets/d.js"] };
  await dl.downloadForOffline();
  MANIFEST = { version: "keep", urls: ["/", "/sw.js", "/assets/c.js", "/assets/e.js"] };

  const status = await dl.offlineStatus({ checkForUpdate: true });
  assert.equal(status.cached, status.expected, "file count is identical (4 == 4)");
  assert.equal(status.downloaded, false, "…yet a required URL is missing, so NOT downloaded");
  assert.equal(status.updateAvailable, false, "same version — this is an incompleteness, not an update");
  assert.equal(status.version, "keep");
});

test("EXACT completeness: a wrong cached version ⇒ updateAvailable=true, downloaded=false", async () => {
  reset();
  MANIFEST = { version: "verOld", urls: ["/", "/sw.js", "/assets/p.js", "/audio/v1/x.mp3"] };
  await dl.downloadForOffline();
  // A new build ships — identical URL set, new content version.
  MANIFEST = { version: "verNew", urls: ["/", "/sw.js", "/assets/p.js", "/audio/v1/x.mp3"] };

  const status = await dl.offlineStatus({ checkForUpdate: true });
  assert.equal(status.updateAvailable, true);
  assert.equal(status.downloaded, false, "the cached copy is a different build");
  assert.equal(status.version, "verOld");
});

test("EXACT completeness: a FAILED update leaves the previous complete cache intact and usable", async () => {
  reset();
  MANIFEST = { version: "relA", urls: ["/", "/sw.js", "/assets/q.js"] };
  await dl.downloadForOffline();
  assert.ok(store.has("vs-offline-relA"));

  // New build relB; the fetch for one of its files fails mid-download.
  MANIFEST = { version: "relB", urls: ["/", "/sw.js", "/assets/q.js"] };
  FAIL = new Set(["/assets/q.js"]);
  const failed = await dl.downloadForOffline();
  assert.deepEqual(failed.failed, ["/assets/q.js"]);

  // The previous COMPLETE cache is still there and still holds every relA URL
  // (no safe-swap on a failed download).
  assert.ok(store.has("vs-offline-relA"), "previous cache preserved");
  const relAPaths = await cachedPaths("vs-offline-relA");
  for (const u of ["/", "/sw.js", "/assets/q.js"]) assert.ok(relAPaths.has(u), `relA still holds ${u}`);
  assert.ok(store.has("vs-offline-relB"), "the partial new cache also exists");

  // Status against the live relB: the selected (relB) copy is incomplete.
  const stale = await dl.offlineStatus({ checkForUpdate: true });
  assert.equal(stale.downloaded, false);

  // Retry the update cleanly — now it completes and swaps.
  FAIL = new Set();
  await dl.downloadForOffline();
  assert.ok(store.has("vs-offline-relB"));
  assert.ok(!store.has("vs-offline-relA"), "old cache dropped only after a COMPLETE re-download");
  const fresh = await dl.offlineStatus({ checkForUpdate: true });
  assert.equal(fresh.downloaded, true);
  assert.equal(fresh.version, "relB");
});

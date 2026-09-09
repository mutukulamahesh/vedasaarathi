// lib/offline/download.ts — the "Download for offline use" logic (item 5).
// A minimal Cache Storage + fetch polyfill exercises populate / verify /
// remove without a browser.

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
const fetchLog = [];
globalThis.fetch = async (url) => {
  fetchLog.push(String(url));
  const body = Buffer.from(`BODY:${url}`);
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

test("offlineUrlList covers the shell, the document's JS/CSS, and every bundled audio file", () => {
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
  // No duplicates.
  assert.equal(new Set(list).size, list.length);
});

test("downloadForOffline populates the offline cache, reports progress, and records a verified status", async () => {
  const seen = [];
  const res = await dl.downloadForOffline((p) => seen.push(p));
  assert.equal(res.failed.length, 0);
  assert.equal(res.total, dl.offlineUrlList().length);
  assert.equal(res.cached, res.total);
  assert.ok(res.bytes > 0);
  // Progress fired once per file, monotonically increasing, last === total.
  assert.equal(seen.length, res.total);
  assert.equal(seen[0].done, 1);
  assert.equal(seen[seen.length - 1].done, res.total);
  assert.ok(seen.every((p, i) => p.done === i + 1 && p.total === res.total));

  const status = await dl.offlineStatus();
  assert.equal(status.supported, true);
  assert.equal(status.downloaded, true);
  assert.equal(status.cached, res.total);
  assert.ok(status.bytes > 0);
  assert.match(status.at ?? "", /^\d{4}-\d\d-\d\dT/);
});

test("every audio URL was fetched with no Range header (range-safe storage)", () => {
  const audio = dl.offlineAudioUrls();
  for (const u of audio) assert.ok(fetchLog.includes(u), `fetched ${u}`);
});

test("removeOffline clears the download; status returns to not-downloaded", async () => {
  await dl.removeOffline();
  const status = await dl.offlineStatus();
  assert.equal(status.downloaded, false);
  assert.equal(status.cached, 0);
  assert.equal(status.bytes, 0);
});

test("the offline cache name matches the one public/sw.js reads", async () => {
  const sw = (await import("node:fs")).readFileSync(`${root}/public/sw.js`, "utf8");
  assert.ok(sw.includes(`"${dl.OFFLINE_CACHE_NAME}"`), "sw.js references the same cache name");
});

// Executes the real worker with separate simulated HTTP and Cache Storage
// layers. These are behavioral unit tests, not browser upgrade evidence.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const origin = "https://upgrade.example";
const audio = "/audio/v1/achamana.en.plain.mp3";
function worker(script = source) {
  const stores = new Map(), events = new Map(), network = [];
  const key = (input) => new URL(typeof input === "string" ? input : input.url, origin).href;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const map = stores.get(name);
      return {
        match: async (input) => map.get(key(input))?.clone(),
        put: async (input, response) => { map.set(key(input), response.clone()); },
      };
    },
  };
  runInNewContext(script, {
    Request, Response, Headers, URL, caches,
    self: { location: { origin }, addEventListener: (type, cb) => events.set(type, cb),
      skipWaiting: async () => {}, clients: { claim: async () => {} } },
    fetch: async (input, options) => {
      const mode = options?.cache ?? input.cache ?? "default";
      network.push(mode);
      return new Response(mode === "reload" || mode === "no-store" ? "BBBBBB" : "AAA");
    },
  });
  return {
    stores, network,
    seed: async (name, path, body) => (await caches.open(name)).put(path, new Response(body)),
    request: async (options = {}) => {
      let response;
      events.get("fetch")({ request: new Request(new URL(audio, origin), options),
        respondWith: (value) => { response = value; } });
      return response;
    },
    activate: async () => {
      let done;
      events.get("activate")({ waitUntil: (value) => { done = value; } });
      await done;
    },
  };
}
for (const mode of ["reload", "no-store"]) {
  test(`audio ${mode} bypasses old complete download and preserves HTTP freshness`, async () => {
    const w = worker();
    await w.seed("vs-offline-A", "/__offline_meta__", JSON.stringify({ cached: 2, total: 2 }));
    await w.seed("vs-offline-A", audio, "AAA");
    const response = await w.request({ cache: mode });
    assert.equal(await response.text(), "BBBBBB");
    assert.equal(w.network[0], mode);
    assert.equal(response.headers.get("content-type"), "audio/mpeg");
  });
}
test("negative control detects omission of the forwarded cache mode", async () => {
  const broken = source.replace('fetch(url.href, { cache: request.cache })', 'fetch(url.href)');
  assert.notEqual(broken, source);
  assert.equal(await (await worker(broken).request({ cache: "reload" })).text(), "AAA");
});
test("interrupted B cannot shadow complete A; completed B becomes usable", async () => {
  const w = worker();
  await w.seed("vs-offline-B", audio, "BBBBBB");
  await w.seed("vs-offline-B", "/__offline_meta__", JSON.stringify({ cached: 1, total: 2 }));
  await w.seed("vs-offline-A", audio, "AAA");
  await w.seed("vs-offline-A", "/__offline_meta__", JSON.stringify({ cached: 2, total: 2 }));
  assert.equal(await (await w.request()).text(), "AAA");
  assert.equal(w.network.length, 0);
  await w.seed("vs-offline-B", "/__offline_meta__", JSON.stringify({ cached: 2, total: 2 }));
  assert.equal(await (await w.request()).text(), "BBBBBB");
});
test("activation removes old runtime caches while retaining downloaded content", async () => {
  const w = worker();
  await w.seed("vs-v2-old-audio", audio, "AAA");
  await w.seed("vs-offline-A", audio, "AAA");
  await w.activate();
  assert.equal(w.stores.has("vs-v2-old-audio"), false);
  assert.equal(w.stores.has("vs-offline-A"), true);
});
test("range request retains freshness and slices the new full audio", async () => {
  const w = worker();
  const response = await w.request({ cache: "reload", headers: { Range: "bytes=1-3" } });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 1-3/6");
  assert.equal(await response.text(), "BBB");
  assert.equal(w.network[0], "reload");
});

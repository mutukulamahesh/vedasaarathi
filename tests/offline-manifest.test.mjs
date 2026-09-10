// scripts/generate-offline-manifest.mjs — the offline precache manifest is
// CONTENT-addressed (blocker: OFFLINE VERSIONING).
//
// The version must come from each included file's actual bytes plus its URL,
// NOT its byte size — and it must also move when the SERVER-RENDERED shell
// changes, because the precached "/" URL is streamed from the SSR bundle, not a
// physical client file. A rebuilt asset (or shell) with the same length but
// different content has to produce a different version, or a stale offline copy
// would never be flagged.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildOfflineManifest } from "../scripts/generate-offline-manifest.mjs";

/** Lay down a minimal dist/ (client + server siblings) with the files the
 * manifest walker + shell fingerprint read. Returns { root, client }. */
function fixture(files = {}, { serverManifest = '{"index.html":{"file":"assets/x-1111.js"}}' } = {}) {
  const root = mkdtempSync(join(tmpdir(), "offline-manifest-"));
  const client = join(root, "client");
  mkdirSync(join(client, "assets"), { recursive: true });
  mkdirSync(join(client, "audio", "v1"), { recursive: true });
  mkdirSync(join(client, "icons"), { recursive: true });
  mkdirSync(join(root, "server", ".vite"), { recursive: true });
  writeFileSync(join(client, "sw.js"), "self.addEventListener('install',()=>{});\n");
  writeFileSync(join(client, "manifest.webmanifest"), "{}\n");
  writeFileSync(join(client, "favicon.svg"), "<svg/>\n");
  writeFileSync(join(client, "assets", "mhah-panchang.esm-abc123.js"), "export const x=1;\n");
  writeFileSync(join(client, "audio", "v1", "one.mp3"), "ID3AAAA");
  if (serverManifest !== null) {
    writeFileSync(join(root, "server", ".vite", "manifest.json"), serverManifest);
  }
  for (const [rel, content] of Object.entries(files)) {
    writeFileSync(join(client, rel), content);
  }
  return { root, client };
}
const cleanup = (f) => rmSync(f.root, { recursive: true, force: true });

test("the manifest version is content-addressed: same bytes ⇒ same version", () => {
  const a = fixture({ "assets/app-hash.js": "console.log(1);" });
  const b = fixture({ "assets/app-hash.js": "console.log(1);" });
  try {
    const va = buildOfflineManifest(a.client);
    const vb = buildOfflineManifest(b.client);
    assert.equal(va.version, vb.version, "byte-identical trees produce the same version");
    assert.deepEqual(va.urls, vb.urls);
    assert.match(va.version, /^[0-9a-f]{12}$/);
  } finally {
    cleanup(a);
    cleanup(b);
  }
});

test("changing a file's CONTENT without changing its SIZE changes the version", () => {
  const before = "AAAABBBBCCCC"; // 12 bytes
  const after = "AAAAB6BBCCCC"; // still 12 bytes, one byte different
  assert.equal(Buffer.byteLength(before), Buffer.byteLength(after), "sizes are identical");

  const f = fixture({ "assets/chunk-deadbeef.js": before });
  try {
    const first = buildOfflineManifest(f.client);
    writeFileSync(join(f.client, "assets", "chunk-deadbeef.js"), after);
    const second = buildOfflineManifest(f.client);

    assert.notEqual(first.version, second.version, "content change flips the version");
    // The URL list and file count are unchanged — only the content moved.
    assert.deepEqual(first.urls, second.urls);
    assert.equal(first.count, second.count);
  } finally {
    cleanup(f);
  }
});

test("renaming a chunk (new hashed URL, same bytes) also changes the version", () => {
  const f = fixture({ "assets/chunk-1111.js": "payload();" });
  try {
    const first = buildOfflineManifest(f.client);
    rmSync(join(f.client, "assets", "chunk-1111.js"));
    writeFileSync(join(f.client, "assets", "chunk-2222.js"), "payload();");
    const second = buildOfflineManifest(f.client);
    assert.notEqual(first.version, second.version);
  } finally {
    cleanup(f);
  }
});

test("a SHELL-ONLY change (no client file touched) changes the offline version", () => {
  const f = fixture({ "assets/page-xyz.js": "x" });
  try {
    const first = buildOfflineManifest(f.client);
    // Only the server build output changes — every client file is byte-identical.
    writeFileSync(
      join(f.root, "server", ".vite", "manifest.json"),
      '{"index.html":{"file":"assets/x-2222.js"}}',
    );
    const second = buildOfflineManifest(f.client);
    assert.notEqual(first.version, second.version, "the shell fingerprint feeds the version");
    // The precached URL list is unchanged — this is a content move, not a set change.
    assert.deepEqual(first.urls, second.urls);
  } finally {
    cleanup(f);
  }
});

test("the shell fingerprint falls back to server/index.js when there is no vite manifest", () => {
  const f = fixture({}, { serverManifest: null });
  // no .vite/manifest.json — write an index.js instead
  writeFileSync(join(f.root, "server", "index.js"), "export default 1;\n");
  try {
    const first = buildOfflineManifest(f.client);
    writeFileSync(join(f.root, "server", "index.js"), "export default 2;\n");
    const second = buildOfflineManifest(f.client);
    assert.notEqual(first.version, second.version);
  } finally {
    cleanup(f);
  }
});

test("the manifest lists the shell, root files, and every hashed asset / audio file", () => {
  const f = fixture({ "assets/page-xyz.js": "x", "assets/index-xyz.css": "y" });
  try {
    const m = buildOfflineManifest(f.client);
    for (const u of [
      "/", "/sw.js", "/manifest.webmanifest", "/favicon.svg",
      "/assets/mhah-panchang.esm-abc123.js", "/assets/page-xyz.js",
      "/assets/index-xyz.css", "/audio/v1/one.mp3",
    ]) {
      assert.ok(m.urls.includes(u), `manifest lists ${u}`);
    }
    assert.equal(new Set(m.urls).size, m.urls.length, "no duplicate URLs");
  } finally {
    cleanup(f);
  }
});

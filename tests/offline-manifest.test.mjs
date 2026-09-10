// scripts/generate-offline-manifest.mjs — the offline precache manifest is
// CONTENT-addressed (blocker: OFFLINE VERSIONING).
//
// The version must come from each included file's actual bytes plus its URL,
// NOT its byte size. A rebuilt asset with the same length but different content
// has to produce a different version, or a stale offline copy would never be
// flagged.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildOfflineManifest } from "../scripts/generate-offline-manifest.mjs";

/** Lay down a minimal dist/client with the files the manifest walker collects. */
function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), "offline-manifest-"));
  mkdirSync(join(dir, "assets"), { recursive: true });
  mkdirSync(join(dir, "audio", "v1"), { recursive: true });
  mkdirSync(join(dir, "icons"), { recursive: true });
  writeFileSync(join(dir, "sw.js"), "self.addEventListener('install',()=>{});\n");
  writeFileSync(join(dir, "manifest.webmanifest"), "{}\n");
  writeFileSync(join(dir, "favicon.svg"), "<svg/>\n");
  writeFileSync(join(dir, "assets", "mhah-panchang.esm-abc123.js"), "export const x=1;\n");
  writeFileSync(join(dir, "audio", "v1", "one.mp3"), "ID3AAAA");
  for (const [rel, content] of Object.entries(files)) {
    writeFileSync(join(dir, rel), content);
  }
  return dir;
}

test("the manifest version is content-addressed: same bytes ⇒ same version", () => {
  const a = fixture({ "assets/app-hash.js": "console.log(1);" });
  const b = fixture({ "assets/app-hash.js": "console.log(1);" });
  try {
    const va = buildOfflineManifest(a);
    const vb = buildOfflineManifest(b);
    assert.equal(va.version, vb.version, "byte-identical trees produce the same version");
    assert.deepEqual(va.urls, vb.urls);
    assert.match(va.version, /^[0-9a-f]{12}$/);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("changing a file's CONTENT without changing its SIZE changes the version", () => {
  const before = "AAAABBBBCCCC"; // 12 bytes
  const after = "AAAAB6BBCCCC"; // still 12 bytes, one byte different
  assert.equal(Buffer.byteLength(before), Buffer.byteLength(after), "sizes are identical");

  const dir = fixture({ "assets/chunk-deadbeef.js": before });
  try {
    const first = buildOfflineManifest(dir);
    writeFileSync(join(dir, "assets", "chunk-deadbeef.js"), after);
    const second = buildOfflineManifest(dir);

    assert.notEqual(first.version, second.version, "content change flips the version");
    // The URL list and file count are unchanged — only the content moved.
    assert.deepEqual(first.urls, second.urls);
    assert.equal(first.count, second.count);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("renaming a chunk (new hashed URL, same bytes) also changes the version", () => {
  const dir = fixture({ "assets/chunk-1111.js": "payload();" });
  try {
    const first = buildOfflineManifest(dir);
    rmSync(join(dir, "assets", "chunk-1111.js"));
    writeFileSync(join(dir, "assets", "chunk-2222.js"), "payload();");
    const second = buildOfflineManifest(dir);
    assert.notEqual(first.version, second.version);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the manifest lists the shell, root files, and every hashed asset / audio file", () => {
  const dir = fixture({ "assets/page-xyz.js": "x", "assets/index-xyz.css": "y" });
  try {
    const m = buildOfflineManifest(dir);
    for (const u of [
      "/", "/sw.js", "/manifest.webmanifest", "/favicon.svg",
      "/assets/mhah-panchang.esm-abc123.js", "/assets/page-xyz.js",
      "/assets/index-xyz.css", "/audio/v1/one.mp3",
    ]) {
      assert.ok(m.urls.includes(u), `manifest lists ${u}`);
    }
    assert.equal(new Set(m.urls).size, m.urls.length, "no duplicate URLs");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

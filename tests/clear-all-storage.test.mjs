// "Clear saved data on this device" (F7): removes every vedasaarathi: key
// and nothing else, is safe to call with no storage available, and never
// throws.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const { clearAllStoredData, listStoredDataKeys, VEDASAARATHI_STORAGE_PREFIX } =
  await vite.ssrLoadModule("/lib/storage/clear-all.ts");

assert.equal(VEDASAARATHI_STORAGE_PREFIX, "vedasaarathi:");

class FakeStorage {
  #map = new Map();
  get length() { return this.#map.size; }
  key(i) { return [...this.#map.keys()][i] ?? null; }
  getItem(k) { return this.#map.has(k) ? this.#map.get(k) : null; }
  setItem(k, v) { this.#map.set(k, String(v)); }
  removeItem(k) { this.#map.delete(k); }
}

test("removes every vedasaarathi: key and returns the count removed", () => {
  const s = new FakeStorage();
  s.setItem("vedasaarathi:location:v1", "{}");
  s.setItem("vedasaarathi:preparation:v3", "{}");
  s.setItem("vedasaarathi:calendar-months:v1", "{}");
  const removed = clearAllStoredData(s);
  assert.equal(removed, 3);
  assert.equal(s.length, 0);
});

test("never touches a key outside the vedasaarathi: prefix", () => {
  const s = new FakeStorage();
  s.setItem("vedasaarathi:location:v1", "{}");
  s.setItem("some-other-app:token", "keep-me");
  clearAllStoredData(s);
  assert.equal(s.getItem("some-other-app:token"), "keep-me");
  assert.equal(s.getItem("vedasaarathi:location:v1"), null);
});

test("listStoredDataKeys lists exactly the vedasaarathi: keys, nothing else", () => {
  const s = new FakeStorage();
  s.setItem("vedasaarathi:a", "1");
  s.setItem("vedasaarathi:b", "2");
  s.setItem("unrelated", "3");
  const keys = listStoredDataKeys(s).sort();
  assert.deepEqual(keys, ["vedasaarathi:a", "vedasaarathi:b"]);
});

test("is a safe no-op when no storage is available", () => {
  assert.equal(clearAllStoredData(null), 0);
  assert.deepEqual(listStoredDataKeys(null), []);
});

test("an empty store removes nothing and does not throw", () => {
  const s = new FakeStorage();
  assert.equal(clearAllStoredData(s), 0);
});

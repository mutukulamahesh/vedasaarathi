import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

after(async () => {
  await vite.close();
});

const mod = await vite.ssrLoadModule("/lib/storage/playback-speed.ts");
const {
  defaultPlaybackSpeed, parsePlaybackSpeed, loadPlaybackSpeed, savePlaybackSpeed,
  applyPlaybackSpeed, getPlaybackSpeedSnapshot, setPlaybackSpeed,
  PLAYBACK_SPEED_STORAGE_KEY,
} = mod;

function makeFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    raw: map,
  };
}

test("the default speed is 1.1x when no preference is saved yet", () => {
  assert.equal(defaultPlaybackSpeed(), 1.1);
  const store = makeFakeStorage();
  assert.equal(loadPlaybackSpeed(store), 1.1);
});

test("a saved choice persists locally and round-trips exactly", () => {
  const store = makeFakeStorage();
  savePlaybackSpeed(1, store);
  assert.equal(loadPlaybackSpeed(store), 1);
  savePlaybackSpeed(1.1, store);
  assert.equal(loadPlaybackSpeed(store), 1.1);
});

test("damaged, empty, or out-of-range saved data falls back to the default (1.1x), never a broken rate", () => {
  assert.equal(parsePlaybackSpeed(null), 1.1);
  assert.equal(parsePlaybackSpeed("not a number"), 1.1);
  assert.equal(parsePlaybackSpeed("2"), 1.1, "2x was never offered - reject it rather than apply an unreviewed rate");
  assert.equal(parsePlaybackSpeed("0"), 1.1);
  assert.equal(parsePlaybackSpeed("-1.1"), 1.1);
});

test("only the two offered speeds (1 and 1.1) are ever accepted", () => {
  assert.equal(parsePlaybackSpeed("1"), 1);
  assert.equal(parsePlaybackSpeed("1.1"), 1.1);
});

test("applyPlaybackSpeed sets playbackRate and every preservesPitch flag, so 1.1x never raises pitch", () => {
  const fakeEl = {};
  applyPlaybackSpeed(fakeEl, 1.1);
  assert.equal(fakeEl.playbackRate, 1.1);
  assert.equal(fakeEl.preservesPitch, true);
  assert.equal(fakeEl.mozPreservesPitch, true);
  assert.equal(fakeEl.webkitPreservesPitch, true);
});

test("getPlaybackSpeedSnapshot falls back to the default when no browser localStorage is available (this SSR test environment)", () => {
  // setPlaybackSpeed/getPlaybackSpeedSnapshot always use the real browser
  // localStorage (matching presentation-mode.ts's established pattern) -
  // not injectable, so they are only meaningfully exercised in a real
  // browser/JSDOM context, not this plain-Node SSR harness. Confirmed here
  // that the fallback itself is safe (never throws, never a broken rate).
  setPlaybackSpeed(1);
  assert.equal(getPlaybackSpeedSnapshot(), 1.1);
});

test("storage key is namespaced and versioned like the app's other on-device preferences", () => {
  assert.equal(PLAYBACK_SPEED_STORAGE_KEY, "vedasaarathi:playback-speed:v1");
});

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

after(async () => {
  await vite.close();
});

const storageMod = await vite.ssrLoadModule("/lib/storage/location.ts");
const {
  clearLocationState, emptyLocationState, loadLocationState, parseLocationState,
  requestLocationClear, saveLocationState,
} = storageMod;

const readyLocation = {
  status: "READY",
  latitude: 41.8781,
  longitude: -87.6298,
  timezone: "America/Chicago",
  city: "Chicago",
  region: "Illinois",
  country: "United States",
  source: "MANUAL",
  accuracyMeters: null,
  savedAt: "2026-09-03T12:00:00.000Z",
};

function makeFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    get size() {
      return map.size;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Save, reload, clear                                                        */
/* -------------------------------------------------------------------------- */

test("a saved ready location round-trips exactly", () => {
  const store = makeFakeStorage();
  saveLocationState(readyLocation, store);
  assert.deepEqual(loadLocationState(store), readyLocation);
});

test("an unready status round-trips too", () => {
  const store = makeFakeStorage();
  for (const status of ["NOT_SET", "PERMISSION_DENIED", "UNAVAILABLE", "ERROR"]) {
    saveLocationState({ status }, store);
    assert.deepEqual(loadLocationState(store), { status });
  }
});

test("clearLocationState removes the stored entry", () => {
  const store = makeFakeStorage();
  saveLocationState(readyLocation, store);
  assert.equal(store.size, 1);
  clearLocationState(store);
  assert.equal(store.size, 0);
  assert.deepEqual(loadLocationState(store), emptyLocationState());
});

/* -------------------------------------------------------------------------- */
/* Damaged localStorage falls back safely, never to a default city            */
/* -------------------------------------------------------------------------- */

test("null, malformed JSON, and non-object data all fall back to NOT_SET", () => {
  assert.deepEqual(parseLocationState(null), emptyLocationState());
  assert.deepEqual(parseLocationState("{not json"), emptyLocationState());
  assert.deepEqual(parseLocationState("[]"), emptyLocationState());
  assert.deepEqual(parseLocationState('"a string"'), emptyLocationState());
});

test("a READY record missing required fields falls back to NOT_SET, not a default city", () => {
  const incomplete = JSON.stringify({ status: "READY", city: "Somewhere" });
  const result = parseLocationState(incomplete);
  assert.deepEqual(result, emptyLocationState());
  assert.doesNotMatch(JSON.stringify(result), /frisco/i);
});

test("a READY record with an out-of-range latitude is rejected entirely", () => {
  const damaged = JSON.stringify({ ...readyLocation, latitude: 400 });
  assert.deepEqual(parseLocationState(damaged), emptyLocationState());
});

test("a READY record with an invalid time zone is rejected entirely", () => {
  const damaged = JSON.stringify({ ...readyLocation, timezone: "Not/AZone" });
  assert.deepEqual(parseLocationState(damaged), emptyLocationState());
});

test("an unrecognized status string falls back to NOT_SET", () => {
  const weird = JSON.stringify({ status: "SOMETHING_ELSE" });
  assert.deepEqual(parseLocationState(weird), emptyLocationState());
});

/* -------------------------------------------------------------------------- */
/* Accuracy validation - invalid accuracy is dropped, not rejecting the record */
/* -------------------------------------------------------------------------- */

test("a READY record with an invalid accuracy (negative, wrong type, or missing) loads with accuracy null, not rejected", () => {
  // NaN/Infinity cannot survive a real JSON round trip (JSON.stringify turns
  // them into null already); the cases a damaged localStorage string can
  // actually contain are a negative number, the wrong type, or a missing
  // field entirely - each covered here.
  for (const accuracyMeters of [-5, "not a number", undefined]) {
    const stored = JSON.stringify({ ...readyLocation, accuracyMeters });
    const result = parseLocationState(stored);
    assert.equal(result.status, "READY", `an otherwise valid location with accuracy ${accuracyMeters} must still load`);
    assert.equal(result.accuracyMeters, null);
  }
});

test("a READY record with a normal positive accuracy loads it unchanged", () => {
  const stored = JSON.stringify({ ...readyLocation, accuracyMeters: 30 });
  const result = parseLocationState(stored);
  assert.equal(result.accuracyMeters, 30);
});

test("a READY record with accuracy exactly zero loads as zero, not null", () => {
  const stored = JSON.stringify({ ...readyLocation, accuracyMeters: 0 });
  const result = parseLocationState(stored);
  assert.equal(result.accuracyMeters, 0);
});

/* -------------------------------------------------------------------------- */
/* Clear with confirmation                                                    */
/* -------------------------------------------------------------------------- */

test("requestLocationClear does nothing when declined", () => {
  let cleared = 0;
  const done = requestLocationClear({ confirm: () => false, onClear: () => { cleared += 1; } });
  assert.equal(done, false);
  assert.equal(cleared, 0);
});

test("requestLocationClear clears once when confirmed", () => {
  let cleared = 0;
  const done = requestLocationClear({
    confirm: (message) => {
      assert.match(message, /clears your saved location/i);
      return true;
    },
    onClear: () => { cleared += 1; },
  });
  assert.equal(done, true);
  assert.equal(cleared, 1);
});

test("requestLocationClear cannot clear when it has no way to ask (no browser confirm)", () => {
  let cleared = 0;
  const done = requestLocationClear({ onClear: () => { cleared += 1; } });
  assert.equal(done, false);
  assert.equal(cleared, 0);
});

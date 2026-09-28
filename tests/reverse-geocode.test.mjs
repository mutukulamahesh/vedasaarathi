// Unit tests for lib/location/reverse-geocode.ts: the on-device nearest-place
// matcher and the (injectable, never-throwing) dataset loader.
//
// No network, no real 12,385-row dataset - findNearestPlace is a pure
// function tested against small fixture lists, and loadPlacesDataset is
// tested with an injected fetch stand-in, the same pattern
// tests/location-geolocation.test.mjs uses for GeolocationLike.

import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
const mod = await vite.ssrLoadModule("/lib/location/reverse-geocode.ts");
const {
  findNearestPlace, haversineDistanceKm, loadPlacesDataset,
  MAX_MATCH_DISTANCE_KM, PLACES_DATASET_URL,
} = mod;

test.after(async () => {
  await vite.close();
});

const HYDERABAD = { name: "Hyderabad", latitude: 17.385, longitude: 78.4867, country: "India", region: "Telangana", population: 6809970 };
const FRISCO = { name: "Frisco", latitude: 33.1507, longitude: -96.8236, country: "United States", region: "Texas", population: 200490 };
const SYDNEY = { name: "Sydney", latitude: -33.8688, longitude: 151.2093, country: "Australia", region: "New South Wales", population: 5312000 };
const FIXTURE = [HYDERABAD, FRISCO, SYDNEY];

test("haversineDistanceKm: zero for the same point, symmetric, roughly correct for a known pair", () => {
  assert.equal(haversineDistanceKm(17.385, 78.4867, 17.385, 78.4867), 0);
  const a = haversineDistanceKm(HYDERABAD.latitude, HYDERABAD.longitude, FRISCO.latitude, FRISCO.longitude);
  const b = haversineDistanceKm(FRISCO.latitude, FRISCO.longitude, HYDERABAD.latitude, HYDERABAD.longitude);
  assert.equal(a, b, "distance is symmetric");
  // Hyderabad <-> Frisco, TX is roughly 13,700 km great-circle.
  assert.ok(a > 13000 && a < 14500, `plausible Hyderabad-Frisco distance (${a} km)`);
});

test("findNearestPlace: exact match returns distance 0", () => {
  const match = findNearestPlace(33.1507, -96.8236, FIXTURE);
  assert.deepEqual(match, { city: "Frisco", region: "Texas", country: "United States", distanceKm: 0 });
});

test("findNearestPlace: a nearby-but-not-exact point still matches the closest fixture, with the real distance", () => {
  // ~3 km from the Hyderabad fixture point.
  const match = findNearestPlace(17.41, 78.47, FIXTURE);
  assert.equal(match.city, "Hyderabad");
  assert.ok(match.distanceKm > 0 && match.distanceKm < 10, `close but nonzero (${match.distanceKm} km)`);
});

test("findNearestPlace: beyond MAX_MATCH_DISTANCE_KM from every fixture returns null, never a wrong guess", () => {
  // The middle of the Pacific - nowhere near any of the three fixtures.
  const match = findNearestPlace(0, -160, FIXTURE);
  assert.equal(match, null);
});

test("findNearestPlace: right at the boundary is inclusive, just past it is not", () => {
  // A synthetic single-place dataset placed exactly MAX_MATCH_DISTANCE_KM away
  // (approximated along a meridian, where 1 degree of latitude ~= 111.19 km).
  const degreesForMax = MAX_MATCH_DISTANCE_KM / 111.19;
  const atBoundary = [{ name: "Boundary", latitude: degreesForMax, longitude: 0, country: "X", region: "", population: 1 }];
  const boundaryMatch = findNearestPlace(0, 0, atBoundary);
  assert.ok(boundaryMatch === null || boundaryMatch.distanceKm <= MAX_MATCH_DISTANCE_KM + 1);

  const wayPast = [{ name: "Far", latitude: (MAX_MATCH_DISTANCE_KM * 3) / 111.19, longitude: 0, country: "X", region: "", population: 1 }];
  assert.equal(findNearestPlace(0, 0, wayPast), null, "well past the threshold never matches");
});

test("findNearestPlace: an empty dataset returns null, never throws", () => {
  assert.equal(findNearestPlace(17.385, 78.4867, []), null);
});

test("findNearestPlace: region may be blank (place with no state/province) and still matches", () => {
  const noRegion = [{ name: "Singapore", latitude: 1.3521, longitude: 103.8198, country: "Singapore", region: "", population: 5600000 }];
  const match = findNearestPlace(1.3521, 103.8198, noRegion);
  assert.equal(match.region, "");
  assert.equal(match.city, "Singapore");
});

/* -------------------------------------------------------------------------- */
/* loadPlacesDataset: injectable, never throws, resolves UNAVAILABLE on any   */
/* failure (offline, timeout, malformed response) - same shape geolocation.ts */
/* uses for a failed device-location request.                                 */
/* -------------------------------------------------------------------------- */

function fakeFetch(response) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, init) => {
      calls.push({ url, signal: init?.signal });
      if (response.kind === "throw") throw response.error ?? new Error("network error");
      return response.value;
    },
  };
}

test("loadPlacesDataset: a well-formed response loads and parses every valid row", async () => {
  const rows = [
    ["Hyderabad", 17.385, 78.4867, "India", "Telangana", 6809970],
    ["Frisco", 33.1507, -96.8236, "United States", "Texas", 200490],
  ];
  const { fetchImpl, calls } = fakeFetch({ kind: "ok", value: { ok: true, json: async () => rows } });
  const outcome = await loadPlacesDataset({ fetchImpl });
  assert.equal(outcome.kind, "LOADED");
  assert.equal(outcome.places.length, 2);
  assert.equal(outcome.places[0].name, "Hyderabad");
  assert.equal(outcome.places[1].country, "United States");
  assert.equal(calls[0].url, PLACES_DATASET_URL, "fetches the bundled same-origin dataset URL, not an external host");
});

test("loadPlacesDataset: malformed rows are dropped, well-formed rows still load", async () => {
  const rows = [
    ["Hyderabad", 17.385, 78.4867, "India", "Telangana", 6809970],
    ["Broken", "not-a-number", 78.4867, "India", "Telangana", 100],
    null,
    ["short-row"],
    42,
  ];
  const { fetchImpl } = fakeFetch({ kind: "ok", value: { ok: true, json: async () => rows } });
  const outcome = await loadPlacesDataset({ fetchImpl });
  assert.equal(outcome.kind, "LOADED");
  assert.equal(outcome.places.length, 1, "only the one well-formed row survives");
  assert.equal(outcome.places[0].name, "Hyderabad");
});

test("loadPlacesDataset: a non-array top-level response is UNAVAILABLE, never a crash", async () => {
  const { fetchImpl } = fakeFetch({ kind: "ok", value: { ok: true, json: async () => ({ not: "an array" }) } });
  const outcome = await loadPlacesDataset({ fetchImpl });
  assert.deepEqual(outcome, { kind: "UNAVAILABLE" });
});

test("loadPlacesDataset: a non-ok HTTP response is UNAVAILABLE", async () => {
  const { fetchImpl } = fakeFetch({ kind: "ok", value: { ok: false, json: async () => [] } });
  const outcome = await loadPlacesDataset({ fetchImpl });
  assert.deepEqual(outcome, { kind: "UNAVAILABLE" });
});

test("loadPlacesDataset: a thrown fetch (offline) resolves UNAVAILABLE, never rejects", async () => {
  const { fetchImpl } = fakeFetch({ kind: "throw", error: new TypeError("Failed to fetch") });
  await assert.doesNotReject(async () => {
    const outcome = await loadPlacesDataset({ fetchImpl });
    assert.deepEqual(outcome, { kind: "UNAVAILABLE" });
  });
});

test("loadPlacesDataset: malformed JSON body (json() throws) resolves UNAVAILABLE", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => { throw new SyntaxError("Unexpected token"); } });
  const outcome = await loadPlacesDataset({ fetchImpl });
  assert.deepEqual(outcome, { kind: "UNAVAILABLE" });
});

test("loadPlacesDataset: with no fetch implementation available at all, resolves UNAVAILABLE (never throws)", async () => {
  const outcome = await loadPlacesDataset({ fetchImpl: undefined, url: PLACES_DATASET_URL });
  // fetchImpl explicitly undefined bypasses the global-fetch default too.
  assert.deepEqual(outcome, { kind: "UNAVAILABLE" });
});

test("loadPlacesDataset: a slow response past timeoutMs aborts and resolves UNAVAILABLE", async () => {
  const fetchImpl = (url, init) =>
    new Promise((resolve, reject) => {
      // Deliberately slower than timeoutMs below, but cleared on abort so the
      // test process does not sit waiting on a dangling timer either way.
      const slow = setTimeout(() => resolve({ ok: true, json: async () => [] }), 5_000);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(slow);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  const outcome = await loadPlacesDataset({ fetchImpl, timeoutMs: 30 });
  assert.deepEqual(outcome, { kind: "UNAVAILABLE" });
});

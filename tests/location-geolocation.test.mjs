import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const geoMod = await vite.ssrLoadModule("/lib/location/geolocation.ts");
const {
  isGeolocationSupported, requestDeviceLocation, DEFAULT_MAXIMUM_AGE_MS,
  DEFAULT_TIMEOUT_MS,
} = geoMod;

function fakeGeolocation({ succeed, position, errorCode } = {}) {
  const calls = [];
  return {
    calls,
    getCurrentPosition(onSuccess, onError, options) {
      calls.push(options);
      if (succeed) {
        onSuccess({ coords: position });
      } else {
        onError({ code: errorCode });
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Every outcome                                                              */
/* -------------------------------------------------------------------------- */

test("permission granted resolves with coordinates and accuracy", async () => {
  const geo = fakeGeolocation({
    succeed: true,
    position: { latitude: 41.8781, longitude: -87.6298, accuracy: 25 },
  });
  const outcome = await requestDeviceLocation(geo);
  assert.deepEqual(outcome, {
    kind: "GRANTED",
    latitude: 41.8781,
    longitude: -87.6298,
    accuracyMeters: 25,
  });
});

test("a granted position with no accuracy value still resolves cleanly", async () => {
  const geo = fakeGeolocation({ succeed: true, position: { latitude: 1, longitude: 2 } });
  const outcome = await requestDeviceLocation(geo);
  assert.equal(outcome.accuracyMeters, null);
});

test("a granted position with an invalid accuracy (negative, NaN, or Infinity) resolves with accuracy null, not a rejected location", async () => {
  for (const accuracy of [-5, NaN, Infinity]) {
    const geo = fakeGeolocation({ succeed: true, position: { latitude: 1, longitude: 2, accuracy } });
    const outcome = await requestDeviceLocation(geo);
    assert.equal(outcome.kind, "GRANTED");
    assert.equal(outcome.accuracyMeters, null, `accuracy ${accuracy} must be dropped, not passed through`);
  }
});

test("a granted position with a normal positive accuracy passes it through unchanged", async () => {
  const geo = fakeGeolocation({ succeed: true, position: { latitude: 1, longitude: 2, accuracy: 25 } });
  const outcome = await requestDeviceLocation(geo);
  assert.equal(outcome.accuracyMeters, 25);
});

test("permission denied resolves distinctly from other failures", async () => {
  const geo = fakeGeolocation({ succeed: false, errorCode: 1 });
  const outcome = await requestDeviceLocation(geo);
  assert.deepEqual(outcome, { kind: "PERMISSION_DENIED" });
});

test("position unavailable resolves distinctly", async () => {
  const geo = fakeGeolocation({ succeed: false, errorCode: 2 });
  const outcome = await requestDeviceLocation(geo);
  assert.deepEqual(outcome, { kind: "POSITION_UNAVAILABLE" });
});

test("an unrecognized error code still resolves as position unavailable, not a throw", async () => {
  const geo = fakeGeolocation({ succeed: false, errorCode: 999 });
  const outcome = await requestDeviceLocation(geo);
  assert.deepEqual(outcome, { kind: "POSITION_UNAVAILABLE" });
});

test("a request timeout resolves distinctly", async () => {
  const geo = fakeGeolocation({ succeed: false, errorCode: 3 });
  const outcome = await requestDeviceLocation(geo);
  assert.deepEqual(outcome, { kind: "TIMEOUT" });
});

test("an unsupported browser (no geolocation object) resolves without calling anything", async () => {
  const outcome = await requestDeviceLocation(undefined);
  assert.deepEqual(outcome, { kind: "UNSUPPORTED" });
});

test("isGeolocationSupported reflects whether navigator.geolocation exists", () => {
  assert.equal(isGeolocationSupported({ geolocation: {} }), true);
  assert.equal(isGeolocationSupported({ geolocation: undefined }), false);
  assert.equal(isGeolocationSupported(undefined), false);
});

/* -------------------------------------------------------------------------- */
/* Reasonable timeout and accuracy settings, and no automatic re-request      */
/* -------------------------------------------------------------------------- */

test("uses reasonable default timeout and maximumAge, and does not force high accuracy", async () => {
  const geo = fakeGeolocation({ succeed: true, position: { latitude: 0, longitude: 0 } });
  await requestDeviceLocation(geo);
  assert.equal(geo.calls[0].timeout, DEFAULT_TIMEOUT_MS);
  assert.equal(geo.calls[0].maximumAge, DEFAULT_MAXIMUM_AGE_MS);
  assert.equal(geo.calls[0].enableHighAccuracy, false);
  assert.ok(DEFAULT_TIMEOUT_MS > 0 && DEFAULT_TIMEOUT_MS <= 30_000, "timeout is a reasonable one-off value");
});

test("requestDeviceLocation only ever calls getCurrentPosition once per invocation", async () => {
  const geo = fakeGeolocation({ succeed: true, position: { latitude: 0, longitude: 0 } });
  await requestDeviceLocation(geo);
  assert.equal(geo.calls.length, 1, "one call in, one browser prompt - no automatic repeat requests");
});

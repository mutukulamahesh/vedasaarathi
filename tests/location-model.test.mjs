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

const modelMod = await vite.ssrLoadModule("/lib/location/model.ts");
const {
  isValidAccuracyMeters, isValidISOTimestamp, isValidLatitude, isValidLongitude,
  isValidTimezone, locationSummaryLabel, sanitizeAccuracyMeters, validateReadyLocation,
} = modelMod;

const validReady = {
  latitude: 41.8781,
  longitude: -87.6298,
  timezone: "America/Chicago",
  city: "Chicago",
  region: "Illinois",
  country: "United States",
  savedAt: "2026-09-03T12:00:00.000Z",
};

/* -------------------------------------------------------------------------- */
/* Latitude / longitude boundaries                                            */
/* -------------------------------------------------------------------------- */

test("latitude accepts exactly -90 and 90, rejects just outside", () => {
  assert.equal(isValidLatitude(-90), true);
  assert.equal(isValidLatitude(90), true);
  assert.equal(isValidLatitude(0), true);
  assert.equal(isValidLatitude(-90.0001), false);
  assert.equal(isValidLatitude(90.0001), false);
  assert.equal(isValidLatitude(NaN), false);
  assert.equal(isValidLatitude(Infinity), false);
});

test("longitude accepts exactly -180 and 180, rejects just outside", () => {
  assert.equal(isValidLongitude(-180), true);
  assert.equal(isValidLongitude(180), true);
  assert.equal(isValidLongitude(0), true);
  assert.equal(isValidLongitude(-180.0001), false);
  assert.equal(isValidLongitude(180.0001), false);
  assert.equal(isValidLongitude(NaN), false);
});

/* -------------------------------------------------------------------------- */
/* Time zone validation                                                       */
/* -------------------------------------------------------------------------- */

test("valid IANA time zones are accepted", () => {
  for (const tz of ["America/Chicago", "Asia/Kolkata", "UTC", "Europe/London", "Pacific/Auckland"]) {
    assert.equal(isValidTimezone(tz), true, tz);
  }
});

test("invalid or nonsense time zones are rejected", () => {
  for (const tz of ["Not/AZone", "america/chicago-fake", "", "   ", "GMT+5:30 fake", "123"]) {
    assert.equal(isValidTimezone(tz), false, JSON.stringify(tz));
  }
  assert.equal(isValidTimezone(null), false);
  assert.equal(isValidTimezone(undefined), false);
  assert.equal(isValidTimezone(42), false);
});

/* -------------------------------------------------------------------------- */
/* savedAt timestamp validation                                               */
/* -------------------------------------------------------------------------- */

test("a real ISO 8601 timestamp is valid", () => {
  assert.equal(isValidISOTimestamp("2026-09-03T12:00:00.000Z"), true);
  assert.equal(isValidISOTimestamp("2026-09-03T12:00:00Z"), true);
  assert.equal(isValidISOTimestamp("2026-09-03T12:00:00+05:30"), true);
});

test("a bare date or free text is not a valid timestamp", () => {
  assert.equal(isValidISOTimestamp("2026-09-03"), false);
  assert.equal(isValidISOTimestamp("yesterday"), false);
  assert.equal(isValidISOTimestamp(""), false);
  assert.equal(isValidISOTimestamp(null), false);
});

test("an impossible calendar date or time is rejected even though Date.parse would silently normalize it", () => {
  // Real, valid timestamps.
  assert.equal(isValidISOTimestamp("2026-09-03T12:00:00Z"), true, "valid UTC timestamp");
  assert.equal(isValidISOTimestamp("2026-09-03T12:00:00+05:30"), true, "valid offset timestamp");
  assert.equal(isValidISOTimestamp("2024-02-29T00:00:00Z"), true, "valid leap day (2024 is a leap year)");

  // Impossible dates and times that Date.parse would otherwise roll over
  // into a neighboring, real date/time instead of rejecting.
  assert.equal(isValidISOTimestamp("2026-02-30T00:00:00Z"), false, "February 30 does not exist");
  assert.equal(isValidISOTimestamp("2023-02-29T00:00:00Z"), false, "2023 is not a leap year");
  assert.equal(isValidISOTimestamp("2026-13-01T00:00:00Z"), false, "month 13 does not exist");
  assert.equal(isValidISOTimestamp("2026-09-03T24:00:00Z"), false, "hour 24 does not exist");
  assert.equal(isValidISOTimestamp("2026-09-03T12:60:00Z"), false, "minute 60 does not exist");

  // Surrounding whitespace must not be trimmed away by any part of validation.
  assert.equal(isValidISOTimestamp(" 2026-09-03T12:00:00Z"), false, "leading whitespace rejected");
  assert.equal(isValidISOTimestamp("2026-09-03T12:00:00Z "), false, "trailing whitespace rejected");
});

/* -------------------------------------------------------------------------- */
/* Accuracy validation                                                        */
/* -------------------------------------------------------------------------- */

test("isValidAccuracyMeters accepts null and any finite, non-negative number", () => {
  assert.equal(isValidAccuracyMeters(null), true);
  assert.equal(isValidAccuracyMeters(0), true);
  assert.equal(isValidAccuracyMeters(20), true);
});

test("isValidAccuracyMeters rejects negative, NaN, and Infinity", () => {
  assert.equal(isValidAccuracyMeters(-1), false);
  assert.equal(isValidAccuracyMeters(NaN), false);
  assert.equal(isValidAccuracyMeters(Infinity), false);
  assert.equal(isValidAccuracyMeters(-Infinity), false);
});

test("sanitizeAccuracyMeters passes through valid values and null, and drops invalid ones to null", () => {
  assert.equal(sanitizeAccuracyMeters(null), null);
  assert.equal(sanitizeAccuracyMeters(0), 0);
  assert.equal(sanitizeAccuracyMeters(20), 20);
  assert.equal(sanitizeAccuracyMeters(-1), null);
  assert.equal(sanitizeAccuracyMeters(NaN), null);
  assert.equal(sanitizeAccuracyMeters(Infinity), null);
});

/* -------------------------------------------------------------------------- */
/* Full ready-location validation                                             */
/* -------------------------------------------------------------------------- */

test("a fully valid ready location produces no errors", () => {
  assert.deepEqual(validateReadyLocation(validReady), []);
});

test("region is optional; city and country are required", () => {
  assert.deepEqual(validateReadyLocation({ ...validReady, region: "" }), []);

  const noCity = validateReadyLocation({ ...validReady, city: "  " });
  assert.equal(noCity.some((e) => e.field === "city"), true);

  const noCountry = validateReadyLocation({ ...validReady, country: "" });
  assert.equal(noCountry.some((e) => e.field === "country"), true);
});

test("each invalid field is reported independently", () => {
  const errors = validateReadyLocation({
    ...validReady,
    latitude: 200,
    longitude: -400,
    timezone: "Nowhere/Fake",
    savedAt: "not a date",
  });
  const fields = errors.map((e) => e.field).sort();
  assert.deepEqual(fields, ["latitude", "longitude", "savedAt", "timezone"]);
});

/* -------------------------------------------------------------------------- */
/* No default Frisco substitution                                             */
/* -------------------------------------------------------------------------- */

test("locationSummaryLabel never mentions Frisco or any hard-coded city", () => {
  const states = [
    { status: "NOT_SET" },
    { status: "PERMISSION_DENIED" },
    { status: "UNAVAILABLE" },
    { status: "ERROR" },
  ];
  for (const state of states) {
    const label = locationSummaryLabel(state);
    assert.doesNotMatch(label, /frisco/i);
    assert.doesNotMatch(label, /texas/i);
  }
});

test("locationSummaryLabel shows city and region only when ready", () => {
  assert.equal(
    locationSummaryLabel({ ...validReady, status: "READY" }),
    "Chicago, Illinois",
  );
  assert.equal(
    locationSummaryLabel({ ...validReady, status: "READY", region: "" }),
    "Chicago",
  );
  assert.equal(locationSummaryLabel({ status: "NOT_SET" }), "Set your location");
  assert.equal(locationSummaryLabel({ status: "PERMISSION_DENIED" }), "Location permission denied");
  assert.equal(locationSummaryLabel({ status: "UNAVAILABLE" }), "Location unavailable");
  assert.equal(locationSummaryLabel({ status: "ERROR" }), "Location error");
});

// §8 regression coverage: the Sankalpam's Paksha and Tithi must always come
// from the SAME "as of" anchor.
//
// The bug: lib/sankalpam/from-app.ts read the Tithi NAME from the panchanga
// field's CURRENT-INSTANT value, but the Paksha from the context's AT-SUNRISE
// value. On a day when the paksha changes between sunrise and "now" (e.g.
// Krishna Amavasya ending and Shukla Pratipada beginning after sunrise), this
// combined an at-sunrise Paksha with a current-instant Tithi name and could
// produce an impossible pair such as "Krishna Paksha ... Shukla Padyami" -
// exactly what a tester saw at Hyderabad on 11 September 2026.
//
// The fix (panchangaToSlots) always reads the tithi NAME from the field's
// `atSunrise` string when present (which already encodes the SAME anchor as
// ctx.paksha), falling back to `value` only when there was no transition (the
// two are then equal anyway). This file proves the fixed pair is always
// self-consistent - drawn from the SAME instant, current or at-sunrise, never
// a hybrid - across real transition days, and independent of host timezone.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");
const { panchangaToSlots } = await vite.ssrLoadModule("/lib/sankalpam/from-app.ts");
const { computePanchanga } = await vite.ssrLoadModule("/lib/panchanga/engine.ts");

const HYD = { status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata" };

/** Every 15 minutes across `dateISO` (local civil day at `location`), assert
 * the Sankalpam slots' (paksha, tithi) pair is one of the two internally-
 * consistent pairs the raw engine result offers - current-instant or
 * at-sunrise - never a cross of the two ("Krishna Paksha ... Shukla
 * Padyami"-style impossibility). */
async function assertPakshaTithiNeverStraddles(location, dateISO, label) {
  const [y, m, d] = dateISO.split("-").map(Number);
  let checked = 0;
  let sawTransition = false;
  for (let hh = 0; hh < 24; hh += 1) {
    for (const mm of [0, 15, 30, 45]) {
      // Local wall-clock instant, expressed as a UTC ms guess then refined via
      // the same civil-day math the app itself uses (panchangaForLocation
      // takes a UTC ms "now" and derives the civil day at the location's tz).
      const probeUtc = Date.UTC(y, m - 1, d, hh, mm, 0) - offsetGuessMs(location.timezone);
      const raw = await computePanchanga({
        dateMs: probeUtc, latitude: location.latitude, longitude: location.longitude,
        timezone: location.timezone,
      });
      const p = await panchangaForLocation(location, probeUtc);
      const slots = panchangaToSlots(p);
      if (!slots.tithi || !slots.paksha) continue;
      checked += 1;

      const currentPair = `${raw.paksha}|${raw.tithi.name}`;
      const sunrisePair = `${raw.pakshaAtSunrise}|${raw.tithiAtSunrise.name}`;
      const gotPair = `${slots.paksha}|${slots.tithi}`;
      if (currentPair !== sunrisePair) sawTransition = true;
      assert.ok(
        gotPair === currentPair || gotPair === sunrisePair,
        `${label} ${dateISO} ${hh}:${String(mm).padStart(2, "0")} - Sankalpam slots (${gotPair}) must equal the ` +
          `current-instant pair (${currentPair}) or the at-sunrise pair (${sunrisePair}), never a hybrid`,
      );
    }
  }
  assert.ok(checked > 0, `${label}: at least one probe produced tithi/paksha slots`);
  return sawTransition;
}

// A rough, DST-naive UTC offset guess for the probe loop above - only used to
// seed a same-civil-day UTC instant; panchangaForLocation itself derives the
// real civil day from the location's timezone, so a rough guess is enough to
// land on (or very near) the intended local day.
function offsetGuessMs(tz) {
  const known = { "Asia/Kolkata": 5.5 * 3600000, "America/Chicago": -5 * 3600000 };
  return known[tz] ?? 0;
}

test("Hyderabad, 11 September 2026 (the reported transition day): Paksha and Tithi never straddle sunrise", async () => {
  const sawTransition = await assertPakshaTithiNeverStraddles(HYD, "2026-09-11", "Hyderabad");
  // This is specifically the day the bug was seen - the fixture should
  // actually exercise a real paksha transition, not vacuously pass.
  assert.ok(sawTransition, "2026-09-11 at Hyderabad is expected to straddle a paksha transition");
});

test("Hyderabad, adjacent days around the Amavasya/Purnima boundaries also never straddle", async () => {
  for (const dateISO of ["2026-09-10", "2026-09-12", "2026-09-25", "2026-09-26"]) {
    await assertPakshaTithiNeverStraddles(HYD, dateISO, "Hyderabad");
  }
});

test("saved location timezone different from the host/browser timezone: still self-consistent", async (t) => {
  const originalTz = process.env.TZ;
  process.env.TZ = "America/Chicago"; // host/browser timezone
  t.after(() => { process.env.TZ = originalTz; });
  // The SAVED location is still Hyderabad (Asia/Kolkata) - panchangaForLocation
  // must use the location's own timezone, never the host's.
  const sawTransition = await assertPakshaTithiNeverStraddles(HYD, "2026-09-11", "Hyderabad (host TZ = America/Chicago)");
  assert.ok(sawTransition, "the transition day still straddles even under a different host timezone");
});

test("panchangaToSlots reads the tithi name from the SAME anchor as ctx.paksha (unit-level)", async () => {
  // A direct unit check of the fix, independent of the engine's actual dates:
  // when `atSunrise` differs from `value` (a real transition), the tithi name
  // must come from `atSunrise`, matching ctx.paksha's own at-sunrise anchor.
  const p = {
    context: [{ key: "paksha", value: "Krishna" }],
    fields: [
      { key: "tithi", value: "Shukla Padyami", atSunrise: "Krishna Amavasya" },
    ],
  };
  const slots = panchangaToSlots(p);
  assert.equal(slots.paksha, "Krishna");
  assert.equal(slots.tithi, "Amavasya", "tithi name must come from the atSunrise anchor, matching ctx.paksha - not from the current-instant value");
  assert.notEqual(slots.tithi, "Padyami", "must NOT mix the current-instant tithi name with the at-sunrise paksha");
});

test("panchangaToSlots: no transition (atSunrise absent) falls back to value safely", async () => {
  const p = {
    context: [{ key: "paksha", value: "Shukla" }],
    fields: [{ key: "tithi", value: "Shukla Chaturthi" }],
  };
  const slots = panchangaToSlots(p);
  assert.equal(slots.paksha, "Shukla");
  assert.equal(slots.tithi, "Chaturthi");
});

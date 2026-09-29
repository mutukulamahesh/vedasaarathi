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
const FRISCO = { status: "READY", latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago" };
const SYDNEY = { status: "READY", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" };

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
  const known = {
    "Asia/Kolkata": 5.5 * 3600000, "America/Chicago": -5 * 3600000,
    "Australia/Sydney": 10 * 3600000,
  };
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

test("Frisco, the same reported transition day (11 September 2026): also never straddles", async () => {
  const sawTransition = await assertPakshaTithiNeverStraddles(FRISCO, "2026-09-11", "Frisco");
  assert.ok(sawTransition, "2026-09-11 at Frisco is also expected to straddle a paksha transition");
});

test("Sydney, the same reported transition day (11 September 2026): also never straddles", async () => {
  await assertPakshaTithiNeverStraddles(SYDNEY, "2026-09-11", "Sydney");
});

test("Sydney, 14 September 2026 (the Vinayaka Chavithi Madhyahna-vyapti edge case): Paksha/Tithi still never straddle sunrise", async () => {
  // This is the specific date docs/temp/panchangam-investigation-followup-
  // 2026-09-14.md Section 6 traced by hand: Sydney's sunrise Tithi that day
  // is Tritiya, not Chaturthi (the festival's own tithi) - a SEPARATE
  // question from whether Paksha/Tithi straddle each other, which this test
  // checks. The Tithi-vs-festival mismatch itself is covered by the
  // dedicated test below.
  await assertPakshaTithiNeverStraddles(SYDNEY, "2026-09-14", "Sydney");
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

/* -------------------------------------------------------------------------- */
/* Nakshatra anchor: must match Tithi/Paksha's own sunrise anchor - the same  */
/* class of inconsistency the Tithi/Paksha fix above already closed, applied  */
/* to Nakshatra (docs/temp/sankalpam-correctness-audit-2026-09-29.md item 2). */
/* -------------------------------------------------------------------------- */

test("panchangaToSlots reads the nakshatra name from atSunrise when a transition happened (unit-level)", async () => {
  const p = {
    context: [{ key: "paksha", value: "Shukla" }],
    fields: [
      { key: "tithi", value: "Shukla Chaturthi" },
      { key: "nakshatra", value: "Uttara Phalguni", atSunrise: "Purva Phalguni" },
    ],
  };
  const slots = panchangaToSlots(p);
  assert.equal(slots.nakshatra, "Purva Phalguni", "nakshatra must come from the atSunrise anchor when one is present");
  assert.notEqual(slots.nakshatra, "Uttara Phalguni", "must not use the current-instant nakshatra once it has transitioned past sunrise");
});

test("panchangaToSlots: nakshatra with no transition (atSunrise absent) falls back to value safely", async () => {
  const p = {
    context: [{ key: "paksha", value: "Shukla" }],
    fields: [
      { key: "tithi", value: "Shukla Chaturthi" },
      { key: "nakshatra", value: "Hasta" },
    ],
  };
  const slots = panchangaToSlots(p);
  assert.equal(slots.nakshatra, "Hasta");
});

/* -------------------------------------------------------------------------- */
/* Vinayaka Chavithi's own recited Tithi, Hyderabad / Frisco / Sydney -       */
/* documents CURRENT, UNCHANGED behavior (docs/temp/sankalpam-correctness-   */
/* audit-2026-09-29.md item 1). An attempted correction here (withholding    */
/* the Tithi whenever it differs from the festival's own nominal "Chaturthi")*/
/* was tried and REVERTED during this audit: it was disproved by this exact  */
/* data - Hyderabad's OWN sunrise Tithi on its own Vinayaka Chavithi day is   */
/* ALSO Tritiya, not Chaturthi (confirmed independently by Drik Panchang in   */
/* docs/temp/panchangam-verification-2026-09-14.md's own fetched data), so a  */
/* "sunrise != festival tithi" check cannot distinguish Hyderabad's ordinary, */
/* undisputed early-morning transition from Sydney's late, disputed one       */
/* without silently regressing the common case. No fix is implemented; the   */
/* underlying religious question stays recorded as unresolved. These tests   */
/* exist to document exactly that today's (unchanged) values are, as an      */
/* executable version of the audit's expected-output table.                  */
/* -------------------------------------------------------------------------- */

test("Hyderabad, its own Vinayaka Chavithi day (14 Sep 2026): sunrise Tithi is Tritiya, not Chaturthi (confirmed, unchanged)", async () => {
  const p = await panchangaForLocation(HYD, Date.UTC(2026, 8, 14, 4, 0, 0));
  assert.equal(panchangaToSlots(p).tithi, "Thadiya", "Hyderabad's own sunrise Tithi is Tritiya (mhah-panchang spells it 'Thadiya'); Chaturthi ('Chavithi') does not begin until 7:06 AM local, after sunrise (6:05 AM) - this is the routine, undisputed case, not an error");
});

test("Frisco, its own Vinayaka Chavithi day (14 Sep 2026): sunrise Tithi is already Chaturthi (Chaturthi began the previous evening)", async () => {
  const p = await panchangaForLocation(FRISCO, Date.UTC(2026, 8, 14, 13, 0, 0));
  assert.equal(panchangaToSlots(p).tithi, "Chavithi", "Frisco's Chaturthi ('Chavithi') began 8:36 PM the prior evening, well before Frisco's own sunrise - the one of the three locations where sunrise Tithi already matches the festival's own tithi");
});

test("Sydney, its own selected Vinayaka Chavithi day (14 Sep 2026): sunrise Tithi is Tritiya, and Chaturthi arrives close to the madhyahna window's own start", async () => {
  const p = await panchangaForLocation(SYDNEY, Date.UTC(2026, 8, 14, 2, 0, 0));
  assert.equal(panchangaToSlots(p).tithi, "Thadiya", "Sydney's sunrise Tithi is Tritiya; Chaturthi does not begin until 11:36 AM local - later in the day than Hyderabad's 7:06 AM transition, close enough to the engine's own computed madhyahna window start that Drik Panchang's own calculation selects the FOLLOWING day (15 Sep) instead, a still-unresolved date-selection dispute, not merely a Tithi-wording one");
});

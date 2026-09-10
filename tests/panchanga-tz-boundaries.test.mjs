// Blocker: PANCHANGA DST CORRECTNESS.
//
// The Tithi/Nakshatra boundary conversion must be host-timezone independent and
// correct even when the reference instant and the boundary lie on opposite
// sides of a host DST transition (spring-forward gap or fall-back overlap).
//
// This spawns tests/helpers/panchanga-boundary-cli.mjs under five host zones —
// Etc/UTC, Asia/Kolkata, America/Chicago, Pacific/Kiritimati, Pacific/Pago_Pago
// — for cases that straddle America/Chicago's 2026 spring-forward
// (2026-03-08T08:00:00Z) and fall-back (2026-11-01T07:00:00Z), and asserts the
// returned UTC start/end are byte-identical across every zone.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("./helpers/panchanga-boundary-cli.mjs", import.meta.url));
const ROOT = fileURLToPath(new URL("..", import.meta.url));

const ZONES = [
  "Etc/UTC",
  "Asia/Kolkata",
  "America/Chicago",
  "Pacific/Kiritimati", // UTC+14
  "Pacific/Pago_Pago", // UTC-11
];

const SPRING_FORWARD_UTC = Date.parse("2026-03-08T08:00:00Z"); // 02:00 CST → 03:00 CDT
const FALL_BACK_UTC = Date.parse("2026-11-01T07:00:00Z"); // 02:00 CDT → 01:00 CST

function boundaryUnder(tz, withinISO, field) {
  const raw = execFileSync("node", [CLI, withinISO, field], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, TZ: tz },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(raw.trim().split("\n").pop());
}

/** Run one case under every zone; assert the boundary is identical everywhere
 * and that the reference instant and the returned span straddle `transitionMs`. */
function assertTzInvariant(withinISO, field, transitionMs, straddle) {
  const results = ZONES.map((tz) => [tz, boundaryUnder(tz, withinISO, field)]);
  const [, ref] = results[0];

  // Identical UTC boundaries under every host zone.
  for (const [tz, r] of results) {
    assert.equal(r.startsAt, ref.startsAt, `startsAt differs under ${tz}`);
    assert.equal(r.endsAt, ref.endsAt, `endsAt differs under ${tz}`);
    assert.equal(r.name, ref.name, `element name differs under ${tz}`);
  }

  // The case genuinely straddles the DST transition.
  const withinMs = Date.parse(withinISO);
  if (straddle === "end") {
    assert.ok(
      withinMs < transitionMs && ref.endsAt > transitionMs,
      `expected the input (${withinISO}) before and the end (${new Date(ref.endsAt).toISOString()}) after ${new Date(transitionMs).toISOString()}`,
    );
  } else {
    assert.ok(
      ref.startsAt < transitionMs && withinMs > transitionMs,
      `expected the start (${new Date(ref.startsAt).toISOString()}) before and the input (${withinISO}) after ${new Date(transitionMs).toISOString()}`,
    );
  }
  return ref;
}

test("Nakshatra boundary across America/Chicago SPRING-FORWARD is identical under every host time zone", () => {
  // 07:00Z on the transition day = 01:00 CST, ~1h before the 02:00→03:00 gap;
  // this Nakshatra ends just after the gap.
  const ref = assertTzInvariant("2026-03-08T07:00:00Z", "nakshatra", SPRING_FORWARD_UTC, "end");
  assert.ok(ref.endsAt - SPRING_FORWARD_UTC < 3 * 3_600_000, "the end is close to the transition");
});

test("Tithi boundary across America/Chicago SPRING-FORWARD (start before the gap, input after) is identical under every host time zone", () => {
  // 09:00Z = 03:00 CDT, just after the gap; the Tithi began the previous evening.
  assertTzInvariant("2026-03-08T09:00:00Z", "tithi", SPRING_FORWARD_UTC, "start");
});

test("Tithi boundary across America/Chicago FALL-BACK is identical under every host time zone", () => {
  // 05:30Z = 00:30 CDT, before the 02:00→01:00 overlap; this Tithi ends after it.
  const ref = assertTzInvariant("2026-11-01T05:30:00Z", "tithi", FALL_BACK_UTC, "end");
  assert.ok(ref.endsAt - FALL_BACK_UTC < 4 * 3_600_000, "the end is close to the transition");
});

test("Nakshatra boundary across America/Chicago FALL-BACK (start before the overlap, input after) is identical under every host time zone", () => {
  // 09:00Z = 03:00 CST, after the overlap; the Nakshatra began well before it.
  assertTzInvariant("2026-11-01T09:00:00Z", "nakshatra", FALL_BACK_UTC, "start");
});

// Computes one or more monthly-calendar results and prints them as canonical
// JSON, so a test can spawn this under different `TZ` env values and assert the
// output is byte-identical (Feature 5: Panchanga correctness is host-timezone
// independent).
//
//   node tests/helpers/calendar-month-cli.mjs '<lat>,<lng>,<locTz>,<YYYY-MM>' ...
//
// Each argument is one (location, month) case. The location time zone is the
// SAVED location's zone — deliberately independent of the host `TZ`.

import { withProjectModule } from "../../scripts/lib/vite-load.mjs";

const cases = process.argv.slice(2);
if (cases.length === 0) {
  console.error("usage: calendar-month-cli.mjs '<lat>,<lng>,<locTz>,<YYYY-MM>' ...");
  process.exit(2);
}

const out = await withProjectModule("/lib/panchanga/calendar.ts", async (m) => {
  const months = [];
  for (const spec of cases) {
    const [lat, lng, tz, ym] = spec.split(",");
    const [year, month] = ym.split("-").map(Number);
    const result = await m.computeCalendarMonth({
      latitude: Number(lat),
      longitude: Number(lng),
      timezone: tz,
      year,
      month,
    });
    // Drop engineVersion only if it is stable anyway; keep everything that a
    // stale-result bug would corrupt.
    months.push({
      key: `${result.latitude},${result.longitude},${result.timezone},${result.year}-${result.month}`,
      engineVersion: result.engineVersion,
      days: result.days,
      festivals: result.festivals,
      released: result.released,
    });
  }
  return { tz: process.env.TZ ?? "(host default)", months };
});

process.stdout.write(JSON.stringify(out.months) + "\n");

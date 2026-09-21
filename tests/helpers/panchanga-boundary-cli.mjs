// Prints one Panchanga element boundary (UTC ms) for a fixed Frisco location,
// so a test can spawn it under different TZ env values and compare.
//
//   node tests/helpers/panchanga-boundary-cli.mjs <withinISO> <tithi|nakshatra>

import { withProjectModule } from "../../scripts/lib/vite-load.mjs";

const withinMs = Date.parse(process.argv[2]);
const field = process.argv[3];
if (!Number.isFinite(withinMs) || !["tithi", "nakshatra"].includes(field)) {
  console.error("usage: panchanga-boundary-cli.mjs <withinISO> <tithi|nakshatra>");
  process.exit(2);
}

const out = await withProjectModule("/lib/panchanga/engine.ts", async (m) => {
  const p = await m.computePanchanga({
    latitude: 33.1507,
    longitude: -96.8236,
    timezone: "America/Chicago",
    dateMs: withinMs,
  });
  return {
    tz: process.env.TZ ?? "(host default)",
    within: withinMs,
    name: p[field].name,
    startsAt: p[field].startsAt.getTime(),
    endsAt: p[field].endsAt.getTime(),
  };
});

process.stdout.write(JSON.stringify(out) + "\n");

// Regenerates public/geodata/places-v1.json (the on-device place list used by
// lib/location/reverse-geocode.ts for the "Use my location" city/region/
// country suggestion) from the exact GeoNames source files recorded in
// lib/location/geodata-provenance.ts.
//
//   node scripts/generate-geodata.mjs           # downloads fresh source files, regenerates
//   node scripts/generate-geodata.mjs --check    # verifies the checked-in file's
//                                                 # metadata WITHOUT downloading anything
//
// This script is NEVER run automatically by `npm test` or `npm run build` -
// it makes real network requests to download.geonames.org and shells out to
// the system `unzip` command, neither of which belong in an ordinary CI run.
// The build/test suite instead validates the ALREADY-checked-in file against
// the recorded record count and sha256 in lib/location/geodata-provenance.ts
// (see tests/geodata-integrity.test.mjs) - no network involved there at all.
//
// Re-run this script only when deliberately refreshing the dataset, and
// update GEODATA_RETRIEVED_ON, GEODATA_EXPECTED_RECORD_COUNT and
// GEODATA_EXPECTED_SHA256 in geodata-provenance.ts together with the
// regenerated file - never one without the others.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GEODATA_EXPECTED_RECORD_COUNT, GEODATA_EXPECTED_SHA256, GEODATA_OUTPUT_PATH,
  GEODATA_POPULATION_THRESHOLD, GEODATA_SOURCE_FILES,
} from "../lib/location/geodata-provenance.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, GEODATA_OUTPUT_PATH);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Parses a GeoNames tab-separated dump line by column index; the format is
 * documented at https://download.geonames.org/export/dump/readme.txt. */
function parseTsvLines(text) {
  return text.split("\n").filter((l) => l.length > 0).map((l) => l.split("\t"));
}

async function regenerate() {
  const work = mkdtempSync(join(tmpdir(), "vedasaarathi-geodata-"));
  try {
    const [citiesZipUrl, admin1Url, countryUrl] = GEODATA_SOURCE_FILES.map((f) => f.url);

    console.log(`Downloading ${citiesZipUrl} ...`);
    const zipBytes = await download(citiesZipUrl);
    const zipPath = join(work, "cities15000.zip");
    writeFileSync(zipPath, zipBytes);
    // GeoNames only publishes this dump as a .zip; Node has no built-in ZIP
    // reader, so this build-time-only script shells out to the system
    // `unzip` (present on any normal Linux/macOS dev or CI image) - the
    // one external-tool dependency in this whole script, and one this repo
    // already relies on elsewhere for build-time shelling out (scripts/*.sh).
    execFileSync("unzip", ["-o", "-q", zipPath, "-d", work]);
    const citiesText = readFileSync(join(work, "cities15000.txt"), "utf8");

    console.log(`Downloading ${admin1Url} ...`);
    const admin1Text = (await download(admin1Url)).toString("utf8");

    console.log(`Downloading ${countryUrl} ...`);
    const countryText = (await download(countryUrl)).toString("utf8");

    const admin1Names = new Map();
    for (const [code, name] of parseTsvLines(admin1Text)) admin1Names.set(code, name);

    const countryNames = new Map();
    for (const line of countryText.split("\n")) {
      if (line.startsWith("#") || line.trim() === "") continue;
      const cols = line.split("\t");
      countryNames.set(cols[0], cols[4]);
    }

    const rows = [];
    for (const cols of parseTsvLines(citiesText)) {
      // cities15000.txt columns (0-indexed): 1 name, 4 latitude, 5 longitude,
      // 8 country code, 10 admin1 code, 14 population.
      const name = cols[1];
      const latitude = Number(cols[4]);
      const longitude = Number(cols[5]);
      const countryCode = cols[8];
      const admin1Code = cols[10];
      const population = Number(cols[14]) || 0;
      if (population < GEODATA_POPULATION_THRESHOLD) continue;
      const country = countryNames.get(countryCode) ?? countryCode;
      const region = admin1Names.get(`${countryCode}.${admin1Code}`) ?? "";
      rows.push([name, Math.round(latitude * 1e4) / 1e4, Math.round(longitude * 1e4) / 1e4, country, region, population]);
    }

    const json = JSON.stringify(rows);
    writeFileSync(OUT, json);
    const hash = sha256(Buffer.from(json, "utf8"));
    console.log(`Wrote ${GEODATA_OUTPUT_PATH}: ${rows.length} rows, sha256 ${hash}.`);
    console.log(
      "If these differ from GEODATA_EXPECTED_RECORD_COUNT / GEODATA_EXPECTED_SHA256 in " +
      "lib/location/geodata-provenance.ts, update BOTH constants there together with this file, " +
      "and update GEODATA_RETRIEVED_ON to today.",
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function check() {
  if (!existsSync(OUT)) {
    console.error(`${GEODATA_OUTPUT_PATH} does not exist.`);
    process.exit(1);
  }
  const bytes = readFileSync(OUT);
  const hash = sha256(bytes);
  const rows = JSON.parse(bytes.toString("utf8"));
  const problems = [];
  if (rows.length !== GEODATA_EXPECTED_RECORD_COUNT) {
    problems.push(`record count ${rows.length} !== expected ${GEODATA_EXPECTED_RECORD_COUNT}`);
  }
  if (hash !== GEODATA_EXPECTED_SHA256) {
    problems.push(`sha256 ${hash} !== expected ${GEODATA_EXPECTED_SHA256}`);
  }
  if (problems.length > 0) {
    console.error(`${GEODATA_OUTPUT_PATH} does not match its recorded provenance metadata:`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error("Regenerate with `node scripts/generate-geodata.mjs` and update geodata-provenance.ts, or restore the checked-in file.");
    process.exit(1);
  }
  console.log(`${GEODATA_OUTPUT_PATH} matches its recorded provenance metadata (${rows.length} rows, sha256 ${hash}).`);
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invoked) {
  if (process.argv.includes("--check")) {
    check();
  } else {
    await regenerate();
  }
}

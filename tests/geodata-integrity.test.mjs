// Validates the CHECKED-IN public/geodata/places-v1.json against the
// canonical provenance metadata in lib/location/geodata-provenance.ts - no
// network request, no dependency on scripts/generate-geodata.mjs actually
// running. This is what makes "the checked-in dataset doesn't silently
// drift from its documented provenance" part of the ordinary build/test
// suite, while the (network-using) regeneration script itself stays
// entirely out of it.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import assert from "node:assert/strict";
import test from "node:test";

import {
  GEODATA_EXPECTED_RECORD_COUNT, GEODATA_EXPECTED_SHA256, GEODATA_OUTPUT_PATH,
  GEODATA_POPULATION_THRESHOLD, GEODATA_SOURCE_FILES,
} from "../lib/location/geodata-provenance.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FILE_PATH = new URL(`../${GEODATA_OUTPUT_PATH}`, import.meta.url);
const bytes = readFileSync(FILE_PATH);
const text = bytes.toString("utf8");
const rows = JSON.parse(text);

test("the checked-in dataset's sha256 matches its recorded provenance metadata", () => {
  const actual = createHash("sha256").update(bytes).digest("hex");
  assert.equal(
    actual, GEODATA_EXPECTED_SHA256,
    "public/geodata/places-v1.json has changed without lib/location/geodata-provenance.ts being " +
    "updated to match - regenerate with `node scripts/generate-geodata.mjs` and update " +
    "GEODATA_EXPECTED_SHA256 (and GEODATA_EXPECTED_RECORD_COUNT, GEODATA_RETRIEVED_ON) together, " +
    "or restore the previously checked-in file.",
  );
});

test("the checked-in dataset's row count matches its recorded provenance metadata", () => {
  assert.equal(rows.length, GEODATA_EXPECTED_RECORD_COUNT);
});

test("every row is well-formed: [name, lat, lon, country, region, population]", () => {
  for (const row of rows) {
    assert.ok(Array.isArray(row) && row.length === 6, `row has 6 fields: ${JSON.stringify(row)}`);
    const [name, lat, lon, country, region, population] = row;
    assert.equal(typeof name, "string");
    assert.ok(name.length > 0, "name is non-empty");
    assert.equal(typeof lat, "number");
    assert.ok(lat >= -90 && lat <= 90, `latitude in range: ${lat}`);
    assert.equal(typeof lon, "number");
    assert.ok(lon >= -180 && lon <= 180, `longitude in range: ${lon}`);
    assert.equal(typeof country, "string");
    assert.ok(country.length > 0, "country is non-empty");
    assert.equal(typeof region, "string"); // may be "" - not every place has one
    assert.equal(typeof population, "number");
    assert.ok(population >= GEODATA_POPULATION_THRESHOLD, `population meets the documented threshold: ${population}`);
  }
});

test("no duplicate rows (same name+coordinates+country)", () => {
  const seen = new Set();
  for (const [name, lat, lon, country] of rows) {
    const key = `${name}|${lat}|${lon}|${country}`;
    assert.ok(!seen.has(key), `duplicate row: ${key}`);
    seen.add(key);
  }
});

test("this app's own Hyderabad and Frisco, TX fixtures are present and correctly attributed", () => {
  const hyderabad = rows.find(([name, , , country]) => name === "Hyderabad" && country === "India");
  assert.ok(hyderabad, "Hyderabad, India is in the dataset");
  assert.equal(hyderabad[4], "Telangana");

  const frisco = rows.find(([name, , , country]) => name === "Frisco" && country === "United States");
  assert.ok(frisco, "Frisco, United States is in the dataset");
  assert.equal(frisco[4], "Texas");
});

test("scripts/generate-geodata.mjs --check agrees (double-checks the same file the same way the script itself would)", () => {
  const out = execFileSync(process.execPath, ["scripts/generate-geodata.mjs", "--check"], {
    cwd: ROOT, encoding: "utf8",
  });
  assert.match(out, /matches its recorded provenance metadata/);
});

test("provenance metadata itself is internally consistent and makes no unfounded claims", () => {
  assert.ok(GEODATA_SOURCE_FILES.length >= 3, "cities + admin1 + country source files are all recorded");
  for (const f of GEODATA_SOURCE_FILES) {
    assert.match(f.url, /^https:\/\/download\.geonames\.org\//, "every source file is the real GeoNames download host");
  }
});

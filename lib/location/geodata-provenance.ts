// Canonical provenance and validation metadata for the on-device place list
// (public/geodata/places-v1.json), used by lib/location/reverse-geocode.ts.
//
// This is the single source of truth for the facts that must otherwise be
// repeated in three places: the generation script (scripts/generate-geodata.mjs),
// the checked-in dataset's own integrity test (tests/geodata-integrity.test.mjs),
// and the third-party notices generator (scripts/generate-third-party-notices.mjs).
// Keeping them here, imported everywhere they're needed, means the facts can
// only drift out of sync with the actual file if someone edits this file
// without re-running the generator - which the integrity test below is
// exactly there to catch.

export const GEODATA_OUTPUT_PATH = "public/geodata/places-v1.json";

/** The exact GeoNames dump files this dataset was built from - see
 * scripts/generate-geodata.mjs for how they are combined. */
export const GEODATA_SOURCE_FILES = [
  {
    url: "https://download.geonames.org/export/dump/cities15000.zip",
    description: "All populated places with a reported population >= 15,000 (name, coordinates, country code, admin1 code, population).",
  },
  {
    url: "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
    description: "Maps each country+admin1 code (e.g. IN.19) to its region/state/province name (e.g. Telangana).",
  },
  {
    url: "https://download.geonames.org/export/dump/countryInfo.txt",
    description: "Maps each ISO country code (e.g. IN) to its country name (e.g. India).",
  },
] as const;

/** The date the three source files above were downloaded to build the
 * currently checked-in public/geodata/places-v1.json. Update this (and
 * regenerate the file) if the source is ever refreshed. */
export const GEODATA_RETRIEVED_ON = "2026-09-28";

/** cities15000 rows below this reported population are dropped - see
 * scripts/generate-geodata.mjs. Chosen to balance global coverage against
 * bundle size; not a claim that smaller places don't exist. */
export const GEODATA_POPULATION_THRESHOLD = 50_000;

/** Recorded from the currently checked-in file. The integrity test fails
 * the build if the actual file's row count or sha256 no longer match these -
 * regenerate with scripts/generate-geodata.mjs and update both values
 * together (never edit just one). */
export const GEODATA_EXPECTED_RECORD_COUNT = 12_385;
export const GEODATA_EXPECTED_SHA256 =
  "8ec012011905cf9ddb85ce318613695e724d8c5001cc57023064dc29a22b55c4";

export const GEODATA_LICENSE = "CC BY 4.0";
export const GEODATA_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
export const GEODATA_ATTRIBUTION_URL = "https://www.geonames.org/";

/** Exactly what was done to the source data - for the third-party notices
 * section and docs/PRODUCT_DETAILS.md. Deliberately does not claim or imply
 * GeoNames approves, endorses, or guarantees VedaSaarathi or the accuracy of
 * this derived, filtered subset. */
export const GEODATA_TRANSFORMATION_NOTE =
  "Filtered to places with a reported population of at least " +
  `${GEODATA_POPULATION_THRESHOLD.toLocaleString("en-US")}, joined with the admin1 ` +
  "(region/state) and country name tables above, and reformatted from GeoNames' " +
  "own tab-separated dump format into a compact JSON array of " +
  "[name, latitude, longitude, country, region, population] rows. This is a " +
  "derived, filtered subset of GeoNames data - it is not GeoNames' own file, " +
  "and GeoNames has not reviewed, approved, or endorsed VedaSaarathi or this " +
  "derived subset's accuracy.";

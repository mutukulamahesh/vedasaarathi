# ADR 0001: On-device city/state/country suggestion after "Use my location"

Status: Accepted (2026-09-28)

## Context

"Use my location" only ever supplied latitude, longitude, and the device's
time zone; the user still had to type city, state/region, and country by
hand. A tester found this confusing.

Turning coordinates into a place name is reverse geocoding. Two approaches
were considered:

1. **An external, keyless reverse-geocoding API** (e.g. a free client-side
   provider), called after the user grants device location.
2. **A bundled, on-device place list**, matched entirely in the browser with
   no network call.

This app's whole privacy posture — stated in `docs/OFFLINE.md`,
`docs/PRODUCT_DETAILS.md`, and asserted by tests (`tests/location-save-flow.test.mjs`'s
"no network request happens anywhere in the location setup and save flow",
`tests/e2e/journey.e2e.mjs`'s external-request allowlist) — is that nothing
the user enters ever leaves the device. Option 1 would have been the app's
first-ever external network dependency and would have required transmitting
the user's exact GPS coordinates to a third party, a CSP change
(`worker/index.ts`'s `connect-src 'self'`), and walking back several existing
"no external API" claims.

Two free, keyless providers were evaluated directly against this app's own
Hyderabad and Frisco, TX test fixtures:

- **Nominatim (OpenStreetMap)**: accurate for the Hyderabad point tested, but
  its usage policy explicitly forbids production/live use of the public
  endpoint without self-hosting, and it returned HTTP 403 ("Access denied")
  partway through this evaluation's own light testing — not viable as a
  reliable dependency.
- **BigDataCloud's free client-side reverse-geocode**: reachable and
  accurate for Hyderabad, but returned `city: "McKinney"` (a neighboring
  city) for the Frisco, TX fixture, with "Frisco" demoted to a `locality`
  field — a concrete example of a real, external, uncontracted free service
  returning a wrong answer for a place this app treats as a first-class test
  fixture.

## Decision

Use a bundled, on-device place list (Option 2). Built from
[GeoNames](https://www.geonames.org) `cities15000` (CC BY 4.0), filtered to
the 12,385 places with a reported population of at least 50,000, joined with
`admin1CodesASCII.txt` and `countryInfo.txt` for region/country names, and
reformatted into a compact array at `public/geodata/places-v1.json` (~726 KB
raw, ~251 KB gzip). `lib/location/reverse-geocode.ts` matches a device fix's
coordinates against this list by nearest great-circle distance
(`findNearestPlace`), only within `MAX_MATCH_DISTANCE_KM` (100 km) — beyond
that, no suggestion is offered rather than a confidently wrong distant guess.

Against this app's own two test fixtures, the on-device match is at least as
accurate as either external provider tested: Hyderabad matches within 3.2 km,
and Frisco, TX matches exactly (0.0 km) — correctly, unlike BigDataCloud.

The suggestion always lands in the same editable form fields manual entry
already used, and nothing is saved until the user presses "Save location" —
matched fields can be edited or replaced first. A fresh device fix always
clears city/region/country before the lookup resolves, so a new coordinate
pair is never left sitting next to a stale place name.

## Consequences

- No change to `worker/index.ts`'s CSP (`connect-src 'self'` still holds —
  the dataset fetch is same-origin).
- No change to any existing "no external network dependency" claim or test;
  they all remain literally true.
- The place-name suggestion is coarser than a true reverse-geocoding service
  in sparsely covered areas (nearest listed place only, population ≥ 50,000):
  a small town far from any bundled city gets no suggestion at all, not a
  wrong one, and falls back to exactly today's manual entry.
- The dataset is a one-time snapshot (retrieved 2026-09-28); it does not
  reflect place renames, new incorporations, or population changes after that
  date, and there is no update mechanism yet. Refreshing it is a future,
  separate task, not part of this change.
- `public/geodata/places-v1.json` is added to the build's offline precache
  manifest (`scripts/generate-offline-manifest.mjs`) and the fallback shell
  list (`lib/offline/download.ts`), so the suggestion also works after
  "Download for offline use", not only when the device happens to already
  have it cached from an earlier online use.

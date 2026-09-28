// On-device reverse geocoding: turns a device location fix's raw coordinates
// into a SUGGESTED city, region (state/province) and country, by nearest-
// match against a bundled place list. Nothing is ever sent anywhere - the
// place list is a same-origin static file (public/geodata/places-v1.json,
// served at /geodata/places-v1.json), fetched and matched entirely in the
// browser. There is no external API, no account, and no key.
//
// Source: GeoNames (https://www.geonames.org), licensed CC BY 4.0
// (https://creativecommons.org/licenses/by/4.0/). Built from the "cities15000"
// export plus admin1CodesASCII.txt (region names) and countryInfo.txt
// (country names), all from https://download.geonames.org/export/dump/,
// retrieved 2026-09-28. Modified: YES - re-formatted into a compact
// [name, lat, lon, country, region, population] array and reduced from the
// original ~34,100 rows to the 12,385 places with a reported population of at
// least 50,000. See docs/PRODUCT_DETAILS.md for the full note.
//
// This is a SUGGESTION only: the nearest listed place to a coordinate is not
// always the right one (state/country borders, sparse regions, a small town
// with no populous neighbor nearby), so a match is only offered within
// MAX_MATCH_DISTANCE_KM. The caller must still show it as an editable field
// requiring the user's own confirmation before saving - never presented as an
// authoritative geocoding result.

export interface PlaceRecord {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly country: string;
  readonly region: string;
  readonly population: number;
}

export interface PlaceMatch {
  city: string;
  region: string;
  country: string;
  distanceKm: number;
}

export const PLACES_DATASET_URL = "/geodata/places-v1.json";

/** Beyond this distance, the nearest listed place is not offered as a
 * suggestion - open ocean, deserts, and other sparsely covered areas would
 * otherwise surface a confidently wrong, distant city. */
export const MAX_MATCH_DISTANCE_KM = 100;

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in kilometers. */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * The nearest bundled place to the given coordinates, or null when the
 * dataset is empty or nothing is within MAX_MATCH_DISTANCE_KM. A pure
 * function - takes the already-loaded dataset and does no fetching itself -
 * so it is trivially testable with a small fixture list instead of the real
 * 12,385-row file.
 */
export function findNearestPlace(
  latitude: number,
  longitude: number,
  places: readonly PlaceRecord[],
): PlaceMatch | null {
  let best: PlaceRecord | null = null;
  let bestDistanceKm = Infinity;
  for (const place of places) {
    const distanceKm = haversineDistanceKm(latitude, longitude, place.latitude, place.longitude);
    if (distanceKm < bestDistanceKm) {
      bestDistanceKm = distanceKm;
      best = place;
    }
  }
  if (!best || bestDistanceKm > MAX_MATCH_DISTANCE_KM) return null;
  return { city: best.name, region: best.region, country: best.country, distanceKm: bestDistanceKm };
}

export type PlacesLoadOutcome =
  | { kind: "LOADED"; places: PlaceRecord[] }
  | { kind: "UNAVAILABLE" };

/** The minimal fetch shape this module needs - injected so it is testable
 * without a real network stack, the same pattern GeolocationLike uses in
 * ./geolocation.ts for navigator.geolocation. */
export type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export interface LoadPlacesOptions {
  fetchImpl?: FetchLike;
  url?: string;
  timeoutMs?: number;
}

const DEFAULT_LOAD_TIMEOUT_MS = 5_000;

function isPlaceRow(row: unknown): row is [string, number, number, string, string, number] {
  return (
    Array.isArray(row) &&
    row.length >= 6 &&
    typeof row[0] === "string" &&
    typeof row[1] === "number" &&
    typeof row[2] === "number" &&
    typeof row[3] === "string" &&
    typeof row[4] === "string" &&
    typeof row[5] === "number"
  );
}

/**
 * Loads the bundled place dataset. Never throws and never rejects - any
 * failure (offline and not yet cached, a malformed response, or slow enough
 * to time out) resolves to UNAVAILABLE so the caller can fall back to plain
 * manual entry exactly as it already does for a failed device-location
 * request. There is no retry here; the caller decides whether to offer one.
 */
export async function loadPlacesDataset(
  options: LoadPlacesOptions = {},
): Promise<PlacesLoadOutcome> {
  const {
    fetchImpl = typeof fetch !== "undefined" ? (fetch as unknown as FetchLike) : undefined,
    url = PLACES_DATASET_URL,
    timeoutMs = DEFAULT_LOAD_TIMEOUT_MS,
  } = options;

  if (!fetchImpl) return { kind: "UNAVAILABLE" };

  const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  try {
    const response = await fetchImpl(url, { signal: controller?.signal });
    if (!response.ok) return { kind: "UNAVAILABLE" };
    const raw = await response.json();
    if (!Array.isArray(raw)) return { kind: "UNAVAILABLE" };

    const places: PlaceRecord[] = [];
    for (const row of raw) {
      if (!isPlaceRow(row)) continue;
      const [name, latitude, longitude, country, region, population] = row;
      places.push({ name, latitude, longitude, country, region, population });
    }
    return { kind: "LOADED", places };
  } catch {
    return { kind: "UNAVAILABLE" };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

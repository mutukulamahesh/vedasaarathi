// The location model: what a saved location looks like, and how it is
// validated. This module has no browser dependency (no navigator, no
// localStorage) so it is trivially testable.
//
// There is no default location anywhere in this module. An unset or failed
// location is represented by a status with no coordinates at all - never a
// hard-coded city standing in for a real one.

export type LocationSource = "DEVICE" | "MANUAL";

/** A fully configured, validated location the app can use. */
export interface ReadyLocation {
  status: "READY";
  latitude: number;
  longitude: number;
  /** IANA time zone identifier, e.g. "America/Chicago". */
  timezone: string;
  city: string;
  /** State, province, or region. May be blank for places that do not use one. */
  region: string;
  country: string;
  source: LocationSource;
  /** Reported GPS accuracy in meters, when the device provides it. */
  accuracyMeters: number | null;
  /** ISO 8601 timestamp of when this location was saved. */
  savedAt: string;
}

/** No location configured yet, or the last attempt did not produce one. */
export interface UnreadyLocation {
  status: "NOT_SET" | "PERMISSION_DENIED" | "UNAVAILABLE" | "ERROR";
}

export type LocationState = ReadyLocation | UnreadyLocation;

export const UNREADY_STATUSES: readonly UnreadyLocation["status"][] = [
  "NOT_SET",
  "PERMISSION_DENIED",
  "UNAVAILABLE",
  "ERROR",
];

/** Plain-language line for the current status. READY is handled by the caller
 * (it needs the actual city/region), everything else has a fixed message. */
export const LOCATION_STATUS_MESSAGE: Record<UnreadyLocation["status"], string> = {
  NOT_SET: "Set your location",
  PERMISSION_DENIED: "Location permission denied",
  UNAVAILABLE: "Location unavailable",
  ERROR: "Location error",
};

/** The label to show for this location state: city/region when ready, else a status line. */
export function locationSummaryLabel(state: LocationState): string {
  if (state.status === "READY") {
    return state.region.trim() ? `${state.city}, ${state.region}` : state.city;
  }
  return LOCATION_STATUS_MESSAGE[state.status];
}

/* -------------------------------------------------------------------------- */
/* Field validation                                                           */
/* -------------------------------------------------------------------------- */

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

/** True only for a string Intl actually recognizes as an IANA time zone. */
export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") return false;
  try {
    // Throws a RangeError for an unrecognized zone name.
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** True for a usable GPS accuracy reading: none at all (null), or a finite,
 * non-negative number of meters. Never negative, NaN, or Infinity. */
export function isValidAccuracyMeters(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

/** An invalid accuracy reading is simply dropped (becomes null) - it never
 * blocks an otherwise valid location from being saved, stored, or shown. */
export function sanitizeAccuracyMeters(value: unknown): number | null {
  return isValidAccuracyMeters(value) ? value : null;
}

const ISO_TIMESTAMP_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * True only for a real, fully-specified ISO 8601 timestamp (date and time).
 * Beyond the regex shape, this checks the calendar itself - Date.parse alone
 * silently normalizes an impossible date (e.g. February 30 rolls into March)
 * instead of rejecting it, so that normalization is never relied on here for
 * anything but a final sanity check on an already-validated value.
 */
export function isValidISOTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_TIMESTAMP_RE.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  if (month < 1 || month > 12) return false;
  const daysInMonth = month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
  if (day < 1 || day > daysInMonth) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;

  return !Number.isNaN(Date.parse(value));
}

export interface LocationFieldError {
  field: "latitude" | "longitude" | "timezone" | "city" | "country" | "savedAt";
  message: string;
}

export interface ReadyLocationInput {
  latitude: number;
  longitude: number;
  timezone: string;
  city: string;
  region: string;
  country: string;
  savedAt: string;
}

/**
 * Validate a candidate ready location. Returns an empty array when valid.
 * Region (state/province) is not required - many places do not use one - but
 * every other field is.
 */
export function validateReadyLocation(input: ReadyLocationInput): LocationFieldError[] {
  const errors: LocationFieldError[] = [];

  if (!isValidLatitude(input.latitude)) {
    errors.push({ field: "latitude", message: "Latitude must be a number between -90 and 90." });
  }
  if (!isValidLongitude(input.longitude)) {
    errors.push({ field: "longitude", message: "Longitude must be a number between -180 and 180." });
  }
  if (!isValidTimezone(input.timezone)) {
    errors.push({ field: "timezone", message: "Enter a valid time zone, for example America/Chicago." });
  }
  if (input.city.trim() === "") {
    errors.push({ field: "city", message: "Enter a city." });
  }
  if (input.country.trim() === "") {
    errors.push({ field: "country", message: "Enter a country." });
  }
  if (!isValidISOTimestamp(input.savedAt)) {
    errors.push({ field: "savedAt", message: "Saved time must be a valid timestamp." });
  }

  return errors;
}

export function isValidReadyLocation(input: ReadyLocationInput): boolean {
  return validateReadyLocation(input).length === 0;
}

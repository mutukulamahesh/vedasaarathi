// Public Panchanga API for the app.
//
// The browser calculates ONLY the requested location for the current instant.
// The historical validation fixtures and the festival scan are NOT run here —
// they run at build/test time (scripts/verify-panchanga.mjs) and their outcome
// is frozen in ./release-config.json, which this module imports as a small
// static file. A field is shown only if the build-verified config marks it
// released. Festival day and any muhurtham are never returned.
//
// mhah-panchang is still loaded lazily (its own chunk), only once a location
// is saved. computePanchanga() REJECTS on failure so the Home card can show a
// clear "unavailable" state rather than silently showing nothing.

import type { LocationState } from "@/lib/location/model";

import { computePanchanga, formatClock, formatEndsAt, type PanchangaElement } from "./engine";
import type { FieldResult } from "./report-types";
import releaseConfig from "./release-config.json";

const RELEASED = releaseConfig.released as Record<
  "sunrise" | "sunset" | "tithi" | "nakshatra" | "festival", boolean
>;
const REPORT = releaseConfig.report as unknown as FieldResult[];

export interface PanchangaCardField {
  key: "sunrise" | "sunset" | "tithi" | "nakshatra";
  /** Display value already formatted for the location's time zone. */
  value: string;
  /** For tithi / nakshatra: when it ends, in the location's time zone. Reads
   * "3:14 PM", "10:33 AM tomorrow", or "3:00 AM on Sat, 12 Sep". */
  endsAt?: string;
  /** For tithi / nakshatra: the value that prevailed at today's sunrise, only
   * when it differs from the current one (the drik-panchang "day" value). */
  atSunrise?: string;
}

export interface LocationPanchanga {
  /** Fields the build-verified config released, for this location + instant. */
  fields: PanchangaCardField[];
  hasAny: boolean;
  /** Always true while the festival fixture fails: the UI must not claim a
   * location-based festival date or any puja timing. */
  festivalUnavailable: boolean;
  /** For reviewer diagnostics only — the build-verified validation report. */
  validation: FieldResult[];
}

const emptyFor = (): LocationPanchanga => ({
  fields: [], hasAny: false, festivalUnavailable: !RELEASED.festival, validation: REPORT,
});

/**
 * Panchanga for the Home card, for `location` at `nowMs`. Rejects if the
 * calculation fails. Returns an empty (no-fields) result when no location is
 * set. An element is never returned as current once its end time has passed.
 */
export async function panchangaForLocation(
  location: LocationState,
  nowMs: number,
): Promise<LocationPanchanga> {
  if (location.status !== "READY") return emptyFor();

  // No try/catch: a genuine failure propagates so Home shows "unavailable".
  const result = await computePanchanga({
    dateMs: nowMs,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
  });

  const tz = location.timezone;
  const fields: PanchangaCardField[] = [];
  if (RELEASED.sunrise) fields.push({ key: "sunrise", value: formatClock(result.sunrise, tz) });
  if (RELEASED.sunset) fields.push({ key: "sunset", value: formatClock(result.sunset, tz) });

  const addElement = (
    key: "tithi" | "nakshatra",
    current: PanchangaElement,
    currentValue: string,
    sunriseValue: string,
  ) => {
    // Guard: never show an element as current after its end time.
    if (current.endsAt.getTime() <= nowMs) return;
    fields.push({
      key,
      value: currentValue,
      endsAt: formatEndsAt(current.endsAt, nowMs, tz),
      atSunrise:
        sunriseValue.trim().toLowerCase() !== currentValue.trim().toLowerCase()
          ? sunriseValue
          : undefined,
    });
  };

  if (RELEASED.tithi) {
    addElement(
      "tithi",
      result.tithi,
      `${result.paksha} ${result.tithi.name}`,
      `${result.pakshaAtSunrise} ${result.tithiAtSunrise.name}`,
    );
  }
  if (RELEASED.nakshatra) {
    addElement(
      "nakshatra",
      result.nakshatra,
      result.nakshatra.name,
      result.nakshatraAtSunrise.name,
    );
  }

  return {
    fields,
    hasAny: fields.length > 0,
    festivalUnavailable: !RELEASED.festival,
    validation: REPORT,
  };
}

/** The build-verified release flags (no computation). */
export function panchangaReleased() {
  return { ...RELEASED };
}

/** Reviewer-only: the build-verified validation report (no computation). */
export function panchangaValidationReport(): FieldResult[] {
  return REPORT;
}

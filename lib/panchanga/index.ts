// Public Panchanga API for the app. Computes sunrise, sunset, and the Tithi /
// Nakshatra active at the current instant (with the value at sunrise retained
// when it differs), then applies the validation gate (./validation.ts): a
// field is returned only when its published-reference fixtures pass. Festival
// day and any muhurtham are never returned (the festival fixture fails;
// muhurtham is not computed at all).
//
// Everything here is async: the underlying library (mhah-panchang) is loaded
// lazily as its own chunk, only once a location is saved.

import type { LocationState } from "@/lib/location/model";

import { computePanchanga, formatClock, formatEndsAt, type PanchangaElement } from "./engine";
import { validatePanchanga, type FieldResult } from "./validation";

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
  /** Fields that passed validation, ready to display. */
  fields: PanchangaCardField[];
  hasAny: boolean;
  /** Always true while the festival fixture fails: the UI must not claim a
   * location-based festival date or any puja timing. */
  festivalUnavailable: boolean;
  /** For reviewer diagnostics only. */
  validation: FieldResult[];
}

// The validation gate is deterministic; run it once and cache.
let gate: Awaited<ReturnType<typeof validatePanchanga>> | null = null;
async function getGate() {
  if (!gate) gate = await validatePanchanga();
  return gate;
}

/**
 * Panchanga for the Home card. Returns released fields only. `nowMs` is the
 * instant to evaluate (the current minute). An element is never returned as
 * current once its end time has passed.
 */
export async function panchangaForLocation(
  location: LocationState,
  nowMs: number,
): Promise<LocationPanchanga> {
  const { released, results } = await getGate();
  const empty: LocationPanchanga = {
    fields: [], hasAny: false, festivalUnavailable: !released.festival, validation: results,
  };
  if (location.status !== "READY") return empty;

  let result;
  try {
    result = await computePanchanga({
      dateMs: nowMs,
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
    });
  } catch {
    return empty;
  }

  const tz = location.timezone;
  const fields: PanchangaCardField[] = [];
  if (released.sunrise) fields.push({ key: "sunrise", value: formatClock(result.sunrise, tz) });
  if (released.sunset) fields.push({ key: "sunset", value: formatClock(result.sunset, tz) });

  const addElement = (
    key: "tithi" | "nakshatra",
    current: PanchangaElement,
    atSunrise: PanchangaElement,
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

  if (released.tithi) {
    addElement(
      "tithi",
      result.tithi,
      result.tithiAtSunrise,
      `${result.paksha} ${result.tithi.name}`,
      `${result.pakshaAtSunrise} ${result.tithiAtSunrise.name}`,
    );
  }
  if (released.nakshatra) {
    addElement(
      "nakshatra",
      result.nakshatra,
      result.nakshatraAtSunrise,
      result.nakshatra.name,
      result.nakshatraAtSunrise.name,
    );
  }

  return {
    fields,
    hasAny: fields.length > 0,
    festivalUnavailable: !released.festival,
    validation: results,
  };
}

/** Reviewer-only: the full validation report. */
export async function panchangaValidationReport() {
  return (await getGate()).results;
}

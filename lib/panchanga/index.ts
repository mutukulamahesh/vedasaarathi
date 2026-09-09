// Public Panchanga API for the app. Computes sunrise, sunset, current Tithi and
// current Nakshatra from a saved location + instant, then applies the
// validation gate (./validation.ts): a field is returned only when its
// published-reference fixtures pass. Festival day and any muhurtham are never
// returned (the festival fixture fails; muhurtham is not computed at all).
//
// Everything here is async: the underlying library (mhah-panchang) is loaded
// lazily as its own chunk, only once a location is saved.

import type { LocationState } from "@/lib/location/model";

import { computePanchanga, formatClock, type PanchangaElement } from "./engine";
import { validatePanchanga, type FieldResult } from "./validation";

export interface PanchangaCardField {
  key: "sunrise" | "sunset" | "tithi" | "nakshatra";
  /** Display value already formatted for the location's time zone. */
  value: string;
  /** For tithi / nakshatra: when it ends, in the location's time zone. */
  endsAt?: string;
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

const elementEnds = (el: PanchangaElement, tz: string) => formatClock(el.endsAt, tz);

/**
 * Panchanga for the Home card. Returns released fields only. `nowMs` is the
 * instant to evaluate (the current minute).
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
  if (released.tithi) {
    fields.push({
      key: "tithi",
      value: `${result.paksha} ${result.tithi.name}`,
      endsAt: elementEnds(result.tithi, tz),
    });
  }
  if (released.nakshatra) {
    fields.push({
      key: "nakshatra",
      value: result.nakshatra.name,
      endsAt: elementEnds(result.nakshatra, tz),
    });
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

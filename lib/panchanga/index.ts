// Public Panchanga API for the app.
//
// The browser calculates ONLY the requested location for the current instant
// (plus, when the festival field is released, one forward scan for the next
// Vinayaka Chavithi — a few hundred ms, memoised per location+day). The
// historical validation fixtures do NOT run here — they run at build/test time
// (scripts/verify-panchanga.mjs) and their outcome is frozen in
// ./release-config.json, imported here as a small static file. A field is shown
// only if the build-verified config marks it released.
//
// mhah-panchang is still loaded lazily (its own chunk), only once a location
// is saved. computePanchanga() REJECTS on failure so the Home card can show a
// clear "unavailable" state rather than silently showing nothing.

import type { LocationState } from "@/lib/location/model";

import {
  computePanchanga, formatClock, formatEndsAt, madhyahnaVyaptiFestivalDay,
  type PanchangaElement,
} from "./engine";
import type { FieldResult, PanchangaField } from "./report-types";
import releaseConfig from "./release-config.json";

const RELEASED = releaseConfig.released as Record<PanchangaField, boolean>;
const REPORT = releaseConfig.report as unknown as FieldResult[];

/** The Vinayaka Chavithi festival rule (Bhadrapada Shukla Chaturthi, by the
 * madhyahna-vyapti rule — see engine.ts). Masa name is mhah-panchang's. */
const VINAYAKA_RULE = {
  name: "Vinayaka Chavithi",
  masa: "Bhadraba",
  paksha: "Shukla",
  tithi: "Chaturthi",
} as const;

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

/** An almanac line: samvatsara / ayana / ritu / masa / paksha / vaara. */
export interface PanchangaContextField {
  key: "samvatsara" | "ayana" | "ritu" | "masa" | "paksha" | "vaara";
  value: string;
  /** Set when the field is a tradition that others reckon differently. */
  note?: string;
}

export interface PanchangaFestival {
  name: string;
  /** Local civil date (YYYY-MM-DD) in the location's time zone. */
  dateISO: string;
  /** Whole days from now (0 = today). */
  inDays: number;
  /** Location-aware puja window (madhyahna ∩ Chaturthi tithi span), formatted
   * for the location's time zone. Present only when both the festival and the
   * puja-window fields are build-verified as released. */
  pujaWindow?: { start: string; end: string };
}

export interface LocationPanchanga {
  /** Fields the build-verified config released, for this location + instant. */
  fields: PanchangaCardField[];
  /** Almanac context lines (released descriptive fields). */
  context: PanchangaContextField[];
  hasAny: boolean;
  /** The next Vinayaka Chavithi for this location, when the festival field is
   * released. Undefined otherwise. */
  festival?: PanchangaFestival;
  /** True while the festival field is NOT released: the UI must not claim a
   * location-based festival date or any puja timing. */
  festivalUnavailable: boolean;
  /** For reviewer diagnostics only — the build-verified validation report. */
  validation: FieldResult[];
}

const emptyFor = (): LocationPanchanga => ({
  fields: [], context: [], hasAny: false,
  festivalUnavailable: !RELEASED.festival, validation: REPORT,
});

// Memoise the festival scan per location+civil-day so navigating back to Home
// does not recompute it.
const festivalCache = new Map<string, PanchangaFestival | undefined>();

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

  const context: PanchangaContextField[] = [];
  if (RELEASED.samvatsara && result.samvatsara) {
    context.push({
      key: "samvatsara",
      value: result.samvatsara,
      note: "South Indian (Shaka) reckoning — the North Indian / Vikrama cycle names a different year.",
    });
  }
  if (RELEASED.ayana && result.ayana) {
    context.push({
      key: "ayana",
      value: result.ayana,
      note: "From the six-season split; a solar-sankranti panchang can differ by a few days near the solstice.",
    });
  }
  if (RELEASED.ritu && result.ritu) {
    context.push({
      key: "ritu",
      value: result.ritu,
      note: "Vedic (lunar-month) ritu; a solar-reckoning panchang may name the adjacent season.",
    });
  }
  // masa + paksha are already released (tithi gate) and always safe to show.
  if (result.masa) context.push({ key: "masa", value: result.masa, note: "Purnimanta reckoning." });
  if (result.pakshaAtSunrise) context.push({ key: "paksha", value: result.pakshaAtSunrise });
  if (RELEASED.vaara && result.vaara) context.push({ key: "vaara", value: result.vaara });

  let festival: PanchangaFestival | undefined;
  if (RELEASED.festival) {
    const civilKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(nowMs));
    const cacheKey = `${location.latitude},${location.longitude},${tz},${civilKey}`;
    if (festivalCache.has(cacheKey)) {
      festival = festivalCache.get(cacheKey);
    } else {
      const m = await madhyahnaVyaptiFestivalDay(
        { dateMs: nowMs, latitude: location.latitude, longitude: location.longitude, timezone: tz },
        VINAYAKA_RULE,
      );
      festival = m
        ? {
            name: m.name,
            dateISO: m.dateISO,
            inDays: m.inDays,
            pujaWindow: RELEASED.pujaWindow
              ? {
                  start: formatClock(new Date(m.pujaWindow.startMs), tz),
                  end: formatClock(new Date(m.pujaWindow.endMs), tz),
                }
              : undefined,
          }
        : undefined;
      festivalCache.set(cacheKey, festival);
    }
  }

  return {
    fields,
    context,
    hasAny: fields.length > 0 || context.length > 0,
    festival,
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

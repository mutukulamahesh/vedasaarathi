// Public Panchanga API for the app.
//
// The browser calculates ONLY the requested location for the current instant
// (plus, when the festival field is released, one forward scan per configured
// festival rule to find the soonest upcoming calendar observance — a few
// hundred ms per rule, memoised per location+day). The historical validation
// fixtures do NOT run here — they run at build/test time
// (scripts/verify-panchanga.mjs) and their outcome is frozen in
// ./release-config.json, imported here as a small static file. A field is shown
// only if the build-verified config marks it released.
//
// mhah-panchang is still loaded lazily (its own chunk), only once a location
// is saved. computePanchanga() REJECTS on failure so the Home card can show a
// clear "unavailable" state rather than silently showing nothing.

import type { LocationState } from "@/lib/location/model";

import {
  computePanchanga, formatClock, formatEndsAt, festivalRuleOccurrence,
  civilDateParts, weekdayIndex, collapseSupersededOccurrences,
  type PanchangaElement,
} from "./engine";
import { computeDayTimings, displayPeriods, type DisplayPeriod } from "./day-timings";
import { FESTIVAL_RULES } from "./festival-rules";
import type { FieldResult, PanchangaField } from "./report-types";
import releaseConfig from "./release-config.json";

const RELEASED = releaseConfig.released as Record<PanchangaField, boolean>;
const REPORT = releaseConfig.report as unknown as FieldResult[];

export interface PanchangaCardField {
  key: "sunrise" | "sunset" | "tithi" | "nakshatra";
  /** Display value already formatted for the location's time zone. */
  value: string;
  /** For tithi / nakshatra: when it ends, in the location's time zone. Reads
   * "3:14 PM", "10:33 AM tomorrow", or "3:00 AM on Sat, 12 Sep". */
  endsAt?: string;
  /** The same instant as `endsAt`, as a raw epoch-ms timestamp. Lets a caller
   * that is holding on to an older `PanchangaCardField` (e.g. across a
   * pending per-minute refresh) check for itself whether THIS specific value
   * has actually expired relative to the current instant, without needing to
   * parse `endsAt`'s formatted string. */
  endsAtMs?: number;
  /** For tithi / nakshatra: the value that prevailed at today's sunrise, only
   * when it differs from the current one (the drik-panchang "day" value). */
  atSunrise?: string;
  /** For tithi / nakshatra, only when `atSunrise` is set: the instant the
   * sunrise value and the current value actually differ from each other,
   * formatted for the location's time zone. This is NOT `endsAt` (the
   * current element's own end, a future time) - it is the boundary BETWEEN
   * the sunrise element and the current element. When `now` is at or after
   * today's sunrise, this is a past instant (the element already changed);
   * when checked before today's own sunrise (the sunrise-anchored value is
   * itself still in the future), this is a future instant instead - see
   * `transitionIsFuture`. */
  transitionAt?: string;
  /** True when `transitionAt` has not happened yet relative to `now` - only
   * possible before that day's own sunrise, where the value prevailing right
   * now differs from what will prevail once sunrise arrives. The UI must
   * phrase this as an upcoming change ("begins at"), never as something that
   * already happened ("changed at"). */
  transitionIsFuture?: boolean;
}

/** An almanac line: samvatsara / ayana / ritu / masa / paksha / vaara. */
export interface PanchangaContextField {
  key: "samvatsara" | "ayana" | "ritu" | "masa" | "masaAmanta" | "paksha" | "vaara";
  value: string;
  /** Set when the field is a tradition that others reckon differently. */
  note?: string;
  /** `masaAmanta` only: true when `value` is an Adhika (intercalary) month.
   * Structured (from `PanchangaResult.isAdhikaMasa`) so a consumer can
   * render a qualifier without parsing `note`'s prose. */
  isAdhikaMasa?: boolean;
}

export interface PanchangaFestival {
  name: string;
  nameTe?: string;
  /** Local civil date (YYYY-MM-DD) in the location's time zone. */
  dateISO: string;
  /** Whole days from now (0 = today). */
  inDays: number;
  /** The rule id, e.g. "vinayaka-chavithi" - lets a caller open the matching
   * puja without a name-string lookup. */
  ruleId: string;
  /** Puja slug when this festival opens a real puja service, else null (a
   * calendar-only observance, e.g. Ugadi or Masa Shivaratri). */
  pujaSlug: string | null;
  /** Location-aware puja window (madhyahna ∩ Chaturthi tithi span), formatted
   * for the location's time zone. Present only when both the festival and the
   * puja-window fields are build-verified as released. */
  pujaWindow?: { start: string; end: string };
}

/** A general daily period (Rahu Kalam, Abhijit, …), formatted for the location. */
export type PanchangaDayPeriod = DisplayPeriod;

export interface LocationPanchanga {
  /** Fields the build-verified config released, for this location + instant. */
  fields: PanchangaCardField[];
  /** Almanac context lines (released descriptive fields). */
  context: PanchangaContextField[];
  /** General useful / avoid periods for TODAY at this location (everyone; not
   * personal, not astrology). Empty only when sun times are unavailable. */
  useful: PanchangaDayPeriod[];
  avoid: PanchangaDayPeriod[];
  hasAny: boolean;
  /** The soonest upcoming calendar observance for this location among every
   * configured, validated festival rule — independently of whether that
   * rule opens a puja service — when the festival field is released.
   * Undefined otherwise, or while none is found. Equal to
   * `upcomingFestivals[0]`, kept for callers that only need the one. */
  festival?: PanchangaFestival;
  /** Home's selected festival rows (Calendar V1 Phase 1 selection —
   * see `selectHomeFestivals`'s own doc comment): at most
   * `HOME_MAX_ROWS`, at most one Home-P0 rule within `HOME_P0_HORIZON_DAYS`,
   * at most two Home-P1 rules within `HOME_P1_HORIZON_DAYS`, never more than
   * one occurrence per rule, never fabricated when nothing qualifies. Empty
   * while the festival field is not released, or while nothing qualifies. */
  upcomingFestivals: PanchangaFestival[];
  /** True while the festival field is NOT released: the UI must not claim a
   * location-based festival date or any puja timing. */
  festivalUnavailable: boolean;
  /** For reviewer diagnostics only — the build-verified validation report. */
  validation: FieldResult[];
}

const emptyFor = (): LocationPanchanga => ({
  fields: [], context: [], useful: [], avoid: [], hasAny: false,
  festivalUnavailable: !RELEASED.festival, validation: REPORT, upcomingFestivals: [],
});

// Memoise the festival scan per location+civil-day so navigating back to Home
// does not recompute it.
const festivalCache = new Map<string, PanchangaFestival[]>();
/** Calendar V1 Phase 1 Home selection — replaces the old flat
 * top-5-by-date merge (which let the two monthly-recurring rules crowd out
 * everything else; see docs/temp/festival-calendar-v1-spec-2026-09-17.md §7,
 * "Home Rule"). At most this many rows total. */
const HOME_MAX_ROWS = 3;
/** A Home-P0 rule (one "next major festival" slot) only qualifies within this
 * many days. */
const HOME_P0_HORIZON_DAYS = 60;
/** A Home-P1 rule (up to two "nearest observance" slots) only qualifies
 * within this many days. */
const HOME_P1_HORIZON_DAYS = 30;

/**
 * Home's selected festival rows: at most one Home-P0 rule's nearest
 * occurrence within `HOME_P0_HORIZON_DAYS`, plus at most two Home-P1 rules'
 * nearest occurrences within `HOME_P1_HORIZON_DAYS`, sorted chronologically,
 * never more than `HOME_MAX_ROWS` total. Every rule contributes AT MOST ONE
 * occurrence (its own nearest one) — never two rows for the same rule. A
 * rule tagged "calendar-only" is never a Home candidate at all. When nothing
 * qualifies for a tier, that tier simply contributes no row — never a
 * fabricated placeholder.
 *
 * Calls `festivalRuleOccurrence` directly (the SAME shared dispatcher
 * Calendar's own `festivalRuleOccurrencesInRange` calls internally per
 * occurrence) — one call per rule, not a merged multi-occurrence scan, since
 * Home only ever needs each rule's single nearest occurrence. This is the
 * "one shared occurrence source for Home and Calendar" the spec requires:
 * both screens' festival dates always come from this one dispatch function,
 * never two independently hand-rolled scans that could quietly disagree.
 *
 * SUPERSESSION, BEFORE the P0/P1 split: the raw per-rule candidates are run
 * through the SAME shared `collapseSupersededOccurrences` step Calendar's
 * own `festivalsInMonth` calls, so a superseded rule's occurrence (e.g. that
 * month's ordinary Masa Shivaratri, on the date annual Maha Shivaratri
 * coincides with it) is removed BEFORE tiers are picked - never surfacing as
 * an extra P1 row alongside the rule that supersedes it. This has to happen
 * before the split, not after: collapsing only within one already-picked
 * tier would miss a same-date collision across tiers (Maha Shivaratri is
 * Home-P0; Masa Shivaratri is Home-P1).
 *
 * YIELDS BETWEEN SCAN DAYS on a genuinely uncached (cold) visit, the SAME
 * mechanism `computeCalendarMonth` already uses (a `setTimeout(0)` hop every
 * few horizon-days, via each engine function's own `opts.onIteration`) -
 * measured directly (real browser, 4x CPU throttle) to turn a single
 * ~1.5s main-thread block across all 11 active rules' sequential scans into
 * many small chunks, keeping the page able to paint/handle input while a
 * cold Home calculation is in flight. This does NOT parallelise the rules
 * or add a worker - the scan is still sequential, one rule at a time; it
 * only stops being ONE uninterrupted synchronous block. A warm (cached)
 * revisit never reaches this loop at all (see `festivalCache` below).
 */
async function selectHomeFestivals(
  locationInput: { dateMs: number; latitude: number; longitude: number; timezone: string },
  tz: string,
): Promise<PanchangaFestival[]> {
  const toFestival = (rule: (typeof FESTIVAL_RULES)[number], m: NonNullable<Awaited<ReturnType<typeof festivalRuleOccurrence>>>): PanchangaFestival => ({
    name: m.name,
    nameTe: m.nameTe,
    dateISO: m.dateISO,
    inDays: m.inDays,
    ruleId: rule.id,
    pujaSlug: rule.pujaSlug,
    pujaWindow: RELEASED.pujaWindow && m.pujaWindow
      ? {
          start: formatClock(new Date(m.pujaWindow.startMs), tz),
          end: formatClock(new Date(m.pujaWindow.endMs), tz),
        }
      : undefined,
  });

  const yieldToLoop = () => new Promise<void>((r) => setTimeout(r, 0));
  let scanTick = 0;
  const scanOpts = {
    onIteration: async () => {
      if (++scanTick % 4 === 0) await yieldToLoop();
    },
  };

  const ruleById = new Map<string, (typeof FESTIVAL_RULES)[number]>(FESTIVAL_RULES.map((r) => [r.id, r]));
  const candidates: PanchangaFestival[] = [];
  for (const rule of FESTIVAL_RULES) {
    if (rule.method === "deferred") continue;
    if (rule.homePriority === "calendar-only") continue;
    const horizonDays = rule.homePriority === "P0" ? HOME_P0_HORIZON_DAYS : HOME_P1_HORIZON_DAYS;
    const m = await festivalRuleOccurrence(locationInput, rule, horizonDays, scanOpts);
    if (!m) continue;
    candidates.push(toFestival(rule, m));
  }
  const collapsed = collapseSupersededOccurrences(candidates, FESTIVAL_RULES);

  const p0Candidates = collapsed
    .filter((f) => ruleById.get(f.ruleId)?.homePriority === "P0")
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  const p1Candidates = collapsed
    .filter((f) => ruleById.get(f.ruleId)?.homePriority === "P1")
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  const rows = [...p0Candidates.slice(0, 1), ...p1Candidates.slice(0, HOME_MAX_ROWS - 1)];
  rows.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  return rows.slice(0, HOME_MAX_ROWS);
}

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

  // General useful / avoid periods for today's civil date at this location.
  const { y, mo, da } = civilDateParts(nowMs, tz);
  const dayT = computeDayTimings(
    result.sunrise.getTime(), result.sunset.getTime(), weekdayIndex(y, mo, da),
  );
  // Overlaps of a "useful" period with the avoid periods are computed by the
  // SAME shared function Calendar uses (displayPeriods), so the exact
  // intervals and wording are identical on both screens.
  const shown = displayPeriods(dayT, (ms) => formatClock(new Date(ms), tz));
  const periodsReleased = RELEASED.sunrise && RELEASED.sunset;
  const useful = periodsReleased ? shown.useful : [];
  const avoid = periodsReleased ? shown.avoid : [];

  const addElement = (
    key: "tithi" | "nakshatra",
    current: PanchangaElement,
    currentValue: string,
    sunrise: PanchangaElement,
    sunriseValue: string,
  ) => {
    // Guard: never show an element as current after its end time.
    if (current.endsAt.getTime() <= nowMs) return;
    const differs = sunriseValue.trim().toLowerCase() !== currentValue.trim().toLowerCase();
    let transitionAt: string | undefined;
    let transitionIsFuture: boolean | undefined;
    if (differs) {
      // The boundary between the sunrise element and the current element -
      // never `current.endsAt` (that is the CURRENT element's own future
      // end, not the past transition into it). Ordinarily that boundary is
      // `current.startsAt` (when today's actual sunrise has already
      // happened, so the sunrise-anchored value already gave way to the
      // current one). Before today's own sunrise, the "sunrise" value is
      // itself still in the future - the transition has not happened yet,
      // so the boundary is instead `sunrise.startsAt` (when that upcoming
      // sunrise-anchored element will itself begin), and it must be
      // presented as upcoming, not as something already changed.
      const sunriseInstant = result.sunrise.getTime();
      const transitionMs = nowMs >= sunriseInstant
        ? current.startsAt.getTime()
        : sunrise.startsAt.getTime();
      transitionAt = formatClock(new Date(transitionMs), tz);
      transitionIsFuture = transitionMs > nowMs;
    }
    fields.push({
      key,
      value: currentValue,
      endsAt: formatEndsAt(current.endsAt, nowMs, tz),
      endsAtMs: current.endsAt.getTime(),
      atSunrise: differs ? sunriseValue : undefined,
      transitionAt,
      transitionIsFuture,
    });
  };

  if (RELEASED.tithi) {
    addElement(
      "tithi",
      result.tithi,
      `${result.paksha} ${result.tithi.name}`,
      result.tithiAtSunrise,
      `${result.pakshaAtSunrise} ${result.tithiAtSunrise.name}`,
    );
  }
  if (RELEASED.nakshatra) {
    addElement(
      "nakshatra",
      result.nakshatra,
      result.nakshatra.name,
      result.nakshatraAtSunrise,
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
  // "masa" is UNCHANGED here - existing consumers (Sankalpam via
  // panchangaToSlots, the Vinayaka Chavithi festival rule) keep reading this
  // exact key/value; nothing here alters what they see. It is historically
  // labelled "Purnimanta" but is actually a same-instant solar-Raasi lookup,
  // not a true lunar-boundary Purnimanta calculation - confirmed wrong
  // during an Adhika-masa stretch; see amantaMasaFromMoonMasa's doc comment
  // in engine.ts and docs/temp/amanta-masa-validation-2026-09-14.md. Left
  // as-is; not fixed here. "masaAmanta" is new and additive - the correct,
  // lunar-boundary-based Telugu-family convention, for display only.
  if (result.masa) context.push({ key: "masa", value: result.masa, note: "Historically labelled Purnimanta; actually a same-instant solar-Raasi lookup, not a true lunar-boundary calculation." });
  if (result.masaAmanta) {
    context.push({
      key: "masaAmanta",
      value: result.masaAmanta,
      isAdhikaMasa: result.isAdhikaMasa,
      note: result.isAdhikaMasa
        ? "Amanta reckoning (Telugu/South Indian) — Adhika (intercalary) month."
        : "Amanta reckoning (Telugu/South Indian) — ends at the new moon, not the full moon.",
    });
  }
  if (result.pakshaAtSunrise) context.push({ key: "paksha", value: result.pakshaAtSunrise });
  if (RELEASED.vaara && result.vaara) context.push({ key: "vaara", value: result.vaara });

  let upcomingFestivals: PanchangaFestival[] = [];
  if (RELEASED.festival) {
    const civilKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(nowMs));
    const cacheKey = `${location.latitude},${location.longitude},${tz},${civilKey}`;
    if (festivalCache.has(cacheKey)) {
      upcomingFestivals = festivalCache.get(cacheKey)!;
    } else {
      const locationInput = {
        dateMs: nowMs, latitude: location.latitude, longitude: location.longitude, timezone: tz,
      };
      upcomingFestivals = await selectHomeFestivals(locationInput, tz);
      festivalCache.set(cacheKey, upcomingFestivals);
    }
  }

  return {
    fields,
    context,
    useful,
    avoid,
    hasAny: fields.length > 0 || context.length > 0 || useful.length > 0 || avoid.length > 0,
    festival: upcomingFestivals[0],
    upcomingFestivals,
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

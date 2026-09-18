// Monthly Hindu calendar — one Panchanga per Gregorian civil day of a month,
// for the saved location, plus the validated festivals whose date falls in that
// month.
//
// The expensive per-day boundary bisection (see engine.ts elementBounds) runs
// ONCE per day here, from computeCalendarMonth(); the React screen only reads
// the result. Results are cached by
//   engineVersion + latitude + longitude + timezone + year-month
// so a revisit — including an offline revisit after the offline download — is
// instant and never recomputes.
//
// This computes the same values the Home card does (computePanchanga + the
// build-verified release flags in release-config.json). It never scrapes or
// copies another site's calendar.

import type { LocationState } from "@/lib/location/model";

import {
  computePanchanga, formatClock, formatEndsAt,
  festivalRuleOccurrencesInRange, civilDateParts, localWallToUtcMs,
  collapseSupersededOccurrences,
} from "./engine";
import { computeDayTimings, type DayPeriodId, type DayPeriodKind } from "./day-timings";
import { FESTIVAL_RULES, type FestivalRuleId } from "./festival-rules";
import type { PanchangaField } from "./report-types";
import releaseConfig from "./release-config.json";

const RELEASED = releaseConfig.released as Record<PanchangaField, boolean>;

/**
 * Bumped whenever computeCalendarMonth's output shape or values could change for
 * the same inputs (an engine algorithm change, a mhah-panchang upgrade, a
 * release-config regeneration, or a change to the CalendarDay structure). It is
 * part of every cache key, so a stale cached month is never read after a change.
 * cal-2: added per-day general useful/avoid timings.
 * cal-3: Brahma Muhurta deferred (removed from the per-day useful timings).
 * cal-4: added masaAmanta + isAdhikaMasa (Amanta lunar month, Telugu-family
 *   convention) alongside the existing Purnimanta masa.
 * cal-5: added the Ugadi (amanta-sunrise) festival rule alongside Vinayaka
 *   Chavithi (madhyahna-vyapti) in festivalsInMonth.
 * cal-6: added Masa Shivaratri (nishita-vyapti); festivalsInMonth now
 *   enumerates EVERY occurrence of each rule in the month via the shared
 *   festivalRuleOccurrencesInRange, not just the first.
 * cal-7: added Sankashti Chaturthi (chandrodaya-vyapti) - this rule's own
 *   addition was never bumped when it shipped, so a month cached before it
 *   (missing the observance entirely, or missing it for a location/month
 *   combination the original moonrise-touches-no-day kshaya fallback did
 *   not yet cover - see chandrodayaVyaptiFestivalDay's "NOON, NOT MIDNIGHT"
 *   fix) could still be served stale, silently omitting a real occurrence.
 *   (festivalRuleOccurrencesInRange's separate inDays-relative-to-cursor
 *   fix does not need a bump here: Calendar's cached CalendarDay/festival
 *   shape never stored inDays at all - only Home's own, in-memory-only,
 *   never-persisted festival cache reads it, and that one is naturally
 *   cleared on every reload.)
 * cal-8: Calendar V1 Phase 1 - added eight new festival rules (Navratri
 *   begins, Atla Tadde, Nagula Chavithi, Bali Padyami, Yama Dwitiya, Ratha
 *   Saptami, annual Maha Shivaratri, Kartika Somavaram; see
 *   festival-rules.ts and docs/temp/festival-calendar-v1-spec-2026-09-17.md).
 *   A month cached before this change would silently omit every one of
 *   them - forcing a recompute, exactly like cal-7's own addition, is the
 *   whole point of bumping this on every rule addition, not just an
 *   engine-mechanism change.
 * cal-9: Phase 1 release-hardening - `festivals` is now the COLLAPSED,
 *   family-visible list (a rule's occurrence is dropped when another rule's
 *   `supersedes` names it and both land on the same date - e.g. annual Maha
 *   Shivaratri collapses that month's Masa Shivaratri card); the new
 *   `festivalsAll` field carries the full, uncollapsed set for tests/review.
 *   A month cached before this change would still show both cards on the
 *   coincidence date - forcing a recompute is required, not optional.
 * cal-10: fixed a real echo bug in `tithiAtSunriseFestivalDay` (no rule in
 *   this family had an echo guard until now, unlike the other three vyapti
 *   families) - confirmed for real: Frisco's own Kartika Shukla Chaturthi
 *   (Nagula Chavithi) genuinely prevails at BOTH the 2026-11-12 and
 *   2026-11-13 sunrises, so a month cached before this fix would show TWO
 *   Nagula Chavithi cards that November instead of one. Also strengthened
 *   the annual Maha Shivaratri two-night tie-break (see
 *   annualNishitaVyaptiFestivalDay's own doc comment) to handle two more
 *   real boundary shapes, changing its computed date for some years/
 *   locations - a cached month from before this fix could show the wrong
 *   Maha Shivaratri date. Both are correctness fixes, not just additions -
 *   forcing a recompute is required.
 * cal-11: coverage-checklist correction pass (2026-09-18). Three changes,
 *   each invalidating a previously cached month on its own:
 *   (1) fixed `annualNishitaVyaptiFestivalDay` returning null when queried
 *       exactly ON its own tie-break-resolved date (query-start dependence
 *       bug) and `festivalRuleOccurrencesInRange` returning an occurrence
 *       one day outside a requested range (Maha Shivaratri, both confirmed
 *       for real at Frisco 2027-03-06) - a cached month spanning that
 *       boundary could have silently missed or mis-ranged the occurrence.
 *   (2) added two new displayed rules (Maha Navami, Vijayadashami/Dussehra)
 *       - a month cached before this change would omit both cards.
 *   (3) `familyVisible: false` now filters Kartika Somavaram OUT of the
 *       family-visible `festivals` list (still present, unfiltered, in
 *       `festivalsAll`) - a cached month from before this change would
 *       still show its repeated cards on the family-facing list.
 */
export const CALENDAR_ENGINE_VERSION = `cal-11+${releaseConfig.evidenceHash.slice(-12)}`;

/** A general daily period, formatted for the location's time zone. */
export interface CalendarDayPeriod {
  id: DayPeriodId;
  kind: DayPeriodKind;
  /** "h:mm AM/PM" in the location's time zone. */
  start: string;
  end: string;
  /** Set on a "useful" period whose interval overlaps an "avoid" period the
   * same day - see lib/panchanga/index.ts's matching field for the rationale. */
  overlapsAvoid?: boolean;
}

export interface CalendarDay {
  /** Civil date YYYY-MM-DD in the location's own time zone. */
  dateISO: string;
  /** Day of month (1-31). */
  day: number;
  /** 0 = Sunday … 6 = Saturday, for grid placement. */
  weekday: number;
  vaara: string;
  paksha: string;
  /** Purnimanta lunar month — unchanged, existing consumers' convention. */
  masa: string;
  /** Amanta lunar month — the Telugu/South Indian convention. Equal to
   * `masa` throughout Shukla Paksha; only diverges during Krishna Paksha. */
  masaAmanta: string;
  /** True when `masaAmanta` is an Adhika (intercalary) month. */
  isAdhikaMasa: boolean;
  ritu: string | null;
  ayana: string | null;
  samvatsara: string | null;
  sunrise: string | null;
  sunset: string | null;
  /** Element name + a formatted "ends …" string (location time zone). */
  tithi: { name: string; endsAt: string } | null;
  nakshatra: { name: string; endsAt: string } | null;
  /** General useful/avoid periods for this civil day (everyone, not personal). */
  useful: CalendarDayPeriod[];
  avoid: CalendarDayPeriod[];
  /** Festival slugs whose date is this day. */
  festivalSlugs: string[];
}

export interface CalendarFestival {
  /** Puja slug when the festival opens a puja service, else the rule id. */
  slug: string;
  ruleId: FestivalRuleId;
  name: string;
  dateISO: string;
  /** Location-aware puja window, formatted for the location zone (when the
   * rule's puja-window field is build-verified as released). */
  pujaWindow: { start: string; end: string } | null;
  /** Exact rule provenance — never invented. */
  ruleName: string;
  convention: string;
  provenanceUrl: string;
  accessedISO: string;
  /** True when this festival's rule + date opens a real puja service. */
  opensPuja: boolean;
}

export interface CalendarMonth {
  year: number;
  /** 1-12. */
  month: number;
  timezone: string;
  latitude: number;
  longitude: number;
  engineVersion: string;
  /** One entry per Gregorian civil day of the month, in order. */
  days: CalendarDay[];
  /** The FAMILY-VISIBLE festival list - what Calendar (and, via the same
   * shared collapse step, Home) actually shows. Two things can remove an
   * occurrence from this list without removing it from `festivalsAll`:
   * (1) supersession - when another rule's `supersedes` names it and both
   * land on the same date (see `collapseSupersededOccurrences` in
   * engine.ts), e.g. the ordinary monthly Masa Shivaratri card is collapsed
   * on the one date each year the annual Maha Shivaratri coincides with it;
   * (2) `rule.familyVisible === false` (see festival-rules.ts) - a rule
   * whose EVERY occurrence is excluded from family-facing lists, e.g.
   * Kartika Somavaram (up to five cards in one Amanta Kartika month reads
   * as clutter, not five distinct observances). Each `CalendarDay`'s own
   * `festivalSlugs` is derived from THIS list, not `festivalsAll`. */
  festivals: CalendarFestival[];
  /** The FULL, unfiltered festival list - every rule's own occurrence this
   * month, including one a same-date `festivals` entry has superseded AND
   * every occurrence of a `familyVisible: false` rule (e.g. every Kartika
   * Somavaram Monday, not just the ones `festivals` would have shown). Never
   * rendered directly to a family; kept for tests and Reviewer-mode
   * diagnostics that need to see what each rule independently computed. */
  festivalsAll: CalendarFestival[];
  /** Which Panchanga fields are build-verified for display. */
  released: Record<PanchangaField, boolean>;
}

/** Number of days in a Gregorian month (month is 1-12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The cache key for a month + location. Includes the engine version so a
 * changed calculation never reads a stale cached month. */
export function calendarCacheKey(opts: {
  latitude: number;
  longitude: number;
  timezone: string;
  year: number;
  month: number;
}): string {
  const ym = `${opts.year}-${String(opts.month).padStart(2, "0")}`;
  return `${CALENDAR_ENGINE_VERSION}|${opts.latitude}|${opts.longitude}|${opts.timezone}|${ym}`;
}

/** Local noon on `year-month-day` in `timezone`, as a UTC instant. */
function noonOfCivilDate(year: number, month: number, day: number, timezone: string): number {
  return localWallToUtcMs(year, month, day, 12, 0, 0, timezone);
}

/** EVERY validated-rule festival occurrence whose civil date lands inside
 * `year-month` at the location - a recurring rule (e.g. Masa Shivaratri) can
 * contribute more than one CalendarFestival for the same month; an annual
 * rule (Ugadi, Vinayaka Chavithi) contributes at most one. Only rules with a
 * supported, validated method (never "deferred" - no guessing) and a
 * released `festival` flag are scanned. Uses `festivalRuleOccurrencesInRange`
 * - the exact same shared occurrence function Home
 * (panchangaForLocation) calls for its own "next occurrence" pick, so the two
 * screens can never quietly disagree about what a rule finds.
 *
 * The per-rule horizon scan (~one month + 3 days of engine work, comparable to
 * one day of the per-day loop) yields to the event loop every few days and
 * checks `signal` on every horizon day, so a month/location change cancels the
 * festival work as promptly as the per-day work. */
async function festivalsInMonth(
  opts: {
    latitude: number;
    longitude: number;
    timezone: string;
    year: number;
    month: number;
  },
  onIteration?: (dayIndex: number) => void | Promise<void>,
): Promise<CalendarFestival[]> {
  if (!RELEASED.festival) return [];
  const out: CalendarFestival[] = [];
  const total = daysInMonth(opts.year, opts.month);
  const fromMs = noonOfCivilDate(opts.year, opts.month, 1, opts.timezone);

  const locationInput = {
    latitude: opts.latitude, longitude: opts.longitude, timezone: opts.timezone,
  };
  for (const rule of FESTIVAL_RULES) {
    if (rule.method === "deferred") continue; // never scanned, never guessed.
    await onIteration?.(-1);
    // Scan a little past the month end so a festival on the 30th/31st is
    // caught, and collect EVERY occurrence in that window, not just the
    // first (a recurring rule can land twice in one Gregorian month).
    const occurrences = await festivalRuleOccurrencesInRange(
      { dateMs: fromMs, ...locationInput },
      rule,
      total + 3,
      { onIteration },
    );
    for (const m of occurrences) {
      const [fy, fmo] = m.dateISO.split("-").map(Number);
      if (fy !== opts.year || fmo !== opts.month) continue;
      out.push({
        slug: rule.pujaSlug ?? rule.id,
        ruleId: rule.id,
        name: rule.name,
        dateISO: m.dateISO,
        pujaWindow: RELEASED.pujaWindow && m.pujaWindow
          ? {
              start: formatClock(new Date(m.pujaWindow.startMs), opts.timezone),
              end: formatClock(new Date(m.pujaWindow.endMs), opts.timezone),
            }
          : null,
        ruleName: rule.ruleName,
        convention: rule.convention,
        provenanceUrl: rule.provenanceUrl,
        accessedISO: rule.accessedISO,
        opensPuja: Boolean(rule.pujaSlug),
      });
    }
  }
  out.sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  return out;
}

/** Thrown when a month computation is cancelled via its AbortSignal. */
export class CalendarAbortError extends Error {
  constructor() {
    super("calendar month computation aborted");
    this.name = "CalendarAbortError";
  }
}

export interface ComputeCalendarMonthOptions {
  /** Cancel the computation. When aborted, the promise rejects with
   * CalendarAbortError and NOTHING partial is returned or cached. */
  signal?: AbortSignal;
  /** Called after each day with (daysDone, total) so the UI can show progress. */
  onProgress?: (done: number, total: number) => void;
}

/** Yield to the event loop so a month of bisections never blocks the main
 * thread for more than one day's work at a time. */
const yieldToLoop = () => new Promise<void>((r) => setTimeout(r, 0));

const dayPeriods = (
  sunriseMs: number,
  sunsetMs: number,
  weekday: number,
  timezone: string,
): { useful: CalendarDayPeriod[]; avoid: CalendarDayPeriod[] } => {
  const t = computeDayTimings(sunriseMs, sunsetMs, weekday);
  const msOverlap = (a: { startMs: number; endMs: number }, b: { startMs: number; endMs: number }) =>
    a.startMs < b.endMs && b.startMs < a.endMs;
  const fmt = (p: { id: DayPeriodId; kind: DayPeriodKind; startMs: number; endMs: number }): CalendarDayPeriod => ({
    id: p.id,
    kind: p.kind,
    start: formatClock(new Date(p.startMs), timezone),
    end: formatClock(new Date(p.endMs), timezone),
    overlapsAvoid: p.kind === "useful" && t.avoid.some((av) => msOverlap(p, av)),
  });
  return { useful: t.useful.map(fmt), avoid: t.avoid.map(fmt) };
};

/**
 * The full month: one Panchanga + general timings per civil day, plus the
 * month's validated festivals. Expensive (≈ one boundary bisection per day) —
 * call it once and cache the result; never inside a React render.
 *
 * It yields to the event loop between days, reports progress, and can be
 * cancelled. A cancelled run rejects with CalendarAbortError and produces no
 * partial month.
 */
export async function computeCalendarMonth(
  opts: {
    latitude: number;
    longitude: number;
    timezone: string;
    year: number;
    month: number;
  },
  options: ComputeCalendarMonthOptions = {},
): Promise<CalendarMonth> {
  const { latitude, longitude, timezone, year, month } = opts;
  const { signal, onProgress } = options;
  const abortIfNeeded = () => {
    if (signal?.aborted) throw new CalendarAbortError();
  };

  const total = daysInMonth(year, month);
  abortIfNeeded();
  // The festival scan is now itself progressive + cancellable: it aborts on the
  // same signal and yields between horizon days, so a rapid Prev/Next during the
  // scan is honoured immediately rather than after the whole scan.
  // One festival horizon-day (madhyahna window + a tithi bisection) costs about
  // as much as one day of the per-day loop below. Yield every few days so a
  // festival-scan chunk is never a worse main-thread block than the per-day
  // loop's own worst task, while keeping the added setTimeout hops modest.
  let festivalTick = 0;
  const festivalsAll = await festivalsInMonth(opts, async () => {
    abortIfNeeded();
    if (++festivalTick % 4 === 0) await yieldToLoop();
  });
  abortIfNeeded();
  // The FAMILY-VISIBLE list - the one shared collapse step Home also calls
  // (lib/panchanga/index.ts's selectHomeFestivals), so the two screens can
  // never disagree about which rule's card wins a same-date coincidence.
  // familyVisible: false is filtered out FIRST (an entire rule opting out
  // of family-facing lists, e.g. Kartika Somavaram), THEN supersession is
  // applied to whatever remains - the two are independent filters, not
  // ordering-sensitive against each other for any rule currently in the
  // catalogue (no familyVisible:false rule also carries `supersedes`).
  const familyRuleIds = new Set(
    FESTIVAL_RULES.filter((r) => r.familyVisible !== false).map((r) => r.id),
  );
  const familyEligible = festivalsAll.filter((f) => familyRuleIds.has(f.ruleId));
  const festivals = collapseSupersededOccurrences(familyEligible, FESTIVAL_RULES);
  const festivalByDate = new Map<string, string[]>();
  for (const f of festivals) {
    festivalByDate.set(f.dateISO, [...(festivalByDate.get(f.dateISO) ?? []), f.slug]);
  }

  const days: CalendarDay[] = [];
  for (let d = 1; d <= total; d += 1) {
    abortIfNeeded();
    const dateMs = noonOfCivilDate(year, month, d, timezone);
    const p = await computePanchanga({ dateMs, latitude, longitude, timezone });
    const { y, mo, da } = civilDateParts(dateMs, timezone);
    const dateISO = `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
    const weekday = new Date(Date.UTC(y, mo - 1, da)).getUTCDay();
    // "ends …" is expressed relative to that day's sunrise (the panchang "day").
    const fromMs = p.sunrise.getTime();
    const { useful, avoid } = dayPeriods(fromMs, p.sunset.getTime(), weekday, timezone);
    days.push({
      dateISO,
      day: da,
      weekday,
      vaara: p.vaara,
      paksha: p.pakshaAtSunrise,
      masa: p.masa,
      masaAmanta: p.masaAmanta,
      isAdhikaMasa: p.isAdhikaMasa,
      ritu: RELEASED.ritu ? p.ritu || null : null,
      ayana: RELEASED.ayana ? p.ayana || null : null,
      samvatsara: RELEASED.samvatsara ? p.samvatsara || null : null,
      sunrise: RELEASED.sunrise ? formatClock(p.sunrise, timezone) : null,
      sunset: RELEASED.sunset ? formatClock(p.sunset, timezone) : null,
      tithi: RELEASED.tithi
        ? {
            name: `${p.pakshaAtSunrise} ${p.tithiAtSunrise.name}`,
            endsAt: formatEndsAt(p.tithiAtSunrise.endsAt, fromMs, timezone),
          }
        : null,
      nakshatra: RELEASED.nakshatra
        ? {
            name: p.nakshatraAtSunrise.name,
            endsAt: formatEndsAt(p.nakshatraAtSunrise.endsAt, fromMs, timezone),
          }
        : null,
      useful,
      avoid,
      festivalSlugs: festivalByDate.get(dateISO) ?? [],
    });
    onProgress?.(d, total);
    if (d < total) await yieldToLoop();
  }
  abortIfNeeded();

  return {
    year,
    month,
    timezone,
    latitude,
    longitude,
    engineVersion: CALENDAR_ENGINE_VERSION,
    days,
    festivals,
    festivalsAll,
    released: RELEASED,
  };
}

/** The civil YYYY-MM-DD of "now" in the saved location's time zone (for
 * "Today"). Falls back to a UTC date when no location is set. */
export function todayISOForLocation(location: LocationState, nowMs: number): string {
  const tz = location.status === "READY" ? location.timezone : "Etc/UTC";
  const { y, mo, da } = civilDateParts(nowMs, tz);
  return `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
}

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
  computePanchanga, formatClock, formatEndsAt, madhyahnaVyaptiFestivalDay,
  civilDateParts, localWallToUtcMs,
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
 */
export const CALENDAR_ENGINE_VERSION = `cal-3+${releaseConfig.evidenceHash.slice(-12)}`;

/** A general daily period, formatted for the location's time zone. */
export interface CalendarDayPeriod {
  id: DayPeriodId;
  kind: DayPeriodKind;
  /** "h:mm AM/PM" in the location's time zone. */
  start: string;
  end: string;
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
  masa: string;
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
  festivals: CalendarFestival[];
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

/** Validated festivals whose civil date lands inside `year-month` at the
 * location. Only rules with a build-verified madhyahna-vyapti fixture set and a
 * released `festival` flag are scanned.
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

  for (const rule of FESTIVAL_RULES) {
    if (rule.method !== "madhyahna-vyapti") continue; // only the validated method
    await onIteration?.(-1);
    // Scan a little past the month end so a festival on the 30th/31st is caught.
    const m = await madhyahnaVyaptiFestivalDay(
      {
        dateMs: fromMs,
        latitude: opts.latitude,
        longitude: opts.longitude,
        timezone: opts.timezone,
      },
      { name: rule.name, masa: rule.masa, paksha: rule.paksha, tithi: rule.tithi },
      total + 3,
      { onIteration },
    );
    if (!m) continue;
    const [fy, fmo] = m.dateISO.split("-").map(Number);
    if (fy !== opts.year || fmo !== opts.month) continue;
    out.push({
      slug: rule.pujaSlug ?? rule.id,
      ruleId: rule.id,
      name: rule.name,
      dateISO: m.dateISO,
      pujaWindow: RELEASED.pujaWindow
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
  const fmt = (p: { id: DayPeriodId; kind: DayPeriodKind; startMs: number; endMs: number }): CalendarDayPeriod => ({
    id: p.id,
    kind: p.kind,
    start: formatClock(new Date(p.startMs), timezone),
    end: formatClock(new Date(p.endMs), timezone),
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
  const festivals = await festivalsInMonth(opts, async () => {
    abortIfNeeded();
    if (++festivalTick % 4 === 0) await yieldToLoop();
  });
  abortIfNeeded();
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

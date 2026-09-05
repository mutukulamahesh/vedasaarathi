// Pure calendar-day math shared by any puja's festival date, independent of
// which puja or festival is involved.

export const MS_PER_DAY = 86_400_000;

/** Whole-day number for a timestamp, so day maths ignores clock time. */
export function epochDay(ms: number): number {
  return Math.floor(ms / MS_PER_DAY);
}

/**
 * Today's calendar date as observed in a specific IANA time zone - never the
 * browser's own local zone. A saved location's timezone can differ from the
 * device's, so "today" for that location must be computed from that exact
 * zone, not assumed from wherever the browser happens to be. Returns null for
 * an unknown "now" (for example during server rendering, where `nowMs` is 0)
 * or an invalid timezone string - this never guesses or falls back silently.
 */
export function formatTodayInTimezone(nowMs: number, timezone: string): string | null {
  if (!nowMs) return null;
  try {
    return new Date(nowMs).toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: timezone,
    });
  } catch {
    return null;
  }
}

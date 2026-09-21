// Generic festival-date presentation for any puja's PujaDefinition. This
// module never references a specific festival - it only ever operates on
// whatever PujaFestivalDefinition a caller passes in, so platform screens can
// show "today" and a countdown for whichever puja is selected without
// importing a puja-specific content file.
//
// This intentionally duplicates the small amount of date math already in
// lib/content/festival.ts (which stays as-is, defaulting to Vinayaka's own
// PILOT_FESTIVAL, for existing callers and tests) rather than having platform
// code import that Vinayaka-specific module.

import { epochDay, MS_PER_DAY } from "./calendar";
import type { PujaFestivalDefinition } from "./types";

export { epochDay };

/** Shown alongside any puja's festival date until real per-location Panchanga
 * calculation exists. Not specific to any one puja or festival. */
export const PILOT_DATA_NOTE =
  "Pilot data. Not yet calculated for your location.";

/**
 * Whole days from `todayEpochDay` to the festival. Positive before the
 * festival, zero on the day, negative afterwards. Returns null when the
 * current date is unknown (for example during server rendering).
 */
export function daysUntilPujaFestival(
  todayEpochDay: number,
  festival: PujaFestivalDefinition,
): number | null {
  if (!todayEpochDay) return null;
  const target = Date.parse(`${festival.dateISO}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  return epochDay(target) - todayEpochDay;
}

/**
 * The countdown as a presentation-ready state, so the UI never has to show a
 * negative number once the festival has passed.
 */
export type PujaFestivalCountdown =
  | { state: "unknown" }
  | { state: "upcoming"; days: number }
  | { state: "today" }
  | { state: "past"; daysAgo: number };

export function pujaFestivalCountdown(
  todayEpochDay: number,
  festival: PujaFestivalDefinition,
): PujaFestivalCountdown {
  const days = daysUntilPujaFestival(todayEpochDay, festival);
  if (days === null) return { state: "unknown" };
  if (days > 0) return { state: "upcoming", days };
  if (days === 0) return { state: "today" };
  return { state: "past", daysAgo: -days };
}

/** Format an epoch-day number as e.g. "Monday, 14 September". UTC to stay stable. */
export function formatEpochDay(todayEpochDay: number): string | null {
  if (!todayEpochDay) return null;
  return new Date(todayEpochDay * MS_PER_DAY).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Format a puja's own festival date the same way. */
export function formatPujaFestivalDate(festival: PujaFestivalDefinition): string {
  return new Date(`${festival.dateISO}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

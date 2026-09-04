// Festival context for the pilot.
//
// The date and countdown were hard-coded in the page. They are collected here
// as clearly-labelled pilot data. The countdown is computed from dateISO so it
// stays correct as the current date changes. Real per-location Panchanga dates
// still require the separate calculation-and-review work.
//
// The festival date itself does not depend on the user's location (see
// lib/location/ for the real, user-configured location). It stays fixed pilot
// data until validated per-location observance rules exist.

import { MS_PER_DAY, epochDay } from "@/lib/puja/calendar";

export { epochDay };

export interface PilotFestival {
  name: string;
  /** Validated pilot festival date, ISO 8601 (local civil date). */
  dateISO: string;
  isPilotData: true;
}

export const PILOT_FESTIVAL: PilotFestival = {
  name: "Vinayaka Chavithi",
  dateISO: "2026-09-14",
  isPilotData: true,
};

export const PILOT_DATA_NOTE =
  "Pilot data. Not yet calculated for your location.";

/**
 * Whole days from `todayEpochDay` to the festival. Positive before the festival,
 * zero on the day, negative afterwards. Returns null when the current date is
 * unknown (for example during server rendering).
 */
export function daysUntilFestival(
  todayEpochDay: number,
  festival: PilotFestival = PILOT_FESTIVAL,
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
export type FestivalCountdown =
  | { state: "unknown" }
  | { state: "upcoming"; days: number }
  | { state: "today" }
  | { state: "past"; daysAgo: number };

export function festivalCountdown(
  todayEpochDay: number,
  festival: PilotFestival = PILOT_FESTIVAL,
): FestivalCountdown {
  const days = daysUntilFestival(todayEpochDay, festival);
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

/** Format the festival's own date the same way. */
export function formatFestivalDate(
  festival: PilotFestival = PILOT_FESTIVAL,
): string {
  return new Date(`${festival.dateISO}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

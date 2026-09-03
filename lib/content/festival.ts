// Festival context for the pilot.
//
// Location, date and countdown were hard-coded in the page. They are collected
// here as clearly-labelled pilot data. The countdown is computed from dateISO so
// it stays correct as the current date changes. Real per-location Panchanga
// dates still require the separate calculation-and-review work.

export interface PilotFestival {
  name: string;
  /** Validated pilot festival date, ISO 8601 (local civil date). */
  dateISO: string;
  /** Human label for the pilot location. Not a real geocoded place. */
  locationLabel: string;
  isPilotData: true;
}

export const PILOT_FESTIVAL: PilotFestival = {
  name: "Vinayaka Chavithi",
  dateISO: "2026-09-14",
  locationLabel: "Frisco, Texas",
  isPilotData: true,
};

export const PILOT_DATA_NOTE =
  "Pilot data. Not yet calculated for your location.";

const MS_PER_DAY = 86_400_000;

/** Whole-day number for a timestamp, so day maths ignores clock time. */
export function epochDay(ms: number): number {
  return Math.floor(ms / MS_PER_DAY);
}

/**
 * Whole days from `todayEpochDay` to the festival. Returns null when the current
 * date is unknown (for example during server rendering).
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

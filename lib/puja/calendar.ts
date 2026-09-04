// Pure calendar-day math shared by any puja's festival date, independent of
// which puja or festival is involved.

export const MS_PER_DAY = 86_400_000;

/** Whole-day number for a timestamp, so day maths ignores clock time. */
export function epochDay(ms: number): number {
  return Math.floor(ms / MS_PER_DAY);
}

// Telugu-script display forms for computed Panchanga VALUES (not just labels).
//
// The engine yields romanised / English-India names ("Krishna Amavasya",
// "Bhadrapada", "Shravana", "Bhanuvara", …). When the interface language is
// Telugu, the calendar and Home card must show the VALUE in Telugu too — a
// Telugu label next to an English value is not "bilingual". These helpers reuse
// the vetted maps in lib/sankalpam/telugu-terms.ts and fall back to the
// original string when a term is not mapped (never a mixed-script guess).

import { renderTerm, type SankalpamTermKind } from "@/lib/sankalpam/telugu-terms";

const one = (kind: SankalpamTermKind, roman: string): string => {
  const v = (roman ?? "").trim();
  if (!v) return v;
  const r = renderTerm(kind, v);
  return r.matched ? r.te : v;
};

export const teNakshatra = (roman: string) => one("nakshatra", roman);
export const teMasa = (roman: string) => one("masa", roman);
export const teVaara = (roman: string) => one("vaara", roman);
export const teAyana = (roman: string) => one("ayana", roman);
export const teRitu = (roman: string) => one("ritu", roman);
export const teSamvatsara = (roman: string) => one("samvatsara", roman);
export const tePaksha = (roman: string) => one("paksha", roman);

/** "Krishna Amavasya" → "కృష్ణ అమావాస్య". Accepts an already-combined
 * "<paksha> <tithi>" string OR a bare tithi. */
export function teTithiPhrase(value: string): string {
  const parts = (value ?? "").trim().split(/\s+/);
  if (parts.length >= 2) {
    const paksha = renderTerm("paksha", parts[0]);
    const tithi = renderTerm("tithi", parts.slice(1).join(" "));
    if (paksha.matched && tithi.matched) return `${paksha.te} ${tithi.te}`;
  }
  const t = renderTerm("tithi", value);
  return t.matched ? t.te : value;
}

/** Translate the language-specific words inside an "ends …" phrase produced by
 * engine.formatEndsAt. Handles "3:14 PM", "10:33 AM tomorrow" and
 * "3:00 AM on Sat, 12 Sep" — the clock stays as-is. */
export function teEndsAt(englishEndsAt: string): string {
  return (englishEndsAt ?? "")
    .replace(/\btomorrow\b/i, "రేపు")
    .replace(/\bon\b/i, "—");
}

/** Telugu day-period word for a 24-hour clock hour, using the boundaries
 * common in Telugu print calendars: ఉదయం (morning) 4-11, మధ్యాహ్నం (midday)
 * 12-15, సాయంత్రం (evening) 16-18, రాత్రి (night) 19-3. */
function teDayPeriod(hour24: number): string {
  if (hour24 >= 4 && hour24 < 12) return "ఉదయం";
  if (hour24 >= 12 && hour24 < 16) return "మధ్యాహ్నం";
  if (hour24 >= 16 && hour24 < 19) return "సాయంత్రం";
  return "రాత్రి";
}

/** Telugu clock grammar: the day-period word comes BEFORE the time, and
 * "AM"/"PM" is dropped (the day-period word already conveys it) - "8:56 AM"
 * becomes "ఉదయం 8:56", never "8:56 AM" with only the surrounding words
 * translated. Handles the same "tomorrow" / "on <date>" suffixes
 * formatClock/formatEndsAt produce. Falls back to the original string
 * unchanged if it doesn't match the expected "H:MM AM/PM…" shape - never a
 * guessed or partially-translated format. */
export function teClockPhrase(englishClock: string): string {
  const input = (englishClock ?? "").trim();
  const m = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\b(.*)$/i);
  if (!m) return input;
  const [, hourStr, minute, ampm, rest] = m;
  const hour12 = Number(hourStr);
  const hour24 = (hour12 % 12) + (ampm.toUpperCase() === "PM" ? 12 : 0);
  const suffix = rest
    .replace(/\btomorrow\b/i, "రేపు")
    .replace(/\bon\b/i, "—");
  return `${teDayPeriod(hour24)} ${hour12}:${minute}${suffix}`;
}

/** Language-aware value passthrough for a single term kind. */
export function localizeTerm(kind: SankalpamTermKind, roman: string, language: "EN" | "TE"): string {
  return language === "TE" ? one(kind, roman) : (roman ?? "").trim();
}

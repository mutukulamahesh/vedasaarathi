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

/** Language-aware value passthrough for a single term kind. */
export function localizeTerm(kind: SankalpamTermKind, roman: string, language: "EN" | "TE"): string {
  return language === "TE" ? one(kind, roman) : (roman ?? "").trim();
}

# Amanta Masa — Implementation & Validation Report

**Date:** 14 September 2026
**Branch:** `dev-foundation`, continuing from `1c79fa4`
**Scope:** add an explicit Amanta (Telugu-family) lunar-month result alongside the
existing Purnimanta one. No change to Sankalpam, festival selection, or any
other calculation. No deployment.

---

## 1. What changed

- `lib/panchanga/engine.ts`: `PanchangaResult` gains `masaAmanta` and
  `isAdhikaMasa`. A new function, `amantaMasaFromMoonMasa()`, derives them
  from mhah-panchang's own `calendar().MoonMasa` (already used internally by
  `southIndianSamvatsara`, so this is reuse of an existing calculation, not a
  new dependency). `masa` (Purnimanta) is untouched — same source
  (`cal.Masa`), same value, same callers.
- `lib/panchanga/index.ts`: a new, additive `PanchangaContextField` entry,
  key `"masaAmanta"`. The existing `"masa"` entry (which Sankalpam and the
  Vinayaka Chavithi festival rule both read) is unchanged.
- `lib/panchanga/calendar.ts`: `CalendarDay` gains `masaAmanta` +
  `isAdhikaMasa`; `masa` (Purnimanta) is unchanged. `CALENDAR_ENGINE_VERSION`
  bumped `cal-3` → `cal-4` so no stale-shaped cached month is ever read.
- `lib/storage/calendar-cache.ts`: the cached-month structural validator now
  also checks the two new fields (same pattern as the existing checks).
- `components/platform/home-screen.tsx` / `calendar-screen.tsx`: the "Masa"
  row in Home's expanded "See full Panchanga" and in Calendar's day-detail
  view now display **`masaAmanta`** (Amanta), not `masa` (Purnimanta). A new
  one-line note — "Masa (lunar month) uses the Amanta convention — the month
  ends at the new moon, the reckoning used in Telugu and other South Indian
  calendars." / Telugu equivalent — was added to the existing "About this
  calculation" disclosure in both screens. Nothing was added to the compact
  Home card.
- `tests/calendar-cache.test.mjs`: its hand-built `CalendarDay` fixture now
  includes the two new required fields (was failing the (now stricter)
  structural validator otherwise).

## 2. Why `MoonMasa`, not a hand-rolled "peek forward" heuristic

mhah-panchang's `calendar()` (`node_modules/mhah-panchang/dist/mhah-panchang.esm.js`,
`getMasa()`) computes, for every civil day: the solar Raasi prevailing at the
**start** of the current synodic (new-moon-to-new-moon) lunar month
(`currentSolarMonth`) and at its **end** (`nextSolarMonth`). If they're equal
(no sankranti falls inside that lunar month), it's an Adhika (leap) month. This
is a real, standard Adhika-masa detection algorithm, not a guess — reading it
directly justified using `MoonMasa` rather than reimplementing month-boundary
bisection from scratch, per "reuse existing calculations."

The one thing that needed independent verification: **which name index the
library's `MoonMasa` output actually corresponds to**, since a naive reading
of it does NOT match true Amanta directly (see §4).

## 3. The naming-offset finding

`mhah-panchang`'s own `Masa.name_en_IN` array (`MhahLocalConstant`) is:

```
['Baisakha','Jyestha','Asadha','Srabana','Bhadraba','Aswina','Karttika','Margasira','Pausa','Magha','Phalguna','Chaitra']
```

— note it starts at **Baisakha**, not Chaitra. `getMasa()` sets
`n_maasa = is_leap_month ? currentSolarMonth : currentSolarMonth + 1`, i.e. for
a REGULAR month, `MoonMasa`'s raw name is **one entry ahead**, in this array,
of the Raasi actually prevailing at that lunar month's own start; for a LEAP
month it is **not** shifted. The traditional Amanta convention names a lunar
month after the Raasi prevailing at its own start in both cases, so:

- **Regular (non-leap) month:** shift `MoonMasa`'s raw name back one entry in
  this array (wrapping Baisakha → Chaitra).
- **Leap (Adhika) month:** use `MoonMasa`'s raw name as-is.

This is exactly what `amantaMasaFromMoonMasa()` implements. It was derived by
reading the library source, then checked against every row in §5 below before
being treated as established — not assumed from the source reading alone.

## 4. A discovered, pre-existing limitation of `masa` (Purnimanta) — not fixed here

`masa` (`result.masa`, fed from `cal.Masa`) is **not** a true lunar-boundary
Purnimanta calculation. It is `getCalendarRaasi()` applied to the sun's
position **at today's own sunrise** — a same-instant solar-Raasi lookup, with
no month-boundary logic at all. It coincides with true Purnimanta for most of
an ordinary month (confirmed against Drik for several dates below), but is
**confirmed wrong during an Adhika-masa stretch**: on 24–25 June 2026 (the
Nija/regular Jyeshtha immediately following 2026's Adhika Jyeshtha), our
engine's `masa` reads **"Ashadha"** — a full month early — while Drik's own
Purnimanta label for the same dates is **"Jyeshtha"** (verified by direct
fetch, §5 row 9).

Per instruction, `masa` is left exactly as-is in this batch (Sankalpam and
the Vinayaka Chavithi festival rule both depend on it unchanged). This is
recorded here as a **concrete, still-open limitation**, not silently patched.
`masaAmanta` is not affected by this gap — for the same 24–25 June dates it
correctly reads "Jyeshtha", matching Drik exactly (§5 row 9), because it uses
the library's real lunar-boundary bisection rather than a same-instant Raasi
lookup.

## 5. Source-backed validation table

All rows fetched directly (`curl` against the live page, HTML tags stripped
with a plain script — no AI-mediated summarisation of the page content) on
14 September 2026 from `drikpanchang.com/panchang/day-panchang.html` (date
param format confirmed as `dd/mm/yyyy` by inspecting the site's own internal
links). Geoname ids: Hyderabad `1269843`, Frisco, TX `4692559`. "Our engine"
values are `computePanchanga()`'s `masa` / `masaAmanta` / `isAdhikaMasa`,
sunrise-anchored (the same anchor the engine already uses for Paksha/Tithi).

| # | Date | Location | Source URL | Drik Purnimanta | Drik Amanta | Our `masa` | Our `masaAmanta` | Our `isAdhikaMasa` | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-09-14 | Hyderabad | `.../day-panchang.html?geoname-id=1269843&date=14/09/2026` (control; Shukla Tritiya — Purnimanta/Amanta cannot differ) | Bhadrapada | Bhadrapada | Bhadrapada | Bhadrapada | false | match |
| 2 | 2026-11-05 | Hyderabad | `...?geoname-id=1269843&date=05/11/2026` | Kartika | Ashwina | Kartika | Ashvina | false | match |
| 3 | 2026-11-05 | Frisco, TX | `...?geoname-id=4692559&date=05/11/2026` | Kartika | Ashwina | Kartika | Ashvina | false | match (same civil-day result; the two locations aren't near a month boundary on this date) |
| 4 | 2026-12-09 | Hyderabad | `...?geoname-id=1269843&date=09/12/2026` (new-moon month-boundary day itself — Shukla Pratipada) | Margashirsha | Margashirsha | Margashirsha | Margashirsha | false | match |
| 5 | 2026-12-10 | Hyderabad | `...?geoname-id=1269843&date=10/12/2026` | Margashirsha | Margashirsha | Margashirsha | Margashirsha | false | match |
| 6 | 2026-12-26 | Hyderabad | `...?geoname-id=1269843&date=26/12/2026` | Pausha | Margashirsha | Pausha | Margashirsha | false | match |
| 7 | 2026-12-26 | Frisco, TX | `...?geoname-id=4692559&date=26/12/2026` | Pausha | Margashirsha | Pausha | Margashirsha | false | match |
| 8 | 2026-05-26/27 | Hyderabad | `...?geoname-id=1269843&date=26/05/2026` / `date=27/05/2026` (intercalary month) | Jyeshtha (Adhik) | Jyeshtha (Adhik) | Jyeshtha | Jyeshtha | **true** | match (base name; our fields don't carry Drik's "(Adhik)" suffix text, but the leap flag is set) |
| 9 | 2026-06-24/25 | Hyderabad | `...?geoname-id=1269843&date=24/06/2026` / `date=25/06/2026` (Nija Jyeshtha, immediately after the Adhika month) | Jyeshtha | Jyeshtha | **Ashadha (known limitation, §4)** | Jyeshtha | false | `masaAmanta` matches; `masa` does not — documented, not fixed |
| 10 | 2026-03-19 | Hyderabad | `...?geoname-id=1269843&date=19/03/2026` (day before Ugadi — sunrise still falls in Amavasya) | Chaitra | **Phalguna** | Chaitra | Phalguna | false | match — confirms the sunrise anchor, not a "which tithi is dominant that civil day" convention (see §6) |
| 11 | 2026-03-20 | Hyderabad | `...?geoname-id=1269843&date=20/03/2026` (year rollover / Ugadi, sunrise-anchored) | Chaitra | Chaitra | Chaitra | Chaitra | false | match |

Also directly fetched: `drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843`
(the Telugu festival-list page) — used only to locate candidate transition
dates before pinning each one down on the single-day page above; its own
labelling convention differs from the day-panchang page's (see §6), so it was
not used as the final source of record for any row in the table.

## 6. A genuine cross-page discrepancy on Drik's own site, resolved and explained

Drik's yearly Telugu-calendar listing page labels 19 March 2026 as
"Chaithramu, Sukla Padyami" (implying Amanta Chaitra begins that day), but
the single-day `day-panchang.html` page's own header field says Amanta is
still "Phalguna" on that same date, and only becomes "Chaitra" the next day
(20 March). Tracing the Tithi values resolves this cleanly: on 19 March,
Amavasya ends at 6:52 AM and Pratipada then runs until 4:52 AM the next day —
Hyderabad's sunrise that morning is before 6:52 AM, so **Amavasya, not
Pratipada, is what prevails at sunrise** on 19 March. The yearly listing page
evidently labels a civil day by "the tithi/month that begins or is dominant
that day," while the day-panchang page (like our own engine, everywhere else
in this codebase — Paksha, Tithi, Nakshatra are all already sunrise-anchored)
uses the sunrise-prevailing value. Our engine's `masaAmanta` was checked
against, and matches, the **sunrise-anchored** page — the same anchor
already used consistently throughout this codebase — not the yearly
listing page's different convention.

## 7. Existing Sankalpam / festival-selection month dependencies — identified, unchanged

- `lib/sankalpam/from-app.ts`, `panchangaToSlots()`: reads `ctx.masa` (the
  existing, unchanged Purnimanta context field) into the Sankalpam's `masa`
  slot. Untouched by this batch — still Purnimanta, still the same value as
  before.
- `lib/panchanga/engine.ts`, `madhyahnaVyaptiFestivalDay()` and
  `nextFestivalDay()`: both compare `cal.Masa.name_en_IN` (the raw,
  pre-Sanskrit-mapped Purnimanta/Raasi value, e.g. `"Bhadraba"`) directly
  against `FestivalRule.masa` (`VINAYAKA_RULE.masa = "Bhadraba"`). Untouched.
  Neither function reads `MoonMasa` / Amanta at all.
- Consequence, stated plainly: because festival selection depends on `masa`
  (§4's known limitation), a festival whose target month happens to fall on
  an Adhika or the immediately-following Nija month in some future year could
  be misdated by this pre-existing gap. Not the case for Vinayaka Chavithi in
  2026 (that year's Adhika month is Jyeshtha, not Bhadrapada) — flagged here
  as a longer-term watch item, not an active bug, and explicitly out of scope
  for this batch.

## 8. Not done in this batch (by instruction)

- No "(Adhika)" label/badge in the UI — `isAdhikaMasa` is computed and
  available (engine + `CalendarDay`) but not yet surfaced visually anywhere.
- No fix to `masa`/Purnimanta's Adhika-masa gap (§4).
- No change to Sankalpam wording, festival-selection rules, or any puja.
- No new Home card content, no new settings screen.

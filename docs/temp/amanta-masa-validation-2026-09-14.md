# Amanta Masa — Implementation & Validation Report

**Date:** 14 September 2026 (completion pass continuing from `ef1c015`)
**Branch:** `dev-foundation`
**Scope:** add an explicit Amanta (Telugu-family) lunar-month result, an Adhika
(intercalary) qualifier in the UI, regression tests, and a documentation
correction pass. No change to Sankalpam wording, festival-selection rules, or
any other calculation. No deployment.

**Correction notice (this pass):** the original version of this report
understated §4 as a "limitation" rather than an active defect, called Drik's
cross-page difference (§6) "resolved and explained" rather than an
unverified interpretation, and overstated how many fields use the sunrise
anchor. All three are corrected in place below, marked where they were
wrong.

---

## 1. What changed

**From `1c79fa4` → `ef1c015` (prior commit):**
- `lib/panchanga/engine.ts`: `PanchangaResult` gains `masaAmanta` and
  `isAdhikaMasa`. A new function, `amantaMasaFromMoonMasa()`, derives them
  from mhah-panchang's own `calendar().MoonMasa` (already used internally by
  `southIndianSamvatsara`, so this is reuse of an existing calculation, not a
  new dependency). Legacy `masa` is untouched — same source (`cal.Masa`),
  same value, same callers.
- `lib/panchanga/index.ts`: a new, additive `PanchangaContextField` entry,
  key `"masaAmanta"`. The existing `"masa"` entry (which Sankalpam and the
  Vinayaka Chavithi festival rule both read) is unchanged.
- `lib/panchanga/calendar.ts`: `CalendarDay` gains `masaAmanta` +
  `isAdhikaMasa`; legacy `masa` is unchanged. `CALENDAR_ENGINE_VERSION`
  bumped `cal-3` → `cal-4` so no stale-shaped cached month is ever read.
- `lib/storage/calendar-cache.ts`: the cached-month structural validator now
  also checks the two new fields (same pattern as the existing checks).
- `components/platform/home-screen.tsx` / `calendar-screen.tsx`: the "Masa"
  row in Home's expanded "See full Panchanga" and in Calendar's day-detail
  view now display **`masaAmanta`** (Amanta), not legacy `masa`. A new
  one-line note — "Masa (lunar month) uses the Amanta convention — the month
  ends at the new moon, the reckoning used in Telugu and other South Indian
  calendars." / Telugu equivalent — was added to the existing "About this
  calculation" disclosure in both screens. Nothing was added to the compact
  Home card.
- `tests/calendar-cache.test.mjs`: its hand-built `CalendarDay` fixture now
  includes the two new required fields (was failing the (now stricter)
  structural validator otherwise).

**This completion pass (from `ef1c015`):**
- `lib/panchanga/index.ts`: `PanchangaContextField` gains a structured
  `isAdhikaMasa?: boolean`, set on the `"masaAmanta"` entry from
  `result.isAdhikaMasa` directly — not inferred from `note`'s prose text.
- `components/platform/home-screen.tsx` / `calendar-screen.tsx`: the Masa
  row now appends an `(Adhika)` / `(అధిక)` qualifier when `isAdhikaMasa` is
  true, read from the structured field/`CalendarDay.isAdhikaMasa`.
- `lib/panchanga/engine.ts`: `amantaMasaFromMoonMasa`'s doc comment expanded
  with an explicit, unresolved Kshaya (omitted-month) limitation (§ below),
  and corrected to name legacy `masa`'s defect precisely (§4).
- New regression tests: `tests/panchanga.test.mjs` (7 new cases: Shukla
  control, two regular Krishna-Paksha dates ×2 locations, the new-moon
  boundary, the Adhika Jyeshtha window, the following Nija Jyeshtha, the
  Ugadi rollover), `tests/calendar.test.mjs` (1 new case, `CalendarDay`-level,
  covering the same Adhika/Nija Jyeshtha window), `tests/location-ui.test.mjs`
  (2 new cases: the Adhika qualifier renders EN+TE, and does NOT render on an
  ordinary month), and a new file, `tests/e2e/amanta-adhika-display.e2e.mjs`
  (Calendar's client-rendered Masa row, which SSR unit tests cannot reach).
- This document: corrected per the instructions below (§4, §6), and this
  section + §7 + §9 rewritten/added.

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

## 4. `masa` is a solar-derived value that has been MISLABELED "Purnimanta" — an active defect, not fixed here

Corrected framing (the original version of this section understated this):
`masa` (`result.masa`, fed from `cal.Masa`) is not "Purnimanta with an edge-case
bug" — it never implemented Purnimanta's lunar-boundary definition (month ends
at Purnima) at all. It is `getCalendarRaasi()` applied to the sun's position
**at today's own sunrise** — a same-instant SOLAR value with no month-boundary
logic whatsoever. Calling it "Purnimanta" throughout this codebase (the
context key, the UI label, this document's own §1/§5 table headers) is a
historical mislabel that happened to go unnoticed because the solar value
usually coincides with true Purnimanta.

That coincidence breaks down during an Adhika-masa stretch, and the
consequence is not theoretical: **`masa` feeds Sankalpam's spoken month name
today** (`lib/sankalpam/from-app.ts`, `panchangaToSlots()` → `ctx.masa`, §7).
On 24–25 June 2026 (the Nija/regular Jyeshtha immediately following 2026's
Adhika Jyeshtha), `masa` reads **"Ashadha"** — a full month early — while
Drik's own Purnimanta label for the same dates is **"Jyeshtha"** (verified by
direct fetch, §5 row 9). A family generating a Sankalpam on either of those
two real dates hears the wrong month name today, on this branch, right now.
**This is an active defect in current behavior, not a documented risk for
some future date.**

Per instruction, `masa` is left exactly as-is in this completion batch —
Sankalpam and the Vinayaka Chavithi festival rule both still depend on it
unchanged, and replacing its source is explicitly a separate, bounded
follow-up (see the migration points in §7). Recording the defect here, and in
`amantaMasaFromMoonMasa`'s doc comment, is not the same as fixing it.
`masaAmanta` does not share this defect — for the same 24–25 June dates it
correctly reads "Jyeshtha", matching Drik exactly (§5 row 9), because it uses
the library's real lunar-boundary bisection rather than a same-instant solar
lookup.

## 5. Source-backed validation table

All rows fetched directly (`curl` against the live page, HTML tags stripped
with a plain script — no AI-mediated summarisation of the page content) on
14 September 2026 from `drikpanchang.com/panchang/day-panchang.html` (date
param format confirmed as `dd/mm/yyyy` by inspecting the site's own internal
links). Geoname ids: Hyderabad `1269843`, Frisco, TX `4692559`. "Our engine"
values are `computePanchanga()`'s `masa` / `masaAmanta` / `isAdhikaMasa`,
sunrise-anchored — specifically, the same anchor the engine uses for
`pakshaAtSunrise` / `tithiAtSunrise` / `nakshatraAtSunrise` (NOT the
current-instant Tithi/Nakshatra values Home shows when they differ from the
sunrise value — see §6's closing note on which fields this does and doesn't
describe).

| # | Date | Location | Source URL | Drik Purnimanta | Drik Amanta | Our `masa` | Our `masaAmanta` | Our `isAdhikaMasa` | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2026-09-14 | Hyderabad | `.../day-panchang.html?geoname-id=1269843&date=14/09/2026` (control; Shukla Tritiya — Purnimanta/Amanta cannot differ) | Bhadrapada | Bhadrapada | Bhadrapada | Bhadrapada | false | match |
| 2 | 2026-11-05 | Hyderabad | `...?geoname-id=1269843&date=05/11/2026` | Kartika | Ashwina | Kartika | Ashvina | false | match |
| 3 | 2026-11-05 | Frisco, TX | `...?geoname-id=4692559&date=05/11/2026` | Kartika | Ashwina | Kartika | Ashvina | false | match (same civil-day result; the two locations aren't near a month boundary on this date) |
| 4 | 2026-12-09 | Hyderabad | `...?geoname-id=1269843&date=09/12/2026` (new-moon month-boundary day itself — Shukla Pratipada) | Margashirsha | Margashirsha | Margashirsha | Margashirsha | false | match |
| 5 | 2026-12-10 | Hyderabad | `...?geoname-id=1269843&date=10/12/2026` | Margashirsha | Margashirsha | Margashirsha | Margashirsha | false | match |
| 6 | 2026-12-26 | Hyderabad | `...?geoname-id=1269843&date=26/12/2026` | Pausha | Margashirsha | Pausha | Margashirsha | false | match |
| 7 | 2026-12-26 | Frisco, TX | `...?geoname-id=4692559&date=26/12/2026` | Pausha | Margashirsha | Pausha | Margashirsha | false | match |
| 8 | 2026-05-26/27 | Hyderabad | `...?geoname-id=1269843&date=26/05/2026` / `date=27/05/2026` (intercalary month) | Jyeshtha (Adhik) | Jyeshtha (Adhik) | Jyeshtha | Jyeshtha | **true** | match — the leap flag is set and the UI now renders "Jyeshtha (Adhika)" (this completion pass), matching Drik's own "(Adhik)" qualifier |
| 9 | 2026-06-24/25 | Hyderabad | `...?geoname-id=1269843&date=24/06/2026` / `date=25/06/2026` (Nija Jyeshtha, immediately after the Adhika month) | Jyeshtha | Jyeshtha | **Ashadha (active defect, §4)** | Jyeshtha | false | `masaAmanta` matches Drik exactly; legacy `masa` does not — an active defect (§4), documented and covered by a regression test, not fixed here |
| 10 | 2026-03-19 | Hyderabad | `...?geoname-id=1269843&date=19/03/2026` (day before Ugadi — sunrise still falls in Amavasya) | Chaitra | **Phalguna** | Chaitra | Phalguna | false | our sunrise-anchored value matches this page; see §6 for why it differs from Drik's OWN yearly listing page, and why that's my interpretation, not a verified fact |
| 11 | 2026-03-20 | Hyderabad | `...?geoname-id=1269843&date=20/03/2026` (year rollover / Ugadi, sunrise-anchored) | Chaitra | Chaitra | Chaitra | Chaitra | false | match |

Also directly fetched: `drikpanchang.com/telugu/calendar/telugu-calendar.html?geoname-id=1269843`
(the Telugu festival-list page) — used only to locate candidate transition
dates before pinning each one down on the single-day page above; its own
labelling convention differs from the day-panchang page's (see §6), so it was
not used as the final source of record for any row in the table.

## 6. A genuine cross-page discrepancy on Drik's own site — MY interpretation, not verified with Drik

Drik's yearly Telugu-calendar listing page labels 19 March 2026 as
"Chaithramu, Sukla Padyami" (implying Amanta Chaitra begins that day), but
the single-day `day-panchang.html` page's own header field says Amanta is
still "Phalguna" on that same date, and only becomes "Chaitra" the next day
(20 March). This is a real, directly-observed discrepancy BETWEEN TWO PAGES
ON DRIK'S OWN SITE, on the same date, for the same location.

**What follows is my own interpretation of why, traced from the Tithi values
on the page — not a fact confirmed by Drik, not documentation Drik has
published about their own labelling rules, and not independently verified
against a third source.** It should be read as a plausible, self-consistent
account, not an established explanation: on 19 March, Amavasya ends at
6:52 AM and Pratipada then runs until 4:52 AM the next day; Hyderabad's
sunrise that morning is before 6:52 AM, so Amavasya, not Pratipada, is what
prevails at sunrise on 19 March. My reading is that the yearly listing page
labels a civil day by "the tithi/month that begins or is dominant that day,"
while the day-panchang page uses the sunrise-prevailing value instead — but
I have not confirmed this against any statement from Drik about their own
convention, so it remains my interpretation of the data, not a verified
account of their methodology.

**Separately, and stated precisely rather than generalized:** our own
engine's `masaAmanta` (and the other SUNRISE-anchored fields —
`pakshaAtSunrise`, `tithiAtSunrise`, `nakshatraAtSunrise`, and the context
values for Masa/Ritu/Ayana/Samvatsara, all computed from
`engine.calendar(sunrise, ...)`) matches the day-panchang page's
sunrise-prevailing value for 19 March. This is NOT true of every field in
this app: the CURRENT-INSTANT Tithi and Nakshatra values shown on Home (used
whenever the moment checked differs from that day's sunrise value — the
whole point of the "at sunrise" / "now" split on Home's Tithi and Nakshatra
lines) are deliberately anchored to the current instant, not to sunrise. Do
not read this section as "every field in this codebase uses the sunrise
anchor" — only the specific fields named above do.

## 7. Exact migration points for the next bounded fix (legacy `masa` → a real Purnimanta source)

Both consumers are preserved untouched in this batch. Traced precisely below
so the NEXT change can replace `masa`'s incorrect source without touching
either consumer's own code, and without the two consumers accidentally
interfering with each other.

**Sankalpam's dependency — a single, isolated migration point:**
- `lib/sankalpam/from-app.ts`, `panchangaToSlots()`, the line
  `masa: ctx.masa || undefined,` reads the Sankalpam's month slot from
  `ctx.masa` — the `"masa"` entry in `PanchangaContextField[]`.
- That entry is set in exactly one place: `lib/panchanga/index.ts`,
  `if (result.masa) context.push({ key: "masa", value: result.masa, ... })`
  — it passes `PanchangaResult.masa` straight through, unmodified.
- `PanchangaResult.masa` is set in exactly one place: `lib/panchanga/engine.ts`,
  `computePanchanga()`'s return object,
  `masa: masaSanskrit(String(cal.Masa?.name_en_IN ?? cal.Masa?.name ?? "")),`
  — the defective solar-Raasi-at-sunrise lookup (§4).
- **The fix is isolated to that one line.** Replacing what it computes (e.g.
  with a true Purnimanta lunar-boundary value, mirroring
  `amantaMasaFromMoonMasa`'s approach but keyed to Purnima instead of
  Amavasya) requires no change to `index.ts` or `from-app.ts` — both merely
  pass the value through by reference. Confirmed by direct reading, not
  assumed: neither file does any Purnimanta-specific parsing or matching of
  its own.

**Festival selection's dependency — a SEPARATE, independent code path that
does NOT read `PanchangaResult.masa` at all:**
- `lib/panchanga/engine.ts`, `madhyahnaVyaptiFestivalDay()`: calls
  `engine.calendar(new Date(mw.startMs), ...)` itself, inside its own scan
  loop, and compares that fresh `cal.Masa.name_en_IN` directly against
  `FestivalRule.masa` (`VINAYAKA_RULE.masa = "Bhadraba"`,
  `lib/panchanga/festival-rules.ts`). It never touches `computePanchanga()`
  or `result.masa`.
- `lib/panchanga/engine.ts`, `nextFestivalDay()`: does call
  `computePanchanga(dayInput)` (for `p.sunrise`), but then computes ITS OWN
  `cal.Masa` fresh via `engine.calendar(p.sunrise, ...)` and compares that —
  never `p.masa`.
- **Consequence, verified rather than assumed:** fixing Sankalpam's month
  source (the single line above) would have ZERO effect on which calendar
  day either festival function selects — they are structurally independent,
  both reading `cal.Masa` directly at their own chosen instants, never
  through `PanchangaResult`. A future fix to Sankalpam's `masa` source can
  proceed without any festival-precedence side effect, and does not need to
  touch `festival-rules.ts` or either scan function.
- Both festival functions still carry §4's underlying defect independently
  (they read the SAME flawed `getCalendarRaasi()`-at-an-instant primitive,
  just via their own `cal.Masa` reads rather than through `result.masa`) —
  a festival whose target month falls on an Adhika or immediately-following
  Nija month in some future year could still be misdated. Not the case for
  Vinayaka Chavithi in 2026 (that year's Adhika month is Jyeshtha, not
  Bhadrapada). Fixing festival selection's copy of this defect is a
  SEPARATE, deliberate change from fixing Sankalpam's — it changes which day
  a family is told to perform a puja on, a materially higher-stakes edit
  than a spoken month name, and is explicitly out of scope here.

**A third dependency, newly found while tracing the above — reviewer-only,
not family-facing:** `lib/sankalpam/generator.ts` (~line 422) attaches a
per-slot `explanation` string to the masa slot: *"The mhah-panchang month
name (Purnimanta reckoning). Amanta traditions name the previous month in
Krishna paksha."* This is rendered only inside `components/platform/puja-screen.tsx`'s
`reviewMode` "Details for priest review" table — never shown to a family.
Two things about it are worth a priest reviewer knowing, not fixed here:
it repeats the same "Purnimanta" mislabel as §4, and its own claim ("Amanta
traditions name the previous month in Krishna paksha") is exactly the naive
same-instant-minus-one heuristic this batch's instructions explicitly warned
against — and by this report's own findings (§3, §5 row 9), that heuristic
is not reliably true across an Adhika-masa boundary either. Left unchanged
here (reviewer-only text, not in scope), but flagged precisely so it isn't
mistaken for accurate by a reviewer relying on it.

## 8. Kshaya (omitted) masa — established as NOT supported, not silently claimed as covered

Investigated (per instruction) rather than assumed. `node_modules/mhah-panchang`
contains no mention of Kshaya anywhere in its source. Its Adhika-masa test,
`is_leap_month = currentSolarMonth === nextSolarMonth`, is a bare equality: it
distinguishes "zero sankranti in this lunar month" from "not zero", but not
"exactly one" (ordinary) from "two" (Kshaya — two sankrantis inside one
synodic month, which needs a compound/merged month name and normally
co-occurs with an Adhika month elsewhere in the same lunar year to rebalance
the count). The library's public API never exposes `currentSolarMonth` /
`nextSolarMonth` themselves, only the already-collapsed `n_maasa` /
`is_leap_month` — so a "gap of two" cannot be reconstructed from `MoonMasa`
as currently used, without independently re-deriving the Raasi at both
synodic-month boundaries outside the library (not attempted here; a
meaningfully larger, separately-scoped change).

**Concrete, stated precisely:** a Kshaya month would silently produce a
plausible-looking but WRONG `masaAmanta` name with `isAdhikaMasa: false` —
no error, no warning, no test can catch it with the tools used here.

**Correction (this pass):** the prior version of this section justified the
gap partly by claiming Kshaya masa occurs "roughly once every 120-140 years,
last in 1963, next in the 2090s." That specific historical/frequency/next-
occurrence claim was never independently verified for this codebase and has
been removed — it is not needed to establish the actual limitation, which
stands on its own regardless of how often Kshaya masa occurs: this
implementation has not been tested against any real Kshaya-masa date, and
its behaviour on one is unverified. Support is unestablished, not merely
"rare"; treat it as unverified, not as covered. Documented in
`amantaMasaFromMoonMasa`'s doc comment (`lib/panchanga/engine.ts`) and here.

## 9. Not done in this batch (by instruction)

- No fix to legacy `masa`'s defect itself (§4) — the migration points for a
  future, separate fix are identified precisely in §7.
- No change to Sankalpam wording, festival-selection rules, or any puja.
  **Superseded for Sankalpam's month SOURCE by §10 below** (a later, separate
  batch) — festival-selection rules remain untouched throughout.
- No new Home card content, no new settings screen, no personalised
  astrology.
- No Kshaya-masa detection or correction (§8) — established as unsupported,
  not attempted.

## 10. Sankalpam's month source corrected (commit `bb938b9`, follow-up batch)

**What changed:** §7 identified the exact, isolated migration point -
`panchangaToSlots()` in `lib/sankalpam/from-app.ts` reading `ctx.masa` (the
legacy, defective field). That one line now reads the validated
`"masaAmanta"` context entry instead, and carries its structured
`isAdhikaMasa` flag through `SankalpamPanchanga`. When Amanta data is
unavailable, `masa` is left `undefined` rather than falling back to the
legacy value - `generateSankalpam`'s existing "missing calendar value"
handling (already there before this change) then produces an honest SHORT
form with a stated reason, never a silently wrong month.

**Verified unaffected, exactly as §7 predicted:** `madhyahnaVyaptiFestivalDay`
and `nextFestivalDay` still read `cal.Masa` directly, never through
`PanchangaResult.masa` or this Sankalpam path — `tests/calendar.test.mjs`'s
Vinayaka Chavithi festival-date test still passes unchanged. **This is a
Sankalpam-only fix; it does not fix and is not described as fixing
festival-month selection**, which still carries §4's underlying defect
independently (§7).

**Before / after, real generated text** (Hyderabad, 5 November 2026, Krishna
Paksha - `tests/sankalpam-masa.test.mjs`):
- Before: `... Karttika-mase, Krishna-pakshe, ...` / `... కార్తీక మాసే, కృష్ణ పక్షే, ...` (legacy Purnimanta-labelled value, actually the solar-Raasi one)
- After: `... Ashvina-mase, Krishna-pakshe, ...` / `... ఆశ్వయుజ మాసే, కృష్ణ పక్షే, ...` (validated Amanta value, matching Drik's own Amanta calendar - §5 row 2)

**Adhika Masa (e.g. 26 May 2026, Hyderabad):** the month name is spoken
unmodified (`Jyeshtha-mase,` / `జ్యేష్ఠ మాసే,`) - no invented "Adhika" prefix
or alternate wording is inserted into the recited text (no sourced
convention for it was found; a targeted search surfaced genuinely
conflicting practices - a "Purushottama Masa" framing in some traditions, a
plain "Adhika [name]" prefix in others, general auspiciousness/inauspiciousness
by ceremony type in a third — see the new `wikipedia-adhika-masa` source in
`lib/sankalpam/sources.ts`). The ambiguity is instead surfaced honestly: the
masa slot's `explanation` states it plainly and `openQuestions` carries a
"confirm with your priest" note - visible, not lost, and not guessed.

**Superseded by §11 below** (a later, separate batch): presenting the FULL
DATED form at all for an Adhika month, with only an internal note, put the
unresolved ambiguity where a family reciting the puja would not necessarily
see it. §11 instead withholds the full dated form for an Adhika date and
uses the existing SHORT-form fallback, with the explanation moved to a
visible, bilingual note near the calendar-detail choice itself.

**Audio-matching safeguard (`familyAudioMatchesGen`,
`lib/sankalpam/family-audio.ts`):** confirmed, not modified - the fixed
family audio is recorded only for the SHORT calendar form, which never
speaks a month name at all, so this change cannot affect whether it
(mis)matches. Verified directly: a FULL_DATED, Adhika-month FAMILY
Sankalpam still correctly fails the match (never offered as if it were the
recorded audio), and the legitimate SHORT-form case still matches.

**Test results:** `tests/sankalpam-masa.test.mjs` (new, 8/8) covers ordinary
Krishna Paksha at Hyderabad and Frisco, the Adhika Jyeshtha window and its
following Nija Jyeshtha, the Ugadi year-rollover boundary, unavailable
Amanta data, and the audio-matching safeguard - through the REAL pipeline
(`panchangaForLocation` → `panchangaToSlots` → `generateSankalpam`), checking
the actual `teluguScript` and `transliteration` output, not only the
intermediate slot. `sankalpam-generator.test.mjs` (28/28),
`sankalpam-setup.test.mjs` (13/13, one hand-built fixture updated to include
`masaAmanta`), `sankalpam-paksha-tithi.test.mjs` (5/5), and
`family-sankalpam-audio.test.mjs` (14/14) all still pass.

**Kshaya masa (§8) - correction to this document itself:** the original
version of §8 justified the gap partly with an unverified claim about
historical frequency (see §8's own correction notice). That claim has been
removed; the limitation itself (unverified, not merely rare) is unchanged
and still stands.

**Remaining limitation, stated precisely (§10-era; superseded by §11):** no
sourced Sankalpam recitation convention for an Adhika month exists in this
codebase. The generator does not guess one; it speaks the month name as
usual and flags the ambiguity. A priest-reviewed answer on whether (and how)
to alter the recitation for an Adhika month is still needed before this is
more than an honest placeholder.

## 11. The ready-screen summary and the Adhika full-dated gap closed (commit `c3879b1`, follow-up batch)

**Two gaps closed from §10:**

1. `panchangaSummary()` in `components/platform/sankalpam-setup-screen.tsx`
   (the "ready" screen's "Today's Panchanga" line) still read the legacy
   `"masa"` context entry directly — untouched by §10, which only fixed the
   generator's own input. It now reads `"masaAmanta"` the same way
   `panchangaToSlots()` does, and appends the SAME structured
   `isAdhikaMasa`-driven `(Adhika)` / `(అధిక)` qualifier Home and Calendar
   already show (previous batch, commit `bb938b9`) — not inferred from
   prose, read directly from `PanchangaContextField.isAdhikaMasa`. No
   fallback to the legacy value: if `"masaAmanta"` is absent, the month
   segment of the summary is simply omitted (the line still shows
   paksha/tithi/vaara), never silently substituted.

2. §10 left the Adhika ambiguity inside the recited FULL_DATED text's own
   internal explanation/openQuestions only — a family would still be
   *presented* with an unqualified full-dated Sankalpam on an Adhika date,
   with the caveat visible only in developer-facing metadata. This batch
   withholds the full dated form for an Adhika date entirely (until a
   sourced recitation convention is found), reusing the EXISTING
   missing-value fallback mechanism (`generateSankalpam`'s `canFullDated` /
   `calendarFallbackReason`) rather than adding a new one: `canFullDated`
   now also requires `!isAdhikaMasa`. Two new fields record this precisely -
   `calendarFallbackIsAdhika: boolean` and `calendarFallbackReasonTe: string
   | null` - so the UI can show a bilingual note without parsing English
   prose. **The user's own requested `choices.calendarForm` is never altered
   in storage** - only the DELIVERED `calendarForm` differs from it,
   recorded separately in the result, exactly like the pre-existing
   missing/unrenderable-value fallback already did.

**Where the note appears:** `components/platform/sankalpam-setup-screen.tsx`'s
shared `detailedForm` fragment (the calendar-detail radio choice + the live
compact preview - used by both the non-FAMILY detailed screen and FAMILY's
"Change details" subview) now shows one `<p className="sankalpam-choice-hint
info">` line, in the interface's current language, directly below the
calendar-detail choice, only when `gen.calendarFallbackIsAdhika` is true. The
existing `SankalpamAssembledView` note-line (`components/platform/sankalpam-
view.tsx`, shown in the non-compact "View Sankalpam" screen and the puja-step
reviewer detail) is also now bilingual specifically for this case - both
reuse the SAME two generator fields; no new component, no new CSS class, no
new UI surface was created.

**Before / after, a real Adhika-date FULL_DATED request (26 May 2026,
Hyderabad, default choices — `tests/sankalpam-masa.test.mjs`):**
- Before (§10): `calendarForm: "FULL_DATED"`, recited text includes
  `... Jyeshtha-mase, ...` / `... జ్యేష్ఠ మాసే, ...`, the Adhika note visible
  only in `gen.slots`/`gen.openQuestions` (developer/reviewer-facing).
- After (§11): `calendarForm: "SHORT"` (the delivered form; the user's own
  requested choice is unchanged), `calendarFallbackIsAdhika: true`, recited
  text is `... shubhe shobhane muhurte, ...` (no month spoken at all), and a
  visible note reads *"This month is an Adhika (intercalary) month. This app
  does not yet support the full dated Sankalpam wording for an Adhika month,
  so the short form is used instead."* / *"ఈ మాసం అధిక మాసం. అధిక మాసానికి
  పూర్తి తిథి సంకల్ప పాఠం ఇంకా అందుబాటులో లేదు, కాబట్టి సంక్షిప్త రూపం
  వాడుతున్నాం."*

**The following regular (Nija) month is unaffected — verified, not assumed:**
24–25 June 2026 at Hyderabad still produces `calendarForm: "FULL_DATED"` with
`calendarFallbackReason: null`, exactly as before — the Adhika-only guard
does not touch any other date.

**Audio-matching safeguard — a genuinely positive change, not just "still
safe":** because the DELIVERED text (not the request) drives
`familyAudioMatchesGen`, and SHORT form's recited text is byte-identical
regardless of *why* it is SHORT, a FAMILY request on an Adhika date with
otherwise-standard settings (omitted Gotra, omitted place) now correctly
MATCHES the fixed audio — the family gets to use the recorded player, on the
Adhika date, even though they never explicitly chose the short form.
Verified with a real, rendered `FamilySankalpamPlayer` (not just the pure
`familyAudioMatchesGen()` check): the `<audio>` elements render normally for
the standard case, and the deliberate switch-offer (never mismatched audio)
still renders for a non-standard one (e.g. a KNOWN Gotra).

**Test results:** `tests/sankalpam-masa.test.mjs` expanded to 15/15 (2
existing tests updated for the new SHORT-form-on-Adhika behavior; 5 new
tests render the actual `SankalpamSetupScreen` via SSR, covering all five
required scenarios: ordinary Krishna date, the qualified Adhika summary and
its bilingual note, the following Nija month's restored full form, and
absent-Amanta with no legacy fallback). `tests/family-sankalpam-audio.test.mjs`
expanded to 16/16 (2 new tests render `FamilySankalpamPlayer` directly with
real Adhika-date data). `sankalpam-generator.test.mjs` (28/28),
`sankalpam-setup.test.mjs` (13/13), `sankalpam-paksha-tithi.test.mjs` (5/5),
`panchanga.test.mjs` (32/32), `calendar.test.mjs` (15/15, confirming festival
selection is untouched), plus the broader rendering suites all still pass.

**Kshaya masa (§8):** untouched again this batch; still unverified, not
attempted.

**Remaining limitation, stated precisely:** still no sourced Sankalpam
recitation convention for an Adhika month. Until a priest-reviewed answer
exists, an Adhika-date puja is always recited in the short form, with a
visible, honest note explaining why — a deliberate, documented gap, not an
error.

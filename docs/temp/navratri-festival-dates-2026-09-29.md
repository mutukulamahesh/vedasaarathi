# Navratri festival-dates fix — Durga Ashtami / Maha Navami / Vijayadashami (2026-09-29)

## Problem

The deployed October 2026 Calendar was missing Durga Ashtami, Maha Navami,
and Vijayadashami/Dussehra. This was intentional: the earlier plain
tithi-at-sunrise rule produced dates one day later than Drik Panchang's own
festival calendar for Maha Navami and Vijayadashami at Hyderabad (confirmed
astronomically correct to the minute, but not the convention Drik actually
uses), and Durga Ashtami was suspected (not confirmed) to be a kshaya
(touches-no-sunrise) tithi at Hyderabad in 2026. All three were deferred
(`method: "deferred"`) rather than shipping a wrong date. Removing three
major festivals from the family calendar entirely was not acceptable, so
this fix independently re-derives and verifies the correct observance-day
convention for each of the three, restores them, and adds a release
coverage contract so this class of regression cannot silently reappear.

## Method

Per the task's explicit instruction not to treat an engine-computed date as
independent evidence, all dates below were fetched directly from Drik
Panchang's own **dedicated per-festival date/time pages** (not the monthly
festival-calendar grid used in the 2026-09-18 investigation, and not this
app's own output) via `curl -A "Mozilla/5.0"` + Python HTML-stripping —
this codebase's established higher-rigor method for anything requiring
exact dates/times (see `docs/temp/festival-calendar-v1-spec-2026-09-17.md`'s
own Method section). Raw HTML for all 12 fetches is preserved for this
audit at `/tmp/{mahashtami,ashtami,navami,dashami}_{hyd,fri}_{2026,2027}.html`
(scratch, not part of the repo).

URLs used:
- Durga Ashtami: `https://www.drikpanchang.com/navratri/durga-puja/mahashtami-date-time.html`
- Maha Navami: `https://www.drikpanchang.com/navratri/durga-puja/maha-navami-date-time.html`
- Vijayadashami: `https://www.drikpanchang.com/festivals/vijayadashami/vijayadashami-date-time.html`

Each fetched with `?geoname-id=1269843` (Hyderabad) or `?geoname-id=4692559`
(Frisco) and `&year=2026`/`&year=2027`, accessed 2026-09-29.

A second, independent source — Karya Siddhi Hanuman Temple's ("minutes
from Frisco") own 2026 calendar PDF (`assets.dallashanuman.net`) — was read
directly (not summarized) in the prior 2026-09-17 session and recorded in
`docs/temp/festival-calendar-v1-spec-2026-09-17.md`. **This session's
attempt to re-fetch that temple site was blocked**: its `/calendar` page is
client-side (JS) rendered (a static/WebFetch fetch returns only "Retrieving
data for populating page posts", no calendar content), and ~9 guessed PDF
asset paths under `assets.dallashanuman.net` all returned 404. This fix
relies on the prior session's already-recorded, verbatim-PDF reading for
the temple cross-check rather than a fresh one — stated here honestly
rather than silently omitted or re-fabricated.

## Governing conventions (verified independently per festival)

The task explicitly warned against assuming one generic rule covers all
three. That warning turned out to be correct for two of the three but not
all three:

### Durga Ashtami — plain tithi-at-sunrise

The first day on which Ashvina Shukla Ashtami tithi prevails at that day's
sunrise. No fallback used (no kshaya observed in any checked case — see
below, this supersedes the 2026-09-18 "likely kshaya" hypothesis).

| Location | Year | Ashtami begins | Ashtami ends | Drik's stated date | tithi-at-sunrise result |
|---|---|---|---|---|---|
| Hyderabad | 2026 | 08:27 AM Oct 18 | 10:51 AM Oct 19 | Mon, Oct 19, 2026 | Oct 19 ✓ |
| Frisco | 2026 | 09:57 PM Oct 17 | 12:21 AM Oct 19 | Sun, Oct 18, 2026 | Oct 18 ✓ |
| Hyderabad | 2027 | 04:13 AM Oct 07 | 06:27 AM Oct 08 | Thu, Oct 7, 2027 | Oct 07 ✓ |
| Frisco | 2027 | 05:43 PM Oct 06 | 07:57 PM Oct 07 | Thu, Oct 7, 2027 | Oct 07 ✓ |

All 4 checked cases: exact match, no fallback needed. Ashtami is a
normal-length tithi (~24-26h) at every checked location/year, comfortably
spanning one sunrise — not the compressed kshaya case the earlier,
monthly-grid-based hypothesis assumed.

### Maha Navami — aparahna-vyapti

The first day on which Ashvina Shukla Navami tithi is present at any
instant of that day's **Aparahna kala**: the fourth fifth of daylight,
`[sunrise + 3·D/5, sunrise + 4·D/5]` where D = sunset − sunrise. This is
the quintile immediately after this engine's existing Madhyahna window
(`2D/5`–`3D/5`, already used for Vinayaka Chavithi).

| Location | Year | Navami begins | Navami ends | Drik's stated date | tithi-at-sunrise | aparahna-vyapti |
|---|---|---|---|---|---|---|
| Hyderabad | 2026 | 10:51 AM Oct 19 | 12:50 PM Oct 20 | Mon, Oct 19, 2026 | Oct 20 ✗ | Oct 19 ✓ |
| Frisco | 2026 | 12:21 AM Oct 19 | 02:20 AM Oct 20 | Mon, Oct 19, 2026 | Oct 19 ✓ (trivial) | Oct 19 ✓ |
| Hyderabad | 2027 | 06:27 AM Oct 08 | 09:01 AM Oct 09 | Fri, Oct 8, 2027 | Oct 09 ✗ | Oct 08 ✓ |
| Frisco | 2027 | 07:57 PM Oct 07 | 10:31 PM Oct 08 | Fri, Oct 8, 2027 | Oct 08 ✓ (trivial) | Oct 08 ✓ |

Hyderabad exposes the real mismatch in both years; Frisco's later local
sunrise happens to make Navami already prevail at sunrise in both years,
so a Frisco-only check (as the original, superseded implementation
effectively was) would never have caught this — exactly why the task
required checking both locations independently.

An initial simpler hypothesis — a fixed +1/+2 day offset from Durga
Ashtami — was tried first and disproven by this same table: Hyderabad 2026
has Ashtami and Navami on the SAME day (both Oct 19), while Hyderabad 2027
has them one day apart (Oct 07 / Oct 08) — not a fixed offset.

### Vijayadashami / Dussehra — aparahna-vyapti

Same mechanism as Maha Navami, for Ashvina Shukla Dashami.

| Location | Year | Dashami begins | Dashami ends | Drik's stated date (mainstream) | Drik's Aparahna Puja Time | tithi-at-sunrise | aparahna-vyapti |
|---|---|---|---|---|---|---|---|
| Hyderabad | 2026 | 12:50 PM Oct 20 | 02:11 PM Oct 21 | Tue, Oct 20, 2026 | 01:11 PM–03:31 PM | Oct 21 ✗ | Oct 20 ✓ |
| Frisco | 2026 | 02:20 AM Oct 20 | 03:41 AM Oct 21 | Tue, Oct 20, 2026 | 02:19 PM–04:34 PM | Oct 20 ✓ (trivial) | Oct 20 ✓ |
| Hyderabad | 2027 | 09:01 AM Oct 09 | 11:40 AM Oct 10 | Sat, Oct 9, 2027 | 01:15 PM–03:37 PM | Oct 10 ✗ | Oct 09 ✓ |
| Frisco | 2027 | 10:31 PM Oct 08 | 01:10 AM Oct 10 | Sat, Oct 9, 2027 | 02:24 PM–04:43 PM | Oct 09 ✓ (trivial) | Oct 09 ✓ |

Drik's own displayed "Aparahna Puja Time" duration is exactly `D/5` in
every row, starting exactly `3D/5` after that day's sunrise — this engine's
`aparahnaWindow()` formula reproduces those displayed clock times to
within a few minutes at every checked location/year, using only this
engine's own sunrise/sunset (not copied from Drik).

## Tie-break rule

Both `madhyahna-vyapti` (existing) and the new `aparahna-vyapti` use a
forward scan that returns the EARLIEST qualifying day — the Dharma
Sindhu पूर्वैव ("take the earlier") resolution when two consecutive days
both catch the window. This tie-break IS exercised by one of this fix's own
checked cases: Hyderabad 2026 Vijayadashami's Dashami tithi genuinely
satisfies both Oct 20 and Oct 21's own Aparahna windows (see "Second
implementation bug caught before shipping" below for the exact times). The
earlier-day selection, together with the echo guard added to
`aparahnaVyaptiFestivalDay`, resolves this checked case correctly to Oct 20
— matching Drik's own mainstream date and never surfacing Oct 21 as a
second, spurious occurrence.

## Location sensitivity

Confirmed materially location-sensitive for all three festivals. Durga
Ashtami's civil date differs between Hyderabad and Frisco in 2026 (Oct 19
vs Oct 18) but coincides in 2027 (Oct 07 at both) — so the two locations
are not universally different, and a fix that only checked one location or
one year would not have surfaced this. Maha Navami/Vijayadashami's method
choice (aparahna-vyapti vs. plain tithi-at-sunrise) only matters at
Hyderabad-like sunrise timing; Frisco's later sunrise makes the method
choice moot in every checked case. This is exactly why the task required
independently checking both locations rather than trusting one.

## Implementation bug caught before shipping

`engine.aparahnaVyaptiFestivalDay` was first implemented as a structural
mirror of `madhyahnaVyaptiFestivalDay`, matching the raw same-instant
`cal.Masa.name_en_IN` field the same way. Direct empirical testing (running
the actual dispatcher against real dates, not just eyeballing the code)
surfaced a spurious match: for Hyderabad 2026, the rule matched
**2026-09-20/21** instead of the correct **2026-10-19/20**.

Root cause: `cal.Masa.name_en_IN` is a **solar (sankranti-based)** month
name (the underlying list — `Baisakha, Jyestha, Asadha, Srabana, Bhadraba,
Aswina, Karttika, …` — is a Bengali/Odia-style solar calendar naming), not
a lunar Purnimanta name as assumed. It flips from "Ashvina" to "Kartika"
**mid-Navaratri in 2026** (between Ashtami on Oct 17 and Navami on Oct 19,
confirmed directly against the engine). This flip is safely clear of any
boundary for Vinayaka Chavithi's target (Bhadrapada Shukla Chaturthi, day
4 of its lunar month — nowhere near a solar-sankranti boundary in the
already-validated years), but Navami/Dashami (days 9-10) sit close enough
to fall on either side of it depending on the year — an edge case
Vinayaka Chavithi's own rule never had to face.

Fixed by matching the **Amanta** masa (`amantaMasaFromMoonMasa(cal.MoonMasa)
.masaAmanta`) instead — the exact convention `tithi-at-sunrise` already
uses for `navratri-begins` and `durga-ashtami` — which stays "Ashvina"
consistently across the entire Navaratri window (verified directly:
`masaAmanta` = "Ashvina" from Oct 11 through Oct 22, 2026, spanning the
whole Shukla paksha). After the fix, all 12 data points above match
exactly; see the code comment on `aparahnaVyaptiFestivalDay` in
`lib/panchanga/engine.ts` for the in-code record of this.

This is the same class of mistake as the earlier Sankalpam Tithi-consistency
issue documented in `docs/temp/sankalpam-correctness-audit-2026-09-29.md`:
a plausible-looking mechanism, caught by direct multi-location/multi-year
testing before it shipped, not after.

## Second implementation bug caught before shipping: an echo duplicate

After the masa fix above, `computeCalendarMonth` for October 2026 Hyderabad
showed **Vijayadashami twice** — once on 2026-10-20 (correct) and again on
2026-10-21 (spurious). Root cause: Dashami tithi spans 12:50 PM Oct 20 to
2:11 PM Oct 21, and 2:11 PM falls inside Oct 21's own Aparahna window
(~1:07 PM–3:25 PM) too — the same tithi genuinely satisfies two consecutive
days' Aparahna windows, and a whole-month range scan
(`festivalRuleOccurrencesInRange`) reported both as separate occurrences.

This is the exact class of bug `nishitaVyaptiFestivalDay` already solved
with an explicit echo guard (see its own doc comment in `engine.ts`):
`festivalRuleOccurrencesInRange` deliberately leaves "echo safety" to the
callee, not itself. `aparahnaVyaptiFestivalDay` did not yet have this
guard (mirrored from `madhyahnaVyaptiFestivalDay`, which also lacks one,
out of scope to change here — Vinayaka Chavithi's early-in-the-month
target has apparently never hit this boundary in its validated years).
Fixed by adding the identical guard pattern: a candidate day is only a
genuine occurrence if the day immediately before it did NOT also match:
i.e. the search checks day `i-1` under the exact same masa/paksha/tithi/
window condition, and treats a match there as proof that day `i` is a
trailing echo of that earlier, already-genuine occurrence, not a new one.

Caught directly via `computeCalendarMonth` — not a hypothetical — before
this branch's tests were rewritten to assert presence; the rewritten
`tests/festival-navami-dashami.test.mjs` has an explicit "no duplicate
cards" regression test for this.

## Unresolved tradition differences (recorded, not implemented)

**Bengal Vijayadashami.** Drik's own Vijayadashami page separately lists
a "Bengal Vijayadashami" date computed by plain tithi-at-sunrise instead of
aparahna-vyapti:

| Location | Year | Mainstream (aparahna-vyapti) | Bengal (tithi-at-sunrise) |
|---|---|---|---|
| Hyderabad | 2026 | Oct 20 | Oct 21 |
| Frisco | 2026 | Oct 20 | Oct 20 (coincides) |
| Hyderabad | 2027 | Oct 09 | Oct 10 |
| Frisco | 2027 | Oct 09 | Oct 09 (coincides) |

The Bengal variant is one day LATER than mainstream at Hyderabad in both
checked years but coincides with mainstream at Frisco in both years — the
same sunrise-timing coincidence noted throughout this document. This is a
genuine, sourced, named regional variant, not an error. It is **not**
implemented by this fix (out of scope: the task asked to fix three
observances by their governing, Pan-Hindu/Telugu-family convention, not to
add a second regional variant of Vijayadashami). Recorded here so it isn't
silently lost.

**Temple cross-check re-fetch.** As noted in Method, this session could
not independently re-verify the Karya Siddhi Hanuman Temple PDF fresh; the
cross-check relies on the prior session's already-recorded reading, which
matches the fresh Drik evidence exactly for 2026 (the only year the temple
calendar covers).

## Scope

Only `durga-ashtami`, `maha-navami`, and `vijayadashami` in
`lib/panchanga/festival-rules.ts`, plus the new, additive
`aparahnaWindow` / `aparahnaVyaptiFestivalDay` functions and
`"aparahna-vyapti"` dispatch case in `lib/panchanga/engine.ts`, were
changed. No existing festival rule, Sankalpam logic, Panchangam field,
location handling, puja content, audio, or Home layout was touched.

# Calculation-Verification Report — `dev-foundation`

**Date of review:** 14 September 2026
**Branch reviewed:** `dev-foundation` (based on `vinayaka-end-to-end-review` @ `10aa585`)
**Method:** live values pulled directly from our own `lib/panchanga/engine.ts`/`index.ts` (not the codebase's embedded self-test fixtures — those are Drik-sourced and are not treated as an independent source here, per explicit instruction). External comparisons are fresh live fetches, not cached or fabricated. All times are civil local time in the location's own IANA zone unless stated.

## Coverage note, stated honestly up front

- **AI Purohit**: mobile-app-only (Purohit AI, Purohit.app on the App Store; no public web page with live data). Could not be fetched; no values were fabricated or inferred. Every field that would need it is marked **"requires manual screenshot from the app — not obtained."**
- **Second independent source**: `drikpanchang.com` for the primary comparison (explicitly *not* used as validation of itself — these are live fetches, separate from the fixtures baked into `lib/panchanga/validation.ts`). For a genuinely separate source, `shubhpanchang.com` succeeded for Hyderabad Sept 14 (see below); `prokerala.com` (HTTP 429, twice) and `timeanddate.com` (HTTP 403) were attempted and failed — reported as unavailable, not substituted with a guess.
- **Yoga and Karana**: VedaSaarathi's engine does not compute these at all — no field for either exists anywhere in `lib/panchanga/engine.ts`'s `PanchangaResult`. Every row for those two fields reads "not computed by VedaSaarathi," not a comparison.
- **Amanta Masa**: also not computed — only Purnimanta is exposed.
- 9 requested scenarios → 10 rows (UTC+14/UTC-11 are two separate locations).

---

## Scenario-by-scenario data

### 1. Hyderabad, 17.3850°N 78.4867°E, Asia/Kolkata — 14 Sept 2026

| Field | VedaSaarathi | Drik Panchang (live fetch) | Δ | Verdict |
|---|---|---|---|---|
| Sunrise | 6:05 AM | 6:04 AM | 1 min | match (tolerance) |
| Sunset | 6:21 PM | 6:19 PM | 2 min | match (tolerance) |
| Tithi at sunrise | Shukla Tritiya | Shukla Tritiya, "ends 07:06 AM" | 0 min | exact match |
| Tithi ending time | 07:06 AM (Sep 14) → Chaturthi | 07:06 AM (Sep 14) → Chaturthi | 0 min | exact match |
| Current Tithi (fixed 12:00 PM local) | Shukla Chaturthi, ends 7:44 AM Sep 15 | Drik doesn't expose a "value at an arbitrary instant" concept | — | unavailable from comparison source (structural) |
| Nakshatra at sunrise | Chitra, ends 1:55 PM | Chitra, "ends 01:55 PM" | 0 min | exact match |
| Yoga | not computed by VedaSaarathi | not fetched from Drik this round | — | gap on our side |
| Karana | not computed by VedaSaarathi | not fetched from Drik this round | — | gap on our side |
| Paksha | Shukla | Shukla Paksha | 0 | match |
| Purnimanta Masa | Bhadrapada | Bhadrapada (Purnimanta) | 0 | match |
| Amanta Masa | not computed by VedaSaarathi | not shown by Drik in this fetch | — | gap on our side |
| Vaara | Somavara | Monday (Somawara) | 0 | match |
| Samvatsara | Parabhava (South Indian/Shaka) | 2083 Siddharthi (North Indian/Vikrama) | — | acceptable convention difference (different cycle entirely; ours is the correct South Indian value for a Telugu family) |
| Ayana | Dakshinayana | Dakshinayana | 0 | match |
| Ritu | Varsha (Vedic/lunar) | Sharad (solar reckoning) | — | acceptable convention difference; our own code comment anticipates it |
| Rahu Kalam | 7:37–9:09 AM | 7:36–9:08 AM | 1 min | match |
| Yamaganda | 10:41 AM–12:13 PM | 10:40 AM–12:12 PM | 1 min | match |
| Gulika Kalam | 1:45–3:17 PM | 1:44–3:15 PM | 1–2 min | match |
| Abhijit Muhurta | 11:48 AM–12:37 PM | 11:47 AM–12:36 PM | 1 min | match |
| Festival civil date | 2026-09-14 | Monday, September 14, 2026 (Drik's dedicated festival page) | 0 | match |
| **Madhyahna puja window** | **10:59 AM–1:26 PM** | **10:58 AM–1:25 PM** (Drik's dedicated Ganesh Chaturthi muhurat page) | 1 min both ends | match |

**Second source (shubhpanchang.com, unspecified city — sunrise/sunset don't match Hyderabad, so only the location-independent transition times are usable):** Tithi transition "07:06 AM," Nakshatra transition "01:55 PM" — both exact matches, a third independent corroboration. This source also reported **Yoga: Brahma until 12:45 PM → Indra**, and **Karana: Gara until 07:06 AM → Vanija** — proof these fields are normal, expected Panchang content that our engine simply doesn't produce.

**AI Purohit:** not obtained — requires a manual screenshot from the mobile app for every field in this row.

---

### 2. Frisco, TX, 33.1507°N 96.8236°W, America/Chicago — 14 Sept 2026

| Field | VedaSaarathi | Drik Panchang | Δ | Verdict |
|---|---|---|---|---|
| Sunrise | 7:11 AM | not captured this round | — | not obtained |
| Sunset | 7:37 PM | not captured this round | — | not obtained |
| Tithi at sunrise | Shukla Chaturthi, begins Sun 8:36 PM → ends Mon 9:14 PM | Chaturthi Tithi begins "8:36 PM Sep 13" ends "9:14 PM Sep 14" | 0 min both ends | exact match |
| Nakshatra at sunrise | Swati, begins 3:25 AM, ends 4:51 AM Sep 15 | not fetched this round | — | not obtained |
| Yoga / Karana | not computed | not fetched | — | gap on our side |
| Paksha | Shukla | (implied Shukla, consistent with Chaturthi) | 0 | match |
| Masa | Bhadrapada | Bhadrapada | 0 | match |
| **Madhyahna puja window** | **12:09 PM–2:38 PM** | **12:08 PM–2:37 PM** (Drik's dedicated page, duration "2h 29m") | 1 min both ends | match |
| Festival civil date | 2026-09-14 | Monday, September 14, 2026 | 0 | match |

**AI Purohit:** not obtained.

---

### 3. Hyderabad — 15 Sept 2026 (day after the festival)

| Field | VedaSaarathi | Drik Panchang | Δ | Verdict |
|---|---|---|---|---|
| Sunrise | 6:05 AM | 6:04 AM | 1 min | match |
| Sunset | 6:20 PM | 6:18 PM | 2 min | match |
| Tithi at sunrise | Chaturthi, ends 7:44 AM | "Chaturthi upto 07:44 AM" | 0 min | exact match |
| Nakshatra at sunrise | Swati, ends 3:21 PM | "Swati upto 03:21 PM" | 0 min | exact match |
| Current Tithi (12:00 PM) | Panchami, ends 8:59 AM Sep 16 | not queried | — | n/a |
| Paksha | Shukla | Shukla Paksha | 0 | match |
| Masa | Bhadrapada | Bhadrapada (Purnimanta) | 0 | match |
| Vaara | Mangalavara | Tuesday (Mangalawara) | 0 | match |
| Next festival shown | Vinayaka Chavithi 2027-09-04, inDays=354 | not checked — a year out | — | plausible, not independently verified |

---

### 4. Frisco, normal non-festival date (5 Oct 2026)

VedaSaarathi only — no external fetch attempted, deprioritized given budget:

- Sunrise 7:25 AM, Sunset 7:08 PM, Tithi at sunrise Krishna Dasami (ends 3:37 PM), Nakshatra Pushya (ends 12:39 PM), Masa Ashvina, Vaara Somavara. Internally self-consistent (Krishna Paksha + Dasami, a valid pairing).
- **Not compared externally — gap in this report's coverage.**

---

### 5. Frisco, DST spring-forward — 14 March 2027

(Confirmed via direct scan of `America/Chicago` offset transitions: spring-forward civil date = **2027-03-14**, correct 2nd-Sunday-of-March rule.)

- Sunrise 7:40 AM, Sunset 7:35 PM, Tithi at sunrise Shukla Saptami, Nakshatra Rohini, Ayana **Uttarayana** (correctly flipped from Dakshinayana), Ritu Shishira.
- Rahu/Yamaganda/Gulika/Abhijit all computed without error across the transition.
- **Not compared externally** — coverage gap.

---

### 6. Frisco, DST fall-back — 1 November 2026

(Confirmed: fall-back civil date = **2026-11-01**, correct 1st-Sunday-of-November rule.)

- Sunrise 6:46 AM, Sunset 5:37 PM, Tithi at sunrise Krishna Ashtami, Nakshatra Pushya, Masa Kartika, Ritu Sharad.
- All periods computed without visible discontinuity across the clock change.
- **Not compared externally** — coverage gap.

---

### 7. Hyderabad — 11 Sept 2026, the Paksha-transition regression case

| Field | VedaSaarathi | Drik Panchang (live fetch) | Δ | Verdict |
|---|---|---|---|---|
| Sunrise | 6:04 AM | 6:04 AM | 0 | exact |
| Sunset | 6:23 PM | 6:22 PM | 1 min | match |
| Tithi at sunrise | Amavasya, ends 8:56 AM | "Amavasya upto 08:56 AM" → Shukla Pratipada | 0 min | exact match — the critical figure |
| Paksha at sunrise | Krishna | Krishna Paksha | 0 | exact — matches the same anchor as Tithi, no straddling |
| Nakshatra at sunrise | Purva Phalguni, ends 1:16 PM | "Purva Phalguni upto 01:16 PM" | 0 min | exact match |
| Rahu Kalam | 10:41 AM–12:14 PM | 10:40 AM–12:13 PM | 1 min | match |
| Yamaganda | 3:19–4:51 PM | 3:17–4:50 PM | 1–2 min | match |
| Gulika Kalam | 7:37–9:09 AM | 7:36–9:08 AM (first window) | 1 min | match — see caveat |
| Abhijit Muhurta | 11:49 AM–12:38 PM | 11:48 AM–12:37 PM | 1 min | match |

**Caveat, not asserted as fact:** the AI-summarized Drik fetch also mentioned a second Gulika Kalam window "12:37 PM to 01:27 PM" for this date, which our app doesn't show. Could be a genuine second occurrence Drik lists, or a mis-parse by the fetch summarizer conflating a different muhurat (Dur Muhurtam?) into "Gulika." **Not confirmed either way — needs a direct human look at the Drik page.**

**Regression verdict: confirmed fixed.** Paksha and Tithi are read from the same sunrise anchor, matching Drik minute-for-minute on the Amavasya→Pratipada transition instant.

---

### 8. Sydney, NSW, Australia — 33.8688°S 151.2093°E, Australia/Sydney — 14 Sept 2026 (Southern Hemisphere)

| Field | VedaSaarathi | Drik Panchang (live fetch) | Δ | Verdict |
|---|---|---|---|---|
| Sunrise | 5:58 AM | 5:56 AM | 2 min | match |
| Sunset | 5:46 PM | 5:46 PM | 0 | exact |
| Tithi at sunrise | Shukla Tritiya, ends 11:36 AM | "Tritiya... until 11:36 AM" | 0 min | exact match |
| Nakshatra at sunrise | Chitra, ends 6:25 PM | "Chitra... until 06:25 PM" | 0 min | exact match |
| Paksha | Shukla | Shukla Paksha | 0 | match |
| Samvatsara | Parabhava | 2083 Siddharthi, Vikrama | — | convention difference, as before |
| Rahu/Yamaganda/Gulika/Abhijit | all within 0–1 min of Drik | — | match |
| **Festival civil date** | **2026-09-14 (today, inDays=0)** | **2026-09-15 (Tuesday)** — Drik's dedicated Ganesh Chaturthi page explicitly states this | **1 full day off** | **⚠️ UNEXPLAINED DIFFERENCE — see analysis below** |
| Madhyahna puja window (our computed day) | 11:36 AM–1:03 PM (Sep 14) | 10:40 AM–12:14 PM (Sep 15) | not comparable — different days | **⚠️ flows from the date discrepancy above** |

#### Root-cause analysis (traced, not guessed)

The underlying Tithi span matches Drik **exactly**: Chaturthi runs 11:36 AM Sep 14 → 12:14 PM Sep 15 (both sources agree to the minute). The divergence is entirely in **which civil day the puja falls on**, not the astronomy.

- Raw Madhyahna kala for Sydney on Sep 14 (2/5–3/5 of daylight): 10:41 AM–1:03 PM. Chaturthi only begins at 11:36 AM — so only the back ~55% of that day's Madhyahna is actually Chaturthi; the front ~45% (10:41–11:36 AM) is still Tritiya.
- Raw Madhyahna for Sep 15: starts ~10:40 AM. Chaturthi is in effect for the *entire* Sep 15 Madhyahna window (it doesn't end until 12:14 PM, past Madhyahna's end).
- Drik picked Sep 15 — the day with full/majority Madhyahna coverage.
- Our engine's own code comment (`lib/panchanga/engine.ts`, `madhyahnaVyaptiFestivalDay`) says it picks "the first day on which the target tithi is present **at any instant** of that day's Madhyahna kala" — i.e. it takes partial overlap as sufficient, and since Sep 14 has *some* overlap, our rule picks the earlier day even though the overlap is a minority of that day's Madhyahna.

This is a real, traceable difference in the festival-day selection rule itself, most consequential exactly in edge cases like this one where a tithi transition lands inside the Madhyahna window. It didn't matter for Hyderabad or Frisco (their transitions land outside Madhyahna entirely), which is why it only shows up here.

**AI Purohit:** not obtained.

---

### 9a. Kiritimati, Kiribati (UTC+14) — 1.8721°N 157.4278°W, Pacific/Kiritimati — 14 Sept 2026

VedaSaarathi only — no external source indexes this location; not compared.

- Sunrise 6:23 AM, Sunset 6:30 PM, Tithi at sunrise Shukla Tritiya (ends 3:36 PM), Nakshatra Chitra, Paksha Shukla, Ayana Dakshinayana.
- **Festival: 2026-09-15 (inDays=1), not 2026-09-14** — the same "transition lands inside Madhyahna" situation as Sydney (Chaturthi doesn't begin until 3:36 PM local, well past this day's Madhyahna end at ~1:39 PM, so the earliest-any-overlap rule correctly rolls to the next day here). Internally consistent with the *documented* rule; flagged only because it's the same code path implicated in the Sydney discrepancy above.

---

### 9b. Pago Pago, American Samoa (UTC-11) — 14.2710°S 170.7000°W, Pacific/Pago_Pago — 14 Sept 2026

VedaSaarathi only — not compared externally.

- Sunrise 6:19 AM, Sunset 6:19 PM, Tithi at sunrise Shukla Chaturthi (already in effect at sunrise, ends 3:14 PM), Nakshatra Swati, Festival: 2026-09-14, inDays=0.
- Independent middle-fifth-of-daylight arithmetic (using our own sunrise/sunset): 11:07 AM–1:31 PM, which exactly equals the displayed puja window — self-consistent.

---

## Independent middle-fifth-of-daylight arithmetic (as requested)

Formula (this is literally what `madhyahnaWindow()` in `lib/panchanga/engine.ts` implements): `start = sunrise + (sunset−sunrise)×2/5`, `end = sunrise + (sunset−sunrise)×3/5`.

**Using our own Hyderabad sunrise/sunset (6:05 AM–6:21 PM, 735.92 min of daylight):**
`start = 6:05 AM + 294.4 min = 10:59 AM`. `end = 6:05 AM + 441.6 min = 1:26 PM`. → **10:59 AM–1:26 PM**, matching our displayed value exactly.

**Using Drik's own published Hyderabad sunrise/sunset (6:04 AM–6:19 PM, 735 min of daylight):**
`start = 6:04 AM + 294 min = 10:58 AM`. `end = 6:04 AM + 441 min = 1:25 PM`. → **10:58 AM–1:25 PM**, which exactly reproduces Drik's own published Madhyahna muhurat — confirming Drik uses the identical 2/5–3/5 rule. The 1-minute difference between the two apps' published windows is caused entirely by the 1-minute sunrise/sunset ephemeris variance, not a different formula.

**Using Frisco's own sunrise/sunset (7:11 AM–7:37 PM, 745.62 min):**
`start = 7:11 AM + 298.2 min = 12:09 PM`. `end = 7:11 AM + 447.4 min = 2:38 PM`. → matches our displayed value; 1 minute off Drik's 12:08–2:37 PM for the same reason.

---

## Current-vs-sunrise anchor clarity — Home screen (`components/platform/home-screen.tsx`)

Read directly from source (not just the render).

- **Sankalpam generation** (`lib/sankalpam/from-app.ts`): confirmed correct on this branch — it explicitly reads the Tithi name from `field.atSunrise` and Paksha from `ctx.paksha` (itself sunrise-anchored per `lib/panchanga/index.ts`), so Sankalpam text never straddles anchors. The earlier ticket's fix is intact here.
- **The Home screen itself does not show the sunrise-anchored value at all.** `tithiValue` (line 247) is built from `panchanga.fields.find(f => f.key === "tithi").value` — and per the engine, that `.value` is the **current-instant** tithi, not `.atSunrise`. The label next to it is just **"Today's Tithi"** (`tithiLabel`, line 66) — nothing distinguishes it from the sunrise-anchored convention Drik and every printed Panchangam actually use as their headline figure.
- The "Learn about Tithi" disclosure (line 313–316) is generic boilerplate ("A Tithi is a lunar day... does not line up with the clock day") — it does not explain that the shown value is a live, moment-to-moment figure, nor does it mention sunrise at all.
- The "See full Panchanga" disclosure (line 343+) iterates the same `panchanga.fields` array — same current-instant value again, not a separate sunrise-anchored line.

**Conclusion: the Home screen does not clearly distinguish sunrise value / current value / end time as three separate, labeled things.** It shows one value (current-instant, unlabeled as such) plus its own end time. The sunrise-anchored value — the one that matches Drik's and traditional Panchangams' "today's Tithi," and the one the app's own Sankalpam correctly uses internally — is never shown anywhere on this screen. A family checking the app at 8 AM on 11 September 2026 (Amavasya at sunrise) versus 10 AM the same day (after the 8:56 AM Krishna→Shukla transition) would see the "Today's Tithi" line change mid-morning with nothing on screen explaining why — while their eventual Sankalpam text (generated later, correctly, from the sunrise anchor) would say something that no longer matches what the Home screen showed them earlier. Not two anchors combined in one line, but inconsistent single-anchor values shown across the same screen at different times of day, unlabeled — the practical version of the confusion the anchor-consistency rule exists to prevent.

This was checked only on `dev-foundation`'s `home-screen.tsx`; `components/simple/today-screen.tsx` on `simple-v1` was not in scope here.

---

## Recommended changes (not made — nothing edited)

**Correctness-relevant, in priority order:**

1. **Investigate the Sydney festival-date discrepancy.** `madhyahnaVyaptiFestivalDay`'s "any overlap, earliest day" rule disagrees with Drik's apparent "majority/full Madhyahna coverage" rule in the edge case where a tithi transition lands inside the Madhyahna window. A real, traceable algorithm difference, not ephemeris noise — it changes which day a family is told to do the puja. Worth deciding deliberately which rule is correct per Dharma Sindhu.
2. **Label the Home screen's Tithi/Nakshatra values by anchor.** At minimum, state plainly whether "Today's Tithi" is sunrise-anchored (matching Drik's convention) or the live current-instant value — and if keeping the current-instant display, show the sunrise value too, since that's what the Sankalpam actually uses.
3. **Decide on Yoga and Karana.** Absent from the engine entirely; every comparison source reachable in this review publishes them. Not necessarily wrong to omit for a simplified journey, but worth an explicit decision rather than a silent gap.
4. **Consider exposing Amanta Masa** alongside Purnimanta for North Indian users, or at least note which convention is shown.
5. **Manually verify the second Gulika Kalam window** Drik appears to show for Hyderabad on 11 Sept 2026 — could not confirm whether real or a fetch-summary artifact.

**Coverage gaps in this report, stated plainly:**
- No external comparison obtained for: Frisco's normal date, both Frisco DST dates, and both UTC+14/UTC-11 locations.
- AI Purohit not obtained anywhere — every AI-Purohit cell requires a manual screenshot from the mobile app; nothing was fabricated.
- `prokerala.com` and `timeanddate.com` were attempted and failed (429, 403) — not silently skipped.

Nothing was edited, committed, pushed, or deployed at the time this review was performed.

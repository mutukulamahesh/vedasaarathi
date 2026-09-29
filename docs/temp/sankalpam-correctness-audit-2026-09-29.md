# Sankalpam correctness audit — 2026-09-29

Scope: `fix/sankalpam-correctness-v1`, branched from merged `main` at `8d32f24`. Read-only investigation of the existing Sankalpam generation pipeline (`lib/sankalpam/*`, `lib/pujas/vinayaka/sankalpam*.ts`, `lib/panchanga/index.ts`, `lib/panchanga/engine.ts`, `lib/panchanga/festival-rules.ts`, `components/platform/sankalpam-setup-screen.tsx`, `components/platform/sankalpam-view.tsx`, `components/platform/prepare-screen.tsx`, `components/platform/puja-screen.tsx`, `app/page.tsx`, `lib/storage/preparation.ts`). No application behavior changed in this document.

This audit builds directly on two prior investigations already in this repo, rather than re-deriving their findings from scratch:
- `docs/temp/panchangam-verification-2026-09-14.md` (Round 1)
- `docs/temp/panchangam-investigation-followup-2026-09-14.md` (Round 2) — Sections 1, 6, 7, 8 are the direct precedent for items 1–3 below.

Where this audit confirms something those documents already established, it says so and cites the section rather than re-arguing it. Where it goes further (an attempted-then-reverted Sydney tithi-consistency mechanism and the testing that disproved its premise, Frisco/Sydney regression coverage, the Nakshatra fix, the specific code paths for items 4–7), that is new work, marked as such.

Items 5–7's code-path findings were independently read and confirmed twice — once directly, once by a separate read-only investigation covering the same files — reaching the same conclusions; discrepancies, if any had appeared, would be called out explicitly rather than silently reconciled. None appeared.

---

## 1. Tithi anchor

**Current behavior, confirmed by reading `lib/sankalpam/from-app.ts:19-38`:** `panchangaToSlots()` reads the Tithi NAME from the Panchanga field's `atSunrise` string when present, falling back to `value` (the current-instant name) only when there was no transition that day (the two are then equal). This is paired with `ctx.paksha`, which `lib/panchanga/index.ts` always builds from `result.pakshaAtSunrise` — i.e. **Sankalpam's Tithi and Paksha are both sunrise-anchored, consistently, by construction.** This is the fix already validated by `tests/sankalpam-paksha-tithi.test.mjs` (5 tests, rerun clean in this audit — see the Testing section) against the original reported bug (Hyderabad, 11 September 2026: Krishna Amavasya ending and Shukla Pratipada beginning after sunrise, which previously combined an at-sunrise Paksha with a current-instant Tithi name into the impossible pair "Krishna Paksha … Shukla Padyami").

**Confirmed technical defect (new in this audit): none in the anchor-consistency mechanism itself** — Tithi and Paksha never straddle. Re-run and passing (see Testing).

**The Sydney case — status carried forward, not re-litigated:** Round 2 §6 already traced this exact scenario by reading `from-app.ts` against real engine data for Sydney, 14 September 2026 (the day `madhyahnaVyaptiFestivalDay` selects for Vinayaka Chavithi there): sunrise Tithi is **Tritiya** (Chaturthi does not begin until 11:36 AM), so the current code's `atSunrise ?? value` fallback would produce a Sankalpam reading "…తృతీయా తిథౌ…" (Tritiya) for a family performing Ganesha Chaturthi that day. Round 2 explicitly declined to change the anchor logic itself ("Not supported yet — do not implement: any change to the Sankalpam Tithi/Paksha anchor logic … genuinely unresolved, with real evidence pointing in more than one direction depending on the ritual type") and phrased the exact priest question (quoted in full under "Unresolved religious/convention questions" below).

**A correction was attempted, tested, and then REVERTED during this audit — recorded here in full because the reasoning matters more than the false start.** The first draft of this audit proposed: when a puja's `pujaSlug` matches a `FESTIVAL_RULES` entry with a `tithi` field (`festival-rules.ts:250-274`, Vinayaka Chavithi's own already-validated `tithi: "Chaturthi"`), and the computed sunrise-anchored Tithi name doesn't equal it, withhold the Tithi (routing through the generator's existing missing-value → SHORT-form fallback, exactly as a missing Masa already does). This looked like a clean, evidence-based, minimal, non-invented technical safeguard.

**Testing it against all three locations disproved the premise it rested on.** `docs/temp/panchangam-verification-2026-09-14.md`'s own Round 1 data (independently cross-checked against a live Drik Panchang fetch) already recorded, for **Hyderabad's own selected Vinayaka Chavithi day**: "Tithi at sunrise | Shukla Tritiya | Shukla Tritiya, 'ends 07:06 AM' | 0 min | exact match." **Hyderabad's own sunrise Tithi is also Tritiya, not Chaturthi** — Chaturthi only begins at 7:06 AM, after Hyderabad's 6:05 AM sunrise. Re-querying the real engine directly during this audit confirmed this is still true and unchanged. So the proposed check's assumption — "for Hyderabad and Frisco this is a no-op, it only fires for Sydney" — was wrong: it would have silently withheld the Tithi from the FLAGSHIP, ordinary Hyderabad case every single year, not just the disputed Sydney one — a materially worse regression than the problem it was meant to fix, caught by this document's own test suite before merge (see `tests/sankalpam-paksha-tithi.test.mjs`'s Hyderabad/Frisco/Sydney tithi-recording tests).

**Why "sunrise tithi ≠ festival tithi" cannot distinguish the two cases.** Querying the engine's own computed madhyahna window for both locations shows why: Hyderabad's Chaturthi begins at 7:06 AM, hours before its madhyahna window even starts (~10:59 AM) — an ordinary, undisputed transition. Sydney's Chaturthi begins at 11:36 AM, essentially at the very start of the engine's own computed madhyahna window (11:37 AM) — so close that Drik Panchang's own (differently-computed) madhyahna window evidently does not count it as covering enough of the window, and selects the following day instead. The thing that's actually different about Sydney is not "does the sunrise tithi match" (it doesn't, for Hyderabad either) — it's *how marginally* Chaturthi covers the madhyahna window, which is exactly the disputed rule-precision question Round 2 already found no confident source for. A reliable technical detector for "this is the disputed case" would need to reason about tithi-span coverage of the madhyahna window specifically — data `buildSankalpamRequest` does not have today, and plumbing it through would mean judging where a marginal-coverage threshold sits, which is the religious/conventional judgment call this task explicitly says not to make.

**Correction proposed (Stage B): none.** No code change for the Tithi anchor. This is exactly Round 2's own conclusion ("do not implement any change to the Sankalpam Tithi/Paksha anchor logic"), now reinforced by directly testing why a plausible-looking safeguard doesn't actually work. The unresolved religious question is recorded precisely below, and `tests/sankalpam-paksha-tithi.test.mjs` gained three new tests that document today's actual, unchanged Tithi value for Hyderabad, Frisco and Sydney's own Vinayaka Chavithi day — so a future change to the engine or the festival-day selection that shifts these values will be caught, without this audit asserting a fix it can't responsibly make.

**Never allow a family to unknowingly recite an inconsistent Tithi — satisfied without a code change.** Hyderabad and Frisco's Sankalpam Tithi already matches their own selected occurrence day in the only sense that matters to a family: it's the tithi actually prevailing at the moment they generate and read their Sankalpam (sunrise-anchored, self-consistent with Paksha, per item 4). Sydney's case remains an open, disclosed, honestly-unresolved question — not a silent inconsistency this audit is papering over; it is the SAME state Round 2 already left it in, now with a directly-tested, more precise account of why a quick technical fix would have made things worse, not better.

---

## 2. Nakshatra anchor

**Current behavior, confirmed by reading `lib/sankalpam/from-app.ts:36`:** `panchangaToSlots()` reads Nakshatra from `p.fields.find(f => f.key === "nakshatra")?.value` — the CURRENT-INSTANT value — never `.atSunrise`. This is inconsistent with Tithi/Paksha's sunrise anchor within the same generated Sankalpam.

**Confirmed technical defect, evidence already gathered by Round 2 §6 ("A related, narrower finding"):** the engine already computes `nakshatraAtSunrise` (`lib/panchanga/engine.ts:129,551`) exactly the same way as `tithiAtSunrise`, and `lib/panchanga/index.ts`'s shared `addElement()` helper (`index.ts:276-334`) already builds an `atSunrise` string for the `nakshatra` field too, whenever it differs from the current value (`index.ts:326-334`, calling the same helper used for tithi at `index.ts:317-325`) — **the data already exists in the exact same shape `from-app.ts` already knows how to read for Tithi; only the read in `from-app.ts` itself never asks for it.** Round 2 explicitly assessed this as "newly identified, small, and arguably supportable independent of the [Tithi] unresolved questions" — i.e. fixable on its own evidence, unlike the Tithi/festival question.

**Minimal correction proposed (Stage B):** change `from-app.ts`'s Nakshatra read to the same `atSunrise ?? value` pattern already used for Tithi (a one-line change, mirroring existing code exactly). Consistent with §7's "never allow a family… to unknowingly recite an inconsistent [value]" spirit, applied to Nakshatra the same way it already applies to Tithi.

---

## 3. Masa

**Current behavior, confirmed by reading `lib/sankalpam/from-app.ts:39-49` and `lib/panchanga/engine.ts:390-461`:** the Sankalpam's Masa slot comes from `p.context.find(c => c.key === "masaAmanta")` — the validated Amanta (South-Indian/Telugu-family) result from `amantaMasaFromMoonMasa`, the SAME value Home and Calendar show — never the legacy `ctx.masa` field (confirmed wrong during an Adhika-masa stretch; full validation table in `docs/temp/amanta-masa-validation-2026-09-14.md`). When `masaAmanta` is unavailable, `masa` is left `undefined` rather than falling back to the known-wrong legacy value, which (per the mechanism described in item 1) already routes the generator to the honest SHORT form.

**Krishna Paksha / new-moon boundary / Ugadi boundary / Adhika-Nija:** already covered by `tests/sankalpam-masa.test.mjs` (17 tests: two independent Krishna Paksha dates at Hyderabad, the same date at Frisco confirming host-timezone independence, the 2026 Adhika Jyeshtha window and its following Nija month, the 2026 Ugadi year-rollover boundary, an unavailable-Amanta fallback case, and three audio-matching safeguard checks). Rerun clean in this audit (see Testing).

**Confirmed technical defect: none in `masaAmanta`'s correctness.** `amantaMasaFromMoonMasa`'s own doc comment (`engine.ts:390-444`) honestly records its one known, unresolved limitation: a Kshaya (omitted) month is not detectable from `mhah-panchang`'s public API and would silently produce a plausible-but-wrong name — flagged there as an explicit, unverified limitation, not silently claimed as covered. No Kshaya-masa date has been checked against this codebase; none is asserted here either. This is exactly the "if evidence is insufficient, record the unresolved question honestly" pattern the current task asks for — already in place.

**Adhika short-form fallback:** confirmed still the only wording path for an Adhika month (`generator.ts:354-395`); preserved unchanged in this audit's Stage B, per instruction.

**Minor documentation defect found (not a behavior bug):** `engine.ts:401-406`'s doc comment still says "Because Sankalpam's spoken month name (`panchangaToSlots` → `ctx.masa`) reads this same [legacy] field, that mismatch is a live, active defect" — this describes a PRIOR state of `from-app.ts` that has since been corrected (verified: current `from-app.ts` reads `masaAmanta`, not the legacy `ctx.masa`, and says so in its own comment). The stale sentence in `engine.ts` was not updated when `from-app.ts` was fixed. Proposed: a comment-only correction in Stage B (zero behavior change) so a future reader of `engine.ts` is not misled about the current state of `from-app.ts`.

---

## 4. Paksha/Tithi consistency

**Current behavior:** confirmed structurally impossible-combination-free by construction (item 1) and by the existing regression suite `tests/sankalpam-paksha-tithi.test.mjs` — 5 tests, probing every 15 minutes across 24 hours for Hyderabad 11 September 2026 (the originally reported transition day) and four adjacent Amavasya/Purnima-boundary dates, plus a same-scenario check with the HOST timezone forced to `America/Chicago` while the SAVED location stays Hyderabad (proving the saved location's own timezone governs, never the host's), plus two direct unit tests of `panchangaToSlots`'s anchor-selection logic. Rerun clean in this audit.

**Gap found (new in this audit): Frisco and Sydney are not exercised by this specific straddle-regression file.** The task explicitly asks to "test Hyderabad, Frisco and Sydney." Existing coverage: `tests/sankalpam-masa.test.mjs` already exercises Frisco (masa only, not the straddle probe), and no existing Sankalpam test uses Sydney coordinates at all (Sydney fixtures exist elsewhere, e.g. `tests/panchanga.test.mjs:719-720`, for unrelated festival-date regressions, not Sankalpam).

**Correction proposed (Stage B, test-only, no behavior change beyond item 2's Nakshatra fix):** extend `tests/sankalpam-paksha-tithi.test.mjs`'s straddle probe to Frisco and Sydney, and add three tests recording the real, current Tithi value for Hyderabad/Frisco/Sydney's own Vinayaka Chavithi day — the evidence that ruled out item 1's proposed (and reverted) correction, kept as permanent regression coverage.

---

## 5. Location and date consistency (Ready / View / Practice, refresh, resume)

**Confirmed consistent, by tracing the actual code, not inference — independently verified twice** (directly, and by a second read-only investigation covering the same code, which reached the same conclusion with additional line-level detail folded in below):

- `location` in `app/page.tsx:137-139` is read via `useSyncExternalStore(subscribeToLocation, getLocationSnapshot, …)` — the single reactive store also used by Home, Calendar, and the Location screen itself. `panchanga` (`app/page.tsx:189-241`) is a `useState` recomputed in a `useEffect` keyed on `[location, nowMs, locationKey]`; a location change resets `panchanga` to `null` **synchronously in render**, before the effect even fires (lines 199-204), so a stale Panchanga is never shown even for one frame. `app/page.tsx:745-793` passes these SAME `location`/`panchanga` values as props to `PrepareScreen`, `SankalpamSetupScreen`, and `PujaScreen` — one shared source, not three independently-read copies.
- `generateSankalpam(buildSankalpamRequest({…}))` is called **inline, in the render body**, at all three call sites (`prepare-screen.tsx:308-317`, `sankalpam-setup-screen.tsx:271`, `puja-screen.tsx:140-150`) — never memoized, never stored in component state. There is no generated-Sankalpam cache anywhere that could go stale: every render recomputes from whatever `location`/`panchanga`/`choices` currently are.
- `lib/storage/preparation.ts` persists only `sankalpamChoices` (`preparation.ts:46,83,204,276` — the user's FORM preferences: place detail, unknown-Gotra handling, calendar-form request, per-participant Gotra choices) — **never a generated Sankalpam draft or text.** A refresh or a resumed run therefore always regenerates the Sankalpam fresh from the then-current saved location, then-current computed Panchanga, and the persisted (non-calendar) choices — there is nothing to invalidate, because nothing calendar-derived is ever cached. `resumePuja` (`app/page.tsx:485-493`) confirmed to simply call `setScreen("puja")` — it never restores or reconstructs a saved Sankalpam.
- Changing the saved location via the Location screen: `saveLocation` (`app/page.tsx:696`) → `updateLocationState` → `writeLocationState`/`saveLocationState()` then `invalidate(); emitChange();` (`lib/storage/location.ts:202-212`) — a synchronous, same-tab notification (not the cross-tab `storage` event, which only fires in OTHER tabs), so every `useSyncExternalStore` consumer, including the three Sankalpam-rendering screens, re-renders and recomputes on its very next render. No explicit invalidation step is needed because none of them hold a stale copy to invalidate.

**No code defect found.** This matches the existing interactive regression test `tests/sankalpam-adhika-family-nav.test.mjs:126,130` ("FAMILY Ready → View → Back → Practice (EN/TE): explanation visible throughout, delivered text is SHORT, stored FULL_DATED preference unchanged"), which already exercises real navigation across exactly these three screens and asserts consistency. Rerun clean in this audit.

**Test-coverage gap found (new, confirmed independently by both investigations):** no existing test opens a Sankalpam screen, changes the SAVED LOCATION mid-flow via the real update path, and reasserts that the Sankalpam re-renders with the new location. `sankalpam-adhika-family-nav.test.mjs` navigates Ready→View→Back→Practice but holds `location` constant throughout (only the date/masa varies across its fixtures); the location-focused test files (`location-lifecycle.test.mjs`, `location-save-flow.test.mjs`, etc.) never touch `generateSankalpam`/`buildSankalpamRequest`/the Sankalpam screens at all. The architecture (above) gives strong reason to expect this already works, but the exact scenario the task asks about — "changing location must invalidate stale generated results" — was not, until this audit, directly exercised end-to-end by any automated test. Added in Stage B (see Testing).

---

## 6. Family choices (SELF / FAMILY / GROUP, Gotra paths, stored preference)

**Confirmed, by reading `generator.ts:519-605` directly:**
- Collective GROUP Gotra is spoken once ONLY when every named member has the SAME KNOWN Gotra (`generator.ts:531-534`); otherwise none is spoken and the reason is recorded in `collectiveLineageNote`/`openQuestions` (`generator.ts:545-553`). The first participant's Gotra is never used as a stand-in for the group.
- GROUP + "each recites individually": each participant's own unknown-Gotra decision is looked up by that participant's stable `id` (`generator.ts:279`, `choices.participantGotra[m.id]`) and applied only to that one recursive call (`generator.ts:280-289`); it is never taken from another participant or a group-level default.
- No code path in `generator.ts`, `choices.ts`, or `sankalpam-setup-screen.tsx` fills a Gotra/Veda/Sutra/Sampradaya value without either a KNOWN field or an explicit user choice — every non-KNOWN path (`gotraStatus = "NEEDS_CHOICE"`, `generator.ts:583-588`) blocks with `pendingChoices` until the user decides.

**Stored FULL_DATED preference vs. delivered SHORT fallback — confirmed NOT conflated:**
- `SankalpamChoices.calendarForm` (the user's REQUEST) is written to storage from exactly two explicit user actions, both visible/intentional, never a side effect of a fallback: (1) the FULL_DATED/SHORT toggle itself, `sankalpam-setup-screen.tsx:266,306` (`set({ calendarForm: v })`); (2) the "switch to standard form" button, which applies `STANDARD_SHORT_FAMILY_CHOICES` (`lib/sankalpam/family-audio.ts:47-54`, `calendarForm: "SHORT"`) via `onUseStandardForm` (e.g. `sankalpam-setup-screen.tsx:420,516,544`, `puja-screen.tsx:164-168`) — a button the user presses, not something that fires automatically when a fallback occurs.
- `GeneratedSankalpam.calendarForm` (the DELIVERED result, which may differ due to a fallback) is read in exactly two places, both display-only: `sankalpam-view.tsx:75-76` and `prepare-screen.tsx:322`, both just choosing a display label ("full dated form" vs "short form"). Neither writes `gen.calendarForm` back into `choices` or storage. Grepped explicitly for any such write path (`setChoices({...choices, calendarForm: gen.calendarForm})` or `result.calendarForm`); none exists.
- Directly confirmed by the existing test `sankalpam-adhika-family-nav.test.mjs:126,130`'s own name: "stored FULL_DATED preference unchanged" — its body additionally asserts `setChoicesCalls.length === 0` during pure navigation through a fallback scenario. Already asserted, already passing.

**No defect found.**

---

## 7. Telugu and Roman text, audio eligibility

**Structural guarantee, confirmed by reading `generator.ts`:** every segment is pushed via the single `push(roman, te, kind, …)` helper (`generator.ts:334-336`), which stores `roman`/`te` as one paired object; `transliteration` and `teluguScript` are both derived from the SAME `segments` array at the end (`generator.ts:710-711`), joined in the same order. No call site passes mismatched roman/te text, and nothing post-processes `transliteration` or `teluguScript` independently after assembly. This matches the file's own stated assembly rule (`generator.ts:22-25`) and is directly asserted by the existing test `sankalpam-generator.test.mjs:208`, "roman[i] and te[i] are the same clause — identical segment order."

**Audio eligibility, confirmed exact-match, not approximate:** `lib/sankalpam/family-audio.ts:63-72`'s `familyAudioMatchesGen()` compares the Telugu segments the generator ACTUALLY produced (`gen.segments`, the same array that drives the visible Telugu text) against the fixed pre-recorded audio's own transcript, splitting at the same `familySplitIndex` the visible text uses, after stripping only the `« »` user-value markers. Any deviation — a place clause, a Gotra line, a non-canonical purpose, an Adhika-month SHORT fallback — makes this comparison fail closed, and the app is documented (`family-audio.ts:11-13`) to then offer the standard-short-form switch or show no full-Sankalpam audio at all, never audio for text that doesn't match what's displayed. No defect found; this is already the strictest reasonable implementation of "audio only when it exactly matches the delivered text."

**No Telugu-only rewriting found:** `lib/sankalpam/telugu-terms.ts` is a pure lookup table (`renderTerm(kind, romanized) → {te, matched}`), used only inside `generator.ts`'s `push()` call sites, paired with the roman value in the same expression — never operating on an already-assembled Telugu string. `lib/panchanga/display-te.ts` reuses the same underlying term maps for a genuinely DIFFERENT purpose (the separate "Today's Panchanga" summary line on the Setup screen's Ready view, `sankalpam-setup-screen.tsx:461-482`); confirmed by grep that `generator.ts`/`from-app.ts` never import `display-te.ts` — sharing a translation table is not the same as one rewriting the other's output.

---

## Unresolved religious/convention questions (recorded, not guessed)

Carried forward verbatim from `docs/temp/panchangam-investigation-followup-2026-09-14.md` Round 2 (not resolved by this audit, and not attempted to be resolved by Stage B):

1. **The Sydney/Southern-Hemisphere Madhyahna-vyapti tie-break rule itself** (which civil day Vinayaka Chavithi falls on there — our engine picks 14 September 2026, Drik Panchang's own page picks 15 September) — unresolved; Stage B does not touch `madhyahnaVyaptiFestivalDay`.
2. **The exact priest question for the Tithi-anchor case, sharpened by this audit's testing:** *"For a Madhyahna-vyapti festival vrata (e.g. Ganesha Chaturthi), the Sankalpam's Tithi is read from that day's sunrise value. On the selected day, the vrata's own tithi (Chaturthi) is often not yet present at sunrise itself — it arrives later that morning (Hyderabad: 7:06 AM; Sydney: 11:36 AM) and covers the madhyahna window instead. Should the Sankalpam state the tithi prevailing at sunrise (today's behavior, for every location), or the tithi that qualifies the day for the vrata? And separately: is there a meaningful difference between Hyderabad's case (Chaturthi arrives hours before madhyahna) and Sydney's (Chaturthi arrives right at the edge of the computed madhyahna window) that should be treated differently, or are both simply 'the vrata's tithi arrived after sunrise' in the same way?"* No correction is implemented for this (see item 1) — a technical check that tried to answer "which is which" using only the sunrise-tithi name was built, tested against real Hyderabad/Frisco/Sydney data, found to misfire on the ordinary Hyderabad case, and reverted rather than shipped.
3. **Whether an ordinary (non-festival) daily Sankalpam's Tithi should also be sunrise-anchored** — Round 2 found only an unverified search-engine claim for this, not a primary source; unchanged (ordinary days already use the sunrise anchor by construction, per item 1, but the underlying "why sunrise" religious justification for the ordinary case remains unverified, exactly as Round 2 recorded it).
4. **The Kshaya-masa gap** (item 3) — recorded as an explicit, unverified limitation in `engine.ts`'s own doc comment; not addressed here, no Kshaya-masa date is available to test against.

---

## Files and functions involved

| Area | File | Function/section |
|---|---|---|
| Tithi/Paksha anchor (unchanged) | `lib/sankalpam/from-app.ts` | `panchangaToSlots()` (lines 19-61) |
| Tithi-consistency check (attempted, reverted — see item 1) | `lib/sankalpam/from-app.ts` | `buildSankalpamRequest()` — implemented, tested against Hyderabad/Frisco/Sydney, found to misfire, reverted before merge |
| Nakshatra anchor (fixed) | `lib/sankalpam/from-app.ts` | `panchangaToSlots()` — Nakshatra now reads `atSunrise ?? value`, matching Tithi |
| Sunrise-element data | `lib/panchanga/index.ts` | `addElement()` (lines 276-334) |
| Sunrise-element data | `lib/panchanga/engine.ts` | `tithiAtSunrise`/`nakshatraAtSunrise` (lines 129, 550-552) |
| Masa (Amanta) | `lib/panchanga/engine.ts` | `amantaMasaFromMoonMasa()` (lines 390-461) |
| Festival's own validated Tithi | `lib/panchanga/festival-rules.ts` | `FESTIVAL_RULES` vinayaka-chavithi entry (lines 250-274) |
| Generator / SHORT fallback | `lib/sankalpam/generator.ts` | `generateSankalpam()` calendar-form logic (lines 338-397) |
| Stored choices | `lib/sankalpam/choices.ts` | `SankalpamChoices`, `defaultSankalpamChoices()`, `parseSankalpamChoices()` |
| Setup screen (choice persistence) | `components/platform/sankalpam-setup-screen.tsx` | `set()` (line 266), calendar-form toggle (line 306) |
| Ready/View/Practice call sites | `components/platform/prepare-screen.tsx:308-317`, `sankalpam-setup-screen.tsx:271`, `components/platform/puja-screen.tsx:140-150` | `buildSankalpamRequest()` call sites |
| Reactive location source | `app/page.tsx` | `useSyncExternalStore(…, getLocationSnapshot, …)` (lines 137-139) |
| Persisted (non-calendar) state | `lib/storage/preparation.ts` | `sankalpamChoices` field only (lines 46, 83, 204, 276) |
| Audio-eligibility exact match | `lib/sankalpam/family-audio.ts` | `familyAudioMatchesGen()` (lines 63-72) |
| Roman/Telugu pairing | `lib/sankalpam/generator.ts` | `push()` (lines 334-336), assembly (lines 710-711) |

---

## Minimal correction plan (Stage B) — what was actually implemented

1. **`lib/sankalpam/from-app.ts`**: read Nakshatra from `atSunrise ?? value`, matching the existing Tithi pattern exactly (one-line change, mirrors existing code). **Implemented.**
2. **Tithi consistency check: implemented, tested, REVERTED.** See item 1 above for the full account — a technical safeguard was built and then found, by testing it against Hyderabad/Frisco/Sydney real data, to rest on a false premise (that "sunrise tithi ≠ festival tithi" only happens for Sydney; it also happens for Hyderabad, harmlessly, every year). Not shipped. `lib/sankalpam/from-app.ts` is unchanged in this respect from `main`.
3. **`lib/panchanga/engine.ts`**: comment-only correction to `amantaMasaFromMoonMasa`'s doc comment, which described a prior, already-fixed state of `from-app.ts`. Zero behavior change. **Implemented.**
4. **Tests**: extended `tests/sankalpam-paksha-tithi.test.mjs` with Frisco and Sydney straddle coverage; added Nakshatra-anchor regression tests (mirroring the existing Tithi ones); added three tests documenting the real, current, unchanged Tithi value for Hyderabad/Frisco/Sydney's own Vinayaka Chavithi day (an executable version of the table below, and a guard against this exact premise silently changing under a future engine update); added the location-mid-flow regression test identified as a coverage gap in item 5. **Implemented** (item 5's test — see Testing section for status).

No change to: `generator.ts`'s SHORT-form mechanism, `madhyahnaVyaptiFestivalDay` or any other festival date-selection rule, the Adhika-month wording fallback, any UI component, any audio file, any puja step, and — after testing disproved the premise — the Tithi anchor itself.

---

## Expected output — Hyderabad, Frisco, Sydney (Vinayaka Chavithi, 2026)

All three rows are **unchanged by this audit's Stage B** — the one correction that would have changed the Hyderabad/Sydney rows (withholding a "mismatched" Tithi) was implemented, tested, and reverted (see item 1). What follows is the actual, current, tested behavior, executable as `tests/sankalpam-paksha-tithi.test.mjs`'s three new location tests.

| Location | Festival date selected | Sunrise Tithi that day | Sankalpam Tithi (unchanged, before and after this audit) |
|---|---|---|---|
| Hyderabad | 2026-09-14 | Shukla **Tritiya** (Chaturthi begins 7:06 AM, after sunrise) | Full dated, states Tritiya — the day's own sunrise value; matches the ordinary sunrise-anchor rule Tithi/Paksha already use consistently (item 4) |
| Frisco | 2026-09-14 | Shukla **Chaturthi** (began 8:36 PM the previous evening, already in effect by sunrise) | Full dated, states Chaturthi — the one of the three where sunrise Tithi already matches the festival's own nominal tithi |
| Sydney | 2026-09-14 per current engine selection (Drik Panchang's own page instead shows 2026-09-15 for the same location — the still-unresolved date-selection dispute) | Shukla **Tritiya** (Chaturthi begins 11:36 AM, close to the engine's own computed madhyahna-window start) | Full dated, states Tritiya — same as Hyderabad's own case; not a special-cased or suppressed value |

Hyderabad's own row is the concrete evidence that ruled out this audit's first proposed fix: Hyderabad's sunrise Tithi differs from the festival's nominal Tithi in exactly the same direction as Sydney's does, just earlier in the morning — so treating "sunrise ≠ festival tithi" as the marker of a problem would have flagged the routine, undisputed Hyderabad case too. The genuinely disputed question (item 1, priest question above) is about Sydney's *date selection*, not a Tithi-wording bug distinct from Hyderabad's own, otherwise-identical situation.

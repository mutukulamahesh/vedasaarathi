# Sankalpam FAMILY and unrelated-GROUP journey audit (2026-09-30)

Software behavior audit of the complete FAMILY and unrelated-GROUP Sankalpam
journeys, as instructed. Priest/content review is out of scope — Mahesh
handles that separately. No ritual wording, calculations, or festival rules
were touched. This audit found and reports **two genuine software defects**
(neither fixed here, per instruction) and adds durable regression coverage
for confirmed-correct behavior that had no prior test.

**Main SHA tested: `a562cc5` (PRs #5–#8 merged; PR #8 deployed and
verified).** No application code was changed during this audit — only new
tests.

## Method

1. Read `lib/sankalpam/generator.ts`, `lib/sankalpam/choices.ts`,
   `components/platform/sankalpam-setup-screen.tsx`,
   `components/platform/puja-screen.tsx`, `components/platform/prepare-screen.tsx`,
   and every existing `tests/sankalpam-*.test.mjs` / `tests/sankalpam-premature-preview.test.mjs`
   file (8 files, 117 tests) before writing anything, to map existing
   coverage against the requested scenario list.
2. Confirmed suspected gaps and hypotheses directly against the generator
   and rendered output (via `createTestViteServer` + `renderToStaticMarkup`,
   and live Playwright sessions) before writing any test or claim.
3. Added regression tests only where a real, previously-uncovered gap was
   confirmed — not for behavior already tested elsewhere.
4. Tested every requested real-user scenario in a live browser
   (`npm run dev`, Playwright/Chromium), using fictional participants
   throughout (Anjali, Ravi, Sita, Kiran — no real names).
5. Where a genuine defect was found, it is reported here with exact
   reproduction steps and file:line references, and is also captured as an
   explicit, clearly-labelled `FINDING:` assertion inside the new durable
   e2e file — so the defect's existence is itself verified, reproducible,
   executable evidence, without the suite being left red and without any
   fix being bundled into this audit.

## Scenario table

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | FAMILY, all participants KNOWN Gotra | **PASS** | `tests/sankalpam-setup.test.mjs` ("a known valid Gotra…"); live browser (audit e2e, FAMILY primary-KNOWN path via mixed-Gotra test) |
| 2 | FAMILY, mixed KNOWN/UNKNOWN/UNSURE Gotra | **PASS, with a confirmed defect noted (see Finding 1)** | new unit tests + live browser (audit e2e §"FAMILY: mixed…") |
| 3 | FAMILY: no convention auto-selected | **PASS** (pre-existing, re-confirmed) | `tests/sankalpam-generator.test.mjs` ("an unknown Gotra is NOT filled automatically") |
| 4 | FAMILY: each supported unknown-Gotra resolution (OMIT / KASHYAPA / FAMILY_TRADITION) | **PASS** | `tests/sankalpam-setup.test.mjs`, `tests/sankalpam-premature-preview.test.mjs`; live browser |
| 5 | FAMILY: "Enter my family's Gotra" left BLANK keeps the preview gated | **PASS — new coverage (was untested)** | new test in `tests/sankalpam-setup.test.mjs`; live browser (audit e2e) |
| 6 | FAMILY behavior matches the documented contract (ONE shared recitation, never per-member) | **PASS, but exposed Finding 1** | live browser (audit e2e); `tests/beta-usability-repair.test.mjs` (pre-existing: no individual names in family form) |
| 7 | GROUP: undecided collective/individual choice keeps text+playback gated | **PASS** (state-level); **defect found in the resolution mechanism itself — Finding 2** | `tests/sankalpam-setup.test.mjs` (new COLLECTIVE-mode test); live browser |
| 8 | GROUP: collective mode uses the existing group form | **PASS** | `tests/sankalpam-generator.test.mjs`, `tests/sankalpam-assembly.test.mjs`; live browser |
| 9 | GROUP: individual mode respects each participant's own Gotra choice | **PASS** (pre-existing, heavily tested) | `tests/sankalpam-generator.test.mjs` (7 tests), `tests/sankalpam-setup.test.mjs` |
| 10 | GROUP: resolving one participant never overwrites another's choice | **PASS** | pre-existing + live browser confirms Ravi's OMIT and Sita's KASHYAPA stay independent |
| 11 | GROUP: any unresolved required choice keeps the preview gated | **PASS** | live browser (audit e2e) |
| 12 | GROUP: add/edit/remove participants — choices tied to participant IDs, no silent reuse | **PASS — new coverage (was untested)** | new test in `tests/sankalpam-setup.test.mjs` ("a REMOVED participant's orphaned choice entry…") |
| 13 | Full-dated and short forms | **PASS** | `tests/sankalpam-setup.test.mjs` ("both full-dated and short calendar forms…") |
| 14 | English and Telugu | **PASS** | unit + live browser, full matrix |
| 15 | Mobile and desktop | **PASS** | live browser, full matrix |
| 16 | Hyderabad and Frisco | **PASS** | live browser, full matrix (gating is state-based, not location-based — confirmed identical at both) |
| 17 | Preparation preview | **PASS** | `tests/sankalpam-generator.test.mjs` (new invariant test) + live browser via real Pujas→Begin navigation |
| 18 | Setup (ready screen) | **PASS** | live browser, full matrix |
| 19 | Change details | **PASS**, but is where Finding 1's symptom and Finding 2's defect actually live | live browser |
| 20 | Practice / full views | **PASS** | live browser (audit e2e, "Hear and practise / View Sankalpam") |
| 21 | The puja's own Sankalpam step (PujaScreen) | **PASS** | `tests/sankalpam-premature-preview.test.mjs` (5 PujaScreen-level tests, added in PR #8) |
| 22 | Save, refresh, reopen, resume | **PASS** | new live-browser test using a REAL `page.reload()` (not simulated) |
| 23 | Resolved → back to unresolved re-hides text/playback | **PASS — new coverage (was untested)** | new interactive test in `tests/sankalpam-premature-preview.test.mjs` |
| 24 | Controls/navigation/instructions allow resolving pending choices | **PASS for Gotra choices; FAILS for the GROUP-recitation choice — Finding 2** | live browser |
| 25 | No console errors / no horizontal overflow | **PASS** | live browser, full matrix (0 errors across every combination) |
| 26 | Compare rendered text against generator output | **PASS** | direct generator calls cross-checked against rendered DOM (see "Text comparison" below) |

Every row was **tested**, not assumed. No row is "not tested."

## Findings

### Finding 1 — FAMILY mode's "Unknown Gotra" choice widget and summary text are shown and interactive even when they have no effect on the output, for a non-primary participant

**Where:** `components/platform/sankalpam-setup-screen.tsx`
- Line 281: `const anyUnknownGotra = activeList.some(hasUnknownGotra);` — checks **every** participant.
- Line 392: `{!eachIndividually && anyUnknownGotra && (` — gates the "Unknown Gotra" choice fieldset inside `detailedForm` (the "Change details" screen's own body) on this all-participants check.
- Lines 468–475 (`gotraSummary()`), specifically line 469 `if (!anyUnknownGotra) return t.gotraKnown;` and the final fallback at line 474 `return t.gotraOneChoice;` — the Ready screen's own Gotra summary line.
- Contrast: `lib/sankalpam/generator.ts` line 513 `const gotraField = primary.lineage.gotra;` and line 512 `const primary = people[0] ?? …` — the generator's **entire** Gotra/pending computation for FAMILY mode depends **only on `people[0]`** (the first-listed participant), matching the documented, already-tested contract that FAMILY is one shared recitation (`tests/beta-usability-repair.test.mjs`: "family form carries no member names").

**Repro steps (fictional participants):**
1. FAMILY mode, two participants: Anjali (Gotra KNOWN, "Kaundinya") listed **first**, Ravi (Gotra UNKNOWN) listed **second**.
2. Leave `unknownGotra` unset (default).
3. Open Sankalpam setup.

**Expected:** Since the generator only ever looks at the first participant's Gotra, and it is KNOWN, the Sankalpam is genuinely complete — the Ready screen should read "ready," Begin should be enabled, and the Gotra summary should read "known for everyone in the puja," matching reality.

**Actual (confirmed directly, both via `renderToStaticMarkup` and a live Playwright session):**
- Ready screen heading: "Your Sankalpam is ready" ✓ (correct)
- Begin: enabled ✓ (correct)
- **Gotra summary line reads "one simple choice is needed below"** — even though nothing is "below" on this screen (the inline choice widget there is correctly gated by `pending`, which is `false`, so it does not render at all). The claim is simply false.
- Opening "Change details": the **"Unknown Gotra" choice fieldset (Kashyapa / Omit / Enter family Gotra) is shown and fully interactive**, sitting directly next to the **already-complete, already-visible recitable Telugu text** (which uses Anjali's own known Gotra). Making any choice there — e.g. Kashyapa — has **zero effect** on the generated text (confirmed: identical `segments` output with `unknownGotra: null` vs. `unknownGotra: "KASHYAPA"` for this exact participant set).

**Severity:** Medium. Not a data-correctness bug (the recited Sankalpam is always correct — Anjali's own Gotra is genuinely what should be spoken) and not a gating bug (Begin/preview visibility are already correct). It is a **misleading-UI** defect: a family with more than one listed member, where a non-primary member's Gotra happens to be unresolved, sees a "choice is needed" message and an interactive widget that do not correspond to anything the generator actually uses — confusing at best, and could lead a family to believe they've "handled" a non-primary member's Gotra when the app was never going to ask about it in the first place.

**Not fixed here**, per instruction.

### Finding 2 — An unrelated GROUP's "One collective Sankalpam" option cannot be resolved by clicking it directly; only a "switch away, then back" workaround works

**Where:** `components/platform/sankalpam-setup-screen.tsx`, lines 324–334:
```
{isGroup &&
  CHOICE<NonNullable<SankalpamChoices["groupRecitation"]>>(
    t.groupRecitation,
    t.groupRecitationHint,
    choices.groupRecitation ?? "COLLECTIVE",   // <-- the defect
    [
      { v: "COLLECTIVE", label: t.groupCollective, note: t.groupCollectiveNote },
      { v: "EACH_INDIVIDUALLY", label: t.groupEach, note: t.groupEachNote },
    ],
    (v) => set({ groupRecitation: v }),
  )}
```
Contrast with the **correct** pattern used for the Gotra choice two call sites away (line 397 and line 629): `choices.unknownGotra ?? "UNSET"` — where `"UNSET"` is a **real, distinct, visibly-unchecked third option** ("Not decided yet"). The `groupRecitation` choice has **only two real options**, and defaults the **displayed** (not the stored) value to `"COLLECTIVE"` when the real stored value is still `null`. A controlled radio input's `onChange` only fires on an actual value transition — clicking an option that the DOM already reports as `checked` does nothing.

**Repro steps (fictional participants):**
1. GROUP mode, two participants, both with KNOWN Gotra (isolates the bug cleanly from any Gotra-related gating): Anjali ("Kaundinya"), Kiran ("Vasishtha").
2. Default (unset) choices. Open Sankalpam setup (GROUP mode lands directly on the detailed setup screen — there is no separate "ready" page for this mode).

**Expected:** The "Group recitation" choice shows neither option as selected (or shows an explicit neutral/undecided state, matching the Gotra choice's own "Not decided yet" pattern); clicking "One collective Sankalpam" sets the choice, and the preview/Begin resolve immediately.

**Actual (confirmed directly, live Playwright session):**
- Before any interaction: `collectiveRadio.isChecked()` → **`true`**, even though `pending` is `true` (recitable text hidden, Begin disabled) — the radio visually claims a decision has already been made.
- Clicking the already-checked "One collective Sankalpam" radio directly: **no change** — text stays hidden, Begin stays disabled, `groupRecitation` stays `null`.
- Clicking "Each person states their own" (a genuine transition, since it starts unchecked), then clicking **back** on "One collective Sankalpam" (now a genuine transition, since the radio is no longer defaulted to checked): **this works** — the preview and Begin resolve correctly.

**Severity: HIGH.** An unrelated group whose intended choice is the collective form — the more common case — has **no discoverable way to confirm it** via the obvious, expected interaction (clicking the option that is already shown selected). The only path forward is an undocumented two-step workaround (switch to the other option, then switch back) that no user would find without already knowing this defect exists. This can leave a real group's Sankalpam permanently stuck pending, with Begin permanently disabled, via the app's own default rendering.

**Not fixed here**, per instruction.

## Text comparison against generator output

For every resolved scenario exercised in this audit, the rendered DOM text was checked against direct `generateSankalpam()` output for the same inputs, specifically:
- FAMILY, primary UNKNOWN → OMIT: rendered text has no `gotrasya` clause at all — matches `generateSankalpam`'s own `gotraStatus: "OMITTED_BY_CHOICE"` path (no Gotra segment pushed).
- FAMILY, primary KNOWN with a non-primary UNKNOWN (Finding 1): rendered text uses the primary's own `«Kaundinya»-gotrasya` / `«Bharadwaja»-gotrasya` regardless of the Unknown-Gotra choice — confirmed byte-identical generator output (`JSON.stringify` equality) between `unknownGotra: null` and `unknownGotra: "KASHYAPA"` for this participant set.
- GROUP, individual mode, Ravi OMIT + Sita KASHYAPA: rendered text shows `Kashyapa-gotrasya, «Sita»` and no Gotra clause for Ravi's own segment — matches per-member `generateSankalpam` output exactly, and participant names/associations are correct (never swapped).
- GROUP, collective mode: rendered text uses the existing `asmakam,` group frame, never `saha kutumbanam` — matches `FRAME.groupRoman` in `lib/sankalpam/generator.ts`.

No discrepancy between generator output and rendered text was found anywhere. Sacred wording, source citations, and review status were read only for comparison, never judged or altered.

## Remaining software coverage gaps (not fixed, not blocking)

- **Findings 1 and 2 themselves** have no *fix-verifying* regression test yet (correctly, since no fix was made) — only *finding-documenting* assertions in the new e2e file. A future fix PR should add a test asserting the corrected behavior and can reuse the exact repro fixtures recorded here.
- The GROUP "each recites individually" per-participant Gotra choice UI has no equivalent of Finding 1 (no non-participant-specific shared widget there), so it was not separately probed for the same class of bug beyond what's documented — considered low-risk given its already-thorough existing coverage (7 dedicated generator tests).
- The audit's state-correctness scenarios (mixed Gotra, blank FAMILY_TRADITION, GROUP collective gating, participant removal) were deliberately run once each (English, Hyderabad, desktop) rather than across the full language/viewport/location matrix, since the gating and generator logic are provably state-only, not presentation-dependent (see the new e2e file's own header note). If that assumption is ever violated by a future change, the existing full-matrix presentation checks (in the same file) would likely surface it as a new, unexplained failure.
- GROUP mode with 3+ participants mixing KNOWN, UNKNOWN, and UNSURE simultaneously (this audit used at most 2 non-KNOWN participants at once) was not separately exercised; the underlying mechanism (participant-ID-keyed, independent of count) makes a 3-way interaction bug unlikely, but it was not directly tested here.
- Accessibility (screen-reader labeling, keyboard-only completion of the Gotra/recitation choices) was not part of this audit's scope and was not tested.

## Exact commands and counts

| Command | Result |
|---|---|
| `node --test tests/sankalpam-setup.test.mjs tests/sankalpam-premature-preview.test.mjs` | **35/35** |
| `node --test tests/*.test.mjs` (full unit suite) | **1024/1024** (was 1020 on merged main; +4 new tests) |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean (0 errors; 1 pre-existing, unrelated warning in `tests/vinayaka-review-fixes.test.mjs`) |
| `node tests/e2e/sankalpam-family-group-audit.e2e.mjs` (new, durable, kept in repo) | **130/130**, across mobile+desktop × EN+TE × Hyderabad+Frisco for the full-matrix section, plus 6 dedicated state-correctness/screen functions |

No retries were needed for any of the above once each script's own bugs (described below) were fixed — every failure encountered during development of the NEW audit script was a test-authoring mistake on my part, not applied against the app, and is disclosed for transparency:
- First e2e run: assumed GROUP mode shows a "ready"/"Change details" flow like FAMILY. It doesn't — GROUP's default view is the detailed setup screen directly (`sankalpam-setup-screen.tsx`'s `useState(mode === "FAMILY" ? "ready" : "change")`). Fixed by removing the incorrect navigation step.
- Second e2e run: this incorrect assumption was what led directly to discovering Finding 2 — the test's "click COLLECTIVE" step genuinely had no effect, which was the real app behavior, not a test bug. Verified precisely with a standalone script before accepting it as a finding.
- Third e2e run: a Playwright strict-mode violation (`.sankalpam-assembled` matched 3 elements once GROUP's per-individual view renders each member's own nested block) — fixed by scoping the assertion to the outer `.sankalpam-assembled-group` wrapper.
- Fourth e2e run: clean pass (130/130). A fifth, final run after adding a FAMILY-player-presence check (to use a previously-unused helper flagged by lint) also passed clean (130/130, same as reported above).

## Changed files

- `tests/sankalpam-setup.test.mjs` — 3 new tests (blank FAMILY_TRADITION stays gated; GROUP+COLLECTIVE setup-screen gating; removed-participant orphaned-choice isolation).
- `tests/sankalpam-premature-preview.test.mjs` — 1 new test (resolved → back to unresolved re-hides text/playback and disables Begin).
- `tests/e2e/sankalpam-family-group-audit.e2e.mjs` — **new**, durable (kept in the repository, not a scratch script). Covers the full requested scenario matrix and documents both findings as executable evidence.

`tests/sankalpam-generator.test.mjs` is unchanged in this audit — its existing PrepareScreen invariant test (added in the PR #8 session) already covered scenario #17 and was reused as-is, not duplicated.

No application/production code was changed.

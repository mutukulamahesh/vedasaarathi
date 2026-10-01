# Sankalpam FAMILY and unrelated-GROUP journey audit (2026-09-30)

Software behavior audit of the complete FAMILY and unrelated-GROUP Sankalpam
journeys, as instructed. Priest/content review is out of scope — Mahesh
handles that separately. No ritual wording, calculations, or festival rules
were touched. This audit found and reports **two genuine software defects**
(neither fixed here, per instruction) and adds durable regression coverage
for confirmed-correct behavior that had no prior test.

> **Status update (2026-10-01): both findings below are RESOLVED.** PR #10
> (`fix/sankalpam-family-group-defects`, merged to `main` at `0b1a8cc`) fixed
> both Finding 1 and Finding 2. This report's findings text is kept exactly
> as originally written, as the historical record of what was found and how;
> each finding below now also carries a short **Resolved** note pointing to
> the fix. The executable evidence in `tests/e2e/sankalpam-family-group-audit.e2e.mjs`
> that used to assert the broken behavior has been updated in place to assert
> the corrected behavior instead (see that file's own header comment and
> `tests/e2e/sankalpam-family-group-fix.e2e.mjs`, the fix's dedicated
> verification file, for further detail).

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

**Matrix key**, cited explicitly per row below, since coverage breadth genuinely
differs by scenario:
- **[full matrix]** = live browser, all 16 combinations (mobile+desktop ×
  EN+TE × Hyderabad+Frisco) — the `run()` function in the new e2e file.
- **[EN/HYD/desktop]** = live browser, English + Hyderabad + desktop only —
  one of the six dedicated `audit*()` functions in the new e2e file. State
  (gating, generator output, participant association) does not vary by
  language/viewport/location, so these were run once, not across the full
  matrix — see "Remaining software coverage gaps" for the explicit risk this
  leaves.
- **[unit]** = `node --test`, no browser.
- **[not tested]** = genuinely not exercised in this audit, by any means.

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | FAMILY, all participants KNOWN Gotra | **PASS** | [unit] `tests/sankalpam-generator.test.mjs` GOLDEN family test (pre-existing, single KNOWN participant — since FAMILY only ever uses `participants[0]`, a second/third KNOWN participant exercises no additional code path). Not independently re-verified live in this audit; the live-browser FAMILY scenarios used an UNKNOWN participant (see #2). |
| 2 | FAMILY, mixed KNOWN/UNKNOWN/UNSURE Gotra | **PASS, with a confirmed defect noted (see Finding 1, resolved in PR #10)** | [unit] new tests; **[EN/HYD/desktop]** live browser (`auditFamilyMixedGotra`) |
| 3 | FAMILY: no convention auto-selected | **PASS** (pre-existing, re-confirmed) | [unit] `tests/sankalpam-generator.test.mjs` ("an unknown Gotra is NOT filled automatically") |
| 4 | FAMILY: each supported unknown-Gotra resolution (OMIT / KASHYAPA / FAMILY_TRADITION) | **PASS** | [unit] `tests/sankalpam-setup.test.mjs`, `tests/sankalpam-premature-preview.test.mjs`; **[full matrix]** live browser (`run()`, OMIT only) + **[EN/HYD/desktop]** (`auditFamilyBlankFamilyTradition`, FAMILY_TRADITION) |
| 5 | FAMILY: "Enter my family's Gotra" left BLANK keeps the preview gated | **PASS — new coverage (was untested)** | [unit] new test; **[EN/HYD/desktop]** live browser (`auditFamilyBlankFamilyTradition`) |
| 6 | FAMILY behavior matches the documented contract (ONE shared recitation, never per-member) | **PASS, but exposed Finding 1 (resolved in PR #10)** | **[EN/HYD/desktop]** live browser (`auditFamilyMixedGotra`); [unit] `tests/beta-usability-repair.test.mjs` (pre-existing: no individual names in family form) |
| 7 | GROUP: undecided collective/individual choice keeps text+playback gated | **PASS** (state-level); **defect found in the resolution mechanism itself — Finding 2 (resolved in PR #10)** | [unit] `tests/sankalpam-setup.test.mjs` (new COLLECTIVE-mode test); **[EN/HYD/desktop]** live browser (`auditGroup`) |
| 8 | GROUP: collective mode uses the existing group form | **PASS** | [unit] `tests/sankalpam-generator.test.mjs`, `tests/sankalpam-assembly.test.mjs`; **[EN/HYD/desktop]** live browser |
| 9 | GROUP: individual mode respects each participant's own Gotra choice | **PASS** (pre-existing, heavily tested) | [unit] `tests/sankalpam-generator.test.mjs` (7 tests), `tests/sankalpam-setup.test.mjs` |
| 10 | GROUP: resolving one participant never overwrites another's choice | **PASS** | [unit] pre-existing; **[EN/HYD/desktop]** live browser confirms Ravi's OMIT and Sita's KASHYAPA stay independent |
| 11 | GROUP: any unresolved required choice keeps the preview gated | **PASS** | **[EN/HYD/desktop]** live browser (`auditGroup`) |
| 12a | GROUP: choices are associated by participant ID, and a stale/orphaned entry (simulating a prior removal already reflected in `activeList`) does not corrupt the remaining participant's gating or text | **PASS — new coverage (was untested)** | [unit] new test in `tests/sankalpam-setup.test.mjs` ("a REMOVED participant's orphaned choice entry…") — state-level: constructs `activeList`/`choices` directly, does not drive the People screen |
| 12b | GROUP: the actual People-screen Add/Edit/Remove-participant UI journey, then returning to Sankalpam setup | **NOT TESTED** | No test (unit or browser) in this audit exercises the People screen's own add/edit/remove controls feeding into Sankalpam setup |
| 13 | Full-dated and short forms | **PASS** | [unit] `tests/sankalpam-setup.test.mjs` ("both full-dated and short calendar forms…") |
| 14 | English and Telugu | **PASS for the FAMILY primary-Gotra-pending scenario (run() function); EN-only for the other five state-correctness functions** | **[full matrix]** for `run()`; **[EN/HYD/desktop]** (English only) for the other five |
| 15 | Mobile and desktop | **PASS for the FAMILY primary-Gotra-pending scenario; desktop-only for the other five state-correctness functions** | **[full matrix]** for `run()`; **[EN/HYD/desktop]** (desktop only) for the other five |
| 16 | Hyderabad and Frisco | **PASS for the FAMILY primary-Gotra-pending scenario; Hyderabad-only for the other five state-correctness functions** | **[full matrix]** for `run()`; **[EN/HYD/desktop]** (Hyderabad only) for the other five (gating is state-based, not location-based, so this was judged sufficient — see coverage gaps) |
| 17 | Preparation preview | **PASS** | [unit] `tests/sankalpam-generator.test.mjs` (pre-existing invariant test, PR #8); **[EN/HYD/desktop]** live browser via real Pujas→Begin navigation (`auditPreparationPreview`) |
| 18 | Setup (ready screen) | **PASS** | **[full matrix]** live browser (`run()`) |
| 19 | Change details | **PASS**, but is where Finding 1's symptom and Finding 2's defect actually lived (both resolved in PR #10) | **[full matrix]** for the primary path; **[EN/HYD/desktop]** for the finding-specific scenarios |
| 20 | Practice view: button enabled/disabled state | **PASS** | **[EN/HYD/desktop]** live browser (`auditPractiseFullViews`) |
| 20b | Practice view: actually opening it and checking its content | **NOT TESTED in this audit** (pre-existing coverage exists elsewhere: `tests/sankalpam-adhika-family-nav.test.mjs` clicks into "Hear and practise" for a different, KNOWN-Gotra family fixture — not re-verified here for the specific unresolved→resolved scenarios this audit added) | — |
| 20c | "View Sankalpam" (full view): opening it and checking content | **PASS** | **[EN/HYD/desktop]** live browser (`auditPractiseFullViews` clicks into it and checks the rendered text) |
| 21 | The puja's own Sankalpam step (PujaScreen) | **PASS** | [unit] `tests/sankalpam-premature-preview.test.mjs` (5 PujaScreen-level tests, added in PR #8; SSR-rendered, not a live browser click-through in this audit) |
| 22 | Save, refresh, reopen, resume (Sankalpam setup screen) | **PASS** | **[EN/HYD/desktop]** live browser, a REAL `page.reload()` (not simulated) (`auditSaveReloadResume`) |
| 22b | Resuming an in-progress guided PUJA (not just the setup screen) after a reload | **NOT TESTED in this audit** | — |
| 23 | Resolved → back to unresolved re-hides text/playback | **PASS — new coverage (was untested)** | [unit] new interactive test in `tests/sankalpam-premature-preview.test.mjs` (JSDOM, not a live browser in this audit) |
| 24 | Controls/navigation/instructions allow resolving pending choices | **PASS for Gotra choices; FAILED for the GROUP-recitation choice by direct selection — Finding 2, resolved in PR #10 (now PASS)** | **[EN/HYD/desktop]** live browser |
| 25 | No console errors / no horizontal overflow | **PASS** | **[full matrix]** for `run()` (0 errors across all 16 combinations); **[EN/HYD/desktop]** for the other five functions |
| 26 | Compare rendered text against generator output | **PASS** | direct generator calls cross-checked against rendered DOM (see "Text comparison" below) |

Every row above was genuinely tested by the method stated, or explicitly
marked **NOT TESTED**. Rows 12b, 20b, and 22b are real, acknowledged gaps —
also listed in "Remaining software coverage gaps" below.

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

**Expected:** Since the generator only ever looks at the first (primary) participant's Gotra, and the primary's Gotra is KNOWN here, the Sankalpam is genuinely complete — the Ready screen should read "ready," Begin should be enabled, and nothing on screen should claim a choice is still outstanding or offer a widget that has no effect. (This audit does **not** prescribe the exact replacement wording — e.g. it would be inaccurate to say "known for everyone in the puja" when only the primary participant's status is actually known/used; the fix PR should choose wording that accurately reflects what the generator actually does, not a new overclaim in the other direction.)

**Actual (confirmed directly via `renderToStaticMarkup`, a live Playwright session, and now dedicated executable assertions in `tests/e2e/sankalpam-family-group-audit.e2e.mjs`):**
- Ready screen heading: "Your Sankalpam is ready" ✓ (correct)
- Begin: enabled ✓ (correct)
- **Gotra summary line reads "one simple choice is needed below"** — even though nothing is "below" on this screen (the inline choice widget there is correctly gated by `pending`, which is `false`, so it does not render at all). The claim is simply false.
- Opening "Change details": the **"Unknown Gotra" choice fieldset (Kashyapa / Omit / Enter family Gotra) is shown and fully interactive**, sitting directly next to the **already-complete, already-visible recitable Telugu text** (which uses Anjali's own known Gotra). Making any choice there — e.g. Kashyapa — has **zero effect** on the recited text: directly asserted by clicking the Kashyapa radio and comparing `.sankalpam-assembled`'s text content before and after (byte-identical), and independently confirmed via direct `generateSankalpam()` calls (identical `segments` output with `unknownGotra: null` vs. `unknownGotra: "KASHYAPA"` for this exact participant set).

**Severity:** Medium. Not a data-correctness bug (the recited Sankalpam is always correct — Anjali's own Gotra is genuinely what should be spoken) and not a gating bug (Begin/preview visibility are already correct). It is a **misleading-UI** defect: a family with more than one listed member, where a non-primary member's Gotra happens to be unresolved, sees a "choice is needed" message and an interactive widget that do not correspond to anything the generator actually uses — confusing at best, and could lead a family to believe they've "handled" a non-primary member's Gotra when the app was never going to ask about it in the first place.

**Not fixed here**, per instruction.

**Resolved:** PR #10 (`fix/sankalpam-family-group-defects`, merged to `main`
at `0b1a8cc`) changed the gating in both places above (the "Change details"
fieldset and `gotraSummary()`) from `anyUnknownGotra` (every participant) to
a new `primaryHasUnknownGotra` (the first-listed participant only), matching
the generator's actual contract. GROUP+COLLECTIVE's own, different Gotra
rule is deliberately unchanged. `gotraKnown`'s wording was also corrected
from "known for everyone in the puja" to "known" — the old wording itself
overclaimed, as this report's "Expected" section above noted. Verified live:
`tests/e2e/sankalpam-family-group-audit.e2e.mjs` (`auditFamilyMixedGotra`,
assertions updated in place) and `tests/e2e/sankalpam-family-group-fix.e2e.mjs`.

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

**Resolved:** PR #10 (`fix/sankalpam-family-group-defects`, merged to `main`
at `0b1a8cc`) changed the `groupRecitation` CHOICE call's displayed value
from `choices.groupRecitation ?? "COLLECTIVE"` to `choices.groupRecitation
?? "UNSET"`, adding a genuine, visibly-unchecked "Not decided yet" option —
mirroring the correct `unknownGotra` pattern this finding already pointed
to. A single direct click on either "One collective Sankalpam" or "Each
person states their own" now persists that choice; no convention is ever
selected or persisted automatically, and the switch-away/back workaround is
no longer needed. Verified live: `tests/e2e/sankalpam-family-group-audit.e2e.mjs`
(`auditGroup`, assertions updated in place) and
`tests/e2e/sankalpam-family-group-fix.e2e.mjs`.

## Text comparison against generator output

For every resolved scenario exercised in this audit, the rendered DOM text was checked against direct `generateSankalpam()` output for the same inputs, specifically:
- FAMILY, primary UNKNOWN → OMIT: rendered text has no `gotrasya` clause at all — matches `generateSankalpam`'s own `gotraStatus: "OMITTED_BY_CHOICE"` path (no Gotra segment pushed).
- FAMILY, primary KNOWN with a non-primary UNKNOWN (Finding 1): rendered text uses the primary's own `«Kaundinya»-gotrasya` / `«Bharadwaja»-gotrasya` regardless of the Unknown-Gotra choice — confirmed byte-identical generator output (`JSON.stringify` equality) between `unknownGotra: null` and `unknownGotra: "KASHYAPA"` for this participant set.
- GROUP, individual mode, Ravi OMIT + Sita KASHYAPA: rendered text shows `Kashyapa-gotrasya, «Sita»` and no Gotra clause for Ravi's own segment — matches per-member `generateSankalpam` output exactly, and participant names/associations are correct (never swapped).
- GROUP, collective mode: rendered text uses the existing `asmakam,` group frame, never `saha kutumbanam` — matches `FRAME.groupRoman` in `lib/sankalpam/generator.ts`.

No discrepancy between generator output and rendered text was found anywhere. Sacred wording, source citations, and review status were read only for comparison, never judged or altered.

## Remaining software coverage gaps (not fixed, not blocking)

- ~~**Findings 1 and 2 themselves** have no *fix-verifying* regression test yet (correctly, since no fix was made) — only *finding-documenting* assertions in the new e2e file.~~ **Resolved (2026-10-01):** PR #10 fixed both findings and added fix-verifying regression tests (unit + a new dedicated `tests/e2e/sankalpam-family-group-fix.e2e.mjs`); the assertions in this audit's own e2e file that used to document the broken behavior now assert the corrected behavior instead. See the "Resolved" notes under each finding above.
- **Row 12b — the actual People-screen Add/Edit/Remove-participant UI journey**, then returning to Sankalpam setup to confirm choices behave correctly, was **not tested**. Only the resulting *state* (an orphaned `participantGotra` entry not matching any current participant) was tested directly.
- **Row 20b — opening "Hear and practise" and checking its content** was **not tested in this audit** for the unresolved→resolved scenarios it added; pre-existing coverage (`tests/sankalpam-adhika-family-nav.test.mjs`) clicks into it for a different, KNOWN-Gotra fixture.
- **Row 22b — resuming an in-progress guided puja** (not just the setup screen) after a reload was **not tested**.
- The GROUP "each recites individually" per-participant Gotra choice UI has no equivalent of Finding 1 (no non-participant-specific shared widget there), so it was not separately probed for the same class of bug beyond what's documented — considered low-risk given its already-thorough existing coverage (7 dedicated generator tests).
- The audit's state-correctness scenarios (mixed Gotra, blank FAMILY_TRADITION, GROUP collective gating, participant removal) were deliberately run once each (English, Hyderabad, desktop only — see the matrix key above) rather than across the full language/viewport/location matrix, since the gating and generator logic are provably state-only, not presentation-dependent (see the new e2e file's own header note). This is an assumption, not a proof by exhaustion: if it is ever violated by a future change, only the full-matrix `run()` scenario would be positioned to catch it, and only for the specific state that function exercises.
- GROUP mode with 3+ participants mixing KNOWN, UNKNOWN, and UNSURE simultaneously (this audit used at most 2 non-KNOWN participants at once) was not separately exercised; the underlying mechanism (participant-ID-keyed, independent of count) makes a 3-way interaction bug unlikely, but it was not directly tested here.
- Accessibility (screen-reader labeling, keyboard-only completion of the Gotra/recitation choices) was not part of this audit's scope and was not tested.

## Exact commands and counts

| Command | Result |
|---|---|
| `node --test tests/sankalpam-setup.test.mjs tests/sankalpam-premature-preview.test.mjs` | **35/35** |
| `node --test tests/*.test.mjs` (full unit suite) | **1024/1024** (was 1020 on merged main; +4 new tests) |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean (0 errors; 1 pre-existing, unrelated warning in `tests/vinayaka-review-fixes.test.mjs`) |
| `node tests/e2e/sankalpam-family-group-audit.e2e.mjs` (new, durable, kept in repo) | **134/134** — `run()` across the full 16-combination matrix (mobile+desktop × EN+TE × Hyderabad+Frisco), plus 6 dedicated state-correctness/screen functions each run English/Hyderabad/desktop only |

No retries were needed once each script's own bugs (described below) were fixed — every failure encountered while developing the NEW audit script was a test-authoring mistake on my part, not a behavior applied against the app, and is disclosed for transparency:
- Run 1: assumed GROUP mode shows a "ready"/"Change details" flow like FAMILY. It doesn't — GROUP's default view is the detailed setup screen directly (`sankalpam-setup-screen.tsx`'s `useState(mode === "FAMILY" ? "ready" : "change")`). Fixed by removing the incorrect navigation step.
- Run 2: this incorrect assumption was what led directly to discovering Finding 2 — the test's "click COLLECTIVE" step genuinely had no effect, which was the real app behavior, not a test bug. Verified precisely with a standalone script before accepting it as a finding.
- Run 3: a Playwright strict-mode violation (`.sankalpam-assembled` matched 3 elements once GROUP's per-individual view renders each member's own nested block) — fixed by scoping the assertion to the outer `.sankalpam-assembled-group` wrapper.
- Run 4: clean pass (130/130).
- After this review round: added direct executable assertions for Finding 1 (misleading summary text, the widget's presence, and byte-identical text before/after "using" it), and removed a dead, always-true `beginStillDisabled` expression. The FIRST run with these new assertions showed one transient failure — comparing `.sankalpam-setup-preview`'s full text (which also includes `FamilySankalpamPlayer`'s own async-loading UI, unrelated to Finding 1) raced with that player's own mount-time state settling. Fixed by scoping the comparison to `.sankalpam-assembled` only (the actual recited text Finding 1 is about) and adding an explicit settle wait before the first capture; re-ran 3 times consecutively to confirm the fix, then ran the full script once more end to end: **134/134**, clean.

## Changed files

- `tests/sankalpam-setup.test.mjs` — 3 new tests (blank FAMILY_TRADITION stays gated; GROUP+COLLECTIVE setup-screen gating; removed-participant orphaned-choice isolation).
- `tests/sankalpam-premature-preview.test.mjs` — 1 new test (resolved → back to unresolved re-hides text/playback and disables Begin).
- `tests/e2e/sankalpam-family-group-audit.e2e.mjs` — **new**, durable (kept in the repository, not a scratch script). Covers the full requested scenario matrix and documents both findings as executable evidence.

`tests/sankalpam-generator.test.mjs` is unchanged in this audit — its existing PrepareScreen invariant test (added in the PR #8 session) already covered scenario #17 and was reused as-is, not duplicated.

**Correction round (2026-09-30 revision):** in response to review, `tests/e2e/sankalpam-family-group-audit.e2e.mjs` was revised (no new files) to: add direct executable assertions for Finding 1 (previously verified only manually, via a deleted scratch script); remove a dead, always-true `beginStillDisabled` expression; and fix a timing race the new assertions exposed. This report was corrected to distinguish full-matrix from English/Hyderabad/desktop-only coverage per scenario, mark rows 12b/20b/22b as genuinely not tested, and stop claiming "known for everyone in the puja" as the expected fix wording for Finding 1. No application/production code has been changed in this audit at any point.

**Resolution verification (2026-10-01 revision):** PR #9 (this audit) and PR #10 (the fix) are both merged to `main` (`0b1a8cc`). This revision does not alter the findings themselves, which remain the accurate historical record of what was found. It adds the "Resolved" note under each finding and the status banner at the top, annotates the scenario-table rows that reference the findings, and replaces the no-longer-accurate "no fix-verifying test yet" coverage-gap bullet with a resolved note. Separately, `tests/e2e/sankalpam-family-group-audit.e2e.mjs`'s own `FINDING`-labeled assertions — which, after PR #10, were asserting behavior that no longer exists and would fail/crash against current `main` — were updated in place to assert the corrected behavior (see that file's own header comment for detail); its historical commentary about how and why each finding was originally discovered was left untouched. No application/production code was changed as part of this revision.

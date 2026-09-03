# VedaSaarathi Vinayaka Chavithi Pilot — Implementation Plan

Dated execution plan and task status. Scope and acceptance live in
[docs/VINAYAKA_V1_SCOPE.md](./docs/VINAYAKA_V1_SCOPE.md); direction lives in
[docs/VISION.md](./docs/VISION.md); everyday rules live in
[docs/PRODUCT_PRINCIPLES.md](./docs/PRODUCT_PRINCIPLES.md). Where this plan and the
scope document disagree, the scope document wins and this plan is corrected.

**Last updated:** 3 September 2026.

## Milestones

| Milestone | Meaning | Target |
| --- | --- | --- |
| **A. Technical prototype** | Interface and safety gates work; religious content may be unavailable. Deployed privately with gated content. | 8 September 2026 (private test build) |
| **B. Usable religious pilot** | A family can complete the reviewed required Vinayaka Chavithi puja end to end, in simple language, with Telugu instructions. | Gated on religious review — no fixed date |

The festival is 14 September 2026. Milestone A should be usable before then;
milestone B is what a family actually worships with.

## Product language rule

Every screen must be understandable to a person performing puja for the first time.

- Use short sentences and familiar words.
- Explain every Sanskrit or ritual term immediately.
- Tell the user what to do before explaining why.
- Never use fear, blame, or language suggesting that a sincere beginner has failed.
- Never guess Gotra, Veda, Sutra, lineage, mantra, or ritual rules.
- Clearly label textual verification, priest-reviewed practice, regional custom,
  and pending review, and keep practical guidance separate from all of them.

## Status — milestone A (technical prototype)

Done (through commit `62f5763`):

- Mobile-first home, participants, preparation, guided-puja shell, completion.
- Participant modes: only me / my family / students or friends.
- Per participant: name plus Gotra, Veda, Sutra, Sampradaya, each KNOWN /
  UNKNOWN / UNSURE; name only when KNOWN; no inference from surname, caste,
  language, region, or location.
- Validation enforced at every entry to preparation and on start of the puja.
- "Only me" keeps the other profiles instead of deleting them.
- Materials checklist with factual descriptions, neutral category language, a
  draft disclaimer, per-item review status, and provenance fields.
- Patri section: awaiting-review notice, strengthened safety note, and a
  HAVE / NONE / UNSURE self-report. No leaf names.
- Content gate hides any religious claim without a recorded reviewer.
- Local save/restore of mode, participants, materials, patri answer, and step
  number; defensive parsing; legacy named-leaf data dropped.
- Festival date, location, and countdown labelled pilot data; countdown computed
  from a configured date.
- Language toggle removed; static "Telugu version is being prepared" note.
- Audio button disabled and labelled unavailable.
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` pass; journey
  and gate covered by tests.

Open for milestone A:

| Task | Status |
| --- | --- |
| Completion screen says "Prototype Walkthrough Completed", not "Puja Completed" | Not started |
| Confirmation before "Start again" clears saved progress | Not started |
| Private deployment target, not publicly indexed | Not started |
| Problem-report path that never edits canonical content automatically | Not started — needs a decision on the mechanism |
| Manual mobile + desktop, keyboard, and contrast pass recorded | Not started |

## Status — milestone B (usable religious pilot)

| Task | Status |
| --- | --- |
| Split content model into `ContentKind` (`PRACTICAL_GUIDANCE` / `RELIGIOUS_CLAIM`) and `ReligiousReviewStatus` (four values); remove `GENERAL_GUIDANCE` as a fifth status | Not started |
| Make the release gate status-dependent: `VERIFIED` needs a written source and exact reference; `PRIEST_REVIEWED_PRACTICE` does not | Not started |
| Implement resume: guided puja resumes from the saved step; "Start again" is a separate, confirmed action | Not started — current build saves the step number but resets it to zero on start |
| Simple Telugu instructions for every shown step | Not started — content and reviewer needed |
| Reviewed guided-puja steps (what / how / why + approved wording) | Blocked on religious review |
| Reviewed Sankalpam wording for individual, family, and group | Blocked on religious review |
| Reviewed closing prayer and aarti wording | Blocked on religious review |
| Materials: required / optional / tradition-specific classification | Blocked on religious review |
| Durva grass ritual role | Blocked on religious review |
| 21-patri list, textual source, and botanical identification | Blocked on religious review |
| Flowers / akshata fallback, released only as labelled `PRIEST_REVIEWED_PRACTICE` if no written source | Blocked on religious review |
| Vinayaka Chavithi date for the pilot location, timezone basis, and verifier | Blocked on religious / calculation review |
| Reviewed Telugu pronunciation audio where recorded | Blocked on recording; text-with-unavailable-audio is an acceptable fallback |
| Test: no unknown or unsure lineage value ever enters Sankalpam | Not started — needs the reviewed Sankalpam first |
| Test: a canonical passage cannot be altered by explanation, translation, or transliteration | Not started — needs canonical content first |

## Governance dependencies

Milestone B cannot complete without:

- A named Telugu household-practice priest or Pandit to review the procedure,
  Sankalpam, mantras, materials, patri, and fallbacks.
- A recorded review workflow that captures reviewer name, qualification, review
  date, decision, content version, and scope for each exact statement.
- A named checker for the pilot festival date and its timezone basis.

Software engineers do not resolve these religious questions.

## Release boundary

The interface and workflow may be deployed privately as milestone A after the
milestone A blockers and acceptance criteria are met. Mantras, Sankalpam
wording, ritual requirements, substitutions, and calendar values require the
separate religious-content approval gate and belong to milestone B.

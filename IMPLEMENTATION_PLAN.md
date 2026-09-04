# VedaSaarathi Vinayaka Chavithi Pilot — Implementation Plan

Dated execution plan and task status. Scope and acceptance live in
[docs/VINAYAKA_V1_SCOPE.md](./docs/VINAYAKA_V1_SCOPE.md); direction lives in
[docs/VISION.md](./docs/VISION.md); everyday rules live in
[docs/PRODUCT_PRINCIPLES.md](./docs/PRODUCT_PRINCIPLES.md). Where this plan and the
scope document disagree, the scope document wins and this plan is corrected.

**Last updated:** 4 September 2026.

## Platform architecture

VedaSaarathi is a platform for guided puja services. Vinayaka Chavithi is its
first puja service, not the whole product. The codebase reflects this split:

- `lib/puja/types.ts` defines the generic `PujaDefinition` shape (id, slug,
  display names, description, availability, materials, patri, guided steps,
  language support, metadata) that any puja service must provide.
- `lib/puja/catalogue.ts` lists every puja service the platform knows about.
  Vinayaka Chavithi is the only available entry; the catalogue shows "More
  pujas will be added" rather than inventing a placeholder future puja.
- `lib/pujas/vinayaka/service.ts` is the Vinayaka Chavithi service module: the
  one place that adapts Vinayaka's own content
  (`lib/content/{steps,materials,leaves,festival}.ts`) into a `PujaDefinition`.
- Platform screens (`components/platform/*`, and `app/page.tsx` as the
  application coordinator) read puja content only through that generic
  `PujaDefinition` object - never Vinayaka's `RITUAL_STEPS`, `MATERIALS`,
  patri constants, or `PILOT_FESTIVAL` directly. `app/page.tsx` wires the
  platform screens together and holds no ritual content of its own.
- Presentation has two device-local modes (`lib/storage/presentation-mode.ts`):
  `FAMILY_BETA` (the default - one app-level beta notice, no repeated
  review-status chips or "private review candidate" banners through the
  worship flow) and `REVIEWER` (an obvious, device-only entry point for
  invited priests - review status, source/provenance, and draft warnings
  shown throughout). Switching modes never changes a reviewStatus, a
  provenance record, or `canDisplayAsGuidance`'s decision - it only changes
  which chrome is shown. `NEXT_PUBLIC_REVIEW_MODE` is retired in favor of this
  device-local, user-switchable mode.

## Reconciliation status

Work is being reconciled on `vinayaka-end-to-end-review`, based on GitHub commit
`77e075e`. It combines the hardened six-step prototype with the separately built
end-to-end review journey. The private Site is a reviewer preview, not approved
religious guidance and not the public product.

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

Done in the reconciled review branch:

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
- Simple and complete paths are available for private content review; the
  complete path contains 20 candidate steps.
- English and Telugu beginner instructions can be compared in explicit review
  mode. They remain draft content, not approved guidance.
- Device text-to-speech can narrate visible review content for pronunciation
  comparison. It is not canonical audio and is never described as verified.
- Household immersion safety guidance and a draft Udvasana review point are
  separated so practical safety can display without releasing the ritual claim.
- Platform/service split: a generic `PujaDefinition` model and catalogue
  (Vinayaka Chavithi is the first and only available service), a "Pujas"
  destination reachable from Home and bottom navigation
  (catalogue → puja details → people → preparation → guided puja), and
  `app/page.tsx` reduced to an application coordinator over
  `components/platform/*` screens. Location, participant, preparation, and
  voice-preference data are unchanged and keep working across the split.
- Review mode is controlled by the device-local presentation mode (FAMILY_BETA
  / REVIEWER, see "Platform architecture" above) and defaults to FAMILY_BETA.
  In FAMILY_BETA, unapproved ritual instructions remain hidden the same as
  before.
- `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` pass; journey
  and gate covered by tests.

Open for milestone A:

| Task | Status |
| --- | --- |
| Completion screen says "Prototype Walkthrough Completed", not "Puja Completed" | Done |
| Confirmation before "Start again" clears saved progress | Done (`requestReset`) |
| Private deployment target, not publicly indexed | Existing owner-only preview; reconciled build pending validation and replacement |
| Problem-report path that never edits canonical content automatically | Not started — needs a decision on the mechanism |
| Manual mobile + desktop, keyboard, and contrast pass recorded | Not started |
| Dead/simulated controls (location, calendar) either wired or clearly disabled | Done |
| Telugu text carries `lang="te"` for screen readers | Done |

## Status — milestone B (usable religious pilot)

| Task | Status |
| --- | --- |
| Split content model into `ContentKind` (`PRACTICAL_GUIDANCE` / `RELIGIOUS_CLAIM`) and `ReligiousReviewStatus` (four values); remove `GENERAL_GUIDANCE` as a fifth status | Not started |
| Make the release gate status-dependent: `VERIFIED` needs a written source and exact reference; `PRIEST_REVIEWED_PRACTICE` does not | Done with status-specific provenance tests |
| Implement resume: guided puja resumes from the saved step; "Start again" is a separate, confirmed action | Not started — current build saves the step number but resets it to zero on start |
| Simple Telugu instructions for every shown step | Draft candidates available in private review mode; approval still required |
| Reviewed guided-puja steps (what / how / why + approved wording) | Blocked on religious review |
| Reviewed Sankalpam wording for individual, family, and group | Blocked on religious review |
| Reviewed closing prayer and aarti wording | Blocked on religious review |
| Materials: required / optional / tradition-specific classification | Blocked on religious review |
| Durva grass ritual role | Blocked on religious review |
| 21-patri list, textual source, and botanical identification | Blocked on religious review |
| Flowers / akshata fallback, released only as labelled `PRIEST_REVIEWED_PRACTICE` if no written source | Blocked on religious review |
| Vinayaka Chavithi date for the pilot location, timezone basis, and verifier | Blocked on religious / calculation review |
| Reviewed Telugu pronunciation audio where recorded | Browser narration is available only as a review aid; approved audio remains pending |
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

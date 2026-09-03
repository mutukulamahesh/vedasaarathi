# Vinayaka Chavithi Pilot (v1) — Scope

The first VedaSaarathi release. It is deliberately narrow: one festival, one
tradition, one country, one device. See [VISION.md](./VISION.md) for the whole
platform and [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md) for the rules
behind these choices. The dated task list lives in
[../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md).

- **Audience:** Telugu household practice, users in the United States, performing
  as an individual, as a family, or as a student or friend group.
- **Today's status:** the front-end journey exists and is stored on the device
  only. No sacred content has been reviewed, so no reviewed guidance is shown.

## Two milestones, two release gates

| Milestone | Meaning | Target |
| --- | --- | --- |
| **A. Technical prototype** | The interface and the safety gates work. Religious content may still be unavailable. May be deployed privately with gated content. | 8 September 2026 (private test build) |
| **B. Usable religious pilot** | A real family can complete the reviewed required Vinayaka Chavithi puja from beginning to end, in simple language, with Telugu instructions. | When religious review is complete — no fixed date |

A technically safe empty shell is **not** a production Vinayaka Chavithi puja.
The festival is 14 September 2026; milestone A should be usable before then, but
milestone B is what a family actually worships with.

---

## Included in the September pilot (milestone A)

**Home**

- Mobile-first phone-style layout that also works on tablet and desktop.
- A personalized home screen with an upcoming Vinayaka Chavithi card.
- Location, today's date, festival date, and the countdown, all shown as
  **pilot data**. The countdown is calculated from a configured festival date.
- Panchanga values (Tithi, Nakshatra, sunrise, sunset) shown only as
  "being verified" — never a guessed value.
- A note that a Telugu version is being prepared (until milestone B).

**Participants**

- Three modes: only me, my family, students or friends performing together.
- Each participant has a name plus four tradition fields: Gotra, Veda, Sutra,
  Sampradaya.
- Each tradition field is KNOWN, UNKNOWN, or UNSURE. A name is entered only when
  the field is KNOWN.
- Switching to "only me" keeps the other profiles; it does not delete them.
- Validation: a participant name is required; a tradition name is required only
  when its field is KNOWN; UNKNOWN and UNSURE never block progress.
- The name check is enforced at every entry to preparation and again when the
  guided puja starts.
- No tradition value is ever inferred from a surname, caste, language, region, or
  location.

**Preparation**

- A materials checklist. Each item shows a plain factual description, an
  availability toggle, a neutral category label, and its review status.
- A draft disclaimer stating that whether an item is religiously required has not
  been decided by a reviewer.
- Missing materials are summarised but never block the walkthrough.
- A patri (leaves) section with: the awaiting-review notice, a safety warning
  against unknown, unsafe, or kitchen-herb substitutes, and a self-report choice
  (I have some traditional patri / I do not have patri / I am not sure what these
  leaves are). No leaf names are listed.

**Guided puja shell**

- A six-step guided flow, each step written as what to do, how to do it, and why
  we do it, with traditional words explained in plain language.
- Previous and next navigation.
- A "Why do we do this?" disclosure on steps that are shown.
- Steps that need canonical wording (Sankalpam, closing prayer) are locked and
  clearly marked as awaiting review.
- A content gate decides what is shown (see "Content model" below).
- The audio button is present but disabled, labelled "Audio guidance is not
  available yet".
- A completion screen. For milestone A it must say **"Prototype Walkthrough
  Completed"**, not "Puja Completed".

**Storage**

- Mode, participants, materials, the patri answer, and the current step are saved
  in the browser on the device only.
- Loading is defensive: damaged or outdated saved data falls back to a clean
  state. Old named-leaf data is dropped, not migrated.

**Engineering**

- Religious and ritual content lives in typed modules under `lib/content/`,
  separate from the UI.
- `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` all pass.
- An automated test suite covers the participant and preparation journey and the
  content gate.

---

## Required for the usable religious pilot (milestone B)

These are in scope for the pilot as a whole. They are not required for the
milestone A private test build.

- **Simple Telugu instructions** for every shown step, alongside simple English.
  English is required at both milestones; Telugu instructions are required for
  milestone B.
- **Approved guided puja content:** every *required* ritual step has approved
  guidance, and every *required* canonical passage has passed review.
- **Reviewed Sankalpam** wording for individual, family, and group, including how
  it omits an unknown or unsure field.
- **Resume:** the guided puja resumes from the saved step; "Start again" is a
  separate choice; clearing existing progress is confirmed first.
- **Reviewed pronunciation audio** where it has been recorded. If recording
  cannot be completed in time, milestone B may ship with reviewed text and audio
  clearly marked unavailable — but the *text* and *steps* must be reviewed.
- **Completion wording** switches to "Puja Completed" only when the approved
  required journey was available end to end.

---

## Excluded from the pilot entirely

Real platform features, not in this release at either milestone.

- Kriya (action) animations.
- Device location permission, manual location entry, and a location picker.
- Real calculated Panchanga (Tithi, Nakshatra, sunrise, sunset).
- The monthly festival calendar and the "why dates differ by location" screen.
- Full bilingual coverage across the whole platform (only the guided journey is
  bilingual for the pilot).
- Any second festival, tradition, region, or Sampradaya.
- Accounts, sign-in, cloud sync, and any server or database.
- Verified question-and-answer / knowledge base.
- "Save family notes" at the end of the journey.
- Any donation or Hundi mechanism.
- A separate children's explanation mode beyond the plain language already used.
- Analytics or usage tracking.

---

## Content model

Two independent fields, not one list:

- `ContentKind` is `PRACTICAL_GUIDANCE` or `RELIGIOUS_CLAIM`.
- `ReligiousReviewStatus` (`VERIFIED`, `PRIEST_REVIEWED_PRACTICE`,
  `REGIONAL_CUSTOM`, `REVIEW_REQUIRED`) applies **only** to a `RELIGIOUS_CLAIM`.

`PRACTICAL_GUIDANCE` (sit comfortably, keep the flame away from children) carries
no review status and may be shown. A `RELIGIOUS_CLAIM` starts at
`REVIEW_REQUIRED` and shows only the awaiting-review notice until it is approved.
"Light the lamp as the first step of the puja" is a `RELIGIOUS_CLAIM`, even
though the safety of lighting a lamp is practical guidance.

> **Code note:** the current build uses a single five-value `ReviewStatus`
> enum including `GENERAL_GUIDANCE`. Milestone B requires the two-field model
> above so a religious instruction can never be released by labelling it as
> general guidance. Tracked in `IMPLEMENTATION_PLAN.md`.

### Minimum evidence by status

Before a `RELIGIOUS_CLAIM` is shown as guidance:

| Status | Required evidence |
| --- | --- |
| `VERIFIED` | Written source, exact reference, edition where relevant, reviewer, reviewer qualification, review date, content version, tradition and regional scope |
| `PRIEST_REVIEWED_PRACTICE` | Exact approved statement, named priest, qualification, review date, content version, tradition scope. A written source may be pending. |
| `REGIONAL_CUSTOM` | Region or community scope, named knowledgeable reviewer, review date, content version, and evidence the practice is followed there |
| `REVIEW_REQUIRED` | Never displayed as guidance |

> **Code note:** the current gate releases content on a reviewer name and date
> alone. Milestone B requires the status-dependent rules above: `VERIFIED` needs
> a written source and exact reference; `PRIEST_REVIEWED_PRACTICE` does not.

---

## Religious-review blockers

None of the following may be shown as guidance until the evidence in the table
above is recorded for the exact statement:

- Sankalpam wording for individual, family, and group, and how it omits an
  unknown or unsure field.
- Any step mantra, and its approved edition.
- The closing prayer and mangala harati (aarti) wording.
- The offering-sequence steps ("offer what you have", "Naivedyam") as reviewed
  ritual guidance rather than plain description.
- Which materials are required, optional, or tradition-specific for Telugu
  Vinayaka Chavithi.
- The ritual role of durva grass.
- The 21-patri list and its written or textual source, and botanical
  identification guidance.
- Flowers or akshata as an approved substitute for patri. If a priest approves it
  without a confirmed written source, it may be released only as labelled
  `PRIEST_REVIEWED_PRACTICE`, never as verified scripture and never as a claim of
  equal ritual effect.
- The Vinayaka Chavithi date used for the pilot location, its timezone basis, and
  who verified it.
- Any real Panchanga value, if the pilot is ever to show one.
- Prana Pratishtha, Udvasana, and Visarjana scope for household beginners, and
  what a layperson should not attempt without a qualified priest.

Until these are cleared, the guided puja shows mostly awaiting-review notices.
That is acceptable for **milestone A** and not acceptable for **milestone B**.

---

## Technical-release blockers (milestone A)

All must be true before the private test build is deployed:

- `npm run build` passes on the deployed commit.
- `npm run typecheck` (`tsc --noEmit`) is clean.
- `npm test` passes (build + typecheck + `node --test`).
- `npm run lint` is clean.
- Tests prove the content gate never displays an unreviewed `RELIGIOUS_CLAIM` as
  guidance.
- Tests prove no lineage value is inferred, and UNKNOWN and UNSURE are preserved
  exactly, including after a save-and-reload.
- Saved-progress parsing is tested against damaged and outdated data.
- The journey is tested for: first-time beginner; individual; family; student or
  friend group; KNOWN, UNKNOWN, and UNSURE for each field; partial information;
  missing materials; saved progress; and the validation gate on entry to
  preparation and on start.
- Mobile and desktop layouts are checked by hand.
- Keyboard navigation works and every control has an accessible name.
- Text is large enough and has enough contrast for an elderly user.
- No secret, credential, or private contact detail is in source, fixtures, or
  logs.
- No personal, location, family, or tradition data is written to logs or URLs.
- The deployment is private and not publicly indexed.
- There is a way to collect problem reports that does not change canonical
  content automatically.
- The completion screen says "Prototype Walkthrough Completed".

## Additional blockers for the usable religious pilot (milestone B)

- Every required ritual step has approved guidance; every required canonical
  passage has passed review, with evidence recorded per the table above.
- Simple Telugu instructions are present for every shown step.
- Resume works: the puja resumes from the saved step; "Start again" is separate;
  clearing progress is confirmed. This behaviour is tested.
- Reviewed Sankalpam wording is in place for individual, family, and group, and a
  test asserts no unknown or unsure lineage value is ever inserted into it.
- A test asserts a canonical passage cannot be altered by an explanation,
  translation, or transliteration feature.
- Reviewed audio is present where recorded; where not, audio is clearly marked
  unavailable and is never simulated.
- The completion screen says "Puja Completed" only after the approved required
  journey was available end to end.

---

## Acceptance criteria

### Milestone A — technical prototype

A reviewer can confirm each of these by using the app:

1. A first-time user can go from the home screen to the completion screen without
   getting stuck.
2. A user who selects UNKNOWN or UNSURE for every tradition field can still
   complete the whole walkthrough.
3. Trying to reach preparation or start the puja with a blank participant name
   sends the user to the People screen with a clear message, not into the puja.
4. Switching from "my family" to "only me" and back shows the original family
   profiles again.
5. No screen ever shows a Gotra, Veda, Sutra, Sampradaya, mantra, citation, or
   ritual rule that the user did not enter.
6. Every material shows its review status. A `RELIGIOUS_CLAIM` awaiting review
   shows the awaiting-review notice instead of instructions.
7. The patri section shows no leaf names, shows the safety warning, and lets the
   user pick exactly one of the three self-report options.
8. Every guided-puja step that is shown has a what, a how, and a why, and every
   traditional word in it is explained in plain language.
9. Locked steps clearly say the wording and audio are held back for review.
10. The audio button is visibly disabled and labelled as not available.
11. Closing the browser and returning restores the mode, participants, materials,
    and patri answer. (Resume of the current step is a milestone B criterion.)
12. "Start again" clears saved progress after a confirmation.
13. The location, today's date, festival date, and countdown are all labelled as
    pilot data, and the countdown matches the configured festival date.
14. The app is usable one-handed on a phone and also works on a desktop width.
15. The completion screen says "Prototype Walkthrough Completed".
16. `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` all pass.

### Milestone B — usable religious pilot

All of milestone A, plus:

17. A family can complete every required step of the reviewed Vinayaka Chavithi
    puja from beginning to end, with nothing required left as an awaiting-review
    notice.
18. Every shown step has simple Telugu instructions as well as simple English.
19. The guided puja resumes from the step where the user left off; "Start again"
    is a separate, confirmed action.
20. Sankalpam is shown from reviewed wording, and never contains a lineage value
    the user did not enter.
21. Every religious claim shown as guidance has evidence recorded that meets its
    status row in the minimum-evidence table.
22. The completion screen says "Puja Completed" only because the approved
    required journey was available end to end.

---

## Definition of production-ready

Two separate definitions, one per milestone.

**Milestone A — technical prototype — is production-ready when:**

- Every milestone A technical-release blocker is cleared.
- Every milestone A acceptance criterion passes, checked on a phone and a desktop.
- `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` pass on
  the exact commit being deployed.
- The deployment is private, not publicly indexed, with a problem-report path
  that never edits canonical content on its own.
- The interface is honest everywhere about what has not been reviewed: the
  completion screen says "Prototype Walkthrough Completed", and every
  unreviewed `RELIGIOUS_CLAIM` shows the awaiting-review notice and nothing more.

**Milestone B — the usable religious pilot — is production-ready when:**

- Milestone A is production-ready.
- Every milestone B additional blocker and acceptance criterion is met.
- Every *required* ritual step has approved guidance and every *required*
  canonical passage has passed review, with evidence recorded per the
  minimum-evidence table.
- Simple Telugu instructions are present for every shown step.
- A named reviewer (priest or scholar) has signed off in writing that no
  canonical mantra, no Sankalpam wording, no lineage value, and no citation has
  been invented, completed, corrected, or altered anywhere in the release.

A family is only handed the app once milestone B is production-ready.

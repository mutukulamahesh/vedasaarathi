# Vinayaka Chavithi Pilot (v1) — Scope

The first VedaSaarathi release. It is deliberately narrow: one festival, one
tradition, one country, one device. See [VISION.md](./VISION.md) for the whole
platform and [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md) for the rules
behind these choices.

- **Goal:** a private production pilot that a small number of real families can
  use for Vinayaka Chavithi.
- **Target date:** 8 September 2026. The festival is 14 September 2026, so the
  pilot must be usable about a week before.
- **Audience:** Telugu household practice, users in the United States, performing
  as an individual, as a family, or as a student or friend group.
- **Today's status:** the front-end journey exists and is stored on the device
  only. No sacred content has been reviewed, so no reviewed guidance is shown.

---

## Included in the September pilot

**Home**

- Mobile-first phone-style layout that also works on tablet and desktop.
- A personalized home screen with an upcoming Vinayaka Chavithi card.
- Location, today's date, festival date, and the countdown, all shown as
  **pilot data**. The countdown is calculated from a configured festival date.
- Panchanga values (Tithi, Nakshatra, sunrise, sunset) shown only as
  "being verified" — never a guessed value.
- A static note that a Telugu version is being prepared.

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
- Missing materials are summarised but never block the puja.
- A patri (leaves) section with: the awaiting-review notice, a safety warning
  against unknown, unsafe, or kitchen-herb substitutes, and a self-report choice
  (I have some traditional patri / I do not have patri / I am not sure what these
  leaves are). No leaf names are listed.

**Guided puja**

- A six-step guided flow, each step written as what to do, how to do it, and why
  we do it, with traditional words explained in plain language.
- Previous and next navigation; the current step is saved so the user can resume.
- A "Why do we do this?" disclosure on steps that are shown.
- Steps that need canonical wording (Sankalpam, closing prayer) are locked and
  clearly marked as awaiting review.
- A content gate decides what is shown: practical, non-religious steps are shown;
  any religious claim without a recorded reviewer shows the awaiting-review
  notice and nothing else.
- The audio button is present but disabled, labelled "Audio guidance is not
  available yet".
- A completion screen, and a "start again" action that clears saved progress.

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

## Excluded from the pilot

These are real platform features. They are simply not in the September release.

- A working Telugu translation and a language switch. (English only; a
  "being prepared" note is shown.)
- Audio guidance. (Button disabled.)
- Kriya (action) animations.
- Device location permission, manual location entry, and a location picker.
- Real calculated Panchanga (Tithi, Nakshatra, sunrise, sunset).
- The monthly festival calendar and the "why dates differ by location" screen.
- Any second festival, tradition, region, or Sampradaya.
- Accounts, sign-in, cloud sync, and any server or database.
- Verified question-and-answer / knowledge base.
- "Save family notes" at the end of the journey.
- Any donation or Hundi mechanism.
- A separate children's explanation mode beyond the plain language already used.
- Analytics or usage tracking.
- Any canonical mantra text, Sankalpam wording, or audio.
- A named 21-leaf (patri) list.

---

## Religious-review blockers

None of the following may be shown as guidance until a named reviewer, that
reviewer's qualification, a review date, and a source are recorded for the exact
statement:

- Sankalpam wording for individual, family, and group, and how it omits an
  unknown or unsure field.
- Any step mantra.
- The closing prayer and mangala harati (aarti) wording.
- The offering-sequence steps ("offer what you have", "Naivedyam") as reviewed
  ritual guidance rather than plain description.
- Which materials are actually required, optional, or tradition-specific for
  Telugu Vinayaka Chavithi.
- The ritual role of durva grass.
- The patri list and its written or textual source.
- Flowers or akshata as an approved substitute for patri (which priest, which
  source, which exact statement).
- The Vinayaka Chavithi date used for the pilot location, its timezone basis, and
  who verified it.
- Any real Panchanga value, if the pilot is to show one.

Until these are cleared, the guided puja will show mostly awaiting-review
notices. Whether that is an acceptable pilot is an open product decision (see the
review report accompanying these documents).

---

## Technical-release blockers

All must be true before the pilot goes to real families:

- `npm run build` passes on the pushed commit.
- `npm run typecheck` (`tsc --noEmit`) is clean.
- `npm test` passes (build + typecheck + `node --test`).
- `npm run lint` is clean.
- Tests prove the content gate never displays an unreviewed religious claim as
  guidance.
- Tests prove no lineage value is inferred, and UNKNOWN and UNSURE are preserved
  exactly, including after a save-and-reload.
- Saved-progress parsing is tested against damaged and outdated data.
- The journey is tested for: first-time beginner; individual; family; student or
  friend group; KNOWN, UNKNOWN, and UNSURE for each field; partial information;
  missing materials; saved progress and resume; and the validation gate on entry
  to preparation and on start.
- Mobile and desktop layouts are checked by hand.
- Keyboard navigation works and every control has an accessible name.
- Text is large enough and has enough contrast for an elderly user.
- No secret, credential, or private contact detail is in source, fixtures, or
  logs.
- No personal, location, family, or tradition data is written to logs or URLs.
- The deployment is private and not publicly indexed.
- There is a way to collect pilot problem reports that does not change canonical
  content automatically.

---

## Acceptance criteria

The pilot is accepted when a reviewer can confirm each of these by using the app:

1. A first-time user can go from the home screen to the completion screen without
   getting stuck.
2. A user who selects UNKNOWN or UNSURE for every tradition field can still
   complete the whole journey.
3. Trying to reach preparation or start the puja with a blank participant name
   sends the user to the People screen with a clear message, not into the puja.
4. Switching from "my family" to "only me" and back shows the original family
   profiles again.
5. No screen ever shows a Gotra, Veda, Sutra, Sampradaya, mantra, citation, or
   ritual rule that the user did not enter.
6. Every material shows its review status. Items awaiting review show the
   awaiting-review notice instead of instructions.
7. The patri section shows no leaf names, shows the safety warning, and lets the
   user pick exactly one of the three self-report options.
8. Every guided-puja step that is shown has a what, a how, and a why, and every
   traditional word in it is explained in plain language.
9. Locked steps clearly say the wording and audio are held back for review.
10. The audio button is visibly disabled and labelled as not available.
11. Closing the browser and returning restores the mode, participants, materials,
    patri answer, and current step.
12. "Start again" clears saved progress.
13. The location, today's date, festival date, and countdown are all labelled as
    pilot data, and the countdown matches the configured festival date.
14. The app is usable one-handed on a phone and also works on a desktop width.
15. `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` all pass.

---

## Definition of production-ready

The Vinayaka Chavithi pilot is production-ready when **all** of the following hold:

- Every technical-release blocker above is cleared.
- Every piece of content shown as guidance has a recorded source, reviewer,
  reviewer qualification, and review date. Everything else shows the
  awaiting-review notice and nothing more.
- All fifteen acceptance criteria pass, checked on a phone and on a desktop.
- `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` pass on the
  exact commit being deployed.
- A named reviewer (priest or scholar) has signed off in writing that no
  canonical mantra, no Sankalpam wording, no lineage value, and no citation has
  been invented, completed, corrected, or altered anywhere in the release.
- The deployment is private, and a pilot feedback path exists that never edits
  canonical content on its own.

Being "production-ready" does not require the guided puja to be fully populated
with reviewed content. A pilot in which most steps show the awaiting-review
notice can still be production-ready if everything above is true — but see the
open decision on whether that is the pilot we want to ship.

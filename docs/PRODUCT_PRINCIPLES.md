# VedaSaarathi Product Principles

Short rules for everyday decisions in product, content, design, and engineering.
They turn [VISION.md](./VISION.md) into things you can check a decision against.

These principles sit alongside the enforced rules in `.claude/rules/`
(`architecture.md`, `coding.md`, `sacred-content.md`, `security.md`,
`testing.md`). Where a principle repeats a rule, the rule wins.

How to use this file: when a choice is unclear, find the nearest principle and
follow it. If two principles seem to conflict, the trust principles in section 2
come first.

---

## 1. Product decisions

- **One journey at a time.** Finish one festival journey end to end, get it
  reviewed, and ship it before starting the next.
- **Missing knowledge and missing materials are handled with care, not covered
  up.** Unknown lineage never blocks a general approved path. A missing material
  shows an approved alternative when one exists; when none exists, the app says so
  plainly and offers only the next reviewed option. It never invents a fallback.
- **Missing reviewed religious content can legitimately stop the app** from
  claiming the puja is complete. Say "Prototype Walkthrough Completed", not "Puja
  Completed", when required approved steps were unavailable.
- **Two pilot milestones, two gates.** The *technical prototype* (interface and
  safety gates work; religious content may be unavailable) and the *usable
  religious pilot* (a family can complete the reviewed required puja end to end)
  are released separately. A safe empty shell is not a production puja.
- **Serve the least-prepared person first.** If a screen works for a nervous
  first-timer who knows nothing about their lineage, it will work for everyone.
- **No feature that needs invented sacred content.** If a feature can only work by
  guessing a mantra, a lineage, or a rule, it is not built.
- **Free at the point of worship.** No paywall, no upsell, no donation prompt
  inside a puja. A voluntary Hundi, if it exists, lives outside the worship flow.
- **No fear, no pressure.** No astrology predictions, no "bad things happen if you
  skip this", no paid remedies.
- **Pilot scope is a contract.** Adding to the pilot means removing something
  else or moving the date. See [VINAYAKA_V1_SCOPE.md](./VINAYAKA_V1_SCOPE.md).

## 2. Content and sacred material

- **Content kind and review status are two separate fields.**
  - `ContentKind` is `PRACTICAL_GUIDANCE` or `RELIGIOUS_CLAIM`.
  - `ReligiousReviewStatus` is `VERIFIED`, `PRIEST_REVIEWED_PRACTICE`,
    `REGIONAL_CUSTOM`, or `REVIEW_REQUIRED` — and applies **only** to a
    `RELIGIOUS_CLAIM`.
  - `PRACTICAL_GUIDANCE` (comfort, logistics, fire safety) carries no review
    status. A `RELIGIOUS_CLAIM` always carries one and starts at
    `REVIEW_REQUIRED`. A religious instruction is never released by relabelling it
    as practical help.
- **Reviewed or not shown.** A `RELIGIOUS_CLAIM` that is `REVIEW_REQUIRED` appears
  only as "This section is awaiting religious review. No recommendation is
  available yet."
- **Minimum evidence depends on status.** Before a `RELIGIOUS_CLAIM` displays as
  guidance:

  | Status | Required evidence |
  | --- | --- |
  | `VERIFIED` | Written source, exact reference, edition where relevant, reviewer, qualification, date, version, tradition and regional scope |
  | `PRIEST_REVIEWED_PRACTICE` | Exact approved statement, named priest, qualification, review date, version, tradition scope. Written source may be pending. |
  | `REGIONAL_CUSTOM` | Region or community scope, named knowledgeable reviewer, date, version, evidence the practice is followed there |
  | `REVIEW_REQUIRED` | Never displayed as guidance |

  Reviewer name and date alone are **not** enough to release `VERIFIED` content,
  and a missing written source does **not** block `PRIEST_REVIEWED_PRACTICE`.
- **Never generate, complete, correct, or paraphrase a canonical mantra.**
- **Never invent** Gotra, Pravara, Veda, Shakha, Sutra, Sampradaya, lineage,
  ritual rules, or citations.
- **Unknown stays unknown.** Preserve KNOWN, UNKNOWN, and UNSURE exactly. Never
  fill a blank from a surname, caste, language, region, or location.
- **Keep layers separate.** Canonical text, transliteration, translation,
  plain-language explanation, and any AI-assisted help are separate fields and
  separate on screen.
- **Authority levels are distinct.** Textual verification, priest-reviewed
  practice, and regional or family custom are labelled differently and never
  merged or shown as equivalent.
- **Keep disagreements.** When sources differ, show the alternatives; do not pick
  one silently.
- **Alternatives for missing items must be documented or priest-reviewed**, and
  must state their authority level. The 21-patri fallback (flowers or akshata),
  if a priest approves it without a confirmed written source, is released only as
  labelled `PRIEST_REVIEWED_PRACTICE` — never as verified scripture, never as a
  claim of equal ritual effect.

## 3. Language and tone

- **Write for a first-time performer.** Short sentences. Familiar words.
- **What, then how, then why.** Tell the user what to do before explaining why.
- **Explain every traditional word the first time it appears**, in one plain
  sentence (for example: "Naivedyam means food offered to God before it is
  shared as prasadam").
- **No blame.** Never suggest a sincere beginner has failed or sinned.
- **Say what is unknown plainly.** "We do not know this yet" is a complete,
  acceptable answer.
- **Simple English is required; simple Telugu instructions are required for the
  usable religious pilot.** Many intended users follow conversational Telugu more
  easily than formal English or Sanskrit. Other languages come by review, never
  by machine translation of sacred content.
- **Do not simulate what is missing.** If reviewed audio is not recorded, show
  reviewed text and mark audio as unavailable. Do not fake playback.

## 4. Design and accessibility

- **Mobile-first**, and usable on tablet and desktop.
- **One clear action per screen.** The primary next step is obvious.
- **Readable by default.** Large enough text, strong contrast, calm spacing;
  comfortable for elderly users.
- **Full keyboard support and correct labels** on every interactive element.
- **Handle every state:** loading, empty, error, and saved-progress.
- **Never fill a gap with invented data** to make the UI look complete. Show the
  honest empty or "being verified" state instead.
- **Show provenance near the content**, not hidden behind a separate screen.

## 5. Engineering and architecture

- **Keep religious content out of UI and application logic.** It lives in typed
  content modules (today: `lib/content/`).
- **Structured data, not prose parsing.** Steps, sources, reviewer status,
  language, and tradition are typed fields.
- **Strict, explicit TypeScript.** Make units, timezones, locales, and nullable
  values explicit.
- **Dates and times carry metadata.** Any location-based date or time includes
  its timezone and its calculation or source. A bare date is pilot placeholder
  data and is labelled as such.
- **Deterministic and testable.** Fix clocks, fixtures, and provider versions in
  tests. No hidden timezone or location assumptions.
- **A regression test for every corrected calculation or content-handling bug.**
- **Reuse existing components and dependencies** before adding new ones.
- **The release gate is code, not a checklist.** One function decides whether a
  piece of content may be shown as guidance. It takes the content kind and, for a
  religious claim, the review status and provenance, and it applies the
  status-dependent evidence rules in section 2. It is the single source of truth
  and it is tested.
- **Displaying unverified sacred content as approved is a release-blocking
  defect.**
- **Resume is a required behaviour.** Saving the current step is not enough; the
  guided puja must resume from the saved step, "Start again" must be a separate
  choice, and clearing existing progress is confirmed first.
- **The completion screen states the truth.** It says "Puja Completed" only when
  the approved required journey was available; otherwise "Prototype Walkthrough
  Completed".

## 6. Data and privacy

- **Collect the minimum.** Only what the current feature needs, and say why it is
  needed.
- **Treat coordinates, timezone, account details, family details, and tradition
  details as sensitive.**
- **Ask before using device location.** Always offer manual location entry.
- **Never put personal, location, family, or tradition data in logs or URLs.**
- **Validate all user input at every boundary** (client now; client and server
  once a server exists).
- **Local-first for the pilot.** Preparation and participant progress are stored
  on the device only.
- **No secrets in source, logs, fixtures, or generated docs.**
- **Do not send user data or sacred-source data to an external AI service without
  explicit, recorded approval.**

## 7. Money and trust

- **Worship guidance is free.**
- **Any donation is voluntary, external to worship, and never nudged.**
- **No advertising inside the product.**
- **No "premium" sacred content.** Reviewed content is available to everyone or
  to no one.

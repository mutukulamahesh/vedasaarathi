# VedaSaarathi

**VedaSaarathi** is a trusted, location-aware companion that helps Hindu
households understand, prepare for, and perform verified pujas in simple
language — without guessing a family's tradition or presenting unreviewed
religious content as approved guidance.

It connects verified calendar information (Panchanga), family/tradition
context, preparation checklists, and a step-by-step guided puja into one
honest, device-local journey. **VedaSaarathi is the platform; Vinayaka
Chavithi (Ganesha Chaturthi) is its first puja service.**

VedaSaarathi is a project by **ASCOR LABS**, and its guidance is free to use.
Living away from home can make simple questions hard — what is today's tithi,
when is the next festival where I live, how can my family prepare for a puja —
so it brings these together in simple English and Telugu, using the selected
location.

> **Status: private pilot, not publicly deployed.** Everything lives on the
> device only — no account, no server database, nothing sent anywhere. Sacred
> content is labelled `VERIFIED`, `PRIEST_REVIEWED_PRACTICE`,
> `REGIONAL_CUSTOM`, or `REVIEW_REQUIRED` per source; unreviewed material never
> renders as approved guidance to a family. See
> [docs/VINAYAKA_V1_SCOPE.md](./docs/VINAYAKA_V1_SCOPE.md) for the current
> pilot contract and [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for
> dated task status.

## What's in the pilot

- **Home** — today's Panchanga for the saved location (Tithi, Nakshatra,
  sunrise/sunset), general traditional daily timings (Abhijit Muhurta as a
  useful period; Rahu Kalam / Yamaganda / Gulika Kalam to avoid — explicitly
  *not* personalised astrology), and a countdown to the next Vinayaka
  Chavithi.
- **Monthly Hindu calendar** — a full month grid with per-day Panchanga and
  validated festival dates, computed progressively on-device (yields between
  days, cancellable, cached by engine version + location + month).
- **Local search** — deterministic, on-device search across pujas, Sankalpam,
  Panchanga, the calendar, festivals, people, and location. No internet
  search, nothing generated.
- **Participants & Sankalpam** — Individual / Family / Group setup with
  explicit `KNOWN` / `UNKNOWN` / `UNSURE` tradition fields (Gotra, Veda,
  Sutra, Sampradaya) that are never guessed from a name, region, or surname.
  The generated Sankalpam is never presented, played, or begun while a
  required choice is still pending.
- **Guided puja** — a Simple path (16 steps, ~36 min) and a Complete path (35
  steps, ~91 min), each step showing what to keep ready, what to do, the
  mantra in Telugu with an optional romanised reading, and computer-generated
  (Azure neural voice) instruction audio and Telugu mantra *pronunciation
  guides*. English and Telugu throughout.
- **Offline** — a service worker caches the app shell and every bundled audio
  clip after the first online visit, so the whole puja works with no
  connection. See [docs/OFFLINE.md](./docs/OFFLINE.md).
- **Reviewer mode** — a separate, device-local mode for invited priests that
  shows source, page/locator, review status, transcription confidence, and a
  correction workflow (Approve / Correction needed / Not applicable /
  Comment, JSON export). Families never see this chrome.
- **About** — one bilingual page reached from Home: why the app exists, what it
  does, why location matters, tradition and guidance, first-version coverage,
  AI and review limitations, how to send feedback, and the ASCOR LABS
  attribution. (A "With gratitude" section for priests appears only once
  confirmed names and consent are supplied; nothing is shown until then.)

## What V1 does and does not include

- **Includes:** location-based Panchangam and traditional daily timings, a
  monthly calendar with major festivals and a collapsed "Monthly observances"
  group (Pradosham, Masa Shivaratri, Sankashti Chaturthi), local search, the
  Vinayaka Chavithi guided puja (Simple and Complete paths), Sankalpam,
  offline use, English and Telugu.
- **Limitations:** the festival catalogue is incomplete (the Calendar says a
  month has "no major festival currently listed", not that none exists).
  Kanuma and Dhanurmasam dates are provisional and the Frisco Dhanurmasam
  difference is unresolved (explained in each Calendar's "About this
  calculation"). General morning-activity timings (including Brahma Muhurta)
  are not included. Mukkanuma, the Diwali midnight variant and further
  festivals are not built.

## AI, audio and review status

- The daily Panchangam is calculated on the device by an astronomical
  calculation engine (`mhah-panchang` plus the app's own rules). No AI chatbot
  or external AI service produces it, and no user data is sent to one.
- AI tools assisted development and some content preparation. All bundled
  audio is computer-generated (Azure neural voices, produced offline by
  `scripts/generate-audio.mjs`); Telugu mantra audio is a `REVIEW_CANDIDATE`
  pronunciation guide. AI-assisted wording, translation or pronunciation can be
  wrong.
- **No priest has approved the app as a whole.** Sourced content is shown as an
  explicitly labelled beta and is never described as verified or
  priest-approved unless its record says so.
- **Vinayaka Vrata Katha:** an original VedaSaarathi retelling in English and
  Telugu, visible in the guided puja as a `SOURCED_BETA_CANDIDATE` with
  `REVIEW_REQUIRED` status. It is not priest-reviewed and is no longer
  `WITHHELD_FOR_RIGHTS`. Section provenance (Bhagavata Purana vs traditional
  material) is recorded; traditional material is not assumed rights-cleared.

## Reporting an issue

- **Email:** the About page shows `contact.vedasarathi@gmail.com` and an
  "Email us" link (`mailto:`). The link only opens the visitor's own email app;
  they must send the message themselves. Nothing is sent by VedaSaarathi, and
  there is no feedback backend. For date or timing issues, include the city and
  date shown in the app; please do not share private family details.
- **In-puja correction form** (completion screen): saves a note **on the
  device only** and delivers nothing; the person can download the JSON and
  send it themselves.

## Clearing saved data

**About → Clear saved data on this device** removes every `vedasaarathi:`
key this browser has stored — saved location, participants/lineage, puja
progress, saved corrections, calendar cache and preferences — after an
explicit confirmation that states exactly what is (and is not) removed. It
does **not** remove a downloaded offline copy of the puja audio; that has its
own separate control (Pujas → Offline → "Remove downloaded copy"). The app
resets to a fresh state immediately afterward.

## Tech stack

- [vinext](https://github.com/cloudflare/vinext) — Next.js-compatible
  server rendering on Vite + Cloudflare Workers
- React 19, TypeScript 5 (strict), ESLint (including `react-compiler` rules)
- No client or server database — every profile and ritual record lives in the
  browser's own `localStorage`
- Node.js `>=22.13.0`, Linux with `flock`, `curl`, and GNU `timeout`
- **Deployment workflow: OpenAI Sites** (`.openai/hosting.json`, the
  `sites` Vite plugin in `build/sites-vite-plugin`). Cloudflare Workers is
  the runtime Sites builds and serves this app on — it is not a
  separately configured deployment target of its own.

## Build identification and rollback

Every production build records which source commit it was built from:
`scripts/generate-build-info.mjs` runs during `npm run build`
(`scripts/build-verified.sh`) and writes `public/build-info.json`
(`{ commit, commitShort, dirty, builtAt }`, git-ignored, regenerated fresh each
build — never hand-edited or committed). The app shows it on
**About → App build** (a short commit SHA and the build date), so a deployed
build can always be matched back to the exact commit it came from, and to
confirm two environments are actually running the same build.

**Rollback**, through the existing OpenAI Sites deployment workflow (which
runs this app on Cloudflare Workers as its runtime, not a separately
configured deployment target): identify the last known-good commit (from a
previous deploy's recorded `commitShort`, or from `git log`), check it out
(`git checkout <commit>`), run `npm run install:ci` and `npm run build`, and
redeploy through the normal Sites deploy process — this project keeps no
separate infrastructure to roll back (no database, no server-side state;
every user's data stays in their own browser). The
service worker's own cache version (`VERSION` in `public/sw.js`) is bumped by
hand whenever its caching logic changes, so a rollback that changes `sw.js`
correctly evicts the previous build's regular browsing caches on `activate`
without touching a user's explicit offline download, which is versioned and
evicted independently, by content version, only after a new download
completes successfully (see `lib/offline/download.ts`).

## Getting started

```bash
npm run install:ci   # one bounded, non-retrying `npm ci`
npm run dev           # Vite/vinext dev server
npm run build          # production build (bash scripts/build-verified.sh)
npm run start          # serve the built app (vinext start)
```

`install:ci` refuses a concurrent install for the project, prefers an
image-seeded npm cache with registry fallback, verifies the vinext tarball
recorded in `package-lock.json`, and terminates a stalled install rather than
retrying. Scripts that need a writable, project-scoped home/npm/XDG/temp
environment go through `scripts/sites-env.sh`; the generated `.sites-runtime/`
directory is disposable and git-ignored. `dev` and `start` keep Wrangler logs
inside the checkout (`WRANGLER_LOG_PATH`).

## Testing

```bash
npm test        # build + typecheck + node --test tests/*.test.mjs
npm run lint     # eslint
npm run typecheck  # tsc --noEmit
```

Browser end-to-end suites (each spawns its own dev/prod server; run
individually so failures are easy to trace):

```bash
node tests/e2e/journey.e2e.mjs             # full puja journey, EN + TE, audio
node tests/e2e/telugu-continuity.e2e.mjs   # every screen in Telugu, no stray English
node tests/e2e/calendar-search.e2e.mjs     # calendar, festivals, local search
node tests/e2e/presentation-corrections.e2e.mjs  # Passed festivals, monthly group, overlaps, cache upgrade
node tests/e2e/festival-phase1.e2e.mjs     # phase-1 festival catalogue coverage
node tests/e2e/solar-search-labels.e2e.mjs # solar-event search result labels
node tests/e2e/home-tithi-nakshatra-transitions.e2e.mjs  # Home field updates as Tithi/Nakshatra expire
node tests/e2e/amanta-adhika-display.e2e.mjs  # Amanta month / Adhika (leap) month display
node tests/e2e/about.e2e.mjs               # About page, feedback link, EN/TE, overflow
node tests/e2e/offline.e2e.mjs             # offline download + offline puja/calendar
node tests/e2e/offline-first.e2e.mjs       # first-run-offline scenarios
node tests/e2e/offline-update.e2e.mjs      # offline update check/re-download freshness, audio Range/206
node tests/e2e/panchanga-retry.e2e.mjs     # failed engine load recovers via Retry, no data lost
node tests/e2e/back-navigation.e2e.mjs     # browser Back/Forward follows in-app screen history
```

14 suites total.

`scripts/verify-panchanga.mjs` checks the Panchanga engine's evidence hash and
should be run under every timezone the app supports:

```bash
for tz in Etc/UTC Asia/Kolkata America/Chicago Pacific/Kiritimati Pacific/Pago_Pago; do
  TZ=$tz node scripts/verify-panchanga.mjs
done
```

## Project structure

- `app/page.tsx` — the application coordinator; wires platform screens
  together and holds no ritual content of its own
- `components/platform/` — screens (Home, Calendar, Search, People, Prepare,
  Sankalpam setup, guided Puja, Post-puja, Reviewer mode, Offline download,
  About, …)
- `lib/puja/` — the generic `PujaDefinition` shape and puja catalogue; every
  platform screen reads puja content only through this, never a puja's own
  constants directly
- `lib/pujas/vinayaka/` — the Vinayaka Chavithi service module, adapting its
  own content into a `PujaDefinition`
- `lib/panchanga/` — the Panchanga engine, daily-timing rules, and monthly
  calendar computation (host-timezone independent, sourced and validated —
  see `lib/panchanga/day-timings.ts` for rule provenance and limitations)
- `lib/sankalpam/` — the Sankalpam generator (Individual/Family/Group,
  bilingual, pending-choice tracking)
- `lib/content/`, `lib/audio/` — structured ritual content, sources, and the
  audio manifest (per-step instruction + mantra clips, EN/TE)
- `lib/storage/` — device-local persistence (location, participants, puja
  progress, calendar cache) with versioned schemas and migration
- `tests/` — unit tests (`*.test.mjs`) and browser E2E suites (`tests/e2e/`)
- `docs/` — product and engineering documentation (see below)
- `.claude/rules/` — enforced architecture, coding, security, testing, and
  sacred-content rules for anyone (human or AI) changing this codebase

## Documentation

| Document | What it is |
| --- | --- |
| [docs/VISION.md](./docs/VISION.md) | Long-term platform direction. Canonical. |
| [docs/PRODUCT_PRINCIPLES.md](./docs/PRODUCT_PRINCIPLES.md) | Everyday product, content, design, and engineering rules. |
| [docs/VINAYAKA_V1_SCOPE.md](./docs/VINAYAKA_V1_SCOPE.md) | The current pilot contract — what ships, what doesn't, and the release gates. |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Dated execution plan and task status. |
| [docs/OFFLINE.md](./docs/OFFLINE.md) | What works offline and how. |
| [docs/MOBILE_PACKAGING.md](./docs/MOBILE_PACKAGING.md) | Android/iOS wrapper status (Capacitor) — not built or released. |
| [docs/VINAYAKA_PUJA_CONTENT_SPEC.md](./docs/VINAYAKA_PUJA_CONTENT_SPEC.md) | Ritual content structure and sourcing requirements. |
| [docs/VINAYAKA_TELUGU_RECOVERY.md](./docs/VINAYAKA_TELUGU_RECOVERY.md) | Telugu transcription/recovery process and confidence tracking. |
| [docs/PRODUCT_VISION.md](./docs/PRODUCT_VISION.md) | Earlier short product-vision statement (from `main`); [docs/VISION.md](./docs/VISION.md) is the canonical long-term direction. |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | High-level architecture notes (from `main`; design intent, not a description of every implemented detail). |
| [docs/DHARMA_KNOWLEDGE_MODEL.md](./docs/DHARMA_KNOWLEDGE_MODEL.md) | Dharma knowledge model (from `main`; design intent, not a description of every implemented detail). |
| [docs/PANCHANGA_ENGINE.md](./docs/PANCHANGA_ENGINE.md) | Panchanga engine notes (from `main`; design intent, not a description of every implemented detail). |
| [.claude/rules/](./.claude/rules/) | Enforced architecture, coding, security, testing, and sacred-content rules. |

Where documents disagree, the more specific one wins for its scope and the
broader one is corrected.

## Contributing

Project conventions and working agreements are in [CLAUDE.md](./CLAUDE.md) and
[.claude/rules/](./.claude/rules/). Architecture decisions with lasting
cross-module impact are recorded in `docs/adr/`.

## Privacy & data

No account, no server database, no analytics. Location, participant/family
tradition details, and puja progress are stored only in the browser's
`localStorage` on the device and are never sent to a server or an AI feature.
Device location (when used) supplies coordinates only — city, region, and
country are always typed or confirmed by the user, never inferred.

## Ownership and third-party material

© 2026 ASCOR LABS. All rights reserved for ASCOR LABS' original code and
content. This repository does not contain a `LICENSE` file for that original
work, and `package.json` is `"private": true`; no open-source licence is granted
by this notice.

Third-party software keeps its own authors and licences, which are **not** one
licence (MIT, ISC, MPL-2.0 and BSD-2-Clause wording). The full copyright and
licence notices for everything distributed with the app are in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). The same text is served at
`/THIRD_PARTY_NOTICES.txt`, shown under **About → Third-party notices**, and
included in the offline download. It is generated from the installed packages
and checked against `package-lock.json` by
`node scripts/generate-third-party-notices.mjs` (`--check` runs in the build);
re-run it after any dependency change.

`mhah-panchang` 1.2.0 (MPL-2.0) is distributed unmodified; the notices file
states where its corresponding source (the npm package's `src/` folder) is
available for exactly that version. VedaSaarathi does not claim ownership of
traditional texts or third-party sources; the sources used are cited in the
app's content records.

## Unused starter scaffolding

This repo was generated from a generic `vinext` full-stack starter. A few
starter files remain but are **not used by VedaSaarathi**, which is
deliberately account-free and database-free: `db/` and `examples/d1/`
(optional Cloudflare D1 + Drizzle example, unused), `app/chatgpt-auth.ts` and
`.openai/hosting.json` (optional "Sign in with ChatGPT" helpers for OpenAI
Sites hosting, unused). Nothing in `components/` or the app's own `lib/`
imports them.

## Learn more

- [vinext documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 guide](https://orm.drizzle.team/docs/get-started/d1-new) (only relevant if the unused `db/` scaffold is ever adopted)

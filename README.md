# VedaSaarathi

**VedaSaarathi** is a trusted, location-aware companion that helps Hindu
households understand, prepare for, and perform verified pujas in simple
language — without guessing a family's tradition or presenting unreviewed
religious content as approved guidance.

It connects verified calendar information (Panchanga), family/tradition
context, preparation checklists, and a step-by-step guided puja into one
honest, device-local journey. **VedaSaarathi is the platform; Vinayaka
Chavithi (Ganesha Chaturthi) is its first puja service.**

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
  mantra in Telugu with an optional romanised reading, and narrated
  instruction + mantra audio. English and Telugu throughout.
- **Offline** — a service worker caches the app shell and every bundled audio
  clip after the first online visit, so the whole puja works with no
  connection. See [docs/OFFLINE.md](./docs/OFFLINE.md).
- **Reviewer mode** — a separate, device-local mode for invited priests that
  shows source, page/locator, review status, transcription confidence, and a
  correction workflow (Approve / Correction needed / Not applicable /
  Comment, JSON export). Families never see this chrome.

## Tech stack

- [vinext](https://github.com/cloudflare/vinext) — Next.js-compatible
  server rendering on Vite + Cloudflare Workers
- React 19, TypeScript 5 (strict), ESLint (including `react-compiler` rules)
- No client or server database — every profile and ritual record lives in the
  browser's own `localStorage`
- Node.js `>=22.13.0`, Linux with `flock`, `curl`, and GNU `timeout`

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
node tests/e2e/offline.e2e.mjs             # offline download + offline puja/calendar
node tests/e2e/offline-first.e2e.mjs       # first-run-offline scenarios
```

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
  Sankalpam setup, guided Puja, Post-puja, Reviewer mode, Offline download, …)
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
| [.claude/rules/](./.claude/rules/) | Enforced architecture, coding, security, testing, and sacred-content rules. |

Where documents disagree, the more specific one wins for its scope and the
broader one is corrected.

## Privacy & data

No account, no server database, no analytics. Location, participant/family
tradition details, and puja progress are stored only in the browser's
`localStorage` on the device and are never sent to a server or an AI feature.
Device location (when used) supplies coordinates only — city, region, and
country are always typed or confirmed by the user, never inferred.

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

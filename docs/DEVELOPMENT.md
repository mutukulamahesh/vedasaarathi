# Development

Setup, testing, build/deploy mechanics, and repository layout. Moved out of
the top-level `README.md` (which is now the user-facing product overview) so
this detail stays available without crowding it.

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
node tests/e2e/offline-update.e2e.mjs      # offline update check/re-download freshness, audio Range/206 (simulated build B)
node tests/e2e/real-build-upgrade.e2e.mjs  # REAL A-to-B production build upgrade (two actual `npm run build` outputs)
node tests/e2e/panchanga-retry.e2e.mjs     # failed engine load recovers via Retry, no data lost
node tests/e2e/back-navigation.e2e.mjs     # browser Back/Forward follows in-app screen history
```

15 suites total.

`scripts/verify-panchanga.mjs` checks the Panchanga engine's evidence hash and
should be run under every timezone the app supports:

```bash
for tz in Etc/UTC Asia/Kolkata America/Chicago Pacific/Kiritimati Pacific/Pago_Pago; do
  TZ=$tz node scripts/verify-panchanga.mjs
done
```

## Build identification and rollback

Every production build records which source commit it was built from: it is
baked directly into the client bundle at build time (`vite.config.ts`'s
`define`, from `scripts/generate-build-info.mjs`) as `{ commit, commitShort,
dirty, builtAt }` — never fetched at runtime, so it cannot drift from the code
actually running, online or offline. The app shows it on **About → App
build** (a short commit SHA and the build date), so a deployed build can
always be matched back to the exact commit it came from, and to confirm two
environments are actually running the same build.

**Rollback**, through the existing OpenAI Sites deployment workflow (which
runs this app on Cloudflare Workers as its runtime, not a separately
configured deployment target): identify the last known-good commit (from a
previous deploy's recorded `commitShort`, or from `git log`), check it out
(`git checkout <commit>`), run `npm run install:ci` and `npm run build`, and
redeploy through the normal Sites deploy process — this project keeps no
separate infrastructure to roll back (no database, no server-side state;
every user's data stays in their own browser). The service worker's own
cache version (`VERSION` in `public/sw.js`) is bumped by hand whenever its
caching logic changes, so a rollback that changes `sw.js` correctly evicts
the previous build's regular browsing caches on `activate` without touching
a user's explicit offline download, which is versioned and evicted
independently, by content version, only after a new download completes
successfully (see `lib/offline/download.ts`).

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
- `docs/` — product and engineering documentation (see [docs/README.md](./README.md))
- `.claude/rules/` — enforced architecture, coding, security, testing, and
  sacred-content rules for anyone (human or AI) changing this codebase

## Contributing

Project conventions and working agreements are in
[../CLAUDE.md](../CLAUDE.md) and [../.claude/rules/](../.claude/rules/).
Architecture decisions with lasting cross-module impact are recorded in
`docs/adr/`.

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

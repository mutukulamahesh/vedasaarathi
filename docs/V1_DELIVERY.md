# VedaSaarathi V1 — delivery report

Branch: `vinayaka-end-to-end-review` (from `7480c3e`).
All work committed and pushed. No deploy access from this environment — see
**Deployment** at the end.

## Commits (in order)

| Commit | What |
| --- | --- |
| `697bf0c` | Audio: shared playback coordinator + English instruction audio for all 35 steps |
| `912dea9` | Panchanga: madhyahna-vyapti festival rule + location-aware puja window + almanac fields |
| `2c47ec2` | Vrata Katha: original retelling (EN + TE), rights basis recorded, step unblocked |
| `e9fdc83` | Offline: installable PWA — web manifest, service worker, icons, offline doc |
| `bef03fb` | Sankalpam: general-purpose generator (not Vinayaka-only), researched + gated |
| `b2be7fc` | Mobile: Capacitor Android + iOS projects, icons/splash, permissions, docs |
| `7c5698f` | E2E: Playwright journey suite (180 checks, 375×812 + 1440×900) |

## Review findings — fixed

1. **One shared audio-playback coordinator** — `lib/audio/playback-coordinator.ts`.
   Every audio source (English instruction MP3, Telugu instruction MP3, Telugu
   mantra-pronunciation MP3, device-voice fallback) registers a handle on mount
   and unregisters on unmount. `play(id)` stops every other registered source
   first; `stopAll()` stops them all and is called on step change, Previous,
   Home, language change, puja completion and unmount. Proven by
   `tests/audio-coordinator.test.mjs` (a two-player JSDOM interaction) and by
   the E2E suite (starting the mantra player never leaves >1 `<audio>` playing).
2. **English instruction audio for all 35 steps** — generated with
   `en-IN-PrabhatNeural` at −4%, hash-validated. Telugu instruction audio stays
   `te-IN-MohanNeural`; Telugu mantra audio stays Mohan and is never derived
   from English/romanised text; no English chanting/mantra audio exists.
   `scripts/validate-audio.mjs`: 106 files, all valid and manifest-matched.
3. **Stale comments corrected** — `lib/audio/manifest.ts`, `puja-screen.tsx`,
   `audio-player.tsx`, `public/audio/v1/README.md` no longer say hosted audio
   is not bundled.

## V1 feature checklist

| Area | State |
| --- | --- |
| Shared audio coordinator, full mutual-exclusion + stop-all | ✅ done, tested |
| English instruction audio ×35 (`en-IN-PrabhatNeural`) | ✅ done, hash-validated |
| Telugu instruction audio ×35 (`te-IN-MohanNeural`) | ✅ already delivered |
| Telugu mantra pronunciation audio ×32 (`te-IN-MohanNeural`, review candidate) | ✅ already delivered |
| General-purpose Sankalpam generator | ✅ done (`lib/sankalpam/`), 16 unit tests |
| Panchanga: samvatsara / ayana / ritu / masa / paksha / vaara | ✅ released, validated |
| Panchanga: current Tithi + Nakshatra with end times | ✅ already released |
| Sunrise + sunset | ✅ already released |
| Vinayaka Chavithi festival date — madhyahna-vyapti rule | ✅ released, validated 2024–2027 + Frisco |
| Location-aware puja window (Madhyahna Muhurat) | ✅ released, within 1 min of Drik |
| Location-aware festival date | ✅ (the madhyahna scan runs for the saved location) |
| Vinayaka Vrata Katha (EN + TE) | ✅ done — original retelling, rights basis recorded |
| Family-facing Vinayaka service — Simple + Complete, no blocked screens | ✅ verified end-to-end (E2E walks all 16 + all 35 steps to completion) |
| Step order: Telugu name → English title → keep ready → what to do → instruction audio → mantra → romanised → mantra audio → meaning → Prev/Next | ✅ unchanged layout, verified per step |
| Reviewer details kept out of Family mode | ✅ verified (provenance panel hidden in Family, shown in Reviewer) |
| Offline-capable installed web app | ✅ PWA + service worker; `docs/OFFLINE.md` |
| Android project | ✅ generated + configured; ⚠️ not built here (no Android SDK) |
| iOS project | ✅ generated + configured; ⚠️ not built/verified (needs macOS + Xcode) |
| Automated E2E (Playwright, real app, both viewports) | ✅ `tests/e2e/journey.e2e.mjs` — 180 checks pass |

## Sankalpam behaviour matrix

`lib/sankalpam/generateSankalpam()` — output is always `SOURCED_BETA_CANDIDATE`
+ `REVIEW_REQUIRED` + `transcriptionCheckRequired`; never "priest-approved".

| Input | Behaviour |
| --- | --- |
| Individual (SELF) | `mama` / `<name>-nama-dheyasya`. |
| Family (FAMILY) | `asmakam saha kutumbanam` ("with our families"). |
| Unrelated group (GROUP) | Collective `asmakam` **or** each member recites individually — a **choice**; the family phrase `saha kutumbanam` is never used. If no choice is made it is flagged `pendingChoices`. |
| Gotra KNOWN | Inserted verbatim. Never taken from a name or the deity. |
| Gotra UNKNOWN / UNSURE, no choice | Slot status `NEEDS_CHOICE`; the Gotra clause is left out; `pendingChoices` lists the three options. Nothing is guessed. |
| Gotra unknown → "Kashyapa convention" | Applied only on explicit choice; explanation cites `avidita-gotranam kashyapa gotram` and the two sources that record it. |
| Gotra unknown → "omit" | Clause omitted, explained. |
| Gotra unknown → "my family tradition" | Uses exactly the text the user typed. |
| Veda / Sutra / Sampradaya KNOWN | Inserted as `…-shakhadhyayinah` / `…-sutrasya` / `…-sampradayasya`. |
| Veda / Sutra / Sampradaya UNKNOWN / UNSURE | Slot omitted and recorded (`OMITTED_UNKNOWN`); never inferred. |
| Deity supplied | Appears only in the `…prityartham` clause; an open question notes a deity's Gotra is never a performer's Gotra. |
| Place: COUNTRY_ONLY (default) | `…deshe` with the saved country; no city / region / coordinates / timezone. |
| Place: REGION | Adds `…pradeshe`; open question notes locale phrasing varies by tradition. |
| Place: OMIT / no country saved | Stops at `Bharata-khande`. |
| Full-dated calendar (all 8 Panchanga slots present) | All inserted, each explained (South-Indian samvatsara, Purnimanta masa, Vedic ritu noted). |
| Any Panchanga slot missing, or SHORT chosen | Short form (`shubhe shobhane muhurte`); every missing slot listed in `openQuestions`, never filled with a guess. |

Sources (`lib/sankalpam/sources.ts`) — each with URL, access date, section
used, tradition scope, and recorded disagreement:
`pujayagna.com` (full worked slot example + the unknown-Gotra rule),
`swayamvaraparvathi.org` (supplicant phrases + the simplified/short form),
`drikpanchang.com` (canonical slot list + slot update cadence). No wording or
code copied from any of them.

## Panchanga / festival validation report

Evidence lives in `lib/panchanga/validation.ts` (fixtures with full provenance)
and is frozen at build time into `lib/panchanga/release-config.json`
(`evidenceHash sha256:a9609b3b…`). `scripts/verify-panchanga.mjs` re-runs the
fixtures on every build/test and fails if the committed config is stale.

| Field | Released | Validated against |
| --- | --- | --- |
| sunrise / sunset | ✅ | Drik Panchang — Hyderabad + Frisco, 2026-09-09 & 2026-11-01 (across US DST). Max delta 2 min (tolerance ±3). |
| tithi (name at sunrise + end timestamp) | ✅ | Same 4 day-fixtures; transition end-times within 0–1 min (tolerance ±5). |
| nakshatra (name + end timestamp) | ✅ | Same; within 0–1 min. |
| vaara | ✅ | Drik day-panchang — HYD + Frisco 2026-09-09 (Budhavara / Wednesday). |
| ritu | ✅ | Drik "Vedic Ritu" — Varsha. (Drik's solar ritu "Sharad" recorded as a disagreement.) |
| ayana | ✅ | Drik — Dakshinayana. |
| samvatsara | ✅ | Drik "Shaka Samvatsara" — Parabhava (Shaka 1948). Formula also matches 2024 Krodhi, 2025 Vishvavasu, 2027 Plavanga. (Vikrama-cycle "Siddharthi" recorded as a tradition difference.) |
| **festival** (Vinayaka Chavithi date) | ✅ | Drik festival pages — **2024-09-07, 2025-08-27, 2026-09-14, 2027-09-04** (Hyderabad; 2024 is a leap year) **and 2026-09-14 (Frisco / US Central)**. All 5 computed dates exact. |
| **pujaWindow** (Madhyahna Muhurat) | ✅ | Same 5 fixtures — computed window within **1 minute** of Drik's published "Madhyahna Ganesha Puja Muhurat" (tolerance ±5). The 2027 case exercises the end-clamp to the Chaturthi tithi end (12:25 PM). |

**Rule:** the festival day is the earliest day whose Madhyahna kala (middle
fifth of sunrise→sunset) is pervaded by Bhadrapada Shukla Chaturthi — the
Dharma Sindhu पूर्वैव resolution. The puja window is madhyahna ∩ the Chaturthi
tithi span. No general muhurtham is computed.

**Scope not yet covered** (honest): the festival + puja-window fixtures are 4
consecutive Hyderabad years + one US-timezone location. Not yet in the fixture
set: additional Indian cities and additional non-India timezones *for the
festival specifically* (the day-panchang fields already cover Frisco + US DST);
DST-boundary and UTC±14 / UTC−11 *festival* cases; and a fixture on the
samvatsara March/Ugadi boundary (the boundary is handled in code via a
lunar-month check but is not pinned by a fixture). The engine's tz-aware anchor
is separately unit-tested for UTC+14 / UTC−11 / DST days in
`tests/panchanga.test.mjs`.

## Audio counts

| Kind | Language | Count | Voice | Status |
| --- | --- | --- | --- | --- |
| Plain instruction | English | 35 | `en-IN-PrabhatNeural` | GENERATED |
| Plain instruction | Telugu | 35 | `te-IN-MohanNeural` | GENERATED |
| Mantra pronunciation | Telugu | 32 | `te-IN-MohanNeural` | REVIEW_CANDIDATE ("pronunciation guide", never priest-approved) |
| Voice-comparison samples | Telugu | 4 | Mohan + Shruti | Reviewer mode only |
| **Total** | | **106** | | all validated: file present, non-empty, MP3 sync, `.txt`/`.sha256` sidecars match the manifest text |

No English chanting/mantra audio is produced. Every bundled URL returns 200 and
a sample decodes via `decodeAudioData` (E2E).

## Vrata Katha — rights basis

`lib/pujas/vinayaka/vrata-katha.ts`. An **original retelling** written for
VedaSaarathi, six parts, English + Telugu (Telugu is an original translation).
Marked `BETA_CANDIDATE_RETELLING`, `REVIEW_REQUIRED`, locked — never
priest-approved.

- The Syamantaka-jewel episode is from **Bhāgavata Purāṇa 10.56–57** (ancient
  Sanskrit, public domain; event sequence cross-checked against the
  public-domain **J. M. Sanyal** English translation, 1929–1934 — no wording
  reused).
- The Gaṇeśa–Candra curse episode and the "hear the katha to remove false
  blame" frame are **traditional Purāṇic / vrata material** with no single
  rights holder, retold in fresh wording.
- **Not** copied from Nanduri Rama Krishnamacharyulu's booklet or from any
  commercial website.

The step is now `SOURCED_BETA_CANDIDATE` (was `WITHHELD_FOR_RIGHTS`). This is a
deliberate change from the pre-task note in `.claude/rules/sacred-content.md`,
made because the task's Section 6 explicitly asks for the katha to be added as
an original sourced retelling with the rights basis recorded.

## Offline behaviour report

Full detail in `docs/OFFLINE.md`. No account, no server database — every
profile and ritual record is in the browser's `localStorage`
(`vedasaarathi:preparation:v3` for people + lineage + progress + Sankalpam
inputs, `…:location:v1` for the saved location, plus voice / presentation-mode
/ reviewer-decisions keys).

**Works fully offline after the first online run:** all 35 steps' content,
English + Telugu instructions, all 106 audio files (cached on first play), the
Vrata Katha, saved people + lineage, saved location, puja progress, Sankalpam
inputs, and Panchanga for the session (computed on-device from the bundled
`mhah-panchang` chunk — once cached, new dates and the festival scan work
offline too).

**Needs connectivity:** the very first load, the first play of each audio file
(cached as fetched), and loading a code chunk never fetched before. No
analytics, no CDN fonts, no external API (E2E confirms zero unexpected external
requests).

Service worker `public/sw.js`: navigations network-first with a cached-shell
fallback; `/assets/*`, icons and `/audio/v1/*.mp3` cache-first (immutable);
audio Range requests keyed on the plain URL; cross-origin never touched;
versioned caches auto-cleaned on activate. Registration skips `localhost`, so
offline is exercised against a deployed/prod origin, not the dev server.

## Android / iOS packaging status

`capacitor.config.ts` (appId `com.vedasaarathi.app`), `docs/MOBILE_PACKAGING.md`.
The shell loads the deployed site over HTTPS (`CAP_SERVER_URL`) and the service
worker provides offline use — the right pattern for an SSR + PWA app.

- **PWA:** ✅ installable — `manifest.webmanifest`, icons (192/512/maskable/SVG),
  `theme-color`, `apple-web-app` meta; all serve 200 from a production build.
- **Android:** ✅ `android/` generated and configured — `AndroidManifest.xml`
  declares INTERNET + optional `ACCESS_COARSE/FINE_LOCATION`; launcher icons,
  adaptive icon and light/dark splash generated (`@capacitor/assets`); Gradle
  wrapper bumped to 8.7 for modern JDKs; `local.properties.example` added.
  `npx cap sync android` succeeds and **Gradle configuration completes**.
  ⚠️ **`./gradlew assembleDebug` was NOT run to completion in this environment
  — there is no Android SDK installed** (`SDK location not found`). On a machine
  with the SDK the documented `assembleDebug` / `bundleRelease` steps apply
  unchanged.
- **iOS:** ✅ `ios/` generated and configured — `Info.plist` gains
  `NSLocationWhenInUseUsageDescription` and `ITSAppUsesNonExemptEncryption`.
  ⚠️ **Not built or verified — that requires macOS + Xcode, which this
  environment does not have.** Only the project structure was validated
  (`npx cap add ios` succeeded; `capacitor.config.json` and the plist are
  correct).
- Signed-release steps (Play Store `bundleRelease` + keystore; App Store Xcode
  archive → App Store Connect / TestFlight) are in `docs/MOBILE_PACKAGING.md`.

## Exact test results

- `npm test` (`build` + `typecheck` + `node --test tests/*.test.mjs`):
  **540 tests, 540 pass, 0 fail**. Run repeatedly (the suite is deterministic —
  no clock/network flakiness); every run 540/540.
- `npm run lint`: clean (0 errors).
- `npm run typecheck`: clean.
- `npm run build`: production build succeeds; `verify-panchanga` +
  `validate-audio` pass inside it.
- Browser E2E (`tests/e2e/journey.e2e.mjs`) at **375×812 and 1440×900**:
  **ALL 180 CHECKS PASSED** — no console/page errors, no horizontal overflow,
  no unexpected external requests.
- Production smoke test (local `vinext start`, no deploy access): `/`, `/sw.js`,
  `/manifest.webmanifest`, all icons, and **all 106 `/audio/v1/*.mp3` return
  200**; the SSR HTML carries the manifest link + theme-color + apple-web-app
  meta.

## Bundle + offline-cache size

| Bucket | Size |
| --- | --- |
| Client JS + CSS (`dist/client/assets`) | 768 KB raw · ~180 KB gzipped (page 85 KB, framework 59 KB, index 24 KB, mhah-panchang chunk 9 KB) |
| Bundled audio (`/audio/v1`, 106 MP3s) | 13.0 MB |
| Icons + manifest | ~50 KB |
| **Service-worker primed cache total** | **~13.8 MB** |
| Server bundle (Cloudflare Workers, not downloaded by clients) | 1.9 MB |
| `localStorage` per profile | a few KB (well under the ~5 MB quota) |

## Deployment — the one thing this environment cannot do

This container has **no Cloudflare / Wrangler / Sites deploy credentials**
(`wrangler whoami` → not authenticated; no Sites deploy CLI). I cannot create
the private Site preview or smoke-test a deployed URL from here.

Everything is pushed to `vinayaka-end-to-end-review` and is **build-verified and
production-ready**: `npm run build` passes, `vinext start` serves it, and the
local production smoke test above is green. Deploying the private preview from
the Sites platform (or the branch auto-deploy) and re-pointing the E2E suite at
it (`BASE_URL=<preview> npm run test:e2e`) is the only remaining step, and it
needs deploy access this environment doesn't have.

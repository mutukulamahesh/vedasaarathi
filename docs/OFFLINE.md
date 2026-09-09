# Offline behaviour — the installed VedaSaarathi web app

VedaSaarathi is a Progressive Web App. Once it has been opened while connected,
the installed app keeps working with no network, because:

- **No account, no server database.** Every profile and ritual record lives in
  the browser's own `localStorage`, on the device. Nothing is sent to a server.
- A **service worker** (`public/sw.js`) caches the app shell and every bundled
  asset as it is fetched.

## What works fully offline (after the first online run)

| Area | How it survives offline |
| --- | --- |
| Puja content — all 35 steps, Simple + Complete | Bundled in the JS; cached by the service worker. |
| English + Telugu step instructions | Same — part of the app bundle. |
| Bundled audio — 35 English + 35 Telugu instruction MP3s, 32 Telugu mantra MP3s, 4 reviewer voice samples | `/audio/v1/*.mp3`, cache-first in the `…-audio` cache. Each file is cached the first time it is played; one full walk-through primes them all. |
| Vinayaka Vrata Katha (English + Telugu) | Bundled text. |
| Saved people + lineage (Gotra / Veda / Shakha / Sutra / Sampradaya, incl. KNOWN / UNKNOWN / UNSURE) | `localStorage["vedasaarathi:preparation:v3"]`. |
| Saved location (city, coordinates, timezone, source) | `localStorage["vedasaarathi:location:v1"]`. |
| Puja progress — path, current step, materials checklist, run lifecycle | `localStorage["vedasaarathi:preparation:v3"]`. |
| Sankalpam inputs | The same participant lineage fields in `preparation:v3`. |
| Panchanga for the current session — sunrise/sunset, Tithi, Nakshatra, Vaara, Ritu, Ayana, Samvatsara, and the next Vinayaka Chavithi date + Madhyahna puja window | Computed on-device from the bundled `mhah-panchang` chunk. Once that chunk is cached, new dates and the festival scan compute offline too. |
| Voice preference, presentation mode, reviewer decisions + JSON export | `localStorage` keys `voice-preference:v1`, `presentation-mode:v1`, `reviewer-decisions:v1`. The correction-report JSON export is produced locally and never transmitted. |
| App icon, install, standalone launch | `manifest.webmanifest` + icons under `/icons/`. |

## What needs connectivity

- **The very first load** of the app, and the **first play of each audio file**
  (they are cached as fetched — a one-time full walk-through, or just playing
  each step once, primes everything).
- Loading a **brand-new code chunk** that the browser has never fetched. The
  Panchanga engine chunk is the only lazy chunk; after it is cached once,
  Panchanga is fully offline.
- There is **no** other network dependency: no analytics, no fonts from a CDN,
  no external API. The Panchanga fixtures and the festival validation run at
  build time only (`scripts/verify-panchanga.mjs`), never in the browser.

## Cache management

- Cache names are versioned (`vs-v1-2026-09-09-*`). On activation the service
  worker deletes any cache whose name does not match the current version, so a
  new deploy does not accumulate stale copies.
- Navigations are **network-first** with a cached-shell fallback, so an online
  user always gets the latest HTML; an offline user gets the last shell.
- Content-hashed assets (`/assets/*`) and the bundled MP3s are **cache-first**
  (immutable).

## Approximate cache size

| Bucket | Size |
| --- | --- |
| App shell + JS/CSS (`/assets/*`) | ~770 KB (~180 KB gzipped over the wire) |
| Bundled audio (`/audio/v1/*.mp3`, 106 files) | ~13.0 MB |
| Icons + manifest | ~50 KB |
| **Total once fully primed** | **~13.8 MB** |

`localStorage` use is a few KB per profile — well within the ~5 MB origin quota.

## Resetting

Clearing site data in the browser (or "Clear location" / starting a new puja in
the app) removes the corresponding `localStorage` entries. Uninstalling the
installed app removes its cache. Nothing is stored anywhere else.

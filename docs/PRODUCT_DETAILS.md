# Product details, coverage, and privacy

Detail moved out of the top-level `README.md` (now a short, user-facing
overview) so it stays available without crowding the front page. This is the
day-to-day accurate description of what's shipped; where it disagrees with
[VINAYAKA_V1_SCOPE.md](./VINAYAKA_V1_SCOPE.md) or
[../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) (both written earlier
and not fully updated since), this document wins for what's actually in the
app today.

## What's in the app

- **Home** — today's Panchanga for the saved location (Tithi, Nakshatra,
  sunrise/sunset), general traditional daily timings (Abhijit Muhurta and
  Vijaya Muhurta as useful periods; Rahu Kalam / Yamaganda / Gulika Kalam to
  avoid — explicitly *not* personalised astrology), and upcoming festivals.
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
  connection. See [OFFLINE.md](./OFFLINE.md).
- **Reviewer mode** — a separate, device-local mode for invited priests that
  shows source, page/locator, review status, transcription confidence, and a
  correction workflow (Approve / Correction needed / Not applicable /
  Comment, JSON export). Families never see this chrome, and there is no
  entry link to it from Home — it's reached only by someone who already
  knows to look for it.
- **About** — one bilingual page reached from Home: why the app exists, what
  it does, why location matters, tradition and guidance, first-version
  coverage, AI and review limitations, how to send feedback, and the
  ASCOR LABS attribution.

## What the app does and does not include

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
- **No priest has approved the app as a whole.** A priest has given an
  initial review of selected content (see the About page's acknowledgement);
  that review is not yet complete, and it does not mean every calculation,
  mantra, audio clip or piece of content has been approved. Sourced content
  is shown as an explicitly labelled beta and is never described as verified
  or priest-approved unless its own record says so.
- **Vinayaka Vrata Katha:** an original VedaSaarathi retelling in English and
  Telugu, visible in the guided puja as a `SOURCED_BETA_CANDIDATE` with
  `REVIEW_REQUIRED` status. It is not priest-reviewed. Section provenance
  (Bhagavata Purana vs traditional material) is recorded; traditional
  material is not assumed rights-cleared.

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
[../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). The same text is
served at `/THIRD_PARTY_NOTICES.txt`, shown under **About → Third-party
notices**, and included in the offline download. It is generated from the
installed packages and checked against `package-lock.json` by
`node scripts/generate-third-party-notices.mjs` (`--check` runs in the build);
re-run it after any dependency change.

`mhah-panchang` 1.2.0 (MPL-2.0) is distributed unmodified; the notices file
states where its corresponding source (the npm package's `src/` folder) is
available for exactly that version. VedaSaarathi does not claim ownership of
traditional texts or third-party sources; the sources used are cited in the
app's content records.

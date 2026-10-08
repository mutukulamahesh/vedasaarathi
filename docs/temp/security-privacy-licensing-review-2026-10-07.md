# Security, privacy and licensing review — 2026-10-07

A bounded, practical hardening review of VedaSaarathi after its public launch at
https://vedasaarathi.com. **This is not a legal opinion, a formal certification
or a penetration test.** Production was checked only with polite, read-only
requests: one request at a time, no load, no fuzzing, no scanners. All other
testing ran against a local production build.

- Branch: `security/public-release-review`, from `origin/main` at `ca91025`.
- Deployed build at review time: About and `/build-info.json` report commit
  `515a2ba`, built 2026-10-07T19:23Z. **That commit is not in the GitHub
  repository's history** (see C-3).
- How it was tested: a worker-backed `vite preview` of `npm run build`. This
  runs `worker/index.ts`, so the real CSP and headers apply, and it honours
  `_headers` the way Cloudflare's own assets binding does. Headless Chromium
  (Playwright 1.63) was used for the browser checks.

Severity labels below are this review's own judgement for this app's context.

---

## 1. Confirmed problems, and the fixes made in this PR

### F-1 — `fast-uri` HIGH advisories, a transitive dependency (fixed; not reachable in the deployed app)

- **Finding.** `npm audit --omit=dev` reported one HIGH: `fast-uri@3.1.2`,
  reached via `@hookform/resolvers@5.7.1 → ajv@8.20.0 → fast-uri`. The
  advisories cover versions 3.0.0–3.1.7. They are host confusion and SSRF
  issues in URI parsing, normalisation and serialisation: GHSA-v2hh-gcrm-f6hx,
  -7p8r-x3mc-p8w7, -f65p-4m7j-42xc, -fph4-wmhf-6fwf, -jqff-g426-hqxp,
  -4c8g-83qw-93j6, -qw65-cvwx-89v3 and -hrr3-gc8f-f4qj.
- **Reachability: none in what ships.** The evidence:
  - No file in `app/`, `components/`, `lib/`, `hooks/` or `worker/` imports
    `@hookform/resolvers` or `ajv`. `react-hook-form` is imported only by
    `components/ui/form.tsx`, an unused shadcn component that nothing imports.
    `ajv` is installed only because it is a peer dependency of
    `@hookform/resolvers`, and npm installs peers by default.
  - The other path to `ajv` is `react-server-dom-webpack → webpack →
    schema-utils`. That is build-time webpack schema validation, never bundled.
  - The built output proves it. The server bundle's module regions contain
    only `vinext`, `@vitejs/plugin-rsc`, `react`, `react-dom`,
    `react-server-dom-webpack`, `lucide-react`, `suncalc` and `mhah-panchang`.
    No `ajv`, `fast-uri` or `react-hook-form` code appears anywhere in
    `dist/`. The vulnerable code paths parse URIs inside JSON-Schema `format`
    validation, and no user input ever reaches that code because the code is
    not deployed.
- **Fix.** `npm update fast-uri` changed **only** the lockfile entry, from
  3.1.2 to **3.1.8**. That is a 3-line diff. 3.1.8 is inside `ajv`'s declared
  `^3.0.1` range, so no override is needed and no other package changed.
  `npm audit fix --force` was **not** used. Afterwards,
  `npm audit --omit=dev` reports **0 vulnerabilities**. 3.1.8 keeps the
  BSD-3-Clause licence.
- **Verification.** Typecheck, lint, build, all 1,151 unit tests, and the
  browser suites listed in section 5.

### F-2 — No HSTS header (fixed)

- **Finding.** Production sends no `Strict-Transport-Security` header.
  `http://` redirects to HTTPS with a temporary **302**, so a first visit
  typed as `http://` could be intercepted before that redirect.
- **Fix.** `worker/security-headers.ts` now sends
  `Strict-Transport-Security: max-age=31536000` on every Worker response
  (all HTML pages). It does **not** include `includeSubDomains` or `preload`
  (see D-6).

### F-3 — No Permissions-Policy (fixed, defence in depth)

- **Fix.** `Permissions-Policy: camera=(), microphone=(), geolocation=(self),
  payment=(), usb=()`.
- `geolocation=(self)` keeps the optional "Use my location" button working.
  The permission-granted, denied, unavailable and manual-entry paths in
  `location-autofill.e2e` all pass under this header.

### F-4 — Security-header documentation was partly inaccurate (fixed)

I checked each documented CSP justification in a real browser rather than
taking the comments on trust.

- **`script-src 'unsafe-inline'`: confirmed necessary.** Every
  server-rendered page carries 6–9 inline `<script>` tags. These are vinext's
  RSC payload (`__VINEXT_RSC_CHUNKS__`) and its bootstrap, which is itself an
  inline `import(...)`. With `'unsafe-inline'` removed, Chromium blocks all of
  them on the home page and every entry page, and the app **never hydrates**:
  bottom-navigation clicks do nothing. The production host also injects its
  own inline bot-detection script (see D-1), which depends on this setting.
- **`style-src 'unsafe-inline'`: the stated reason does not hold.**
  - **Stale.** `components/ui/progress.tsx` is not imported anywhere.
  - **Inaccurate.** The other four progress bars (`offline-download.tsx`,
    `prepare-screen.tsx`, `candidate-review-screen.tsx`, `puja-screen.tsx`)
    do use `style={{ width }}`. But React applies those on the client through
    the CSSOM, which CSP does not block. The server-rendered HTML contains no
    `style=` attributes and no `<style>` tags.
  - **Tested.** With `style-src 'self'` only, the puja progress bar still
    rendered at exactly 25% width, and there were zero CSP violations across
    all 8 entry pages, Home, Prepare and the puja.
  - The CSP itself was **not changed**, because not every screen was probed
    (D-2). Only the documentation now says honestly why the setting is kept.
- **`_headers` is not applied by the production host** (see C-1). The
  comments in `worker/index.ts` and `public/_headers` said it was. Both now
  state what was observed.
- **Code change.** The header logic moved unchanged into
  `worker/security-headers.ts` (plus HSTS and Permissions-Policy). It now has
  a unit test, `tests/security-headers.test.mjs`. The test guards
  same-origin-only sources, no `unsafe-eval`, no external hosts, HSTS without
  subdomains, and `geolocation=(self)`.

### F-5 — About did not say what does go over the network (fixed, short)

- **What About said before, and whether it was true.** It said saved data is
  "stored only in this browser, on this device". That is true, and the new
  `injection-privacy.e2e` confirms it (see F-6).
- **What was missing.** About said nothing about what *does* cross the
  network.
- **What production actually does** (one read-only browser visit):
  - **The hosting provider sets three cookies on first page load.** None of
    them is set by this app's code:
    - `__Host-appgarden-visitor`: HttpOnly, 90 days, set on the HTML
      response by the hosting platform.
    - `__cf_bm`: 30 minutes, Cloudflare bot management.
    - `cf_clearance`: 1 year, Cloudflare challenge.
  - **The host injects an inline Cloudflare "JavaScript detections" script**
    into every HTML page. It POSTs about 16 KB of obfuscated browser signals
    to the same-origin path `/cdn-cgi/challenge-platform/…`.
  - The app itself makes only same-origin GET requests.
- **Fix.** About has a new section, **"What is sent over the internet"**,
  in English and Telugu. It says:
  - the app has no accounts or sign-in;
  - the app never sends location, people, Gotra, family details or progress
    anywhere;
  - the host sees ordinary request details such as IP address and browser
    type;
  - the host sets its own security cookies and a visitor cookie of up to 90
    days, which the app never reads, and the app has no analytics or
    advertising of its own;
  - audio is bundled recordings and nothing is recorded; a browser's own
    voice may be generated online, but it only ever reads step instructions,
    never names or family details. This was verified in
    `lib/speech/narration-policy.ts`.
- **What was not added.** No consent banner or other consent infrastructure
  was added. Whether the host's 90-day visitor cookie needs consent is D-1.
- **Telugu text needs a check.** The Telugu text was written in this review.
  Mahesh should read it before release, as for any UI copy.

### F-6 — Injection tests for names and lineage fields (added; no vulnerability found)

The new suite is `tests/e2e/injection-privacy.e2e.mjs`. It runs at phone and
desktop widths: 32 checks, all passing.

- **What it types.** Script-shaped text goes through the **real People
  form**:
  - name 1: `<script>…</script>Ravi`;
  - name 2: `"><img src=x onerror=…>`;
  - a KNOWN Gotra: `</label><svg onload=…>`;
  - a "My value is not listed" Veda value: `'><iframe srcdoc=…>`.
- **The cycle.** The test saves, **reloads**, and reads every value back.
  It then walks the guided puja to the Sankalpam step, which shows the Gotra
  back to the family.
- **What it asserts:**
  - each value is stored and shown back character-for-character as text;
  - no payload ever executes (a `window.__vsXss` flag is checked directly);
  - no `img[src=x]`, `svg[onload]` or `iframe` is ever injected;
  - no dialog opens;
  - nothing causes horizontal overflow;
  - the app sends nothing anywhere: no cross-origin request, no non-GET
    request, and no request URL or body containing any typed value.
- **Code review agrees.** There are no `dangerouslySetInnerHTML`,
  `innerHTML` or `document.write` sinks in app code. The only one is in
  `components/ui/chart.tsx`, which is unused. Every `href` comes from static
  data. Nothing personal goes into URLs: navigation uses
  `history.pushState` with the bare pathname. App code has no `console.*`
  logging.

---

## 2. Uncertain items that need Mahesh's decision

### D-1 — Hosting-platform cookies and bot-detection script (privacy/consent)

- **The app does not do this; the hosting layer does.** A 90-day
  `__Host-appgarden-visitor` cookie looks like a visitor identifier, and its
  purpose is not documented anywhere this review could see. Cloudflare's
  `cf_clearance` lasts 1 year, and the injected detection script fingerprints
  the browser.
- **The JSD script runs inside the page's own origin.** It could technically
  read `localStorage`. Saved test names and Gotra values were **not** found in
  its POST, in plain or base64 form. Because the payload is obfuscated, that
  is evidence, not proof.
- **Decide:**
  1. Ask the hosting platform what `appgarden-visitor` is used for, and
     whether it and the Cloudflare JS detections can be turned off for this
     site. If you control the Cloudflare zone, these are the Bot Fight Mode /
     JavaScript Detections settings.
  2. Whether EU/UK visitors matter enough to need consent for a
     non-essential visitor cookie. This review did **not** establish that a
     banner is required, and none was added.

### D-2 — Removing `style-src 'unsafe-inline'`

Evidence so far says it is not needed (F-4). Prove it on every screen before
changing it: reviewer mode's candidate review, the offline download in
progress, the calendar, location and About. The approach that worked here was
to rewrite the header in Playwright and collect `securitypolicyviolation`
events. The benefit is modest, defence against CSS injection only.

### D-3 — Nonce-based `script-src` (replacing `'unsafe-inline'`)

vinext has nonce plumbing for scripts it renders (`scriptNonce` in
`vinext/dist/server/app-ssr-entry.js`). Two things block it today:

- The worker would have to mint a nonce for every request.
- The offline service worker would have to keep cached pages working.

Also, the host's injected bot script would be blocked unless it receives the
nonce. This is a larger, separate change, not done here.

### D-4 — Content rights: claims that rest on assumptions

- **Vinayaka puja, the Nanduri Srinivas PDFs.** The mantra sequence and
  romanisation in `lib/pujas/vinayaka/candidate.ts` are grounded page by page
  in two PDFs that carry a "Nanduri Srinivas Youtube Channel" mark.
  `lib/pujas/vinayaka/sources.ts` `COPYRIGHT_FLAGS` itself says:
  "**Confirm permission to build on this compilation**". No record of that
  permission exists anywhere in the repository. The verses are traditional
  liturgy. The selection, order and romanisation scheme may be the compiler's
  editorial work. Record either the permission or a decision.
- **Vinayaka Vrata Katha (`vrata-katha.ts`).** It is an original retelling,
  and facts and plot are not copyrightable, so the risk is low. One
  `rightsStatus` overclaims: it calls J. M. Sanyal's 1929–34 translation
  "Public domain — the Internet Archive record is marked CC0". An uploader's
  CC0 mark does not establish public-domain status. Public-domain status of a
  translation depends on the translator's death date (India: life + 60 years)
  and on US publication-date rules. Neither was established. No wording was
  reused, so this is about accuracy of the record, not exposure. Content
  files were not edited in this review.
- **Satyanarayana master document.** It is in this **public** repository
  (`docs/pujas/sri-satyanarayana-vratham-master.md`) and is not in the app.
  - It reproduces the recitation text "as the base manual prints it" from
    Varadacharyulu's 1967 *Śrī Satyanārāyaṇa Vratakalpaḥ*. The document
    itself records "rights reserved to the translator" for that edition.
  - It also takes some readings from the Mohan Publications booklet
    (2013/2016) and stotranidhi.com.
  - Its reuse basis (section 8.3) argues that liturgy is authorless. That is
    a reasonable position for the mantras themselves. It does not settle the
    edition's selection, arrangement and editorial readings.
  - Three things do **not** establish permission: a Digital Library of India
    or Internet Archive scan, a free-edition price line ("అమూల్యము"), and the
    age of the work.
  - Its Katha retellings follow the copyrighted 1967 Telugu rendering
    chapter by chapter, "every event, in order". They are probably fine as
    original expression, but treat that as unverified.
  - Decide whether this document should stay public before rights are
    settled.
- **TTS audio.** The audio was generated with **Azure AI Speech** neural
  voices `te-IN-MohanNeural` and `en-IN-PrabhatNeural` through the official
  API (`scripts/generate-audio.mjs`). Microsoft's terms for prebuilt neural
  voices generally permit using the output. They also ask that synthetic
  voices be disclosed; About already says "computer-generated voice". Which
  Azure subscription and terms applied when the audio was generated is **not
  recorded**. Keep a note of it.
- **Gitignored source PDFs.** They were never committed: the full history was
  checked, and no PDF was ever added.

### D-5 — No licence for VedaSaarathi's own code

- **Current state.**
  - The repository is **public** and has **no LICENSE file**.
  - About and `THIRD_PARTY_NOTICES` say "© 2026 ASCOR LABS. All rights
    reserved."
  - By default, others may view the code on GitHub but have no licence to
    reuse it.
- **Decision.** Choosing a licence, or keeping it all-rights-reserved, is
  Mahesh's decision. This review did not choose one.

### D-6 — HSTS `includeSubDomains` / `preload`

The HSTS added in F-2 covers this host only.

- **`includeSubDomains`** would also force HTTPS on every subdomain. That
  includes `www`, which does not resolve today.
- **`preload`** is hard to undo.

Decide only once every subdomain is HTTPS-only.

### D-7 — Low-severity input-length gap

Names are capped at 80 characters (`MAX_NAME_LENGTH`). The **Gotra** text box
and the custom Veda/Sutra/Sampradaya values have no length limit. Only the
user's own device is affected; a huge paste could exceed localStorage quota.
A shared limit with a bilingual message would close the gap. It was not
changed here, to keep this PR focused.

---

## 3. Account and platform settings Mahesh must change by hand

**GitHub** (repository Settings). The repo is public; branch-protection status
could not be read with this session's token.

1. **Rulesets / branch protection on `main`:**
   - Require a pull request before merging, with **0 required approvals**.
     You are the only maintainer; requiring another person's approval would
     lock you out.
   - Require status checks to pass: **"Typecheck, lint, build, unit tests"**
     (the job in `.github/workflows/ci.yml`). It appears after the workflow
     has run once.
   - Block force pushes and deletion of `main`.
   - Optionally require branches to be up to date.
   - Leave "Allow auto-merge" **off**. It is off today.
2. **Code security:**
   - Turn on **Dependabot alerts** and **Dependabot security updates**.
     `.github/dependabot.yml` adds monthly version-update PRs; nothing is
     auto-merged.
   - Turn on **Secret scanning** and **Push protection**.
   - Turn on **Private vulnerability reporting**. `SECURITY.md` points to it.
3. **Actions → General:**
   - Workflow permissions: **"Read repository contents"**. The workflow also
     declares `contents: read`.
   - Require approval for workflows from outside collaborators or first-time
     contributors.
4. **Commit email privacy (optional).** One commit in public history carries
   an employer email address as author. Turn on "Keep my email address
   private" for future commits. Rewriting history for this is not
   recommended.

**Hosting / DNS:**

5. **The production host does not apply `public/_headers` (C-1).**
   - Static responses (`/assets/*`, `/audio/*`, `sw.js`,
     `manifest.webmanifest`) carry no `nosniff` / `Referrer-Policy` /
     `X-Frame-Options`.
   - `/assets/*` is served `max-age=0` instead of `immutable`, a performance
     cost.
   - `/_headers` and `/.assetsignore` are downloadable files.
   - Ask the platform how to set static-asset headers. The HTML pages are
     fine; the Worker sets their headers.
6. **The production deploy does not match `npm run build` output (C-2).**
   These files are publicly downloadable although `scripts/build-verified.sh`
   deletes them:
   - `/.vite/manifest.json`;
   - `/audio/v1/README.md`;
   - the audio `.txt` / `.sha256` / `.meta.json` sidecars.

   None contains secrets: the build manifest, voice names, text hashes and
   narration text that the app already shows. Still, this shows the platform
   builds or packages differently from the repository's script. Confirm which
   command the platform runs.
7. **Deployed commit `515a2ba` is not on GitHub (C-3).** Production cannot
   be traced to a reviewed commit. Deploy from a pushed commit, or push that
   commit.
8. **The platform sign-in route exists on the domain.**
   `/signin-with-chatgpt` redirects to an OpenAI OAuth login. The app never
   links to it or reads its identity headers; `app/chatgpt-auth.ts` is unused
   starter code (`docs/DEVELOPMENT.md`). Ask the platform whether it can be
   disabled, since the app promises no sign-in.
9. **D-1 cookies / bot script.** Platform or Cloudflare settings, as above.
10. **Already-known infrastructure items.** `http://` → `https://` is a
    **302**; make it a 301. `www.vedasaarathi.com` does not resolve.

**Credential revocation: none needed.** See section 4.

---

## 4. Items already adequately covered

- **Secrets.** No credential was found anywhere.
  - `gitleaks` and `trufflehog` are not installed here. A regex scan of the
    full `git log -p --all` covered 205 commits and all branches, with
    patterns for AWS, GitHub, OpenAI, Anthropic, Google, Slack and Stripe
    keys, private keys, JWTs, Cloudflare and Azure keys, and generic
    `secret=`/`token=` assignments. It produced one false positive: a field
    named `token` holding Telugu transcription tokens in
    `lib/pujas/vinayaka/telugu-recovery.ts`.
  - No `.env`, `.pem`, keystore or credential file was ever committed.
    `.env*` and `*.pem` are gitignored.
  - The audio scripts read `SPEECH_KEY` only from the environment and never
    print it.
- **The app's own network surface.** All same-origin:
  - **Pages and assets:** pages, RSC navigation, audio, the bundled GeoNames
    place list, and the offline manifest.
  - **Location:** suggestions are computed on the device. The existing
    `location-save-flow.test.mjs` "no network request" assertion still
    passes.
  - **Third parties:** no analytics, CDN or AI service is called.
  - **Server side:** the Worker has no API routes, no database (D1 is
    unbound) and no server actions in use.
- **Content-Security-Policy.** It is hand-written, same-origin only, with no
  `unsafe-eval`, `object-src 'none'`, `base-uri 'none'` and
  `frame-ancestors 'none'`. A real-browser check found no violations in
  production or locally.
- **TLS and routes.**
  - TLS 1.3 with a Google Trust Services certificate. TLS 1.0/1.1 could not
    be negotiated from this client.
  - Source maps are not built or served: `*.js.map` returns 404.
  - Source and config paths return 404: `/.env`, `/package.json`, `/.git/…`,
    `/worker/index.ts`, `/dist/…`.
  - Public entry pages (8 EN/TE routes) return 200 with unexpected query
    strings and never reflect them. Malformed paths give a plain 404/400; the
    trailing slash gives a 308. Nothing crashes or leaks.
- **Third-party notices.** `THIRD_PARTY_NOTICES.md` and the served `.txt` are
  identical, and the build checks they are current.
  - The software list matches what the built bundles contain. Licences are
    reproduced in full.
  - The one MPL-2.0 package, `mhah-panchang`, is unmodified, with a
    source-form location and hash.
  - The GeoNames CC BY 4.0 attribution is present.
  - The fast-uri bump does not change notices; it is not bundled.
  - **Dependency licences overall:** production dependencies are MIT, ISC,
    Apache-2.0, BSD, MPL-2.0 and 0BSD. The only (L)GPL code is `sharp`'s
    libvips, a dev/build-time dependency that is not shipped.
- **Fonts and images.**
  - No web fonts are shipped; the app uses system fonts.
  - The app icon is a hand-written SVG in this repository.
  - The share image was rendered from that icon and text with a local font.
    Rendered images are not "Font Software" under the SIL OFL.
  - `file.svg`, `globe.svg` and `window.svg` are leftover MIT-licensed
    create-next-app starter SVGs. They are unused but served; harmless.
- **Existing privacy wording.** The location screen ("never sent to a
  server, an analytics service, or any AI feature"), corrections ("Nothing is
  sent anywhere") and offline download ("No account, nothing sent anywhere")
  are accurate for the app's own behaviour.
- **Dependency audit, full tree.** After F-1, the full audit still lists 36
  advisories. All are in **dev/build-time tooling** that is not in the
  deployed bundle:
  - `next` 16.2.6: types and lint config only; no `next` code is bundled,
    and the server bundle is vinext.
  - `vite`, `wrangler`, `miniflare`, `undici`, `ws`, `esbuild`, `tar` and
    `@capacitor/*`: dev server, local runtime and mobile packaging.
  - `eslint-config-next`, `micromatch`, `braces`, `drizzle-kit`, `sharp`,
    `image-size` (used by vinext only at build time), `js-yaml`,
    `brace-expansion`, `browserslist` and similar.
  - **Why not fixed here:** most fixes need major upgrades (vinext 1.x,
    @capacitor/cli 8, drizzle-kit, eslint-config-next) or are outside the
    declared ranges, and the instruction was not to upgrade unrelated
    packages. The in-range ones (`@babel/core`, `brace-expansion`,
    `browserslist`, `js-yaml`, `nanoid`, `source-map-js`, `fflate`,
    `baseline-browser-mapping`) are a reasonable first Dependabot PR.
  - **Risk:** mainly to a developer machine or CI runner, not to users.
  - **Worth doing soon:** upgrade `vite` to ≥ 8.0.16 (Windows dev-server
    issues) and `next` to ≥ 16.4.0 (for tooling hygiene, even though no
    Next.js code is bundled), each as its own tested PR.

---

## 5. Verification for this PR

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | pass |
| `npm run lint` | 0 errors; 1 warning that was already there (`tests/vinayaka-review-fixes.test.mjs`, unused `mountAppWith`) |
| `npm run build` (includes notices `--check`, Panchanga and audio validation) | pass |
| Unit tests `node --test tests/*.test.mjs` | **1,151 / 1,151 pass**: 1,145 existing + 6 new `security-headers` |
| `npm audit --omit=dev` | 0 vulnerabilities (was 1 HIGH) |
| E2E against the worker-backed preview, so real CSP + HSTS + Permissions-Policy apply | `injection-privacy` 32/32 (new), `about` 182/182 (new section checks added), `location-autofill` 66/66 (granted / denied / unavailable / manual), `people-return-navigation` 64/64, `entry-pages` 190/190, `back-navigation` 42/42, `offline` 23/23, `offline-first` 12/12, `journey` 202/202 (every step's instruction and mantra audio, reload/resume, keyboard, no console errors) |
| Real-browser CSP probe | 0 violations on 8 entry pages, Home, Prepare and the puja; hydration OK; audio plays (`/audio/v1/…mp3` advancing); service worker active; geolocation OK |

Not re-verified here: native Capacitor builds, iOS Safari, and production
after this PR. Production changes only when it is redeployed.

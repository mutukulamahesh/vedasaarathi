# Cloudflare Web Analytics — what it does and doesn't measure here (2026-10-12)

Phase 1 only: basic, anonymous traffic for the whole site and the public
entry pages, read from Cloudflare's own existing private dashboard. No
custom events, no second analytics tool, no new URLs, no custom dashboard.

## Why custom events are not used

Cloudflare's own Web Analytics FAQ (developers.cloudflare.com/web-analytics/faq/),
checked directly: custom events are **not supported** — "Not yet, but we may
add support for this in the future." An earlier draft of this investigation
proposed firing Calendar-opened / People-opened / puja-start events through
this tool; that proposal was withdrawn once the FAQ was actually checked.

## What the SPA tracking can and can't see in this app

Per Cloudflare's own docs, the beacon's single-page-app support works by
overriding the History API's `pushState` and listening for `popstate` (a
newer, in-preview version of the same page also mentions the Soft
Navigations API and the Navigation API as alternates, depending on browser
support).

This app already calls `window.history.pushState(...)` on every in-app
screen change (`app/page.tsx`'s `setScreen`) — but always with the *same*
`window.location.pathname`, only differing in the history-state object. The
beacon's own documentation identifies a "route" by the URL, not by anything
app-specific, so a same-path `pushState` almost certainly does not read as a
*distinct* page to Cloudflare's dashboard, even though the navigation event
itself is real and would be detected.

**What this means in practice:** Home, Calendar, People, and the puja steps
all share one path (`/`) today, so Cloudflare Web Analytics is not expected
to distinguish them from each other — only "the app was used" visibility, not
"which screen." The public entry pages (`/panchangam`, `/festivals`,
`/bathukamma-2026`, `/vinayaka-chavithi-puja`, their `/te/...` siblings) each
have a real, distinct path and are expected to report correctly and
individually.

**Honestly unresolved, needs a live look once real traffic exists:** whether
identical-path route changes are silently dropped, double-counted, or shown
as noise in the dashboard is not spelled out in Cloudflare's documentation.
Confirming this needs an actual dashboard observation, not more reading.

## Technical details, from Cloudflare's own FAQ (not its marketing pages)

- Beacon script: `https://static.cloudflareinsights.com/beacon.min.js?token=<site token>`
- Beacon reports to: `https://cloudflareinsights.com/cdn-cgi/rum` (manual/JS-snippet install, which is what this site uses — it is not Cloudflare-DNS-proxied)
- Fires once per pageview: on load, and again when the visitor leaves
- Does **not** log URL query strings ("to avoid collecting potentially sensitive data")
- Requires the `Referer` header (a documented in-progress change narrows this to `Origin`)
- Retention: full/unsampled data for 7 days, then reduced to roughly 10% of records afterward
- The FAQ does **not** state whether the beacon uses cookies, or whether/how IP addresses are stored — those specific claims live only in Cloudflare's marketing copy, not its technical FAQ, and are not verified here. Do not describe this integration as cookie-free or non-tracking on the strength of marketing claims alone; that line in the About screen is deliberately scoped to what's actually been confirmed (anonymous visit counts, no app data ever reaches it) rather than restating Cloudflare's unverified claims.

## SPA measurement: enabled (by default), and what that does and doesn't mean here

The installed snippet carries only `{"token": "..."}` in `data-cf-beacon` — no
`"spa": false` was added, so SPA route-change measurement is **active**
(Cloudflare's own docs describe `spa: false` as the way to turn it *off*,
implying it is on by default). This was a deliberate choice to install
Cloudflare's snippet exactly as generated, not to disable a feature without
reason.

**What this does NOT mean:** it does not mean VedaSaarathi can see which
in-app screen someone is on. As covered above, every in-app screen shares the
path `/`, so SPA measurement here most likely reports repeated activity on
one identical path, not "Calendar" vs. "People" vs. "a puja step." **This
integration does not identify which screen is open and does not track puja
starts** — it was never built to, and nothing in this change claims it does.
The only screens with real, distinct paths are the public entry pages.

## What local testing actually proved, and what it didn't

Checked directly (not assumed): the beacon script loads under the new CSP
with zero Content-Security-Policy violations, and the app continues to
hydrate and navigate normally with it present.

**What this does NOT prove:** that data is actually being collected in
Cloudflare's dashboard. Testing against `http://localhost:34300` triggered
CORS rejections from Cloudflare's own `cloudflareinsights.com` endpoint,
because the Web Analytics site token is registered specifically for
`vedasaarathi.com` — Cloudflare's server correctly refuses to log
localhost traffic under a production site's token. This is expected, not a
bug, but it also means **local testing cannot confirm successful production
data collection**. That can only be confirmed by checking the real Web
Analytics dashboard after this ships to the actual domain.

## Self-correction made during PR review (2026-10-12)

The first draft of the About-screen wording claimed the integration "does
not use cookies" and "does not track you individually across visits" — both
are Cloudflare *marketing* claims, not statements in their technical FAQ
(see above). Caught and corrected before opening the PR: the wording now
describes only what's actually confirmed (basic visit counts; the app's own
data never leaves the device, which is true regardless of Cloudflare's own
practices) and drops the unconfirmed cookie/tracking claims entirely.

## What changed in the app for this

- `worker/security-headers.ts`: CSP `script-src` and `connect-src` each gained exactly one external host (the two above). No other directive changed.
- `lib/site.ts`: the site's Web Analytics token (not a secret — it ships in every page's source; Cloudflare's own docs call it a "site tag", never an API token/key, and it carries no account-level access).
- `app/layout.tsx`: the beacon `<script>` tag, once, in the root layout (confirmed: exactly one real `<script src="...beacon.min.js">` element per rendered document, including on the public entry pages).
- `components/platform/about-screen.tsx`: the "What is sent over the internet" section (EN + TE) now mentions this specifically and narrowly, no longer claims "no analytics of its own," and (after the self-correction above) no longer asserts unconfirmed cookie/tracking claims.

## Still open

- Whether same-path screens report usefully at all, or just as repeated noise on "/" (above) — needs a real dashboard look once live.
- Whether data is actually reaching Cloudflare's dashboard at all — local testing cannot confirm this (above) — needs a real dashboard look once live.
- The EU-visitor-exclusion toggle Cloudflare offers was left as the owner's own call — not enabled or disabled here.
- The Telugu wording added to About was written for this change, not reviewed by a native speaker.

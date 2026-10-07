# ADR 0003: Bilingual public entry pages

Status: Accepted (2026-10-06)

## Context

Until now the app was one public document at `/`. Every screen (Calendar,
Pujas, People, the guided puja) is client-side state on that URL. A search
engine therefore saw one page, and a shared link could only ever open Home.

We want a small set of real public pages that:

- carry useful topic text in the first server response, before JavaScript;
- exist in English and Telugu, with their own title, description, canonical
  URL, reciprocal `hreflang` links and sharing card;
- open the real, existing app screen for that topic, not a separate
  marketing page.

The scope is exactly four topics: Panchangam, the festival calendar,
Bathukamma 2026 dates and the Vinayaka Chavithi guided puja. City-specific
pages, a router rewrite and any new dependency are out of scope.

## Decision

1. **URL scheme: path prefix for Telugu, same slug in both languages.**

   | Topic | English | Telugu |
   | --- | --- | --- |
   | Panchangam | `/panchangam` | `/te/panchangam` |
   | Festival calendar | `/festivals` | `/te/festivals` |
   | Bathukamma 2026 | `/bathukamma-2026` | `/te/bathukamma-2026` |
   | Vinayaka Chavithi puja | `/vinayaka-chavithi-puja` | `/te/vinayaka-chavithi-puja` |

   - A path, not `?lang=te`: each language version is its own URL, which
     is what canonical and `hreflang` expect. Query-string variants are easy
     to drop or merge when shared, cached or crawled.
   - English has no prefix: `/` already serves English by default, so the
     English pages sit beside it. `te` is the ISO 639-1 code for Telugu.
   - The slug is the same in both languages, so a page's sibling is found by
     adding or removing `/te`. Slugs are plain ASCII, easy to type and share.
   - URLs are topic-level only. They never carry a person, Gotra, Sankalpam
     text, city or coordinates.

2. **Each page is a small App Router route** (`app/<slug>/page.tsx`,
   `app/te/<slug>/page.tsx`). It renders the same client app as `/`
   (`VedaSaarathiApp` in `app/page.tsx`) with an `entry` prop. The entry
   only chooses the first screen and its focus, using the values the app's
   own in-app links already use (`lib/entry-pages.ts` `ENTRY_TARGETS`).
   Navigation inside the app is unchanged: the History API around screen
   state, at the same path.

3. **Topic text is a server component** (`components/entry/`), passed into
   the app and shown with the entry screen. It reads only existing data
   modules. It adds no ritual instructions, mantras or dates. Bathukamma
   keeps each day's evidence status, basis, source and `REVIEW_REQUIRED`.

4. **`<html lang>`** comes from the request path. `proxy.ts` (Next.js 16's
   middleware file) always overwrites one internal request header with
   `en` or `te`. The root layout reads it. A client-sent value is never
   trusted. Nothing else in the request or response changes.

5. **An entry link's language is used for that visit only.** It is kept in
   memory and never written to storage. The saved language and location
   are untouched. An explicit choice with the language selector is saved,
   as on `/`.

6. **Offline.** The service worker caches each page's HTML under its own
   path. Before, every navigation was stored as `/`. Offline, an entry page
   reloads from its own copy. A page never visited falls back to the
   cached app shell, which opens Home.

7. **Sitemap.** `/sitemap.xml` lists `/` plus the eight shipped pages, each
   with its language alternates. Only shipped pages are listed.

## Consequences

- Adding a topic means: one `ENTRY_TOPICS` entry, its text and target, two
  route files and its topic content. The sitemap and tests pick it up.
- The root layout now reads a request header, so it is rendered per request.
  It already was in practice (Workers SSR).
- Satyanarayana Vratham has no page. It is documentation only and is not
  implemented in the app.

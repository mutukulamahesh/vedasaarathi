// Public, indexable site facts shared by the root layout metadata, robots.txt
// and sitemap.xml. One origin, written once, so the canonical URL, the sharing
// card URLs and the sitemap can never disagree about the host.
//
// The production host is the apex domain over HTTPS. `www.vedasaarathi.com`
// is not a served host, so it is never used here.

import { ENTRY_PAGE_PATHS } from "./entry-pages";

export const SITE_ORIGIN = "https://vedasaarathi.com" as const;

/** The public, indexable URLs: the homepage "/" plus the bilingual topic
 * entry pages (lib/entry-pages.ts) - /panchangam, /festivals,
 * /bathukamma-2026, /vinayaka-chavithi-puja and their /te/... Telugu
 * siblings. Every other screen (People, Sankalpam, the guided puja, ...) is
 * client-side state on one of these URLs and depends on the visitor's saved
 * location or people, so it is never listed. Add a path here only when a
 * real, shipped public route exists for it. */
export const INDEXABLE_PATHS: readonly string[] = ["/", ...ENTRY_PAGE_PATHS];

/** Locally hosted sharing image (public/social/), 1200x630 PNG. */
export const SHARE_IMAGE = {
  path: "/social/vedasaarathi-share.png",
  width: 1200,
  height: 630,
  alt: "VedaSaarathi: free Hindu Panchangam, festivals and a guided Vinayaka Chavithi puja, in Telugu and English.",
} as const;

export const SITE_TITLE = "VedaSaarathi — Free Hindu Panchangam, Festival & Puja Companion";

/** Only live, shipped capabilities. Vinayaka Chavithi is the one guided puja
 * available in the app today; do not name pujas that are not in
 * lib/puja/catalogue.ts as AVAILABLE. */
export const SITE_DESCRIPTION =
  "Free, location-aware Hindu Panchangam in Telugu and English. See today’s tithi, nakshatra and daily timings for your city, upcoming festivals, and a step-by-step Vinayaka Chavithi puja.";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}

// Head metadata for the bilingual public entry pages (lib/entry-pages.ts).
//
// Every page gets its OWN title and description, a self-referencing absolute
// canonical URL, reciprocal hreflang alternates (each language version lists
// itself AND its sibling, plus x-default -> English), and its own Open Graph
// and Twitter card text. The sharing image and site name are the shared ones
// from lib/site.ts. Like the root layout, no `metadataBase` is used: every URL
// here is written absolute (see app/layout.tsx for why).

import type { Metadata } from "next";

import {
  ENTRY_PAGE_TEXT, entryPath, htmlLang,
  type EntryLanguage, type EntryTopic,
} from "./entry-pages";
import { absoluteUrl, SHARE_IMAGE } from "./site";

/** hreflang -> absolute URL for both language versions of `topic`. The SAME
 * map is emitted on the English and the Telugu page, so the pair is always
 * reciprocal. */
export function entryAlternateLanguages(topic: EntryTopic): Record<string, string> {
  return {
    [htmlLang("EN")]: absoluteUrl(entryPath(topic, "EN")),
    [htmlLang("TE")]: absoluteUrl(entryPath(topic, "TE")),
    "x-default": absoluteUrl(entryPath(topic, "EN")),
  };
}

const OG_LOCALE: Record<EntryLanguage, string> = { EN: "en_IN", TE: "te_IN" };

export function entryMetadata(topic: EntryTopic, language: EntryLanguage): Metadata {
  const text = ENTRY_PAGE_TEXT[topic][language];
  const url = absoluteUrl(entryPath(topic, language));
  const image = absoluteUrl(SHARE_IMAGE.path);
  return {
    title: text.title,
    description: text.description,
    alternates: {
      canonical: url,
      languages: entryAlternateLanguages(topic),
    },
    openGraph: {
      type: "website",
      url,
      siteName: "VedaSaarathi",
      title: text.title,
      description: text.description,
      locale: OG_LOCALE[language],
      images: [
        {
          url: image,
          width: SHARE_IMAGE.width,
          height: SHARE_IMAGE.height,
          alt: SHARE_IMAGE.alt,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: text.title,
      description: text.description,
      images: [{ url: image, alt: SHARE_IMAGE.alt }],
    },
  };
}

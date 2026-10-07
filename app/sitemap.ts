// /sitemap.xml, served by the app router's metadata-route convention (vinext
// renders it as application/xml). Lists only INDEXABLE_PATHS - the real public
// URLs: "/" and the shipped bilingual entry pages - never in-app screens that
// depend on saved location or people. Each entry page also lists its
// English/Telugu alternates (the same reciprocal hreflang map its own <head>
// carries, lib/entry-metadata.ts).
//
// No lastModified / changeFrequency: the build has no honest per-URL
// modification date to report, so none is invented.
import type { MetadataRoute } from "next";

import { entryAlternateLanguages } from "@/lib/entry-metadata";
import { ENTRY_TOPICS, entryPath, type EntryTopic } from "@/lib/entry-pages";
import { absoluteUrl, INDEXABLE_PATHS } from "@/lib/site";

function topicForPath(path: string): EntryTopic | null {
  return ENTRY_TOPICS.find((t) => entryPath(t, "EN") === path || entryPath(t, "TE") === path) ?? null;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.map((path) => {
    const topic = topicForPath(path);
    return topic
      ? { url: absoluteUrl(path), alternates: { languages: entryAlternateLanguages(topic) } }
      : { url: absoluteUrl(path) };
  });
}

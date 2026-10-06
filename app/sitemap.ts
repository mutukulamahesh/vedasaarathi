// /sitemap.xml, served by the app router's metadata-route convention (vinext
// renders it as application/xml). Lists only INDEXABLE_PATHS - the real public
// URLs - never in-app screens that depend on saved location or people.
//
// No lastModified / changeFrequency: the build has no honest per-URL
// modification date to report, so none is invented.
import type { MetadataRoute } from "next";

import { absoluteUrl, INDEXABLE_PATHS } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.map((path) => ({ url: absoluteUrl(path) }));
}

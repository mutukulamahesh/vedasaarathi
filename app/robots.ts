// /robots.txt, served by the app router's metadata-route convention (vinext
// renders it as text/plain). Nothing is disallowed: the only public document
// is "/", and private data (location, people, progress) lives in the visitor's
// browser, never in a URL.
import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

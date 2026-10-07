// Request proxy (Next.js 16 "proxy.ts", formerly middleware.ts) - ONE job:
// tell the root layout which content language this document is in, so the
// server-rendered `<html lang>` is "te" for the Telugu entry pages (/te/...)
// and "en" everywhere else (lib/entry-pages.ts `languageForPath`).
//
// The root layout cannot see the request path itself, so the language is
// passed on an internal request header. The header is ALWAYS overwritten
// here from the path - a value a client sends itself is never trusted - and
// it carries only "en" or "te": no personal, location or tradition data.
// Nothing is redirected, rewritten or logged, and no response is changed.
import { NextResponse, type NextRequest } from "next/server";

import { CONTENT_LANG_HEADER } from "@/lib/content-lang-header";
import { htmlLang, languageForPath } from "@/lib/entry-pages";

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(CONTENT_LANG_HEADER, htmlLang(languageForPath(request.nextUrl.pathname)));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Documents only. Static files (hashed bundles, audio, icons, the share
  // image, the place list) never render the layout and are skipped.
  matcher: ["/((?!assets/|audio/|icons/|social/|geodata/|favicon|manifest\\.webmanifest|sw\\.js|robots\\.txt|sitemap\\.xml).*)"],
};

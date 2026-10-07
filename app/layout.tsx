import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { PwaRegister } from "@/components/platform/pwa-register";
import {
  SHARE_IMAGE, SITE_DESCRIPTION, SITE_ORIGIN, SITE_TITLE,
} from "@/lib/site";
import { CONTENT_LANG_HEADER } from "@/lib/content-lang-header";

// The canonical URL and sharing card here describe the homepage "/". Every
// other public route (the bilingual entry pages, lib/entry-metadata.ts) sets
// its own title, description, `alternates` and Open Graph / Twitter card,
// which replace these.
//
// No `metadataBase`: it would also rewrite the manifest and icon links to the
// production origin, breaking the installable/offline app on any other host
// (local builds, the Capacitor shell) under CSP `manifest-src 'self'`. The
// canonical, Open Graph and Twitter URLs are written absolute instead.
export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "VedaSaarathi",
  alternates: {
    canonical: `${SITE_ORIGIN}/`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_ORIGIN}/`,
    siteName: "VedaSaarathi",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_ORIGIN}${SHARE_IMAGE.path}`,
        width: SHARE_IMAGE.width,
        height: SHARE_IMAGE.height,
        alt: SHARE_IMAGE.alt,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: `${SITE_ORIGIN}${SHARE_IMAGE.path}`, alt: SHARE_IMAGE.alt }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "VedaSaarathi",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6d2815",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The document's content language from the request path, set by proxy.ts:
  // "te" for the Telugu entry pages (/te/...), "en" for everything else.
  // Anything other than exactly "te" is treated as English.
  const lang = (await headers()).get(CONTENT_LANG_HEADER) === "te" ? "te" : "en";
  return (
    <html lang={lang}>
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}

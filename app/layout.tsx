import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/platform/pwa-register";
import {
  SHARE_IMAGE, SITE_DESCRIPTION, SITE_ORIGIN, SITE_TITLE,
} from "@/lib/site";

// The app is one public document at "/" (see lib/site.ts), so the canonical
// URL and sharing card here describe the homepage. A future stand-alone route
// must set its own `alternates.canonical` and Open Graph `url`.
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}

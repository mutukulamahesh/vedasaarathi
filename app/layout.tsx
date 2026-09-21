import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/platform/pwa-register";

export const metadata: Metadata = {
  title: "VedaSaarathi",
  description: "Telugu-first guided puja assistant with location-aware Panchanga.",
  applicationName: "VedaSaarathi",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "VedaSaarathi",
    statusBarStyle: "default",
  },
  other: {
    "codex-preview": "development",
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

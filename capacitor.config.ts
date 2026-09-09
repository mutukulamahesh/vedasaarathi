import type { CapacitorConfig } from "@capacitor/cli";

// VedaSaarathi native wrapper.
//
// The web app is server-rendered (vinext on Cloudflare Workers) and is also an
// offline-capable PWA (public/sw.js). The Capacitor shell therefore loads the
// deployed site over https and lets the service worker take over for offline
// use — the recommended pattern for an SSR + PWA app. Set
// CAP_SERVER_URL to the deployed preview / production URL before `npx cap sync`
// (or edit `server.url` here). `mobile/www/` holds only a bootstrap page used
// when no server URL is configured.

const serverUrl = process.env.CAP_SERVER_URL || "";

const config: CapacitorConfig = {
  appId: "com.vedasaarathi.app",
  appName: "VedaSaarathi",
  webDir: "mobile/www",
  backgroundColor: "#f5f0e8",
  android: {
    // Media (mantra / instruction audio) should keep playing when the app is
    // backgrounded or briefly interrupted; the WebView handles the audio focus.
    allowMixedContent: false,
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: false,
        androidScheme: "https",
      }
    : {
        androidScheme: "https",
      },
  plugins: {
    // Splash handled by the generated native assets; keep it short.
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#6d2815",
      showSpinner: false,
    },
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

// VedaSaarathi native wrapper — a GENERATED remote-wrapper project.
//
// The web app is server-rendered (vinext on Cloudflare Workers) and is also an
// offline-capable PWA (public/sw.js), so the native shell loads the deployed
// site over HTTPS and the service worker takes over for offline use.
//
// A remote-wrapper build MUST be given the deployed URL:
//     CAP_SERVER_URL=https://<deployed-site> npx cap sync
// When CAP_SERVER_URL is absent, any Capacitor CLI operation that would
// produce a build (sync / copy / update / build / run / open) FAILS here rather
// than silently packaging a placeholder page. Inspection-only commands
// (`cap ls`, `cap doctor`) still work.
//
// These native projects have NOT been built or released. See
// docs/MOBILE_PACKAGING.md for the exact signed-release steps and the tooling
// each platform needs.

const serverUrl = (process.env.CAP_SERVER_URL || "").trim();

// argv[2] is the cap subcommand, e.g. `npx cap sync android` -> "sync".
const BUILD_COMMANDS = new Set(["sync", "copy", "update", "build", "run", "open"]);
const subcommand = process.argv[2] ?? "";
if (!serverUrl && BUILD_COMMANDS.has(subcommand)) {
  throw new Error(
    `capacitor.config.ts: CAP_SERVER_URL is not set.\n` +
      `This is a remote-wrapper project — it needs the deployed site URL to package.\n` +
      `Run:  CAP_SERVER_URL=https://<deployed-site> npx cap ${subcommand} ...\n` +
      `(or bundle a static web build into mobile/www and adjust webDir).`,
  );
}

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
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#6d2815",
      showSpinner: false,
    },
  },
};

export default config;

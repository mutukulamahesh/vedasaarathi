# Mobile packaging — Android & iOS (Capacitor)

**Status: these are GENERATED wrapper projects. They have NOT been built or
released, and nothing here is "store-ready" until it is compiled on real
tooling (Android SDK; macOS + Xcode).**

The web app is server-rendered (vinext on Cloudflare Workers) and is also an
offline-capable PWA (`public/sw.js`), so the **Capacitor 6** shell loads the
deployed site over HTTPS and the service worker provides offline use once the
app has been opened online — the standard pattern for an SSR + PWA app.

This is a **remote-wrapper** project: `capacitor.config.ts` throws (fails the
build) if a Capacitor CLI build command — `sync` / `copy` / `update` / `build`
/ `run` / `open` — is run without `CAP_SERVER_URL` set, rather than packaging a
placeholder. Alternatively, bundle a static web build into `mobile/www` and
point `webDir` at it.

## What is in the repo

| Path | What it is |
| --- | --- |
| `capacitor.config.ts` | App id `com.vedasaarathi.app`, name `VedaSaarathi`, `webDir: mobile/www`, splash + background colours, `server.url` from `CAP_SERVER_URL` (required for a build). |
| `mobile/www/index.html` | A plain "this wrapper was packaged without a server URL" page — no fake domain, no redirect. Never shown once `CAP_SERVER_URL` is set. |
| `android/` | The generated Android Gradle project. Location permissions declared (`ACCESS_COARSE/FINE_LOCATION`, both optional features). App icon + adaptive icon + splash (light/dark) generated from `resources/`. |
| `ios/` | The generated Xcode project. `Info.plist` carries `NSLocationWhenInUseUsageDescription` and `ITSAppUsesNonExemptEncryption=false`. |
| `resources/` | `icon.png` (1024) + `splash.png` / `splash-dark.png` (2732) — the sources `@capacitor/assets` renders from. |

`android/local.properties` and `ios/App/Pods` are git-ignored (see each
platform's `.gitignore`); `android/local.properties.example` shows the one line
you need.

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node | 20+ | already used by the web build |
| JDK | 17 or 21 | the Gradle wrapper is pinned to **8.7**, which supports Java 21 |
| Android SDK | Platform 34, Build-Tools 34.0.0 | set `sdk.dir` in `android/local.properties` or `ANDROID_HOME` |
| Xcode | 15+, **macOS only** | plus CocoaPods (`sudo gem install cocoapods`) |

## Build — Android

```bash
export CAP_SERVER_URL="https://<your-deployed-preview-or-prod-url>"
npm run build                        # produce the web assets (for reference)
npx cap sync android                 # copy config + plugins into android/
# one-time: create android/local.properties with sdk.dir=...
cd android
./gradlew assembleDebug              # -> app/build/outputs/apk/debug/app-debug.apk
```

For a **signed Play Store release**:

```bash
# 1. Create an upload keystore (once):
keytool -genkey -v -keystore vedasaarathi-upload.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias upload

# 2. android/keystore.properties (git-ignored):
#      storeFile=/abs/path/vedasaarathi-upload.jks
#      storePassword=...
#      keyAlias=upload
#      keyPassword=...
#    and wire it into android/app/build.gradle signingConfigs.release.

# 3. Build the App Bundle:
cd android
./gradlew bundleRelease              # -> app/build/outputs/bundle/release/app-release.aab

# 4. Upload the .aab in Google Play Console -> Production (or Internal testing
#    for the private beta). Fill the data-safety form: the app requests optional
#    location, stores everything on-device, and sends nothing to a server.
```

## Build — iOS  (macOS + Xcode required)

```bash
export CAP_SERVER_URL="https://<your-deployed-url>"
npx cap sync ios
cd ios/App && pod install && cd -
npx cap open ios                     # opens App.xcworkspace in Xcode
```

In Xcode: set the Team and a unique bundle id under Signing & Capabilities,
bump `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`, then
Product → Archive → Distribute App → App Store Connect. For TestFlight (the
private beta) submit the same archive and add testers.

## App icons & splash

```bash
npx capacitor-assets generate --android \
  --iconBackgroundColor '#6d2815' --splashBackgroundColor '#6d2815'
# on macOS add --ios
```

## Honest status — nothing here is store-ready

| Piece | State |
| --- | --- |
| Web / PWA build | ✅ `npm run build` passes; `/manifest.webmanifest`, `/sw.js`, `/icons/*` serve; installable and offline-capable (see `docs/OFFLINE.md` + the real `npm run test:e2e:offline`). |
| Android project | ✅ **generated wrapper** — `capacitor.config.ts` + `AndroidManifest.xml` (permissions) + icons/splash + Gradle wrapper 8.7. `npx cap sync android` runs (with `CAP_SERVER_URL` set) and Gradle **configuration** completes. ⚠️ **The APK / AAB has NOT been built** — this container has **no Android SDK** (`assembleDebug` stops at *"SDK location not found"*). Not tested on a device or emulator. Not submitted anywhere. |
| iOS project | ✅ **generated wrapper** — Xcode project + `Info.plist` (`NSLocationWhenInUseUsageDescription`, `ITSAppUsesNonExemptEncryption=false`). ⚠️ **Not built, not run, not verified** — that needs macOS + Xcode + CocoaPods, none of which exist here. Only the project structure was checked. |

**Do not describe the Android or iOS app as "release ready" or "verified"
until it has been compiled and run on the real tooling above.**

## Geolocation, audio, storage in the shell

- **Geolocation:** the app uses the standard `navigator.geolocation` from the
  WebView. Android declares the two optional location permissions; iOS carries
  the usage-description string. The runtime permission prompt is handled by the
  OS; the app always offers manual location entry and works if permission is
  denied.
- **Audio:** the bundled MP3s play through the WebView's `<audio>` element. The
  shared coordinator (`lib/audio/playback-coordinator.ts`) still guarantees one
  source at a time. Backgrounding/interruption is handled by the platform audio
  session; nothing extra is needed for short instruction/mantra clips.
- **Device-local storage:** `localStorage` inside the WebView persists across
  launches. No account, no server database. Uninstalling the app clears it.

// Capacitor mobile-packaging scaffolding. Section 9.
//
// This checks the CONFIG and the generated native project STRUCTURE. It does
// not build an APK/IPA (no Android SDK / no macOS here — see
// docs/MOBILE_PACKAGING.md).

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${repo}/${p}`, "utf8");

test("capacitor.config.ts declares the app id, name, webDir and a configurable server URL", () => {
  const cfg = read("capacitor.config.ts");
  assert.match(cfg, /appId:\s*"com\.vedasaarathi\.app"/);
  assert.match(cfg, /appName:\s*"VedaSaarathi"/);
  assert.match(cfg, /webDir:\s*"mobile\/www"/);
  assert.match(cfg, /CAP_SERVER_URL/, "server URL comes from an env var, not hard-coded");
  assert.match(cfg, /SplashScreen/);
});

test("the Android project exists and declares INTERNET + optional location permissions", () => {
  assert.ok(existsSync(`${repo}/android/app/src/main/AndroidManifest.xml`), "android/ generated");
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android\.permission\.INTERNET/);
  assert.match(manifest, /android\.permission\.ACCESS_COARSE_LOCATION/);
  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);
  assert.match(manifest, /android\.hardware\.location"\s+android:required="false"/);
});

test("the Android Gradle wrapper is a version that runs on modern JDKs", () => {
  const wrapper = read("android/gradle/wrapper/gradle-wrapper.properties");
  const m = wrapper.match(/gradle-(\d+)\.(\d+)/);
  assert.ok(m, "a pinned Gradle version");
  const [maj, min] = [Number(m[1]), Number(m[2])];
  assert.ok(maj > 8 || (maj === 8 && min >= 7), `Gradle ${maj}.${min} supports Java 21+`);
});

test("the Android app has generated launcher icons and splash screens", () => {
  for (const p of [
    "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    "android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml",
    "android/app/src/main/res/drawable-port-xxxhdpi/splash.png",
    "android/app/src/main/res/drawable-night/splash.png",
  ]) {
    assert.ok(existsSync(`${repo}/${p}`), `${p} generated`);
  }
});

test("the iOS project exists and its Info.plist carries the location usage description", () => {
  assert.ok(existsSync(`${repo}/ios/App/App/Info.plist`), "ios/ generated");
  const plist = read("ios/App/App/Info.plist");
  assert.match(plist, /NSLocationWhenInUseUsageDescription/);
  assert.match(plist, /calculate .*Panchanga/i);
  assert.match(plist, /ITSAppUsesNonExemptEncryption/);
});

test("the icon / splash source images used by @capacitor/assets are present", () => {
  for (const p of ["resources/icon.png", "resources/splash.png", "resources/splash-dark.png"]) {
    assert.ok(existsSync(`${repo}/${p}`), `${p} present`);
  }
});

test("docs/MOBILE_PACKAGING.md documents signed-release steps and the environment limitation", () => {
  const doc = read("docs/MOBILE_PACKAGING.md");
  assert.match(doc, /bundleRelease/);
  assert.match(doc, /App Store Connect/);
  assert.match(doc, /no Android SDK installed/i);
  assert.match(doc, /requires macOS \+ Xcode/i);
});

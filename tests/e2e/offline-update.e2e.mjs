// REAL end-to-end tests for two release-blocking defects fixed in this batch:
//
//   1. OFFLINE UPDATE DEFECT — the service worker was returning an OLD cached
//      /offline-manifest.json for a `cache: "no-store"` update check, with
//      zero network calls, so "check for updates" (and a re-download) could
//      never see a byte that changed after the previous offline download.
//   2. AUDIO RANGE SUPPORT — cached audio never answered a byte-range GET
//      with a real 206 Partial Content response, which iOS Safari in
//      particular needs to seek within an <audio> element.
//
// Runs against a PRODUCTION server (`vinext start`) so the real service
// worker (public/sw.js) registers and runs. "Build B" is simulated with
// Playwright request interception on top of the one real build under test
// (not a second `npm run build`): the manifest and one representative file
// are swapped for different bytes/version after "build A" has been
// downloaded, which is exactly the situation the service worker has to tell
// apart from "nothing changed" — a real second build would differ from A in
// the very same way (different bytes behind an unchanged URL), so this
// exercises the actual defect precisely, and quickly.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env.OFFLINE_UPDATE_PORT || 3212);
const BASE = `http://localhost:${PORT}/`;

let fails = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
};
const section = (t) => console.log(`\n— ${t}`);

async function waitForServer(url, ms = 90000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const nav = async (p, i) => { await p.locator(".bottom-nav button").nth(i).click({ force: true }); await p.waitForTimeout(400); };
const gotoOffline = async (p) => { await nav(p, 3); await p.locator(".offline-download").waitFor({ timeout: 20000 }); };
// Forces a genuine unmount+remount of OfflineDownload (its "check for
// updates" fetch only runs on mount) - clicking the already-active Pujas tab
// again is a same-screen no-op in this app's navigation.
const remountOffline = async (p) => { await nav(p, 0); await p.locator(".today-card").waitFor({ timeout: 20000 }); await gotoOffline(p); };
const swReady = (p) => p.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  return Boolean(reg && (reg.active || reg.installing || reg.waiting));
});

async function main() {
  if (!existsSync(`${REPO}dist/client/sw.js`)) {
    console.error("FAIL  no production build — run `npm run build` first (dist/client/sw.js missing).");
    process.exit(1);
  }
  console.log(`— starting vinext start on :${PORT}`);
  const server = spawn("npx", ["vinext", "start", "--port", String(PORT)], {
    cwd: REPO, env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", () => {});
  server.stderr.on("data", () => {});

  const up = await waitForServer(BASE);
  if (!up) {
    console.error(`FAIL  server at ${BASE} did not become ready.`);
    server.kill("SIGKILL");
    process.exit(1);
  }

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => {
    // Two things below are DELIBERATELY broken to prove this batch's fixes: an
    // out-of-bounds Range request (proves the 416 response) and one aborted
    // download request (proves an interrupted download is handled safely).
    // Chromium logs a "failed to load resource" console error for both,
    // which is expected noise from those two intentional probes, not an app
    // defect - a real user's audio player never asks for a range past the
    // end of the file, and a real network drop is not this test's own
    // route.abort() call.
    if (m.type() === "error" && !/status of 416|net::ERR_FAILED/.test(m.text())) errors.push(m.text());
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  try {
    /* ---------------------------------------------------------------- */
    section("Setup: online load, service worker active, save location + progress");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    ok(await swReady(page), "service worker installs and becomes ready");
    await page.evaluate(() => {
      localStorage.setItem("vedasaarathi:location:v1", JSON.stringify({
        status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
        city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
        accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
      }));
      localStorage.setItem("vedasaarathi:preparation:v3", JSON.stringify({
        mode: "SELF",
        participants: [{ id: "p1", name: "Mahesh", gotra: { status: "KNOWN", name: "Bharadwaja" },
          veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } }],
        language: "EN", runs: {},
      }));
    });

    const manifestA = await (await fetch(`${BASE}offline-manifest.json`)).json();
    ok(typeof manifestA.version === "string" && manifestA.urls.length > 50, `real build manifest A: version ${manifestA.version}, ${manifestA.urls.length} files`);
    // A non-executable, non-hashed file (its URL is stable across builds, same
    // as an icon or the manifest) - safe to mutate for "build B" without
    // corrupting any code the app actually runs, while still proving the
    // exact same mechanism (fresh bytes behind an unchanged URL after an
    // update, not silently kept from the previous download).
    const sampleAsset = "/THIRD_PARTY_NOTICES.txt";
    ok(manifestA.urls.includes(sampleAsset), "a representative non-code URL exists to mutate for 'build B'");
    const originalAssetBytes = await (await fetch(`${BASE}${sampleAsset}`)).text();

    /* ---------------------------------------------------------------- */
    section("Download A (build A)");
    await gotoOffline(page);
    await page.locator(".offline-download-actions button").first().click();
    await page.locator(".offline-download-ok, .offline-download-partial, .offline-download-error").first().waitFor({ timeout: 120000 });
    const bodyText = await page.locator(".offline-download").innerText();
    ok(await page.locator(".offline-download-ok").count() === 1, "build A: fully downloaded (no failures)", bodyText.slice(0, 200));
    const cacheNamesAfterA = await page.evaluate(() => caches.keys());
    const offlineCacheA = cacheNamesAfterA.filter((n) => n.startsWith("vs-offline-"));
    ok(offlineCacheA.length === 1 && offlineCacheA[0] === `vs-offline-${manifestA.version}`, `exactly one offline cache, keyed by build A's version (${offlineCacheA.join(",")})`);

    /* ---------------------------------------------------------------- */
    section("THE DEFECT: a 'check for updates' after a completed download must reach the network, not answer from a stale cached response");
    // Seed the exact condition the bug needed: fetch the manifest once more
    // through the normal page (as ANY earlier interaction could), so it is
    // sitting in the regular (non-offline) browsing cache too.
    await page.evaluate((url) => fetch(url), `${BASE}offline-manifest.json`);
    let manifestFetchesSeenByServer = 0;
    await ctx.route("**/offline-manifest.json", async (route) => {
      manifestFetchesSeenByServer += 1;
      const versionB = `${manifestA.version}-testB`;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...manifestA, version: versionB, generatedAt: new Date().toISOString() }),
      });
    });
    const seenAfterBypass = await page.evaluate(async (url) => {
      const res = await fetch(url, { cache: "no-store" });
      return res.json();
    }, `${BASE}offline-manifest.json`);
    ok(manifestFetchesSeenByServer > 0, "a `cache: \"no-store\"` fetch for the manifest actually reached the network (route intercepted it)");
    ok(seenAfterBypass.version === `${manifestA.version}-testB`, `the FRESH (mocked "build B") version was returned, not the stale cached one — got "${seenAfterBypass.version}"`);
    await ctx.unroute("**/offline-manifest.json");

    /* ---------------------------------------------------------------- */
    section("Genuine two-build upgrade: simulate build B (mutated manifest + one changed file), check for updates, download B, verify content is fresh");
    const versionB = `${manifestA.version}-buildB`;
    const mutatedAssetBytes = `${originalAssetBytes}\n/* build B marker ${versionB} */`;
    await ctx.route("**/offline-manifest.json", (route) => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ ...manifestA, version: versionB, generatedAt: new Date().toISOString() }),
    }));
    await ctx.route(`**${sampleAsset}`, (route) => route.fulfill({
      status: 200, contentType: "text/plain", body: mutatedAssetBytes,
    }));

    await remountOffline(page); // remounts OfflineDownload -> auto checkForUpdate since something is already downloaded
    await page.locator(".offline-download-update").waitFor({ timeout: 20000 });
    ok(true, "'check for updates' correctly reports an update is available for simulated build B");

    await page.locator(".offline-download-actions button").first().click(); // "Update" button
    await page.locator(".offline-download-ok, .offline-download-error").first().waitFor({ timeout: 120000 });
    ok(await page.locator(".offline-download-ok").count() === 1, "build B: downloads to completion");

    const cacheNamesAfterB = await page.evaluate(() => caches.keys());
    const offlineCachesAfterB = cacheNamesAfterB.filter((n) => n.startsWith("vs-offline-"));
    ok(
      offlineCachesAfterB.length === 1 && offlineCachesAfterB[0] === `vs-offline-${versionB}`,
      `old build A's offline cache was removed only AFTER B's complete download succeeded (now: ${offlineCachesAfterB.join(",")})`,
    );
    const cachedAssetBody = await page.evaluate(async (asset) => {
      const names = await caches.keys();
      for (const name of names.filter((n) => n.startsWith("vs-offline-"))) {
        const cache = await caches.open(name);
        const res = await cache.match(asset);
        if (res) return res.text();
      }
      return null;
    }, sampleAsset);
    ok(
      typeof cachedAssetBody === "string" && cachedAssetBody.includes(versionB),
      "the re-downloaded file's cached content is build B's (fresh), not build A's (stale) bytes",
    );

    /* ---------------------------------------------------------------- */
    section("Data survives the upgrade");
    const dataAfterUpgrade = await page.evaluate(() => ({
      location: localStorage.getItem("vedasaarathi:location:v1"),
      preparation: localStorage.getItem("vedasaarathi:preparation:v3"),
    }));
    ok(dataAfterUpgrade.location?.includes("Hyderabad"), "saved location survives the upgrade");
    ok(dataAfterUpgrade.preparation?.includes("Mahesh"), "saved participant/progress data survives the upgrade");

    /* ---------------------------------------------------------------- */
    section("Cold-start offline on build B");
    await ctx.unroute("**/offline-manifest.json");
    await ctx.unroute(`**${sampleAsset}`);
    await ctx.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".location-button").waitFor({ timeout: 20000 });
    ok(/Hyderabad/i.test(await page.locator(".location-button").innerText()), "offline cold start: saved location still shown");
    await ctx.setOffline(false);

    /* ---------------------------------------------------------------- */
    section("Interrupted download + network recovery: build A stays usable, nothing marked ready prematurely");
    // Force this run's download to fail partway through by aborting one file.
    let abortedOnce = false;
    const flakyUrl = manifestA.urls.find((u) => u.startsWith("/audio/") && u.endsWith(".mp3"));
    await ctx.route(`**${flakyUrl}`, (route) => {
      if (!abortedOnce) { abortedOnce = true; return route.abort("failed"); }
      return route.continue();
    });
    await remountOffline(page);
    await page.locator(".offline-download-actions button").first().click();
    await page.locator(".offline-download-ok, .offline-download-error, .offline-download-partial").first().waitFor({ timeout: 120000 });
    const interruptedText = await page.locator(".offline-download").innerText();
    ok(/error|failed|couldn/i.test(interruptedText) || (await page.locator(".offline-download-error").count()) > 0, "an interrupted re-download reports a failure, not silent success", interruptedText.slice(0, 200));
    ok((await page.locator(".offline-download-ok").count()) === 0, "an interrupted download is never shown as fully 'downloaded'");
    const cacheNamesAfterInterrupt = await page.evaluate(() => caches.keys());
    ok(
      cacheNamesAfterInterrupt.some((n) => n.startsWith("vs-offline-")),
      "the previous complete offline copy is still present after an interrupted re-download attempt",
    );
    await ctx.unroute(`**${flakyUrl}`);

    // Network recovery: retry now succeeds.
    await remountOffline(page);
    const retryStatus = await page.locator(".offline-download-update, .offline-download-partial").first();
    if (await retryStatus.count()) await page.locator(".offline-download-actions button").first().click();
    await page.locator(".offline-download-ok").waitFor({ timeout: 120000 });
    ok(true, "after network recovery, retrying the download completes successfully");

    /* ---------------------------------------------------------------- */
    section("Audio Range (206) support — full, bounded, open-ended, suffix, invalid");
    const audioUrl = manifestA.urls.find((u) => u.startsWith("/audio/") && u.endsWith(".mp3"));
    const full = await page.evaluate(async (u) => {
      const r = await fetch(u);
      const buf = await r.arrayBuffer();
      return { status: r.status, length: buf.byteLength, acceptRanges: r.headers.get("Accept-Ranges") };
    }, audioUrl);
    ok(full.status === 200 && full.length > 1000, `full-file request: 200 with a real body (${full.length} bytes)`);

    const size = full.length;
    const cases = [
      { name: "bounded (0-99)", header: "bytes=0-99", expectStatus: 206, expectLen: 100 },
      { name: "open-ended (100-)", header: "bytes=100-", expectStatus: 206, expectLen: size - 100 },
      { name: "suffix (-100)", header: "bytes=-100", expectStatus: 206, expectLen: 100 },
      { name: "invalid/unsatisfiable (99999999-)", header: "bytes=99999999-", expectStatus: 416, expectLen: 0 },
    ];
    for (const c of cases) {
      const r = await page.evaluate(async ({ u, header }) => {
        const res = await fetch(u, { headers: { Range: header } });
        const buf = await res.arrayBuffer();
        return {
          status: res.status,
          length: buf.byteLength,
          contentRange: res.headers.get("Content-Range"),
          contentType: res.headers.get("Content-Type"),
        };
      }, { u: audioUrl, header: c.header });
      ok(r.status === c.expectStatus, `${c.name}: status ${r.status} (expected ${c.expectStatus})`, JSON.stringify(r));
      if (c.expectStatus === 206) {
        ok(r.length === c.expectLen, `${c.name}: body is exactly ${c.expectLen} bytes (got ${r.length})`);
        ok(Boolean(r.contentRange) && r.contentRange.startsWith("bytes ") && r.contentRange.endsWith(`/${size}`), `${c.name}: Content-Range is present and correct (${r.contentRange})`);
        ok(r.contentType === "audio/mpeg", `${c.name}: Content-Type is audio/mpeg`);
      } else {
        ok(r.contentRange === `bytes */${size}`, `${c.name}: 416 carries Content-Range: bytes */${size} (got ${r.contentRange})`);
      }
    }

    section("Offline seeking: Range requests work with no network at all");
    await ctx.setOffline(true);
    const offlineRange = await page.evaluate(async (u) => {
      const res = await fetch(u, { headers: { Range: "bytes=10-59" } });
      const buf = await res.arrayBuffer();
      return { status: res.status, length: buf.byteLength, contentRange: res.headers.get("Content-Range") };
    }, audioUrl);
    ok(offlineRange.status === 206 && offlineRange.length === 50, `offline: a bounded Range request still gets a real 206 slice (${JSON.stringify(offlineRange)})`);
    await ctx.setOffline(false);

    ok(errors.length === 0, `no console/page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);
  } finally {
    await browser.close();
    server.kill("SIGKILL");
  }

  console.log(`\n${fails === 0 ? "OFFLINE-UPDATE + RANGE E2E PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

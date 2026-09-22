// A REAL A-to-B production-build upgrade, distinct from offline-update.e2e.mjs's
// simulated build B (which swaps one manifest + one text file via Playwright
// request interception, on top of a SINGLE real build). This test instead
// serves two ACTUAL `npm run build` outputs from two different source trees,
// one after the other, on the SAME origin/port, so:
//
//   - the browser's own real HTTP cache (not intercepted) genuinely holds a
//     build-A response before build B is served - proving the audio bypass
//     fix (public/sw.js audioStrategy honoring `request.cache`) against a
//     response the browser itself decided to cache, not a synthetic one;
//   - the JS application chunks are genuinely different (different content
//     hashes), not just one swapped text file;
//   - the build identifier shown in About is proven to reflect the bundle
//     actually running, including after a cold-start offline reload, not a
//     value fetched fresh from whichever server happens to answer.
//
// "Build B" is produced from a disposable git worktree at the same commit,
// with two intentionally different bytes: a stable-URL audio file gets a
// trailing marker appended (changed bytes, same URL - what a real content
// correction to already-shipped audio would look like), and one source file
// gets a one-line comment (forces a new content-hashed JS chunk name). This
// worktree and its build are scratch - nothing here is committed, and the
// worktree is removed when the test finishes.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env.REAL_BUILD_UPGRADE_PORT || 3213);
const BASE = `http://localhost:${PORT}/`;
const AUDIO_URL = "/audio/v1/achamana.en.plain.mp3";
const AUDIO_SOURCE = "public/audio/v1/achamana.en.plain.mp3";

let fails = 0, checks = 0;
const ok = (cond, msg, extra = "") => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}${!cond && extra ? "  ::  " + extra : ""}`);
};
const section = (t) => console.log(`\n— ${t}`);

async function waitForServer(url, ms = 90000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { const r = await fetch(url); if (r.ok) return true; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
async function waitForPortFree(ms = 15000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { await fetch(BASE); } catch { return true; }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
function startServer(cwd) {
  // `npx` forks a grandchild (the actual vinext/node process) - killing just
  // the npx PID leaves that grandchild running, which matters here because,
  // unlike other e2e suites, this test starts a SECOND server on the SAME
  // port within one run (to swap build A for build B without changing
  // origin). `detached: true` puts the whole tree in its own process group,
  // so killServer below can kill the group, not just npx.
  const server = spawn("npx", ["vinext", "start", "--port", String(PORT)], {
    cwd, env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  server.stdout.on("data", () => {});
  server.stderr.on("data", () => {});
  return server;
}
function killServer(server) {
  if (!server || server.killed) return;
  try { process.kill(-server.pid, "SIGKILL"); } catch { try { server.kill("SIGKILL"); } catch { /* already gone */ } }
}

/** Build a real, disposable "build B" from a throwaway worktree at the
 * current commit: a changed audio file (same URL, different bytes) and a
 * changed source file (different content-hashed JS chunk). Returns the
 * worktree's dist dir and a cleanup function. */
function buildRealBuildB() {
  const wt = mkdtempSync(join(tmpdir(), "vs-buildB-"));
  execFileSync("git", ["worktree", "add", "--detach", wt, "HEAD"], { cwd: REPO, stdio: "pipe" });
  execFileSync("ln", ["-s", join(REPO, "node_modules"), join(wt, "node_modules")]);

  const audioPath = join(wt, AUDIO_SOURCE);
  const original = readFileSync(audioPath);
  const tag = Buffer.alloc(128);
  tag.write("TAG", 0, "latin1");
  tag.write("buildB-marker", 97, "latin1");
  writeFileSync(audioPath, Buffer.concat([original, tag]));

  const pagePath = join(wt, "app/page.tsx");
  const pageSrc = readFileSync(pagePath, "utf8");
  writeFileSync(pagePath, pageSrc.replace(
    '"use client";\n',
    '"use client";\n// build-B marker for tests/e2e/real-build-upgrade.e2e.mjs - not part of the shipped source.\n',
  ));

  execFileSync("npm", ["run", "build"], { cwd: wt, stdio: "pipe" });

  return {
    dir: wt,
    cleanup: () => {
      rmSync(wt, { recursive: true, force: true });
      try { execFileSync("git", ["worktree", "prune"], { cwd: REPO, stdio: "pipe" }); } catch { /* best effort */ }
    },
  };
}

const nav = async (p, i) => { await p.locator(".bottom-nav button").nth(i).click({ force: true }); await p.waitForTimeout(400); };
const gotoOffline = async (p) => { await nav(p, 3); await p.locator(".offline-download").waitFor({ timeout: 20000 }); };
const remountOffline = async (p) => { await nav(p, 0); await p.locator(".today-card").waitFor({ timeout: 20000 }); await gotoOffline(p); };
const swReady = (p) => p.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  return Boolean(reg && (reg.active || reg.installing || reg.waiting));
});
const buildIdShown = async (p) => {
  await p.locator(".about-link").click();
  await p.locator(".about-page h1").waitFor();
  const line = await p.locator(".about-build").innerText();
  // In-app Back (not page.goBack()): a real browser history navigation here
  // risks Chromium's back/forward cache swapping in a stale page instance
  // and destroying this evaluate context, which is irrelevant noise this
  // test does not want to depend on.
  await p.locator(".back-button").click();
  await p.locator(".today-card").waitFor({ timeout: 20000 });
  const m = /([0-9a-f]{7})\+?/.exec(line);
  return m ? m[1] : null;
};

async function main() {
  if (!existsSync(`${REPO}dist/client/sw.js`)) {
    console.error("FAIL  no production build A — run `npm run build` first (dist/client/sw.js missing).");
    process.exit(1);
  }

  console.log("— building a real, disposable build B in a throwaway worktree...");
  const buildB = buildRealBuildB();
  const buildInfoA = JSON.parse(readFileSync(`${REPO}dist/client/build-info.json`, "utf8"));
  const buildInfoB = JSON.parse(readFileSync(`${buildB.dir}/dist/client/build-info.json`, "utf8"));
  ok(buildInfoA.commitShort !== buildInfoB.commitShort || buildInfoA.dirty !== buildInfoB.dirty, "build A and build B carry distinguishable build identifiers");
  const audioSizeA = readFileSync(`${REPO}dist/client/${AUDIO_URL.replace(/^\//, "")}`).length;
  const audioSizeB = readFileSync(`${buildB.dir}/dist/client/${AUDIO_URL.replace(/^\//, "")}`).length;
  ok(audioSizeA !== audioSizeB, `build B's audio file at the SAME URL has different bytes (A: ${audioSizeA}, B: ${audioSizeB})`);
  const chunkListA = execFileSync("bash", ["-c", "ls dist/client/assets | grep '^page-'"], { cwd: REPO }).toString().trim();
  const chunkListB = execFileSync("bash", ["-c", "ls dist/client/assets | grep '^page-'"], { cwd: buildB.dir }).toString().trim();
  ok(chunkListA !== chunkListB, `build B's application chunk has a different content hash (A: ${chunkListA}, B: ${chunkListB})`);
  const manifestVersionA = JSON.parse(readFileSync(`${REPO}dist/client/offline-manifest.json`, "utf8")).version;
  const manifestVersionB = JSON.parse(readFileSync(`${buildB.dir}/dist/client/offline-manifest.json`, "utf8")).version;
  ok(manifestVersionA !== manifestVersionB, `build A and B have different offline-manifest content versions (A: ${manifestVersionA}, B: ${manifestVersionB})`);

  console.log(`— starting build A (${REPO}) on :${PORT}`);
  let server = startServer(REPO);
  let up = await waitForServer(BASE);
  if (!up) { console.error(`FAIL  server at ${BASE} did not become ready.`); killServer(server); buildB.cleanup(); process.exit(1); }

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  try {
    /* ---------------------------------------------------------------- */
    section("Build A: online load, save location + Telugu language + progress");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    ok(await swReady(page), "service worker A installs and becomes ready");
    const idA = await buildIdShown(page);
    ok(idA === buildInfoA.commitShort, `About shows build A's own identifier (${idA})`, JSON.stringify(buildInfoA));

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
        language: "TE", runs: {},
      }));
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".today-card").waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    ok(/Hyderabad/i.test(await page.locator(".location-button").innerText()), "location saved before the upgrade");

    /* ---------------------------------------------------------------- */
    section("Build A: prime the browser's REAL HTTP cache for the audio URL (no interception)");
    const primedA = await page.evaluate(async (u) => {
      const r = await fetch(u); // default cache mode - the browser decides whether/how to cache this
      const buf = await r.arrayBuffer();
      return { status: r.status, length: buf.byteLength };
    }, AUDIO_URL);
    ok(primedA.status === 200 && primedA.length === audioSizeA, `build A's audio bytes are genuinely cached by the browser (${primedA.length} bytes)`, JSON.stringify(primedA));

    /* ---------------------------------------------------------------- */
    section("Build A: full offline download");
    await gotoOffline(page);
    await page.locator(".offline-download-actions button").first().click();
    await page.locator(".offline-download-ok, .offline-download-error").first().waitFor({ timeout: 120000 });
    ok((await page.locator(".offline-download-ok").count()) === 1, "build A downloaded for offline use");

    /* ---------------------------------------------------------------- */
    section("Swap to build B on the SAME origin, without clearing any storage");
    killServer(server);
    await waitForPortFree();
    console.log(`— starting build B (${buildB.dir}) on :${PORT}`);
    server = startServer(buildB.dir);
    up = await waitForServer(BASE);
    ok(up, "build B's server is serving on the same port/origin");
    // waitForServer only proves the root document responds; the Workers
    // runtime can take a little longer to have every route (including
    // /offline-manifest.json) actually serving build B's content, and the
    // app's own "check for updates" fetch runs exactly once per mount with no
    // retry on failure - so confirm the manifest itself is really build B's
    // before asking the UI to notice, instead of racing it.
    const manifestSettled = await (async () => {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        try {
          const j = await (await fetch(`${BASE}offline-manifest.json`, { cache: "no-store" })).json();
          if (j.version === manifestVersionB) return true;
        } catch { /* not ready yet */ }
        await new Promise((r) => setTimeout(r, 300));
      }
      return false;
    })();
    ok(manifestSettled, "build B's /offline-manifest.json is actually being served before checking the UI");

    // The app's own check-for-update runs once on mount with no retry, so
    // retry the remount a couple of times against any remaining timing noise
    // rather than depending on a single race-free attempt.
    let updateSeen = false;
    for (let attempt = 0; attempt < 3 && !updateSeen; attempt += 1) {
      await remountOffline(page); // triggers the app's own "check for updates" on mount
      updateSeen = await page.locator(".offline-download-update").isVisible().catch(() => false)
        || await page.locator(".offline-download-update").waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    }
    ok(updateSeen, "'check for updates' detects a real update is available (build B)");
    await page.locator(".offline-download-actions button").first().click();
    await page.locator(".offline-download-ok, .offline-download-error").first().waitFor({ timeout: 120000 });
    ok((await page.locator(".offline-download-ok").count()) === 1, "build B downloads to completion");

    /* ---------------------------------------------------------------- */
    section("The new application (build B) actually runs, with the previous service worker having handed off cleanly");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".today-card").waitFor({ timeout: 20000 });
    const idB = await buildIdShown(page);
    ok(idB === buildInfoB.commitShort && idB !== idA, `About now shows build B's identifier (${idB}), not build A's (${idA}) - tied to the bundle actually running, not a fetched value`, JSON.stringify(buildInfoB));

    /* ---------------------------------------------------------------- */
    section("Audio bypass fix: a reload/no-store fetch for the SAME URL gets build B's fresh bytes, not the response already sitting in the browser's real HTTP cache from build A");
    const refetched = await page.evaluate(async (u) => {
      const r = await fetch(u, { cache: "reload" });
      const buf = await r.arrayBuffer();
      return { status: r.status, length: buf.byteLength };
    }, AUDIO_URL);
    ok(refetched.length === audioSizeB && refetched.length !== audioSizeA, `a "reload" fetch returns build B's bytes (${refetched.length}), not the previously HTTP-cached build A bytes (${audioSizeA})`, JSON.stringify(refetched));
    const cachedOfflineAudioBody = await page.evaluate(async (u) => {
      const names = await caches.keys();
      for (const name of names.filter((n) => n.startsWith("vs-offline-"))) {
        const cache = await caches.open(name);
        const res = await cache.match(u);
        if (res) { const buf = await res.arrayBuffer(); return buf.byteLength; }
      }
      return null;
    }, AUDIO_URL);
    ok(cachedOfflineAudioBody === audioSizeB, `the offline cache itself also holds build B's audio bytes (${cachedOfflineAudioBody}), not build A's stale copy`);

    /* ---------------------------------------------------------------- */
    section("Data survives the real upgrade: location, language, progress");
    const dataAfter = await page.evaluate(() => ({
      location: localStorage.getItem("vedasaarathi:location:v1"),
      preparation: localStorage.getItem("vedasaarathi:preparation:v3"),
    }));
    ok(dataAfter.location?.includes("Hyderabad"), "saved location survives the real A-to-B upgrade");
    ok(dataAfter.preparation?.includes("\"language\":\"TE\""), "saved language (Telugu) survives the real A-to-B upgrade");
    ok(dataAfter.preparation?.includes("Mahesh"), "saved participant/progress data survives the real A-to-B upgrade");

    /* ---------------------------------------------------------------- */
    section("Cold-start offline on build B");
    await ctx.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".location-button").waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    ok(/Hyderabad/i.test(await page.locator(".location-button").innerText()), "offline cold start on build B: saved location still shown");
    await ctx.setOffline(false);

    /* ---------------------------------------------------------------- */
    section("An interrupted re-download of build B never gets used as if it were the completed app");
    let abortedOnce = false;
    const manifestB = await (await fetch(`${BASE}offline-manifest.json`)).json();
    const flakyUrl = manifestB.urls.find((u) => u.startsWith("/audio/") && u.endsWith(".mp3") && u !== AUDIO_URL);
    await ctx.route(`**${flakyUrl}`, (route) => {
      if (!abortedOnce) { abortedOnce = true; return route.abort("failed"); }
      return route.continue();
    });
    // Remove build B's just-completed offline copy, then re-download it with
    // one file forced to fail partway through, so this attempt leaves behind
    // a genuinely incomplete vs-offline-* cache - exactly the state
    // offlineCacheIsComplete() in sw.js must recognize and refuse to serve
    // from as if it were the finished app.
    await gotoOffline(page); // the earlier reload landed back on Home, not Pujas/Offline
    await page.locator(".offline-download-remove").click();
    await page.waitForTimeout(500);
    await remountOffline(page);
    await page.locator(".offline-download-actions button").first().click();
    await page.locator(".offline-download-ok, .offline-download-error, .offline-download-partial").first().waitFor({ timeout: 120000 });
    ok((await page.locator(".offline-download-ok").count()) === 0, "the interrupted download is never shown as fully 'downloaded'");

    const incompleteCacheState = await page.evaluate(async () => {
      const names = (await caches.keys()).filter((n) => n.startsWith("vs-offline-"));
      const out = [];
      for (const name of names) {
        const cache = await caches.open(name);
        const meta = await cache.match("/__offline_meta__");
        if (!meta) { out.push({ name, complete: false, reason: "no meta" }); continue; }
        const j = await meta.json();
        out.push({ name, complete: Number(j.cached) >= Number(j.total), cached: j.cached, total: j.total });
      }
      return out;
    });
    ok(
      incompleteCacheState.length > 0 && incompleteCacheState.every((c) => !c.complete),
      "every vs-offline-* cache left by the interrupted download is genuinely incomplete (no meta, or cached < total) - offlineCacheIsComplete() in sw.js would correctly refuse to serve from it",
      JSON.stringify(incompleteCacheState),
    );
    await ctx.unroute(`**${flakyUrl}`);

    ok(errors.length === 0, `no console/page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);
  } finally {
    await browser.close();
    killServer(server);
    buildB.cleanup();
  }

  console.log(`\n${fails === 0 ? "REAL A-TO-B BUILD UPGRADE E2E PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

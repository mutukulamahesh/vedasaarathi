// A REAL migration from the currently-deployed main service worker to the
// corrected one in this PR, distinct from offline-update.e2e.mjs's simulated
// build B (which swaps one manifest + one text file via Playwright request
// interception, on top of a SINGLE real build).
//
// Build A is a genuine `npm run build` of `origin/main` - what is actually
// deployed today, with the OLD, pre-fix service worker (no cache-bypass
// fix, no Range/206 support, no build-id feature at all). Build B is a
// genuine `npm run build` of this PR's exact HEAD commit, PLUS one real,
// temporary git commit that changes one audio file's bytes at its existing,
// stable URL (what a real content correction to already-shipped audio would
// look like - the specific scenario the audio cache-bypass fix targets).
// Both builds run from their OWN worktree, with their OWN fresh install (A)
// or the current repo's already-installed node_modules for the SAME
// lockfile (B) - never from a stray leftover dist/ directory.
//
// This proves, with directly observable evidence (not inference from a
// successful fetch, and not just persisted localStorage):
//   - build A and B carry genuinely distinct, deterministic build
//     identifiers (two real commits, not a dirty worktree compared to
//     itself) and a genuinely different service worker VERSION constant -
//     so the browser's real SW update lifecycle (install/activate/
//     clients.claim) actually runs once, migrating from the deployed
//     worker to the corrected one, not a same-script no-op;
//   - the audio URL's Cache Storage entry is inspected directly, before and
//     after, and a passive network-request counter proves an actual cache
//     HIT (no outgoing request) vs an actual cache BYPASS (a real request
//     despite an existing entry) - not merely "a fetch returned 200";
//   - after a cold-start offline reload on build B, About shows build B's
//     own compiled identifier (not a fetched value, and not build A's) and
//     the Home screen shows REAL, freshly computed Panchanga content
//     (Sunrise/Tithi), not just a persisted string;
//   - saved location, language and progress survive the real migration.
//
// Both worktrees and the temporary commit are scratch: nothing here is
// pushed, and everything is removed when the test finishes.

import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env.REAL_BUILD_UPGRADE_PORT || 3213);
const BASE = `http://localhost:${PORT}/`;
const AUDIO_URL = "/audio/v1/achamana.en.plain.mp3";
const AUDIO_SOURCE = "public/audio/v1/achamana.en.plain.mp3";
const MAIN_REF = process.env.REAL_BUILD_UPGRADE_MAIN_REF || "origin/main";
const NPM_CACHE = join(REPO, ".sites-runtime/npm-cache");

let fails = 0, checks = 0;
const ok = (cond, msg, extra = "") => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}${!cond && extra ? "  ::  " + extra : ""}`);
};
const section = (t) => console.log(`\n— ${t}`);

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: REPO, encoding: "utf8", ...opts }).trim();
}

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

/** Build A: the currently-deployed `origin/main`, with its OWN real `npm ci`
 * (never the current repo's node_modules - main's package.json genuinely
 * differs, e.g. react 19.2.6 vs this PR's 19.2.8), so this is a byte-accurate
 * reproduction of what is actually live, not an approximation. */
function buildDeployedMain() {
  const mainSha = sh("git", ["rev-parse", MAIN_REF]);
  const wt = mkdtempSync(join(tmpdir(), "vs-buildA-main-"));
  execFileSync("git", ["worktree", "add", "--detach", wt, mainSha], { cwd: REPO, stdio: "pipe" });
  execFileSync("npm", ["ci"], {
    cwd: wt, stdio: "pipe",
    env: { ...process.env, npm_config_cache: NPM_CACHE, npm_config_audit: "false", npm_config_fund: "false" },
  });
  execFileSync("npm", ["run", "build"], { cwd: wt, stdio: "pipe" });
  return {
    dir: wt, sha: mainSha,
    cleanup: () => {
      rmSync(wt, { recursive: true, force: true });
      try { execFileSync("git", ["worktree", "prune"], { cwd: REPO, stdio: "pipe" }); } catch { /* best effort */ }
    },
  };
}

/** Build B: this PR's exact HEAD, plus one real, temporary commit that
 * changes one audio file's bytes at its existing, stable URL. Reuses the
 * current repo's node_modules (same lockfile as HEAD - no install needed). */
function buildCorrectedWithAudioChange() {
  const prHeadSha = sh("git", ["rev-parse", "HEAD"]);
  const wt = mkdtempSync(join(tmpdir(), "vs-buildB-pr-"));
  execFileSync("git", ["worktree", "add", "--detach", wt, prHeadSha], { cwd: REPO, stdio: "pipe" });
  execFileSync("ln", ["-s", join(REPO, "node_modules"), join(wt, "node_modules")]);

  const audioPath = join(wt, AUDIO_SOURCE);
  const original = readFileSync(audioPath);
  const tag = Buffer.alloc(128);
  tag.write("TAG", 0, "latin1");
  tag.write("buildB-marker", 97, "latin1");
  writeFileSync(audioPath, Buffer.concat([original, tag]));

  execFileSync("git", ["add", AUDIO_SOURCE], { cwd: wt, stdio: "pipe" });
  execFileSync("git", [
    "commit", "-m", "test: mutate one audio file's bytes (temporary, real-build-upgrade.e2e.mjs)",
    "--author", "real-build-upgrade test <test@vedasaarathi.local>",
  ], { cwd: wt, stdio: "pipe" });
  const sha = sh("git", ["rev-parse", "HEAD"], { cwd: wt });

  execFileSync("npm", ["run", "build"], { cwd: wt, stdio: "pipe" });
  return {
    dir: wt, sha, prHeadSha,
    cleanup: () => {
      rmSync(wt, { recursive: true, force: true });
      try { execFileSync("git", ["worktree", "prune"], { cwd: REPO, stdio: "pipe" }); } catch { /* best effort */ }
    },
  };
}

function extractSwVersion(dir) {
  const src = readFileSync(join(dir, "dist/client/sw.js"), "utf8");
  const m = /const VERSION = "([^"]+)"/.exec(src);
  if (!m) throw new Error(`could not find VERSION constant in ${dir}/dist/client/sw.js`);
  return m[1];
}

const nav = async (p, i) => { await p.locator(".bottom-nav button").nth(i).click({ force: true }); await p.waitForTimeout(400); };
const gotoOffline = async (p) => { await nav(p, 3); await p.locator(".offline-download").waitFor({ timeout: 20000 }); };
const remountOffline = async (p) => { await nav(p, 0); await p.locator(".today-card").waitFor({ timeout: 20000 }); await gotoOffline(p); };
const swReady = (p) => p.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  return Boolean(reg && (reg.active || reg.installing || reg.waiting));
});
/** Only valid on build B - the About build-id feature does not exist on
 * build A (origin/main predates it entirely). Returns the exact commitShort
 * text shown, with no regex guessing at where the hex digits start. */
const buildIdShown = async (p) => {
  await p.locator(".about-link").click();
  await p.locator(".about-page h1").waitFor();
  const line = await p.locator(".about-build").innerText();
  // In-app Back (not page.goBack()): a real browser history navigation here
  // risks Chromium's back/forward cache swapping in a stale page instance
  // and destroying the JS execution context this test evaluates in, which
  // is irrelevant noise this test does not want to depend on.
  await p.locator(".back-button").click();
  await p.locator(".today-card").waitFor({ timeout: 20000 });
  return line;
};
/** Matches offline-first.e2e.mjs's own proof that Panchanga content on
 * screen is genuinely computed (Sunrise/Tithi), not a static or persisted
 * string - required on Home, so call this right after landing there. */
const realPanchangaShown = async (p) => {
  await p.locator(".today-card .home-see-full > summary").click();
  await p.locator(".today-card .home-see-full[open]").waitFor({ timeout: 20000 });
  const text = await p.locator(".today-card").innerText();
  return /Sunrise/i.test(text) && /Tithi/i.test(text) ? text : null;
};

async function main() {
  section("Preflight: clean checkout of the exact PR HEAD");
  const dirty = sh("git", ["status", "--porcelain", "--untracked-files=no"]);
  ok(dirty === "", "no uncommitted changes to tracked files - this run reflects exactly what HEAD contains", dirty);
  const prHeadShaPreflight = sh("git", ["rev-parse", "HEAD"]);
  console.log(`  PR HEAD under test: ${prHeadShaPreflight}`);
  if (dirty !== "") process.exit(1);

  console.log(`— building build A: the currently-deployed ${MAIN_REF}, with its own real npm ci...`);
  const t0 = Date.now();
  const buildA = buildDeployedMain();
  console.log(`  build A ready in ${((Date.now() - t0) / 1000).toFixed(1)}s (commit ${buildA.sha})`);

  console.log("— building build B: this PR's HEAD plus one temporary, real audio-content commit...");
  const t1 = Date.now();
  const buildB = buildCorrectedWithAudioChange();
  console.log(`  build B ready in ${((Date.now() - t1) / 1000).toFixed(1)}s (commit ${buildB.sha}, on top of PR HEAD ${buildB.prHeadSha})`);

  // origin/main predates the build-info generator entirely (it was added in
  // this PR's first commit) - build A has no dist/client/build-info.json and
  // no About build-id feature at all (asserted below). Build A's identity
  // for this test is therefore the commit this test itself resolved and
  // built from (buildA.sha), captured BEFORE the build ran - not a file the
  // build wrote, but not any less real or deterministic for it.
  const buildInfoB = JSON.parse(readFileSync(`${buildB.dir}/dist/client/build-info.json`, "utf8"));
  const shortSha = (full) => full.slice(0, 7);
  section("Build identities are real, deterministic, and distinguishable (two genuine commits, not a dirty worktree vs. itself)");
  ok(buildInfoB.commit === buildB.sha && buildInfoB.dirty === false, "build B's own build-info.json matches the commit it was actually built from, and is clean", JSON.stringify({ buildInfoB, expectedB: buildB.sha }));
  ok(buildA.sha !== buildB.sha, `build A (${shortSha(buildA.sha)}, deployed ${MAIN_REF}) and build B (${buildInfoB.commitShort}) are two different real commits`);
  ok(shortSha(buildA.sha) !== buildInfoB.commitShort, "their short identifiers also differ (what About actually displays, on the build that has the feature)");
  ok(buildB.prHeadSha === prHeadShaPreflight, "build B is genuinely rooted at the exact PR HEAD this run started from, not a stale ref");

  const versionA = extractSwVersion(buildA.dir);
  const versionB = extractSwVersion(buildB.dir);
  ok(versionA !== versionB, `the service worker's own VERSION constant differs (A: "${versionA}", B: "${versionB}") - a genuine SW code change, not just an app change, so the browser's real update lifecycle has something to do`);
  const audioSizeA = readFileSync(`${buildA.dir}/dist/client/${AUDIO_URL.replace(/^\//, "")}`).length;
  const audioSizeB = readFileSync(`${buildB.dir}/dist/client/${AUDIO_URL.replace(/^\//, "")}`).length;
  ok(audioSizeA !== audioSizeB, `build B's audio file at the SAME URL has different bytes (A: ${audioSizeA}, B: ${audioSizeB})`);
  const manifestVersionA = JSON.parse(readFileSync(`${buildA.dir}/dist/client/offline-manifest.json`, "utf8")).version;
  const manifestVersionB = JSON.parse(readFileSync(`${buildB.dir}/dist/client/offline-manifest.json`, "utf8")).version;
  ok(manifestVersionA !== manifestVersionB, `build A and B have different offline-manifest content versions (A: ${manifestVersionA}, B: ${manifestVersionB})`);

  const audioCacheA = `${versionA}-audio`;
  const audioCacheB = `${versionB}-audio`;

  console.log(`— starting build A (deployed ${MAIN_REF} @ ${buildA.sha}) on :${PORT}`);
  let server = startServer(buildA.dir);
  let up = await waitForServer(BASE);
  if (!up) { console.error(`FAIL  server at ${BASE} did not become ready.`); killServer(server); buildA.cleanup(); buildB.cleanup(); process.exit(1); }

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error" && !/net::ERR_FAILED/.test(m.text())) errors.push(m.text()); });
  // Passive network-hit counter for the audio URL - registered once, for the
  // whole run. route.continue() changes nothing about the response; this
  // only observes whether the service worker's OWN internal fetch() for
  // this URL actually reached the network layer, which page.on("request")
  // cannot see (SW-initiated fetches run in the worker's own context).
  let audioNetworkHits = 0;
  await ctx.route(`**${AUDIO_URL}`, (route) => { audioNetworkHits += 1; return route.continue(); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  try {
    /* ---------------------------------------------------------------- */
    section(`Build A (deployed ${MAIN_REF}, commit ${shortSha(buildA.sha)}): online load, save location + Telugu language + progress`);
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    ok(await swReady(page), "service worker A installs and becomes ready");
    ok((await page.locator(".about-build").count()) === 0 && (await page.locator(".about-link").count()) === 1, "build A (pre-fix) has no build-id feature at all - confirms this really is the older deployed code, not an approximation of it");

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
    section("Observable cache + network evidence for the audio URL on build A (not inferred from a successful fetch)");
    audioNetworkHits = 0;
    const primedA = await page.evaluate(async (u) => {
      const r = await fetch(u); // default cache mode
      const buf = await r.arrayBuffer();
      return { status: r.status, length: buf.byteLength };
    }, AUDIO_URL);
    ok(primedA.status === 200 && primedA.length === audioSizeA, `first fetch: real bytes returned (${primedA.length})`, JSON.stringify(primedA));
    ok(audioNetworkHits === 1, `first fetch reached the network exactly once (cache miss) - observed via passive request interception, not inferred (hits: ${audioNetworkHits})`);
    const cacheEntryA = await page.evaluate(async ({ cacheName, url }) => {
      const cache = await caches.open(cacheName);
      const res = await cache.match(url);
      if (!res) return null;
      const buf = await res.arrayBuffer();
      return buf.byteLength;
    }, { cacheName: audioCacheA, url: AUDIO_URL });
    ok(cacheEntryA === audioSizeA, `the service worker's own Cache Storage (${audioCacheA}) now holds a real entry for this URL with build A's exact byte length - a directly inspected cache write, not an assumption`, String(cacheEntryA));
    audioNetworkHits = 0;
    const secondFetchA = await page.evaluate(async (u) => (await fetch(u)).status, AUDIO_URL);
    ok(secondFetchA === 200 && audioNetworkHits === 0, `a second identical fetch is served from that cache entry with NO new network request (hits: ${audioNetworkHits}) - a genuine cache HIT, not just "the fetch succeeded"`);

    /* ---------------------------------------------------------------- */
    section("Build A: full offline download");
    await gotoOffline(page);
    await page.locator(".offline-download-actions button").first().click();
    await page.locator(".offline-download-ok, .offline-download-error").first().waitFor({ timeout: 120000 });
    ok((await page.locator(".offline-download-ok").count()) === 1, "build A downloaded for offline use");

    /* ---------------------------------------------------------------- */
    section(`Migrate: swap the currently-deployed worker (${versionA}) for the corrected one (${versionB}) on the SAME origin, without clearing any storage`);
    killServer(server);
    await waitForPortFree();
    console.log(`— starting build B (PR HEAD ${buildB.prHeadSha} + audio commit ${buildB.sha}) on :${PORT}`);
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
    section("The corrected service worker has genuinely taken over (not the same script re-running)");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".today-card").waitFor({ timeout: 20000 });
    const cacheKeysAfterMigration = await page.evaluate(() => caches.keys());
    ok(
      cacheKeysAfterMigration.some((k) => k.startsWith(versionB)) && !cacheKeysAfterMigration.some((k) => k.startsWith(versionA)),
      `only build B's own-versioned caches remain (${versionB}-*); build A's (${versionA}-*) were evicted by the corrected worker's own activate handler, not left running alongside it`,
      JSON.stringify(cacheKeysAfterMigration),
    );
    const idB = await buildIdShown(page);
    ok(idB.includes(buildInfoB.commitShort), `About now shows build B's own compiled identifier ("${idB}"), matching build-info.json (${buildInfoB.commitShort}) exactly - not fetched, not build A's (which had no such feature at all)`, JSON.stringify(buildInfoB));

    /* ---------------------------------------------------------------- */
    section("Audio bypass fix: observable cache/network evidence that a reload/no-store fetch gets build B's fresh bytes, not build A's cached ones");
    audioNetworkHits = 0;
    const refetched = await page.evaluate(async (u) => {
      const r = await fetch(u, { cache: "reload" });
      const buf = await r.arrayBuffer();
      return { status: r.status, length: buf.byteLength };
    }, AUDIO_URL);
    ok(refetched.length === audioSizeB && refetched.length !== audioSizeA, `a "reload" fetch returns build B's bytes (${refetched.length}), not build A's (${audioSizeA})`, JSON.stringify(refetched));
    ok(audioNetworkHits >= 1, `the "reload" fetch actually reached the network (hits: ${audioNetworkHits}) - the bypass is a real request, not a cache read relabeled`);
    const cacheEntryB = await page.evaluate(async ({ cacheName, url }) => {
      const cache = await caches.open(cacheName);
      const res = await cache.match(url);
      if (!res) return null;
      const buf = await res.arrayBuffer();
      return buf.byteLength;
    }, { cacheName: audioCacheB, url: AUDIO_URL });
    ok(cacheEntryB === audioSizeB, `the corrected worker's own Cache Storage (${audioCacheB}) now holds build B's exact byte length - the bypass write-through observed directly, not assumed`, String(cacheEntryB));
    audioNetworkHits = 0;
    const thirdFetch = await page.evaluate(async (u) => (await fetch(u)).status, AUDIO_URL);
    ok(thirdFetch === 200 && audioNetworkHits === 0, `a plain fetch right after is served from that fresh entry with no new network request (hits: ${audioNetworkHits})`);
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
    section("Data survives the real migration: location, language, progress");
    const dataAfter = await page.evaluate(() => ({
      location: localStorage.getItem("vedasaarathi:location:v1"),
      preparation: localStorage.getItem("vedasaarathi:preparation:v3"),
    }));
    ok(dataAfter.location?.includes("Hyderabad"), "saved location survives the real deployed-main-to-corrected-worker migration");
    ok(dataAfter.preparation?.includes("\"language\":\"TE\""), "saved language (Telugu) survives the migration");
    ok(dataAfter.preparation?.includes("Mahesh"), "saved participant/progress data survives the migration");

    /* ---------------------------------------------------------------- */
    section("Cold-start offline on build B: compiled identifier and real computed content, not just a persisted string");
    await ctx.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".location-button").waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    ok(/Hyderabad/i.test(await page.locator(".location-button").innerText()), "offline cold start on build B: saved location still shown");
    const idOffline = await buildIdShown(page);
    ok(idOffline.includes(buildInfoB.commitShort), `About still shows build B's compiled identifier ("${idOffline}") with the network fully off - it is baked into the bundle, not fetched`, idOffline);
    const panchangaOffline = await realPanchangaShown(page);
    ok(Boolean(panchangaOffline), "Home shows REAL, freshly computed Panchanga content (Sunrise + Tithi) offline on build B, not just the persisted city name", panchangaOffline ?? "(no Sunrise/Tithi text found)");
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
    buildA.cleanup();
    buildB.cleanup();
  }

  console.log(`\nTested: PR HEAD ${prHeadShaPreflight} (build B commit ${buildB.sha}) vs. deployed ${MAIN_REF} ${buildA.sha}`);
  console.log(`${fails === 0 ? "REAL A-TO-B BUILD UPGRADE E2E PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

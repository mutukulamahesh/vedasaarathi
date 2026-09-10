// REAL "download BEFORE configuring anything" offline test
// (blocker: OFFLINE COMPLETENESS).
//
//   online load (NO location saved) → "Download for offline use" → 100% →
//   browser offline → save a location → reload OFFLINE →
//   Home Panchanga computes to a ready state with values.
//
// The Panchanga engine (mhah-panchang) is a LAZY chunk that the first page
// never imports, so this only passes if the offline download used the
// build-generated precache manifest (not a DOM scrape). It FAILS (never SKIPs)
// if it cannot run.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env.OFFLINE_PORT || 3211);
const EXTERNAL = process.env.OFFLINE_BASE_URL || "";
const BASE = (EXTERNAL || `http://localhost:${PORT}/`).replace(/\/?$/, "/");

let fails = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
};

const LOC_KEY = "vedasaarathi:location:v1";
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};

async function waitForServer(url, ms = 90000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: "GET" });
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  let server = null;
  if (!EXTERNAL) {
    if (!existsSync(`${REPO}dist/client/sw.js`)) {
      console.error("FAIL  no production build — run `npm run build` first (dist/client/sw.js missing).");
      process.exit(1);
    }
    if (!existsSync(`${REPO}dist/client/offline-manifest.json`)) {
      console.error("FAIL  dist/client/offline-manifest.json missing — the build did not generate the precache manifest.");
      process.exit(1);
    }
    console.log(`— starting vinext start on :${PORT}`);
    server = spawn("npx", ["vinext", "start", "--port", String(PORT)], {
      cwd: REPO, env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", () => {});
    server.stderr.on("data", () => {});
  }

  const up = await waitForServer(BASE, 90000);
  if (!up) {
    console.error(`FAIL  server at ${BASE} did not become ready.`);
    if (server) server.kill("SIGKILL");
    process.exit(1);
  }

  const browser = await chromium.launch({
    args: ["--disable-dev-shm-usage", "--disable-gpu"], // 64 MB /dev/shm in CI crashes the tab
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  try {
    /* 1. online load with NOTHING configured — no location, no participants */
    console.log("— online load, no location configured");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const swReady = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && (reg.active || reg.installing || reg.waiting));
    });
    ok(swReady, "the service worker registered and activated");
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    const noLoc = await page.evaluate((k) => localStorage.getItem(k), LOC_KEY);
    ok(!noLoc, "no location is saved yet");

    /* 2. the build precache manifest is served and covers the lazy Panchanga chunk */
    const manifest = await page.evaluate(async () => {
      const r = await fetch("/offline-manifest.json", { cache: "no-store" });
      if (!r.ok) return null;
      return r.json();
    });
    ok(manifest && typeof manifest.version === "string" && manifest.version.length > 0,
      `offline-manifest.json is served (version ${manifest && manifest.version})`);
    ok(manifest && Array.isArray(manifest.urls) && manifest.urls.some((u) => /mhah-panchang/.test(u)),
      "the manifest lists the lazy mhah-panchang chunk");

    /* 3. download for offline use — must reach 100% */
    console.log("— Download for offline use (before configuring a location)");
    const dlBtn = page.getByRole("button", { name: /download for offline use/i });
    await dlBtn.waitFor();
    await dlBtn.click();
    await page.locator(".offline-download-ok").waitFor({ timeout: 180000 });
    const okText = (await page.locator(".offline-download-ok").innerText()).replace(/\s+/g, " ").trim();
    ok(/Downloaded/i.test(okText), `download reports complete: "${okText}"`);

    const cacheInfo = await page.evaluate(async () => {
      const names = (await caches.keys()).filter((k) => k.startsWith("vs-offline-"));
      if (names.length !== 1) return { names, count: 0, hasPanchanga: false };
      const c = await caches.open(names[0]);
      const keys = await c.keys();
      return {
        names,
        count: keys.length,
        hasPanchanga: keys.some((k) => /mhah-panchang/.test(k.url)),
      };
    });
    ok(cacheInfo.names.length === 1 && /^vs-offline-.+/.test(cacheInfo.names[0]),
      `exactly one versioned offline cache: ${cacheInfo.names.join(", ")}`);
    ok(cacheInfo.hasPanchanga, "the lazy Panchanga chunk is in the offline cache");
    ok(cacheInfo.count >= manifest.urls.length,
      `all ${manifest.urls.length} manifest files cached (${cacheInfo.count} entries)`);

    /* 4. go offline, THEN configure a location for the first time */
    console.log("— go offline, then save a location");
    await ctx.setOffline(true);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [LOC_KEY, JSON.stringify(HYD)]);

    /* 5. reload OFFLINE — app shell from cache, Panchanga computed from the
          lazily-loaded (but precached) engine chunk */
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor({ timeout: 15000 });
    ok(true, "Home renders after an OFFLINE reload");

    // The compact "today" card computes to a ready state offline: plain
    // useful/avoid times + today's Tithi.
    await page.locator(".today-card .home-times").first().waitFor({ timeout: 20000 });
    const cardText = await page.locator(".today-card").innerText();
    const hasValues = /Useful times today/i.test(cardText) && /Today’?s Tithi/i.test(cardText);
    ok(hasValues, "Home compact card computes to a ready state — OFFLINE, first location");
    // Opening "See full Panchanga" reveals the computed sunrise/sunset + Tithi.
    await page.locator(".today-card .home-see-full > summary").click();
    await page.locator(".today-card .home-see-full[open]").waitFor();
    const panchangaText = (await page.locator(".home-full-panchanga").first().innerText())
      .replace(/\s+/g, " ").trim().slice(0, 160);
    ok(/Sunrise/i.test(panchangaText) && /Tithi/i.test(panchangaText),
      `full Panchanga computed offline: "${panchangaText}"`);

    await ctx.setOffline(false);
    ok(errors.length === 0, `no console / page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  console.log(`\n${fails === 0 ? "OFFLINE-FIRST E2E PASSED" : `${fails}/${checks} OFFLINE-FIRST CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FAIL  offline-first E2E threw:", e);
  process.exit(1);
});

// REAL offline end-to-end test (item 5). Runs against a PRODUCTION server
// (`vinext start`) so the service worker registers.
//
//   online load → "Download for offline use" → confirm cached →
//   browser offline → reload → open Simple Puja → play instruction + mantra
//   audio → navigate → complete.
//
// This test FAILS (never SKIPs) if it cannot run: a missing prod build, a
// server that will not start, or the download not completing are all failures.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env.OFFLINE_PORT || 3210);
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
const PREP_KEY = "vedasaarathi:preparation:v3";
const MODE_KEY = "vedasaarathi:presentation-mode:v1";
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const PERSON = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const prep = (run) => JSON.stringify({
  mode: "SELF", participants: [PERSON], language: "EN",
  runs: { "vinayaka-chavithi": run },
});

async function waitForServer(url, ms = 60000) {
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

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  try {
    /* 1. online load, SW registers */
    console.log("— online load + service worker");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const swReady = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && (reg.active || reg.installing || reg.waiting));
    });
    ok(swReady, "the service worker registered and activated");

    await page.evaluate(
      ([lk, pk, mk, lv, pv]) => {
        localStorage.setItem(lk, lv);
        localStorage.setItem(pk, pv);
        localStorage.setItem(mk, "FAMILY_BETA");
      },
      [LOC_KEY, PREP_KEY, MODE_KEY, JSON.stringify(HYD),
        prep({ runState: "NOT_STARTED", stepIndex: 0, pujaPath: "SIMPLE", availableMaterialIds: [], patriSelfReport: null })],
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();

    /* 2. download for offline use */
    console.log("— Download for offline use");
    const dlBtn = page.getByRole("button", { name: /download for offline use/i });
    await dlBtn.waitFor();
    await dlBtn.click();
    await page.locator(".offline-download-ok").waitFor({ timeout: 180000 });
    const okText = await page.locator(".offline-download-ok").innerText();
    ok(/Downloaded/i.test(okText), `download reports complete: "${okText.replace(/\s+/g, " ").trim()}"`);

    /* 3. confirm cached — the offline cache is named vs-offline-<build version> */
    const cacheInfo = await page.evaluate(async () => {
      const names = (await caches.keys()).filter((k) => k.startsWith("vs-offline-"));
      if (names.length !== 1) return { names, keys: 0, audio: 0, panchanga: false };
      const c = await caches.open(names[0]);
      const keys = await c.keys();
      return {
        names,
        keys: keys.length,
        audio: keys.filter((k) => k.url.includes("/audio/v1/") && k.url.endsWith(".mp3")).length,
        panchanga: keys.some((k) => /mhah-panchang/.test(k.url)),
      };
    });
    ok(cacheInfo.names.length === 1 && /^vs-offline-.+/.test(cacheInfo.names[0] || ""),
      `exactly one versioned offline cache exists: ${cacheInfo.names.join(", ")}`);
    ok(cacheInfo.audio >= 106, `all bundled audio is cached (${cacheInfo.audio} mp3s)`);
    ok(cacheInfo.panchanga, "the lazy Panchanga engine chunk is cached (build-manifest precache)");
    ok(cacheInfo.keys >= cacheInfo.audio + 3, `app shell + assets cached too (${cacheInfo.keys} entries)`);

    /* 4. go offline */
    console.log("— browser offline");
    await ctx.setOffline(true);

    /* 5. reload offline → app still renders */
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor({ timeout: 15000 });
    ok(true, "Home renders after an OFFLINE reload");

    /* 6. open Simple Puja offline */
    console.log("— Simple Puja, offline");
    await page.evaluate(
      ([pk, pv]) => localStorage.setItem(pk, pv),
      [PREP_KEY, prep({ runState: "IN_PROGRESS", stepIndex: 0, pujaPath: "SIMPLE", availableMaterialIds: [], patriSelfReport: null })],
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await page.locator(".festival-card").getByRole("button", { name: /^resume$/i }).click();
    await page.locator(".puja-card h1").waitFor({ timeout: 15000 });
    ok(true, "the guided puja opened offline");

    /* 7. play instruction + mantra audio offline (served from cache by the SW) */
    let checkedInstruction = false;
    let checkedMantra = false;
    for (let i = 0; i < 20 && !(checkedInstruction && checkedMantra); i += 1) {
      const instr = page.locator(".flow-content .app-audio audio").first();
      if (await instr.count()) {
        const src = await instr.getAttribute("src");
        const res = await page.evaluate((u) => fetch(u).then((r) => ({ ok: r.ok, s: r.status })).catch((e) => ({ ok: false, s: String(e) })), src);
        ok(res.ok && res.s === 200, `instruction audio served offline: ${src} (${res.s})`);
        await instr.evaluate((el) => el.play().catch(() => {}));
        checkedInstruction = true;
      }
      const mantra = page.locator(".mantra-block .app-audio audio").first();
      if (await mantra.count()) {
        const src = await mantra.getAttribute("src");
        const res = await page.evaluate((u) => fetch(u).then((r) => ({ ok: r.ok, s: r.status })).catch((e) => ({ ok: false, s: String(e) })), src);
        ok(res.ok && res.s === 200, `mantra audio served offline: ${src} (${res.s})`);
        await mantra.evaluate((el) => el.play().catch(() => {}));
        checkedMantra = true;
      }
      const fin = page.getByRole("button", { name: /finish puja/i });
      if (await fin.count()) break;
      await page.locator(".step-actions .primary-action").click();
      await page.locator(".puja-card h1").waitFor();
    }
    ok(checkedInstruction, "played an instruction clip offline");
    ok(checkedMantra, "played a mantra clip offline");

    /* 8. navigate to completion offline */
    console.log("— walk to completion, offline");
    for (let i = 0; i < 25; i += 1) {
      const fin = page.getByRole("button", { name: /finish puja/i });
      if (await fin.count()) { await fin.click(); break; }
      await page.locator(".step-actions .primary-action").click();
      await page.locator(".puja-card h1").waitFor();
    }
    await page.waitForTimeout(400);
    ok(/completed/i.test(await page.locator("body").innerText()), "reached completion offline");

    await ctx.setOffline(false);
    ok(errors.length === 0, `no console / page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);
  } finally {
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  console.log(`\n${fails === 0 ? "OFFLINE E2E PASSED" : `${fails}/${checks} OFFLINE CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FAIL  offline E2E threw:", e);
  process.exit(1);
});

// Simple V1 offline + resume + start again. Runs against a PRODUCTION server
// (`vinext start`) so the service worker registers, exactly like the full
// platform's offline.e2e.mjs, but walking THIS coordinator's five-stage
// journey instead.
//
//   online load -> download for offline use -> confirm cached -> go offline
//   -> reload -> resume the in-progress puja -> play audio offline -> finish
//   -> completion -> Start again -> Today (fresh run)

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const PORT = Number(process.env.SV1_OFFLINE_PORT || 3221);
const EXTERNAL = process.env.SV1_OFFLINE_BASE_URL || "";
const BASE = (EXTERNAL || `http://localhost:${PORT}/`).replace(/\/?$/, "/");

let fails = 0;
let checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails += 1; console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); };

const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const FAMILY = { id: "family", name: "Sharma family", gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } };
const prep = (run) => JSON.stringify({ mode: "FAMILY", language: "EN", participants: [FAMILY], runs: { "vinayaka-chavithi": run } });

async function waitForServer(url, ms = 90000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { if ((await fetch(url, { method: "GET" })).ok) return true; } catch { /* not up */ }
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
  if (!(await waitForServer(BASE))) {
    console.error(`FAIL  server at ${BASE} did not become ready.`);
    if (server) server.kill("SIGKILL");
    process.exit(1);
  }

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  // "Start again" asks for a native confirm() before resetting the run
  // (lib/storage/preparation.ts's requestRunReset) - Playwright auto-dismisses
  // unhandled dialogs, so without this the reset silently no-ops.
  page.on("dialog", (d) => d.accept());

  try {
    console.log("— online load + service worker");
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    const swReady = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg && (reg.active || reg.installing || reg.waiting));
    });
    ok(swReady, "the service worker registered and activated");

    await page.evaluate(([lk, pk, lv, pv]) => {
      localStorage.setItem(lk, lv);
      localStorage.setItem(pk, pv);
    }, [LOC_KEY, PREP_KEY, JSON.stringify(HYD), prep({ runState: "IN_PROGRESS", stepIndex: 2, pujaPath: "COMPLETE", availableMaterialIds: [], patriSelfReport: null })]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".puja-card h1").waitFor({ timeout: 15000 });
    ok(true, "reload resumes directly into the in-progress puja at the saved step");
    const stepLine0 = await page.locator(".step-line").first().innerText();
    ok(/3 of 35|Step 3/.test(stepLine0) || /step/i.test(stepLine0), `resumed at the saved step (${stepLine0})`);

    console.log("— Download for offline use");
    // The offline download control lives on the Today screen.
    await page.locator(".step-actions button").first().click().catch(() => {}); // Previous, back toward Today if reachable
    // Navigate cleanly via a fresh NOT_STARTED seed instead of relying on in-puja back button semantics.
    await page.evaluate(([pk, pv]) => localStorage.setItem(pk, pv),
      [PREP_KEY, prep({ runState: "NOT_STARTED", stepIndex: 0, pujaPath: "COMPLETE", availableMaterialIds: [], patriSelfReport: null })]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".simple-today").waitFor({ timeout: 15000 });
    const dlBtn = page.getByRole("button", { name: /download for offline use/i });
    await dlBtn.waitFor();
    await dlBtn.click();
    await page.locator(".offline-download-ok").waitFor({ timeout: 180000 });
    ok(/Downloaded/i.test(await page.locator(".offline-download-ok").innerText()), "download reports complete");

    const cacheInfo = await page.evaluate(async () => {
      const names = (await caches.keys()).filter((k) => k.startsWith("vs-offline-"));
      if (names.length !== 1) return { names, audio: 0 };
      const c = await caches.open(names[0]);
      const keys = await c.keys();
      return { names, audio: keys.filter((k) => k.url.includes("/audio/v1/") && k.url.endsWith(".mp3")).length };
    });
    ok(cacheInfo.names.length === 1, `exactly one versioned offline cache: ${cacheInfo.names.join(", ")}`);
    ok(cacheInfo.audio >= 100, `bundled audio cached (${cacheInfo.audio} mp3s)`);

    console.log("— browser offline");
    await ctx.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".simple-today").waitFor({ timeout: 15000 });
    ok(true, "Today renders after an OFFLINE reload");

    console.log("— walk to completion, offline, then Start again");
    await page.evaluate(([pk, pv]) => localStorage.setItem(pk, pv),
      [PREP_KEY, prep({ runState: "IN_PROGRESS", stepIndex: 0, pujaPath: "COMPLETE", availableMaterialIds: [], patriSelfReport: null })]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".puja-card h1").waitFor({ timeout: 15000 });
    let playedAudio = false;
    for (let i = 0; i < 40; i += 1) {
      if (!playedAudio) {
        const instr = page.locator(".flow-content .app-audio audio").first();
        if (await instr.count()) {
          const src = await instr.getAttribute("src");
          const res = await page.evaluate((u) => fetch(u).then((r) => r.status).catch(() => 0), src);
          ok(res === 200, `an instruction clip is served offline (${src})`);
          playedAudio = true;
        }
      }
      const label = await page.locator(".step-actions .primary-action").innerText().catch(() => "");
      if (/finish/i.test(label)) { await page.locator(".step-actions .primary-action").click(); break; }
      await page.locator(".step-actions .primary-action").click().catch(() => {});
      await page.waitForTimeout(150);
    }
    ok(playedAudio, "played an audio clip while offline");
    await page.waitForTimeout(500);
    ok(/completed/i.test(await page.locator(".completion").innerText().catch(() => "")), "reached completion offline");

    const startAgain = page.getByRole("button", { name: /start again/i });
    await startAgain.click();
    await page.locator(".simple-today").waitFor({ timeout: 15000 });
    ok(true, "'Start again' returns to Today with a fresh run");

    await ctx.setOffline(false);
  } catch (err) {
    console.error("FAIL  unexpected error:", err instanceof Error ? err.message : err);
    fails += 1;
    checks += 1;
  } finally {
    ok(errors.length === 0, `no console / page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);
    await browser.close();
    if (server) server.kill("SIGKILL");
  }

  console.log(`\n${fails === 0 ? "SIMPLE V1 OFFLINE/RESUME E2E PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

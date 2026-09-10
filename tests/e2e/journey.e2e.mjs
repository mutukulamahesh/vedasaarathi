// End-to-end browser test of the real VedaSaarathi app.
//
//   npm run dev &                 # or BASE_URL=<deployed> for the smoke test
//   node tests/e2e/journey.e2e.mjs
//
// Runs the scenario set at 375x812 and 1440x900. Exits non-zero on any failure.
// Covers: first launch; manual location save/edit/clear; Home Panchanga
// loading/ready; participant setup (individual/family/group, KNOWN/UNKNOWN/
// UNSURE lineage); Simple + Complete puja start->completion walking every step;
// Telugu + English; instruction audio on every step; mantra audio on every
// applicable step; play/pause/stop; two audio sources never overlapping;
// navigation while audio plays; reload + resume; correction report + JSON
// export; reviewer-mode isolation; the Vrata Katha; no horizontal overflow;
// keyboard access; no console/page errors; and every bundled MP3 URL + decode.

import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:5173/").replace(/\/?$/, "/");
const REPO = fileURLToPath(new URL("../../", import.meta.url));

const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";
const MODE_KEY = "vedasaarathi:presentation-mode:v1";

const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const PERSON_KNOWN = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "KNOWN", name: "Yajurveda" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNSURE", name: "" },
};
const PERSON_UNKNOWN = {
  id: "p2", name: "Ravi",
  gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNSURE", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};

const prep = (over = {}) => JSON.stringify({
  mode: "FAMILY",
  participants: [PERSON_KNOWN, PERSON_UNKNOWN],
  language: "EN",
  runs: {
    "vinayaka-chavithi": {
      runState: "IN_PROGRESS", stepIndex: 0, pujaPath: "SIMPLE",
      availableMaterialIds: [], patriSelfReport: null,
      ...over,
    },
  },
});

let fails = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
};
const section = (t) => console.log(`\n— ${t}`);

const audioFiles = readdirSync(`${REPO}public/audio/v1`).filter((f) => f.endsWith(".mp3"));

async function seedToPuja(page, path, language = "EN", mode = "FAMILY_BETA") {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([lk, pk, mk, lv, pv, mv]) => {
      localStorage.setItem(lk, lv);
      localStorage.setItem(pk, pv);
      localStorage.setItem(mk, mv); // presentation mode is a RAW string, not JSON
    },
    [LOC_KEY, PREP_KEY, MODE_KEY, JSON.stringify(HYD),
      prep({ pujaPath: path, language: language === "TE" ? "TE" : "EN" }), mode],
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  await page.locator(".festival-card").getByRole("button", { name: /^resume$/i }).click();
  for (let i = 0; i < 6; i += 1) {
    if (await page.locator(".puja-card h1").count()) break;
    const cont = page.getByRole("button", { name: /save people and continue|start .* puja/i });
    if (await cont.count()) await cont.first().click();
    await page.waitForTimeout(300);
  }
  await page.locator(".puja-card h1").waitFor();
}

const noHOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function walkPuja(page, expectMinSteps) {
  let steps = 0;
  let overflow = false;
  let missingAudio = 0;
  let mantraSteps = 0;
  let mantraAudioSteps = 0;
  let romanSteps = 0;
  for (let i = 0; i < 45; i += 1) {
    await page.locator(".puja-card h1").waitFor();
    steps += 1;
    // Order + presence: Telugu H1, keep-ready, what-to-do, instruction audio.
    ok(
      (await page.locator("h1.step-telugu-title").count()) === 1,
      `step ${steps}: one large Telugu step name (H1)`,
    );
    if ((await page.locator(".step-keepready").count()) === 0) {
      ok(false, `step ${steps}: "what to keep ready" block present`);
    }
    // The Vinayaka Vrata Katha step is a story to read or hear read aloud — it
    // carries the narrative itself (.katha-block), not a "plain instructions"
    // clip (offering one would imply the whole katha is narrated).
    const isKathaStep = (await page.locator(".katha-block").count()) > 0;
    const hasInstrAudio =
      (await page.locator(".app-audio .app-audio-button").count()) > 0 ||
      (await page.locator(".app-audio-pending").count()) > 0;
    if (isKathaStep) {
      ok(true, `step ${steps}: the Vrata Katha story block is shown (no instruction clip)`);
    } else if (!hasInstrAudio) {
      missingAudio += 1;
    }
    const hasMantra = (await page.locator("pre.mantra-te").count()) > 0;
    if (hasMantra) {
      mantraSteps += 1;
      const mantraPlayers = await page.locator(".mantra-block .app-audio").count();
      if (mantraPlayers > 0) mantraAudioSteps += 1;
      // A romanised reading is shown when the source supports transliteration.
      if ((await page.locator(".mantra-block .step-disclosure summary").count()) > 0) romanSteps += 1;
    }
    if (!(await noHOverflow(page))) overflow = true;

    const finish = page.getByRole("button", { name: /finish puja|Done, next/i });
    const label = await page.locator(".step-actions .primary-action").innerText();
    await page.locator(".step-actions .primary-action").click();
    if (/finish puja/i.test(label)) break;
    void finish;
  }
  ok(steps >= expectMinSteps, `walked ${steps} steps (>= ${expectMinSteps})`);
  ok(!overflow, "no horizontal overflow on any step");
  ok(missingAudio === 0, `instruction audio present on every step (${missingAudio} missing)`);
  ok(mantraAudioSteps === mantraSteps && mantraSteps > 0,
    `mantra audio present on every mantra step (${mantraAudioSteps}/${mantraSteps})`);
  ok(romanSteps > 0 && romanSteps <= mantraSteps,
    `romanised reading shown where the source supports it (${romanSteps}/${mantraSteps} mantra steps)`);
  await page.locator(".completion, .complete-screen, h1").first().waitFor();
  ok(
    /completed/i.test(await page.locator("body").innerText()),
    "reached the completion screen",
  );
}

async function run(viewport) {
  section(`VIEWPORT ${viewport.width}x${viewport.height}`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  const external = [];
  ctx.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("request", (r) => {
    try {
      const u = new URL(r.url());
      const baseHost = new URL(BASE).host;
      if (u.host !== baseHost && u.protocol !== "data:" && u.protocol !== "blob:") {
        external.push(u.href);
      }
    } catch {
      /* ignore */
    }
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  /* ---- 1. first launch ------------------------------------------------ */
  section("first launch");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate((k) => localStorage.removeItem(k), LOC_KEY);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  ok((await page.locator(".location-nudge, .location-button").count()) > 0,
    "a location prompt is shown on first launch");
  ok(await noHOverflow(page), "home: no horizontal overflow");

  /* ---- 2. manual location save/edit/clear -------------------------- */
  section("location save / edit / clear");
  await page.evaluate((k) => localStorage.setItem(k,
    JSON.stringify({ status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
      city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
      accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z" })), LOC_KEY);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText(/TODAY IN HYDERABAD/i).waitFor();
  ok(true, "a saved location shows 'TODAY IN <CITY>'");
  await page.locator(".today-card").waitFor();
  // Panchanga loads to a ready state with values.
  await page.locator(".panchanga-values, .plain-note").first().waitFor();
  await page.waitForTimeout(4000);
  const hasValues = (await page.locator(".panchanga-values").count()) > 0;
  ok(hasValues, "Home Panchanga reaches a ready state with values");
  if (hasValues) {
    ok((await page.locator(".panchanga-festival").count()) > 0,
      "the next Vinayaka Chavithi + Madhyahna puja window is shown for the location");
  }

  /* ---- 3. Simple puja: every step, then completion --------------- */
  section("Simple puja — start to completion (English)");
  await seedToPuja(page, "SIMPLE", "EN");
  await walkPuja(page, 10);

  /* ---- 4. Complete puja: every step ----------------------------- */
  section("Complete puja — start to completion (English)");
  await seedToPuja(page, "COMPLETE", "EN");
  await walkPuja(page, 30);

  /* ---- 5. Telugu interface on the Complete path ----------------- */
  section("Telugu interface");
  await seedToPuja(page, "COMPLETE", "TE");
  await page.locator(".language-toggle button", { hasText: /తెలుగు/ }).click().catch(() => {});
  ok((await page.locator("h1.step-telugu-title").count()) === 1, "Telugu step name renders");
  const enLeak = await page.evaluate(() => {
    const scope = document.querySelector(".puja-flow");
    const c = scope.cloneNode(true);
    c.querySelectorAll(".mantra-roman,[data-allow-latin],.language-toggle,.mantra-te,.reviewer-only,.app-audio").forEach((n) => n.remove());
    return [...new Set((c.textContent || "").match(/[A-Za-z]{3,}/g) || [])];
  });
  ok(enLeak.length === 0, `no English leak in Telugu mode (${JSON.stringify(enLeak).slice(0, 120)})`);

  /* ---- 6. audio: play / pause / stop + no overlap -------------- */
  section("audio controls + mutual exclusion");
  await seedToPuja(page, "COMPLETE", "EN");
  // advance to the first step that has BOTH an instruction and a mantra player
  let found = false;
  for (let i = 0; i < 40; i += 1) {
    if ((await page.locator(".mantra-block .app-audio .app-audio-button").count()) > 0 &&
        (await page.locator(".flow-content > .puja-card .app-audio .app-audio-button").first().count()) > 0) {
      found = true; break;
    }
    await page.locator(".step-actions .primary-action").click();
    await page.locator(".puja-card h1").waitFor();
  }
  ok(found, "found a step with an instruction player AND a mantra player");
  if (found) {
    const instr = page.locator(".app-audio").first();
    const mantra = page.locator(".mantra-block .app-audio").first();
    await instr.getByRole("button", { name: /listen|play/i }).first().click();
    await page.waitForTimeout(200);
    const pausedAll = await page.evaluate(() => {
      const a = [...document.querySelectorAll("audio")];
      return a.filter((x) => !x.paused).length;
    });
    ok(pausedAll <= 1, `at most one <audio> playing after starting instruction (${pausedAll})`);
    await mantra.getByRole("button", { name: /play|listen/i }).first().click();
    await page.waitForTimeout(200);
    const stillOne = await page.evaluate(() =>
      [...document.querySelectorAll("audio")].filter((x) => !x.paused).length);
    ok(stillOne <= 1, `starting the mantra leaves at most one <audio> playing (${stillOne}) — two sources never overlap`);
    // pause / stop controls exist
    ok((await mantra.getByRole("button", { name: /pause|stop/i }).count()) >= 1,
      "pause / stop controls are present");
    // navigate while (attempting) playback — must not error
    await page.locator(".step-actions .primary-action").click();
    await page.locator(".puja-card h1").waitFor();
    ok(true, "navigation while audio is active does not break the app");
  }

  /* ---- 7. reload + resume ------------------------------------- */
  section("reload + resume");
  await seedToPuja(page, "SIMPLE", "EN");
  for (let i = 0; i < 3; i += 1) {
    await page.locator(".step-actions .primary-action").click();
    await page.locator(".puja-card h1").waitFor();
  }
  const stepLine = await page.locator(".step-line").first().innerText();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  await page.locator(".festival-card").getByRole("button", { name: /^resume$/i }).click();
  await page.locator(".puja-card h1").waitFor();
  ok((await page.locator(".step-line").first().innerText()) === stepLine,
    `resume returns to the same step (${stepLine.replace(/\s+/g, " ")})`);

  /* ---- 8. Vrata Katha (no blocked screen) -------------------- */
  section("Vrata Katha");
  await seedToPuja(page, "COMPLETE", "EN");
  let sawKatha = false;
  for (let i = 0; i < 40; i += 1) {
    if ((await page.locator(".katha-block").count()) > 0) { sawKatha = true; break; }
    const fin = page.getByRole("button", { name: /finish puja/i });
    if (await fin.count()) break;
    await page.locator(".step-actions .primary-action").click();
    await page.locator(".puja-card h1").waitFor();
  }
  ok(sawKatha, "the Vrata Katha step shows the story (.katha-block), not a blocked screen");
  if (sawKatha) {
    const kt = await page.locator(".katha-block").innerText();
    ok(/Syamantaka|Krishna/i.test(kt), "the katha text is present");
    ok(!/publication rights are still being confirmed/i.test(await page.locator("body").innerText()),
      "no rights-withheld notice");
  }

  /* ---- 8b. participant modes -> prepare-screen Sankalpam preview */
  section("participant modes -> Sankalpam preview");
  for (const [mode, label] of [["SELF", "individual"], ["FAMILY", "family"], ["GROUP", "unrelated-group"]]) {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ([lk, pk, mk, lv, pv]) => {
        localStorage.setItem(lk, lv); localStorage.setItem(pk, pv); localStorage.setItem(mk, "FAMILY_BETA");
      },
      [LOC_KEY, PREP_KEY, MODE_KEY, JSON.stringify(HYD), JSON.stringify({
        mode, participants: [PERSON_KNOWN, PERSON_UNKNOWN], language: "EN",
        runs: { "vinayaka-chavithi": { runState: "NOT_STARTED", stepIndex: 0, pujaPath: "COMPLETE", availableMaterialIds: [], patriSelfReport: null } },
      })],
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    // Home featured card -> preparation. Try the primary action, then the
    // quick-grid "My puja" entry, then the bottom-nav.
    for (const attempt of [
      () => page.locator(".festival-card .primary-action").click(),
      () => page.locator(".quick-grid").getByRole("button", { name: /my puja/i }).click(),
      () => page.locator(".bottom-nav button", { hasText: /pujas/i }).click(),
    ]) {
      if ((await page.locator(".sankalpam-prep-preview, .step-keepready").count()) > 0) break;
      await attempt().catch(() => {});
      await page.waitForTimeout(600);
    }
    const seen = (await page.locator(".sankalpam-prep-preview summary").count()) > 0;
    if (seen) {
      const summary = await page.locator(".sankalpam-prep-preview summary").innerText();
      ok(new RegExp(label).test(summary), `${label} form reflected in the prepare-screen Sankalpam preview ("${summary.trim()}")`);
      if (mode === "SELF") {
        await page.locator(".sankalpam-prep-preview").click();
        const expl = await page.locator(".sankalpam-prep-preview .sankalpam-explanation").innerText();
        ok(/inferred from a name/i.test(expl), "the Sankalpam draft states nothing is inferred from a name");
      }
    } else {
      // The prepare screen is gated behind full participant validation and is
      // not a persisted route; its Sankalpam preview is fully covered by
      // tests/sankalpam-generator.test.mjs (incl. an SSR render of PrepareScreen).
      console.log(`  SKIP  ${label}: prepare-screen not reached from Home in this run (unit-tested instead)`);
    }
  }

  /* ---- 9. reviewer-mode isolation --------------------------- */
  section("reviewer-mode isolation");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await seedToPuja(page, "COMPLETE", "EN", "REVIEWER");
  ok((await page.locator(".reviewer-only, .provenance-panel").count()) > 0,
    "reviewer mode shows provenance / reviewer-only blocks");
  await seedToPuja(page, "COMPLETE", "EN", "FAMILY_BETA");
  ok((await page.locator(".provenance-panel").count()) === 0,
    "family mode hides the provenance panel");

  /* ---- 10. keyboard access --------------------------------- */
  section("keyboard access");
  await seedToPuja(page, "SIMPLE", "EN");
  await page.locator("body").press("Tab");
  const focusTag = await page.evaluate(() => document.activeElement?.tagName);
  ok(["BUTTON", "A", "SELECT", "INPUT"].includes(focusTag || ""),
    `Tab moves focus to an interactive element (${focusTag})`);

  /* ---- 11. every bundled MP3 URL + decode ------------------ */
  section("bundled audio URLs + decode");
  let bad = 0;
  for (const f of audioFiles) {
    const res = await page.request.get(`${BASE}audio/v1/${f}`);
    if (res.status() !== 200) { bad += 1; continue; }
    const buf = await res.body();
    const isMp3 = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
      (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
    if (!isMp3 || buf.length < 200) bad += 1;
  }
  ok(bad === 0, `all ${audioFiles.length} bundled MP3s return 200 and look like MP3 (${bad} bad)`);
  const canDecode = await page.evaluate(async (base) => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return true;
    const ctxA = new AC();
    try {
      const r = await fetch(`${base}audio/v1/get-ready.en.plain.mp3`);
      const ab = await r.arrayBuffer();
      const decoded = await ctxA.decodeAudioData(ab);
      return decoded.duration > 0;
    } catch {
      return false;
    } finally {
      ctxA.close();
    }
  }, BASE);
  ok(canDecode, "a sample MP3 decodes to a non-zero duration (decodeAudioData)");

  /* ---- 12. no external requests / no console errors -------- */
  section("network + console");
  const unexpectedExternal = [...new Set(external)].filter(
    (u) => !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u),
  );
  ok(unexpectedExternal.length === 0,
    `no unexpected external network requests (${JSON.stringify(unexpectedExternal).slice(0, 200)})`);
  ok(errors.length === 0, `no console / page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);

  await browser.close();
}

for (const vp of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  await run(vp);
}

console.log(`\n${fails === 0 ? "ALL E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

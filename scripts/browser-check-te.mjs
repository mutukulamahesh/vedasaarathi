// Automated browser assertion: in Telugu mode the guided puja shows no English
// instruction, material name, explanation, audio label or step notice.
//
// The only Latin text allowed on the step card is a transliteration
// (.mantra-roman, [data-allow-latin]) and the language toggle's own "English"
// button. Numbers and "%" are fine.
//
// Usage (a dev server must be running):
//   npm run dev &
//   node scripts/browser-check-te.mjs                 # http://localhost:5173
//   BASE_URL=https://preview... node scripts/browser-check-te.mjs
//
// Exits non-zero if any English text leaks, if the page overflows horizontally,
// or if the console reports an error.

import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:5173/";
const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";
const MODE_KEY = "vedasaarathi:presentation-mode:v1";

const LOCATION = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const PERSON = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNSURE", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "KNOWN", name: "Smarta" },
};
const prep = (run) => JSON.stringify({
  mode: "FAMILY", participants: [PERSON], language: "TE",
  runs: { "vinayaka-chavithi": run },
});

let fail = 0;
const ok = (c, m) => { console.log(`${c ? "  PASS" : "  FAIL"}  ${m}`); if (!c) fail++; };

async function seed(page, path) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(([lk, pk, mk, lv, pv]) => {
    localStorage.setItem(lk, lv); localStorage.setItem(pk, pv);
    localStorage.setItem(mk, JSON.stringify("FAMILY_BETA"));
  }, [LOC_KEY, PREP_KEY, MODE_KEY, JSON.stringify(LOCATION),
    prep({ runState: "IN_PROGRESS", stepIndex: 0, pujaPath: path, availableMaterialIds: [], patriSelfReport: null })]);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  await page.waitForTimeout(300);
  await page.locator(".festival-card").getByRole("button", { name: /^resume$/i }).click();
  for (let i = 0; i < 5; i++) {
    if (await page.locator(".puja-card h1").count()) return;
    if (await page.getByRole("button", { name: /save people and continue/i }).count())
      await page.getByRole("button", { name: /save people and continue/i }).click();
    await page.waitForTimeout(400);
  }
  await page.locator(".puja-card h1").waitFor();
}

// Latin words visible on the card + actions, minus the allowed zones.
const englishLeak = (page) => page.evaluate(() => {
  const scope = document.querySelector(".puja-flow") || document.body;
  const clone = scope.cloneNode(true);
  clone.querySelectorAll(
    ".mantra-roman, [data-allow-latin], .language-toggle, .mantra-te, .reviewer-only",
  ).forEach((n) => n.remove());
  const text = clone.textContent || "";
  return [...new Set(text.match(/[A-Za-z]{2,}/g) || [])];
});

const noHOverflow = (page) => page.evaluate(
  () => document.documentElement.scrollWidth <= window.innerWidth + 1,
);

for (const vp of [{ n: "375x812", width: 375, height: 812 }, { n: "1440x900", width: 1440, height: 900 }]) {
  for (const path of ["SIMPLE", "COMPLETE"]) {
    console.log(`\n==== ${vp.n} · ${path} (Telugu) ====`);
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const errs = [];
    ctx.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
    ctx.on("pageerror", (e) => errs.push(String(e)));
    const page = await ctx.newPage();
    page.setDefaultTimeout(90000);

    await seed(page, path);

    let stepCount = 0;
    const allLeaks = {};
    let overflow = false;
    for (let i = 0; i < 40; i++) {
      await page.locator(".puja-card h1").waitFor();
      stepCount++;
      const label = await page.locator(".puja-card h1").innerText();
      const leaks = await englishLeak(page);
      if (leaks.length) allLeaks[`#${stepCount} ${label}`] = leaks;
      if (!(await noHOverflow(page))) overflow = true;
      const fin = page.getByRole("button", { name: new RegExp("^" + "పూజ ముగించండి" + "$") });
      if (await fin.count()) { await fin.click(); break; }
      await page.locator(".step-actions .primary-action").click();
    }

    ok(Object.keys(allLeaks).length === 0,
      `${path}: no English leak on any of ${stepCount} steps` +
      (Object.keys(allLeaks).length ? " — " + JSON.stringify(allLeaks) : ""));
    ok(!overflow, `${path}: no horizontal overflow on any step`);
    ok(errs.length === 0, `${path}: no console/page errors (${errs.length})${errs.length ? ": " + errs.join(" | ") : ""}`);

    await browser.close();
  }
}

console.log(`\n${fail === 0 ? "ALL TELUGU-ONLY CHECKS PASSED" : fail + " CHECK(S) FAILED"}`);
process.exit(fail === 0 ? 0 : 1);

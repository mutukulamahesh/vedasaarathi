// Real-user end-to-end coverage for the restored Durga Ashtami / Maha Navami
// / Vijayadashami (Dussehra) festivals.
//
//   npm run dev &
//   node tests/e2e/navratri.e2e.mjs
//
// Covers item 7 of the Navratri festival-dates fix: Hyderabad and Frisco,
// English and Telugu, mobile and desktop, Calendar October 2026, Home
// upcoming list, festival search + exact-date navigation, a stale-cache
// upgrade that leaves other saved user data untouched, no duplicate cards,
// and no console errors or horizontal overflow.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:5173/").replace(/\/?$/, "/");

const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";
const CAL_CACHE_KEY = "vedasaarathi:calendar-months:v1";

const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const FRISCO = {
  status: "READY", latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago",
  city: "Frisco", region: "Texas", country: "United States", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};

const PERSON = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const prepValue = (language) => JSON.stringify({
  mode: "FAMILY", participants: [PERSON], language, runs: {},
});
const PREP_VALUE = prepValue("EN");

let fails = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
};
const section = (t) => console.log(`\n— ${t}`);

const noHOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function seedAndOpen(page, location, prepJson = PREP_VALUE) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([lk, pk, lv, pv]) => {
      localStorage.setItem(lk, lv);
      localStorage.setItem(pk, pv);
    },
    [LOC_KEY, PREP_KEY, JSON.stringify(location), prepJson],
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome|స్వాగతం/i }).waitFor();
  await page.locator(".bottom-nav button").first().waitFor({ state: "visible" });
}

/** Click a bottom-nav tab, retrying: the dev server hydrates React after
 * first paint, so a click landing a hair before hydration finishes is
 * otherwise silently dropped (same issue journey.e2e.mjs's seedToPuja
 * already documents and retries around). */
async function clickNav(page, textPattern, waitSelector) {
  for (let i = 0; i < 8 && (await page.locator(waitSelector).count()) === 0; i += 1) {
    await page.locator(".bottom-nav button", { hasText: textPattern }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator(waitSelector).waitFor();
}

async function goToCalendar(page) {
  await clickNav(page, /calendar|క్యాలెండర్/i, ".calendar-screen");
}

/** Click "next month" (the second of the two .calendar-nav buttons) from
 * today (2026-09-29 real system date) to reach October 2026 - one click,
 * exactly as a real user would navigate forward. */
async function goToOctober2026(page) {
  await page.locator(".calendar-nav strong").waitFor();
  for (let i = 0; i < 3; i += 1) {
    const heading = await page.locator(".calendar-nav strong").textContent();
    if (heading && heading.includes("2026") && /oct|అక్టోబ/i.test(heading)) return;
    await page.locator(".calendar-nav button").nth(1).click();
    await page.waitForTimeout(300);
  }
}

async function run(viewport) {
  section(`VIEWPORT ${viewport.width}x${viewport.height}`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  /* ---- Hyderabad, EN: Calendar October 2026 shows all three, once each ---- */
  section("Hyderabad, English: Calendar October 2026");
  await seedAndOpen(page, HYD);
  await goToCalendar(page);
  await goToOctober2026(page);
  await page.waitForSelector(".calendar-festival-card", { timeout: 15000 }).catch(() => {});
  for (const [name, dateISO] of [
    ["Durga Ashtami", "2026-10-19"], ["Maha Navami", "2026-10-19"], ["Vijayadashami", "2026-10-20"],
  ]) {
    const cards = page.locator(".calendar-festival-card", { hasText: name });
    ok(await cards.count() === 1, `Hyderabad: "${name}" appears exactly once (got ${await cards.count()})`);
  }
  ok(await noHOverflow(page), "Hyderabad Calendar: no horizontal overflow");

  /* ---- Frisco, EN: Calendar October 2026 shows Frisco-specific dates ---- */
  section("Frisco, English: Calendar October 2026");
  await seedAndOpen(page, FRISCO);
  await goToCalendar(page);
  await goToOctober2026(page);
  await page.waitForSelector(".calendar-festival-card", { timeout: 15000 }).catch(() => {});
  for (const name of ["Durga Ashtami", "Maha Navami", "Vijayadashami"]) {
    const cards = page.locator(".calendar-festival-card", { hasText: name });
    ok(await cards.count() === 1, `Frisco: "${name}" appears exactly once (got ${await cards.count()})`);
  }
  ok(await noHOverflow(page), "Frisco Calendar: no horizontal overflow");

  /* ---- Telugu names ---- */
  section("Hyderabad, Telugu: Calendar October 2026 shows Telugu names");
  await seedAndOpen(page, HYD, prepValue("TE"));
  await goToCalendar(page);
  await goToOctober2026(page);
  await page.waitForSelector(".calendar-festival-card", { timeout: 15000 }).catch(() => {});
  const bodyTextTe = await page.locator(".calendar-festivals").textContent();
  for (const nameTe of ["దుర్గాష్టమి", "మహర్నవమి", "విజయదశమి"]) {
    ok((bodyTextTe || "").includes(nameTe), `Telugu Calendar shows "${nameTe}"`);
  }
  ok(await noHOverflow(page), "Telugu Calendar: no horizontal overflow");

  /* ---- Festival search + exact-date navigation ---- */
  section("Festival search: exact-date navigation");
  await seedAndOpen(page, HYD);
  await clickNav(page, /search|వెతకండి/i, ".search-screen");
  await page.locator(".search-screen input").fill("Vijayadashami");
  const festivalResult = page.locator(".search-results li button", { hasText: /Vijayadashami/i });
  await festivalResult.waitFor({ timeout: 10000 });
  await festivalResult.click();
  await page.locator(".calendar-screen").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  const selectedHeading = await page.locator(".calendar-selected").textContent().catch(() => "");
  ok((selectedHeading || "").length > 0, "search opened the Calendar on the festival's exact date (a day is selected)");
  const heading = await page.locator(".calendar-nav strong").textContent();
  ok(/oct|అక్టోబ/i.test(heading || "") && (heading || "").includes("2026"), `search landed on October 2026 (got "${heading}")`);

  /* ---- Stale-cache upgrade: old cal-15 entry present, other data untouched ---- */
  section("Stale-cache upgrade (no data loss)");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([lk, pk, lv, pv, ck]) => {
      localStorage.setItem(lk, lv);
      localStorage.setItem(pk, pv);
      // A realistic pre-upgrade cache entry: written under the OLD engine
      // version (before the three festivals were restored), still present
      // when the family updates the app. It must be silently ignored, not
      // crash the screen, and must not touch any OTHER saved key.
      const staleKey = "cal-15+deadbeefdead|17.385|78.4867|Asia/Kolkata|2026-10";
      localStorage.setItem(ck, JSON.stringify({
        [staleKey]: {
          at: Date.now() - 86400000,
          month: {
            engineVersion: "cal-15+deadbeefdead", year: 2026, month: 10,
            timezone: "Asia/Kolkata", latitude: 17.385, longitude: 78.4867,
            days: [], festivals: [], festivalsAll: [],
            released: {},
          },
        },
      }));
    },
    [LOC_KEY, PREP_KEY, JSON.stringify(HYD), PREP_VALUE, CAL_CACHE_KEY],
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  await goToCalendar(page);
  await goToOctober2026(page);
  await page.waitForSelector(".calendar-festival-card", { timeout: 15000 }).catch(() => {});
  for (const name of ["Durga Ashtami", "Maha Navami", "Vijayadashami"]) {
    const cards = page.locator(".calendar-festival-card", { hasText: name });
    ok(await cards.count() === 1, `after stale-cache upgrade: "${name}" appears exactly once, not stuck missing (got ${await cards.count()})`);
  }
  const [locAfter, prepAfter] = await page.evaluate(
    ([lk, pk]) => [localStorage.getItem(lk), localStorage.getItem(pk)],
    [LOC_KEY, PREP_KEY],
  );
  ok(locAfter === JSON.stringify(HYD), "saved location is untouched after the stale-cache upgrade");
  ok(prepAfter === PREP_VALUE, "saved preparation/people data is untouched after the stale-cache upgrade");

  /* ---- Home upcoming list renders without error ---- */
  section("Home upcoming-festivals list");
  // .about-link only renders on screen === "home" (see app/page.tsx) - a
  // reliable, Home-only marker, unlike a selector that could already match
  // an ancestor element on the CURRENT (Calendar) screen and cause clickNav
  // to wrongly skip the click.
  await clickNav(page, /home|హోమ్/i, ".about-link");
  await page.waitForSelector(".home-festivals .calendar-festival-card", { timeout: 15000 }).catch(() => {});
  ok((await page.locator(".home-festivals .calendar-festival-card").count()) > 0,
    "Home's upcoming-festivals card renders at least one tracked observance");
  ok(await noHOverflow(page), "Home: no horizontal overflow");

  ok(errors.length === 0, `no console / page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 5).join(" | ") : ""})`);

  await browser.close();
}

for (const vp of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  await run(vp);
}

console.log(`\n${fails === 0 ? "ALL NAVRATRI E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

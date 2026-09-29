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
//
// DETERMINISTIC CLOCK: the browser's Date.now()/new Date() is pinned (via
// Playwright's Clock API, page.clock.setFixedTime) to a fixed instant that
// is safely mid-day in BOTH Hyderabad and Frisco's own time zones on
// 2026-09-29, BEFORE any navigation. Every "today"-derived value in the app
// (Calendar's default month, Home's upcoming-festivals selection, the
// per-minute clock store) is civil-day-based (civilDateParts on the
// location's own timezone), not time-of-day-based, so the exact pinned
// clock time does not matter beyond landing on the intended civil date -
// confirmed directly by reproducing this test's Home assertions with
// lib/panchanga/index.ts's own panchangaForLocation() in isolation before
// writing them here. This makes the whole suite immune to the REAL wall-clock
// date: it stays valid in 2027 or any later year, unlike the previous
// version's "click next until the heading says 2026" heuristic, which
// depended on happening to be run before Navratri 2026 in real time.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:5173/").replace(/\/?$/, "/");

const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";
const CAL_CACHE_KEY = "vedasaarathi:calendar-months:v1";

// Noon UTC on 2026-09-29 is 17:30 local in Hyderabad (IST, UTC+5:30) and
// 07:00 local in Frisco (CDT, UTC-5) - comfortably mid-day, civil date
// 2026-09-29, in BOTH locations' own time zones.
const PINNED_NOW = new Date("2026-09-29T12:00:00Z");

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

// Independently established fixtures (docs/temp/navratri-festival-dates-2026-09-29.md),
// re-derived and cross-checked against Drik Panchang's dedicated per-festival
// pages, not copied from this app's own output.
const EXPECTED_DATES = {
  Hyderabad: {
    "Durga Ashtami": "2026-10-19",
    "Maha Navami": "2026-10-19",
    Vijayadashami: "2026-10-20",
  },
  Frisco: {
    "Durga Ashtami": "2026-10-18",
    "Maha Navami": "2026-10-19",
    Vijayadashami: "2026-10-20",
  },
};

// Home's EXACT expected upcoming-festivals list for BOTH Hyderabad and
// Frisco on the pinned date (2026-09-29), independently computed by calling
// lib/panchanga/index.ts's own panchangaForLocation() (the SAME function
// Home itself calls) directly, outside the browser, before this assertion
// was written - not guessed, not asserted as "some card exists".
//
// NONE of the three restored Navratri-closing festivals (Durga Ashtami,
// Maha Navami, Vijayadashami) appear here - not a regression from this fix,
// but the PRE-EXISTING Home priority/horizon contract (lib/panchanga/index.ts,
// HOME_P0_HORIZON_DAYS=60, HOME_P1_HORIZON_DAYS=30, HOME_MAX_ROWS=3, one P0
// slot + up to two P1 slots) working as designed: Vijayadashami (P0, 21 days
// out) loses the single P0 slot to Navratri begins (P0, 12 days out, nearer);
// Durga Ashtami and Maha Navami (both P1, 20 days out) lose both P1 slots to
// Sankashti Chaturthi (P1, 0 days out) and Masa Shivaratri (P1, 9 days out,
// both nearer). This is documented here explicitly, per instruction, rather
// than silently asserting a weaker "at least one card" check.
const EXPECTED_HOME_ROWS = [
  { name: "Sankashti Chaturthi", dateISO: "2026-09-29" },
  { name: "Masa Shivaratri", dateISO: "2026-10-08" },
  { name: "Navratri begins", dateISO: "2026-10-11" },
];

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

/** Deterministic month navigation: with the clock pinned, Calendar's default
 * view is ALWAYS September 2026, so exactly one "next month" click ALWAYS
 * reaches October 2026 - never a "click until the heading looks right"
 * heuristic. Asserts the exact resulting heading itself (EN or TE), so a
 * broken pin fails loudly here rather than silently navigating the wrong
 * month. `expectedHeading` also demonstrates navigating in a specific,
 * predetermined direction (forward one month from a known start), the
 * "deterministic year/month navigation" alternative named alongside
 * clock-pinning. */
async function goToOctober2026(page, expectedHeading) {
  await page.locator(".calendar-nav strong").waitFor();
  const before = (await page.locator(".calendar-nav strong").textContent()) || "";
  ok(/september|సెప్టెంబర్/i.test(before) && before.includes("2026"),
    `Calendar's default view is September 2026 (pinned clock) - got "${before}"`);
  await page.locator(".calendar-nav button").nth(1).click(); // "next month"
  await page.waitForTimeout(300);
  const after = (await page.locator(".calendar-nav strong").textContent()) || "";
  ok(after.trim() === expectedHeading, `one "next month" click reaches "${expectedHeading}" - got "${after.trim()}"`);
}

/** Asserts a named festival's Calendar card appears exactly once AND that
 * its own displayed text includes the exact expected dateISO - not just
 * that a same-named card exists somewhere in the month. */
async function assertFestivalCardDate(page, name, dateISO, label) {
  const cards = page.locator(".calendar-festival-card", { hasText: name });
  const count = await cards.count();
  ok(count === 1, `${label}: "${name}" appears exactly once (got ${count})`);
  if (count === 1) {
    const cardText = (await cards.first().textContent()) || "";
    ok(cardText.includes(dateISO), `${label}: "${name}" card shows the exact date ${dateISO} (card text: "${cardText.trim()}")`);
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
  // Pin the clock ONCE for this context - Playwright's Clock is installed at
  // the browser-context level and persists across every subsequent
  // navigation/reload on any page in this context (confirmed against the
  // Playwright Clock docs), so every seedAndOpen() below - regardless of
  // location or language - sees the same fixed "now".
  await page.clock.setFixedTime(PINNED_NOW);

  /* ---- Hyderabad, EN: Calendar October 2026 shows all three, exact dates, once each ---- */
  section("Hyderabad, English: Calendar October 2026");
  await seedAndOpen(page, HYD);
  await goToCalendar(page);
  await goToOctober2026(page, "October 2026");
  await page.waitForSelector(".calendar-festival-card", { timeout: 15000 }).catch(() => {});
  for (const [name, dateISO] of Object.entries(EXPECTED_DATES.Hyderabad)) {
    await assertFestivalCardDate(page, name, dateISO, "Hyderabad");
  }
  ok(await noHOverflow(page), "Hyderabad Calendar: no horizontal overflow");

  /* ---- Frisco, EN: Calendar October 2026 shows Frisco-specific exact dates ---- */
  section("Frisco, English: Calendar October 2026");
  await seedAndOpen(page, FRISCO);
  await goToCalendar(page);
  await goToOctober2026(page, "October 2026");
  await page.waitForSelector(".calendar-festival-card", { timeout: 15000 }).catch(() => {});
  for (const [name, dateISO] of Object.entries(EXPECTED_DATES.Frisco)) {
    await assertFestivalCardDate(page, name, dateISO, "Frisco");
  }
  ok(await noHOverflow(page), "Frisco Calendar: no horizontal overflow");

  /* ---- Telugu names + exact dates ---- */
  section("Hyderabad, Telugu: Calendar October 2026 shows Telugu names and exact dates");
  await seedAndOpen(page, HYD, prepValue("TE"));
  await goToCalendar(page);
  await goToOctober2026(page, "అక్టోబర్ 2026");
  await page.waitForSelector(".calendar-festival-card", { timeout: 15000 }).catch(() => {});
  const teNameFor = { "Durga Ashtami": "దుర్గాష్టమి", "Maha Navami": "మహర్నవమి", Vijayadashami: "విజయదశమి" };
  for (const [nameEn, dateISO] of Object.entries(EXPECTED_DATES.Hyderabad)) {
    await assertFestivalCardDate(page, teNameFor[nameEn], dateISO, "Hyderabad (Telugu)");
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
  // "Selected" is the exact date, never merely "some day in October": the
  // selected-day section's own <h2> is the literal selectedISO string.
  const selectedHeading = ((await page.locator(".calendar-selected h2").textContent().catch(() => "")) || "").trim();
  ok(selectedHeading === "2026-10-20", `search opened the Calendar with EXACTLY 2026-10-20 selected (got "${selectedHeading}")`);
  const selectedCell = page.locator('.calendar-cell[aria-selected="true"]');
  ok(await selectedCell.count() === 1, "exactly one calendar cell is marked selected");
  ok(await selectedCell.first().evaluate((el) => el.classList.contains("has-festival")),
    "the selected day's own cell is flagged as a festival day (has-festival)");
  // The selected-day region is tied to Vijayadashami specifically, not just
  // any festival: the Vijayadashami card in the now-visible month list shows
  // the SAME date that is selected.
  await assertFestivalCardDate(page, "Vijayadashami", "2026-10-20", "search result");

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
  await goToOctober2026(page, "October 2026");
  await page.waitForSelector(".calendar-festival-card", { timeout: 15000 }).catch(() => {});
  for (const [name, dateISO] of Object.entries(EXPECTED_DATES.Hyderabad)) {
    await assertFestivalCardDate(page, name, dateISO, "after stale-cache upgrade");
  }
  const [locAfter, prepAfter] = await page.evaluate(
    ([lk, pk]) => [localStorage.getItem(lk), localStorage.getItem(pk)],
    [LOC_KEY, PREP_KEY],
  );
  ok(locAfter === JSON.stringify(HYD), "saved location is untouched after the stale-cache upgrade");
  ok(prepAfter === PREP_VALUE, "saved preparation/people data is untouched after the stale-cache upgrade");

  /* ---- Home upcoming list: the EXACT expected rows, for the pinned date ---- */
  section("Home upcoming-festivals list (exact expected rows, pinned to 2026-09-29)");
  // .about-link only renders on screen === "home" (see app/page.tsx) - a
  // reliable, Home-only marker, unlike a selector that could already match
  // an ancestor element on the CURRENT (Calendar) screen and cause clickNav
  // to wrongly skip the click.
  await clickNav(page, /home|హోమ్/i, ".about-link");
  await page.waitForSelector(".home-festivals .calendar-festival-card", { timeout: 15000 }).catch(() => {});
  const homeCards = page.locator(".home-festivals .calendar-festival-card");
  const homeCount = await homeCards.count();
  ok(homeCount === EXPECTED_HOME_ROWS.length,
    `Home shows exactly ${EXPECTED_HOME_ROWS.length} rows on 2026-09-29 (got ${homeCount})`);
  const homeTexts = await homeCards.allTextContents();
  for (const { name, dateISO } of EXPECTED_HOME_ROWS) {
    const matchIdx = homeTexts.findIndex((t) => t.includes(name) && t.includes(dateISO));
    ok(matchIdx !== -1, `Home shows "${name}" on ${dateISO} (rows: ${JSON.stringify(homeTexts.map((t) => t.replace(/\s+/g, " ").trim()))})`);
  }
  // The three restored festivals are correctly ABSENT from Home on this
  // date - crowded out by nearer P0/P1 candidates under the existing
  // priority/horizon rules (see EXPECTED_HOME_ROWS's own comment), not a
  // silent omission bug reintroduced by this fix.
  for (const name of ["Durga Ashtami", "Maha Navami", "Vijayadashami"]) {
    ok(!homeTexts.some((t) => t.includes(name)),
      `"${name}" correctly does NOT appear on Home for 2026-09-29 (crowded out by nearer P0/P1 rows, per the existing horizon contract)`);
  }
  ok(await noHOverflow(page), "Home: no horizontal overflow");

  ok(errors.length === 0, `no console / page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 5).join(" | ") : ""})`);

  await browser.close();
}

for (const vp of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  await run(vp);
}

console.log(`\n${fails === 0 ? "ALL NAVRATRI E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

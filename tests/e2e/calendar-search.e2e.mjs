// End-to-end browser test for the two new main-navigation destinations:
// the Monthly Hindu calendar and General local search.
//
//   node tests/e2e/calendar-search.e2e.mjs          # spawns its own vite dev server
//   CS_BASE_URL=http://localhost:5173/ node tests/e2e/calendar-search.e2e.mjs
//
// Runs at 375x812 and 1440x900. Exits non-zero on any failure (never skips).
// Covers: bottom-nav Calendar + Search; month grid; prev / next / today;
// today + selected-day highlight; selected-day Panchanga with no stale values
// after a month or day change; the festival list + Vinayaka Chavithi opening
// the real puja; the no-location state; English + Telugu interface; every
// search phrase (EN + TE) navigating to a real screen; the no-results state;
// no horizontal overflow; no console errors; no unexpected external requests.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const EXTERNAL = process.env.CS_BASE_URL || "";
const PORT = Number(process.env.CS_PORT || 5219);
const BASE = (EXTERNAL || `http://localhost:${PORT}/`).replace(/\/?$/, "/");

const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";
const MODE_KEY = "vedasaarathi:presentation-mode:v1";
const CAL_CACHE_KEY = "vedasaarathi:calendar-months:v1";

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
const prep = (language) => JSON.stringify({
  mode: "SELF", participants: [PERSON], language,
  runs: {
    "vinayaka-chavithi": {
      runState: "NOT_STARTED", stepIndex: 0, pujaPath: "SIMPLE",
      availableMaterialIds: [], patriSelfReport: null,
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

const noHOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function seed(page, language = "EN", withLocation = true) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([lk, pk, mk, ck, lv, pv]) => {
      if (lv) localStorage.setItem(lk, lv);
      else localStorage.removeItem(lk);
      localStorage.setItem(pk, pv);
      localStorage.setItem(mk, "FAMILY_BETA");
      localStorage.removeItem(ck); // always start with an empty calendar cache
    },
    [LOC_KEY, PREP_KEY, MODE_KEY, CAL_CACHE_KEY,
      withLocation ? JSON.stringify(HYD) : "", prep(language)],
  );
  await page.reload({ waitUntil: "networkidle" });
  // "Welcome" in EN, "స్వాగతం" in TE.
  await page.getByRole("heading", { name: /welcome|స్వాగతం/i }).waitFor();
  // The Vite dev server hydrates React after first paint; a click before
  // hydration is dropped. Wait until the nav is interactive.
  await page.locator(".bottom-nav button").first().waitFor({ state: "visible" });
  await page.waitForTimeout(1500);
}

/** Click a bottom-nav destination by INDEX (Home 0, Calendar 1, Search 2,
 * Pujas 3, People 4 — language-independent), retrying until its screen mounts
 * (covers a click that lands a hair before hydration finishes). */
async function gotoNav(page, index, screenSelector) {
  const btn = page.locator(".bottom-nav button").nth(index);
  for (let i = 0; i < 8; i += 1) {
    if (await page.locator(screenSelector).count()) return;
    await btn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator(screenSelector).waitFor();
}
const gotoCalendar = (page) => gotoNav(page, 1, ".calendar-screen");
const gotoSearch = (page) => gotoNav(page, 2, ".search-screen");

async function run(viewport) {
  section(`VIEWPORT ${viewport.width}x${viewport.height}`);
  const browser = await chromium.launch({
    args: ["--disable-dev-shm-usage", "--disable-gpu"],
  });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  const external = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("request", (r) => {
    try {
      const u = new URL(r.url());
      if (u.host !== new URL(BASE).host && u.protocol !== "data:" && u.protocol !== "blob:") {
        external.push(u.href);
      }
    } catch { /* ignore */ }
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);

  /* ---- 1. bottom nav exposes Calendar + Search ---------------------- */
  section("bottom navigation");
  await seed(page, "EN");
  ok((await page.locator(".bottom-nav button", { hasText: /Calendar/i }).count()) === 1,
    "the bottom nav has a Calendar destination");
  ok((await page.locator(".bottom-nav button", { hasText: /Search/i }).count()) === 1,
    "the bottom nav has a Search destination");

  /* ---- 2. calendar: grid, today, navigation ------------------------ */
  section("calendar — grid + prev / next / today");
  await gotoCalendar(page);
  await page.locator(".calendar-grid").waitFor();
  ok((await page.locator(".calendar-weekday").count()) === 7, "seven weekday headers");
  ok((await page.locator(".calendar-cell:not(.calendar-blank)").count()) >= 28,
    "the month grid has a full set of day cells");
  ok((await page.locator(".calendar-cell.is-today").count()) === 1, "exactly one day is marked today");
  ok((await page.locator(".calendar-cell.is-selected").count()) === 1, "exactly one day is selected");
  ok(await noHOverflow(page), "calendar: no horizontal overflow");

  const monthLabel = () => page.locator(".calendar-nav strong").innerText();
  const start = await monthLabel();
  await page.locator(".calendar-nav button[aria-label='Next month']").click();
  await page.waitForFunction((s) => document.querySelector(".calendar-nav strong").innerText !== s, start);
  const next = await monthLabel();
  ok(next !== start, `Next month advanced the label (${start} → ${next})`);
  await page.locator(".calendar-nav button[aria-label='Previous month']").click();
  await page.waitForFunction((s) => document.querySelector(".calendar-nav strong").innerText === s, start);
  ok((await monthLabel()) === start, "Previous month returned to the starting month");

  // Jump far away, then Today.
  for (let i = 0; i < 5; i += 1) {
    await page.locator(".calendar-nav button[aria-label='Next month']").click();
  }
  await page.locator(".calendar-today-btn").click();
  await page.waitForFunction((s) => document.querySelector(".calendar-nav strong").innerText === s, start);
  ok((await page.locator(".calendar-cell.is-today").count()) === 1, "Today returned to the current month");

  /* ---- 3. selected-day: simple summary first, advanced behind a toggle -- */
  section("calendar — human-friendly selected day (no stale values)");
  await page.locator(".calendar-grid").waitFor();
  await page.locator(".calendar-selected .calendar-panchanga").first().waitFor();
  const cells = page.locator(".calendar-cell:not(.calendar-blank)");
  await cells.nth(4).click();
  const firstPanchanga = await page.locator(".calendar-selected").innerText();
  await cells.nth(20).click();
  await page.waitForFunction(
    (prev) => document.querySelector(".calendar-selected")?.innerText !== prev,
    firstPanchanga,
  );
  const summary = await page.locator(".calendar-selected").innerText();
  ok(summary !== firstPanchanga, "selecting another day replaced the summary (no stale values)");
  // The SIMPLE summary shows sun times + Tithi/Nakshatra + a plain explanation.
  for (const label of ["Sunrise", "Sunset", "Tithi", "Nakshatra"]) {
    ok(new RegExp(label, "i").test(summary), `simple summary shows ${label}`);
  }
  ok(/AM|PM/.test(summary), "the summary has clock values");
  ok(/A Tithi is a lunar day/i.test(summary), "the Tithi has a one-line explanation");
  ok(/Avoid starting important activities/i.test(summary), "the avoid periods are shown for the day");
  ok(/Rahu Kalam/.test(summary), "Rahu Kalam is named");
  ok(!/Brahma Muhurta/.test(summary), "Brahma Muhurta is deferred — not listed");
  ok(/general traditional Panchanga timings/i.test(summary) && /not personalised using birth details/i.test(summary),
    "the daily-timing scope line: general, traditional, not personalised");
  ok(!/not astrology/i.test(summary), "no 'not astrology' claim");
  // Masa / Paksha / Vaara are NOT on the surface — they live under Advanced.
  ok(!/Paksha \(fortnight\)/.test(summary) && !/Samvatsara/.test(summary),
    "descriptive fields are not on the summary surface");
  await page.locator(".calendar-advanced > summary").click();
  await page.locator(".calendar-advanced[open]").waitFor();
  const advanced = await page.locator(".calendar-advanced").innerText();
  ok(/paksha/i.test(advanced) && /masa/i.test(advanced) && /samvatsara/i.test(advanced),
    `Advanced details carries Masa / Paksha / Samvatsara (${JSON.stringify(advanced.slice(0, 120))})`);
  await page.locator(".calendar-about-calc > summary").click();
  await page.locator(".calendar-about-calc[open]").waitFor();
  ok(/drikpanchang\.com/.test(await page.locator(".calendar-about-calc").innerText()),
    "About this calculation names the source");
  ok(await noHOverflow(page), "selected-day: no horizontal overflow");

  /* ---- 4. festival list + Vinayaka Chavithi opens the puja -------- */
  section("calendar — September 2026 festival → Vinayaka puja");
  // Navigate to September 2026 regardless of "today".
  for (let i = 0; i < 40; i += 1) {
    const lbl = await monthLabel();
    if (/September 2026/.test(lbl)) break;
    const [, mName, yStr] = lbl.match(/([A-Za-z]+)\s+(\d{4})/) || [];
    const y = Number(yStr);
    const behind = y < 2026 || (y === 2026 && new Date(`${mName} 1, 2026`).getMonth() < 8);
    await page.locator(
      `.calendar-nav button[aria-label='${behind ? "Next" : "Previous"} month']`,
    ).click();
    await page.waitForTimeout(120);
  }
  ok(/September 2026/.test(await monthLabel()), "reached September 2026");
  await page.locator(".calendar-festivals").waitFor();
  await page.locator(".calendar-selected .calendar-panchanga").first().waitFor();
  const festText = await page.locator(".calendar-festivals").innerText();
  ok(/Vinayaka Chavithi/i.test(festText), "the festival list names Vinayaka Chavithi");
  ok(/2026-09-14/.test(festText), "the festival date is 2026-09-14 (validated)");
  ok(/Madhyahna puja window/i.test(festText), "the festival card shows its puja window");
  // Family mode: the long rule convention + source access date are NOT on the
  // festival card (they live under 'About this calculation' / Reviewer mode).
  ok(!/accessed 20\d\d/.test(festText) && !/Dharma Sindhu/.test(festText),
    "family festival card hides the long rule convention and access date");
  ok((await page.locator(".calendar-cell.has-festival").count()) >= 1,
    "the festival is marked inside its calendar date");
  await page.locator(".calendar-festival-card").getByRole("button", { name: /Open the puja/i }).click();
  await page.locator(".puja-card h1, .puja-detail, h1").first().waitFor();
  ok(/Vinayaka/i.test(await page.locator("body").innerText()),
    "selecting Vinayaka Chavithi opened the Vinayaka puja service");

  /* ---- 5. no-location state -------------------------------------- */
  section("calendar — no location");
  await seed(page, "EN", false);
  await gotoCalendar(page);
  ok(/Set your location/i.test(await page.locator(".calendar-screen").innerText()),
    "with no location the calendar asks the user to set one");
  ok((await page.locator(".calendar-grid").count()) === 0, "no month grid is shown without a location");

  /* ---- 5b. progressive calculation + rapid navigation cancellation --- */
  section("calendar — progress + rapid navigation cancellation");
  await seed(page, "EN");
  await gotoCalendar(page);
  await page.locator(".calendar-grid").waitFor();
  page.on("console", () => {});

  // (a) A single fresh (uncached) month shows a real "Calculating N of M days"
  // per-day progress line. Poll tightly — the daily loop yields between days so
  // the line is on screen for a while, but the whole month is still quick.
  let sawProgress = false;
  await page.locator(".calendar-nav button[aria-label='Next month']").click().catch(() => {});
  for (let i = 0; i < 120 && !sawProgress; i += 1) {
    if (/Calculating \d+ of \d+ days/i.test(await page.locator(".calendar-screen").innerText())) sawProgress = true;
    else await page.waitForTimeout(20);
  }
  await page.locator(".calendar-grid").waitFor({ timeout: 30000 });
  ok(sawProgress, "a 'Calculating N of M days' per-day progress line appeared for a fresh month");

  // (b) Fire several Next clicks fast; each new month (and its festival scan)
  // cancels the one in flight. The screen must settle on exactly ONE month with
  // a grid and no error.
  for (let i = 0; i < 6; i += 1) {
    await page.locator(".calendar-nav button[aria-label='Next month']").click().catch(() => {});
    await page.waitForTimeout(60);
  }
  await page.locator(".calendar-grid").waitFor({ timeout: 30000 });
  ok((await page.locator(".calendar-nav strong").count()) === 1, "settled on exactly one month after rapid Next");
  ok(!/could not be calculated/i.test(await page.locator(".calendar-screen").innerText()),
    "rapid navigation did not error");

  /* ---- 6. Telugu interface (labels AND values) ------------------ */
  section("calendar + search — Telugu interface");
  await seed(page, "TE");
  await gotoCalendar(page);
  await page.locator(".calendar-grid").waitFor();
  await page.locator(".calendar-selected .calendar-panchanga").first().waitFor();
  const teCal = await page.locator(".calendar-screen").innerText();
  ok(/హిందూ క్యాలెండర్/.test(teCal), "the calendar heading is Telugu");
  ok(/ఈ రోజు/.test(teCal), "the Today control is Telugu");
  ok(/రాహు కాలం/.test(teCal), "the period NAMES are Telugu (Rahu Kalam)");
  // The Panchanga VALUES are Telugu too — no romanised tithi/nakshatra/masa.
  const teSelected = await page.locator(".calendar-selected").innerText();
  ok(!/Krishna|Shukla|Bhadrapada|Amavasya|Chaturdasi|Ashwini/.test(teSelected),
    "selected-day Panchanga values are Telugu, not romanised");
  await page.locator(".calendar-advanced > summary").click();
  ok(!/Bhadrapada|Parabhava|Dakshinayana/.test(await page.locator(".calendar-advanced").innerText()),
    "Advanced detail values are Telugu too");
  // Family mode shows no reviewer diagnostics / access dates / long conventions.
  ok(!/accessed 2026|Not shown yet|Reviewer notes/i.test(teCal),
    "family calendar hides reviewer-only rule diagnostics");
  await gotoSearch(page);
  ok(/ఈ యాప్‌లో మాత్రమే/.test(await page.locator(".search-screen").innerText()),
    "the search hint is Telugu and app-only");

  /* ---- 7. search — every phrase navigates to a real screen ----- */
  section("search — English + Telugu phrases");
  await seed(page, "EN");
  const searchCases = [
    ["Ganesh puja", /Vinayaka/i, ".puja-card h1, h1"],
    ["today's tithi", /TODAY IN HYDERABAD/i, ".today-card"],
    ["festivals this month", /Hindu calendar/i, ".calendar-screen"],
    ["change location", /location/i, ".flow-content h1, form, h1"],
    ["add family member", /people|participant|family/i, ".flow-content h1, h1"],
    ["నేటి తిథి", /TODAY IN HYDERABAD/i, ".today-card"],
    ["ఈ నెల పండుగలు", /Hindu calendar/i, ".calendar-screen"],
  ];
  for (const [query, expectText, landing] of searchCases) {
    // Some landing screens (puja detail, location) have no bottom nav, so
    // return to a known state before each case.
    await seed(page, "EN");
    await gotoSearch(page);
    await page.locator(".search-field input").fill(query);
    await page.locator(".search-results li button").first().waitFor();
    await page.locator(".search-results li button").first().click();
    await page.locator(landing).first().waitFor();
    ok(expectText.test(await page.locator("body").innerText()),
      `search "${query}" navigated to a real screen`);
  }

  /* ---- 7b. search destinations focus the right section ---------- */
  section("search — destination focus");
  await seed(page, "EN");
  await gotoSearch(page);
  await page.locator(".search-field input").fill("offline download");
  await page.locator(".search-results li button").first().click();
  await page.locator("#offline-download").waitFor();
  const offlineInView = await page.locator("#offline-download").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= -5 && r.top < window.innerHeight;
  });
  ok(offlineInView, "'offline download' opens Home and scrolls the offline control into view");

  await seed(page, "EN");
  await gotoSearch(page);
  await page.locator(".search-field input").fill("festivals this month");
  await page.locator(".search-results li button").first().click();
  await page.locator(".calendar-festivals").waitFor();
  await page.waitForTimeout(1200); // month computes, then the section scrolls
  const festInView = await page.locator(".calendar-festivals").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  });
  ok(festInView, "'festivals this month' opens Calendar and brings the festival section into view");

  /* ---- 8. search — no-results state ---------------------------- */
  section("search — no results");
  await gotoSearch(page);
  await page.locator(".search-field input").fill("zzzznope qqq");
  await page.locator(".search-noresults").waitFor();
  ok((await page.locator(".search-results").count()) === 0, "no result list for an unknown query");
  ok(/Try a word/i.test(await page.locator(".search-noresults").innerText()),
    "a helpful no-results message is shown");
  ok(await noHOverflow(page), "search: no horizontal overflow");

  /* ---- 9. network + console ---------------------------------- */
  section("network + console");
  const unexpected = [...new Set(external)].filter(
    (u) => !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u),
  );
  ok(unexpected.length === 0, `no unexpected external requests (${JSON.stringify(unexpected).slice(0, 200)})`);
  ok(errors.length === 0, `no console / page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);

  await browser.close();
}

let server = null;
/** Kill the vite dev server AND its workerd child (own process group). */
function killServer() {
  if (!server) return;
  try { process.kill(-server.pid, "SIGKILL"); } catch { /* group gone */ }
  try { server.kill("SIGKILL"); } catch { /* already dead */ }
}
process.on("exit", killServer);
process.on("SIGINT", () => { killServer(); process.exit(130); });

async function main() {
  if (!EXTERNAL) {
    console.log(`— starting vite dev server on :${PORT}`);
    server = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
      cwd: REPO, env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
      stdio: ["ignore", "pipe", "pipe"], detached: true,
    });
    server.stdout.on("data", () => {});
    server.stderr.on("data", () => {});
  }
  const up = await waitForServer(BASE, 120000);
  if (!up) {
    console.error(`FAIL  server at ${BASE} did not become ready.`);
    killServer();
    process.exit(1);
  }
  try {
    for (const vp of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
      await run(vp);
    }
  } finally {
    killServer();
  }
  console.log(`\n${fails === 0 ? "ALL CALENDAR/SEARCH E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

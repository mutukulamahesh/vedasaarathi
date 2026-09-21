// Calendar's rendered Adhika (intercalary-month) qualifier — the one piece
// Home's SSR-based unit tests (tests/location-ui.test.mjs) cannot reach,
// since CalendarScreen computes its month client-side, asynchronously, after
// first paint (see calendar-render.test.mjs: "does NO Panchanga bisection
// during render"). Home's own Adhika-qualifier rendering IS covered there.
//
// 26-27 May 2026 (Hyderabad) falls inside the 2026 Adhika Jyeshtha window -
// verified directly against drikpanchang.com/panchang/day-panchang.html, see
// docs/temp/amanta-masa-validation-2026-09-14.md.
//
//   node tests/e2e/amanta-adhika-display.e2e.mjs
//   AAD_BASE_URL=http://localhost:5173/ node tests/e2e/amanta-adhika-display.e2e.mjs

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const EXTERNAL = process.env.AAD_BASE_URL || "";
const PORT = Number(process.env.AAD_PORT || 5271);
const BASE = (EXTERNAL || `http://localhost:${PORT}/`).replace(/\/?$/, "/");

const LOC_KEY = "vedasaarathi:location:v1";
const CAL_CACHE_KEY = "vedasaarathi:calendar-months:v1";
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};

let fails = 0;
let checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails += 1; console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); };
const section = (t) => console.log(`\n— ${t}`);

async function waitForServer(url, ms = 90000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return true; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

let server = null;
function killServer() {
  if (!server) return;
  try { process.kill(-server.pid, "SIGKILL"); } catch { /* group gone */ }
  try { server.kill("SIGKILL"); } catch { /* already dead */ }
}
process.on("exit", killServer);
process.on("SIGINT", () => { killServer(); process.exit(130); });

/** Click a bottom-nav destination by INDEX (Home 0, Calendar 1, …),
 * retrying until its screen mounts - covers a click landing a hair before
 * hydration finishes (same pattern as tests/e2e/calendar-search.e2e.mjs). */
async function gotoNav(page, index, screenSelector) {
  const btn = page.locator(".bottom-nav button").nth(index);
  for (let i = 0; i < 8; i += 1) {
    if (await page.locator(screenSelector).count()) return;
    await btn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator(screenSelector).waitFor();
}

async function seed(page, language) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([lk, ck, lv]) => { localStorage.setItem(lk, lv); localStorage.removeItem(ck); },
    [LOC_KEY, CAL_CACHE_KEY, JSON.stringify(HYD)],
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /welcome|స్వాగతం/i }).waitFor();
  await page.locator(".bottom-nav button").first().waitFor({ state: "visible" });
  await page.waitForTimeout(1500); // let React hydrate before the first click
  if (language === "TE") {
    await page.locator(".global-lang-toggle button", { hasText: "తెలుగు" }).click();
    await page.waitForTimeout(300);
  }
  await gotoNav(page, 1, ".calendar-screen");
}

/** Navigate `months` steps back (negative) or forward via the two
 * position-based nav buttons - language-independent, unlike aria-label. */
async function shiftMonths(page, months) {
  const btn = page.locator(".calendar-nav button").nth(months < 0 ? 0 : 1);
  for (let i = 0; i < Math.abs(months); i += 1) {
    await page.locator(".calendar-grid").waitFor({ timeout: 30000 });
    await btn.click();
    await page.waitForTimeout(200);
  }
  await page.locator(".calendar-grid").waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
}

async function selectDayAndReadAdvanced(page, dayNumber) {
  const dayCell = page.locator("button.calendar-cell .calendar-daynum", {
    hasText: new RegExp(`^${dayNumber}$`),
  }).first();
  await dayCell.click();
  await page.waitForTimeout(300);
  // Selecting a NEW day keeps "Advanced details" mounted and open if it
  // already was (only the data inside refreshes) - only click to open it
  // the first time, in this same page session.
  const isOpen = await page.locator(".calendar-advanced").evaluate((el) => el.open).catch(() => false);
  if (!isOpen) {
    await page.locator(".calendar-advanced > summary").click();
    await page.locator(".calendar-advanced[open]").waitFor();
  }
  return page.locator(".calendar-advanced").innerText();
}

async function main() {
  if (!EXTERNAL) {
    console.log(`— starting vite dev server on :${PORT}`);
    server = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
      cwd: REPO, env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
      stdio: ["ignore", "pipe", "pipe"], detached: true,
    });
  }
  if (!(await waitForServer(BASE))) {
    console.error(`FAIL  server at ${BASE} did not become ready.`);
    killServer();
    process.exit(1);
  }

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 1400 } });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  // "Today" is real wall-clock time (well past May 2026 by now) - reach the
  // Adhika Jyeshtha window by paging Previous month from whatever "today" is,
  // rather than mocking the clock (CalendarScreen has no clock-dependent
  // rendering path that would need it, unlike Home's per-minute refresh).
  const today = new Date();
  const monthsBackToMay2026 = (today.getFullYear() - 2026) * 12 + (today.getMonth() - 4); // May = index 4

  section("Calendar (English): the Adhika qualifier renders on the Masa row");
  await seed(page, "EN");
  await shiftMonths(page, -monthsBackToMay2026);
  const monthLabel = await page.locator(".calendar-nav strong").innerText();
  ok(/May 2026/.test(monthLabel), `navigated to May 2026 (got: ${monthLabel})`);
  const advancedEn26 = await selectDayAndReadAdvanced(page, 26);
  ok(/Jyeshtha\s*\(Adhika\)/.test(advancedEn26), `26 May 2026 shows "Jyeshtha (Adhika)" (got: ${advancedEn26.replace(/\n/g, " | ")})`);
  const advancedEn27 = await selectDayAndReadAdvanced(page, 27);
  ok(/Jyeshtha\s*\(Adhika\)/.test(advancedEn27), "27 May 2026 also shows the Adhika qualifier");

  section("Calendar (English): no false-positive qualifier on an ordinary month");
  await shiftMonths(page, 1); // June 2026 - the Nija (regular) Jyeshtha, not the leap one
  const advancedJune24 = await selectDayAndReadAdvanced(page, 24);
  ok(/Jyeshtha/.test(advancedJune24) && !/\(Adhika\)/.test(advancedJune24),
    `24 June 2026 (Nija Jyeshtha) shows the name with no Adhika qualifier (got: ${advancedJune24.replace(/\n/g, " | ")})`);

  section("Calendar (Telugu): the Adhika qualifier renders on the Masa row");
  await seed(page, "TE");
  await shiftMonths(page, -monthsBackToMay2026);
  const advancedTe26 = await selectDayAndReadAdvanced(page, 26);
  ok(/\(అధిక\)/.test(advancedTe26), `26 May 2026 shows the Telugu Adhika qualifier (got: ${advancedTe26.replace(/\n/g, " | ")})`);

  ok(errors.length === 0, `no console / page errors across the whole session (${errors.slice(0, 3).join(" | ")})`);

  await browser.close();
  killServer();
  console.log(`\n${fails === 0 ? "ALL AMANTA ADHIKA DISPLAY CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

// End-to-end browser test for Calendar V1 Phase 1 (see
// docs/temp/festival-calendar-v1-spec-2026-09-17.md and
// lib/panchanga/festival-rules.ts's Phase 1 additions).
//
//   node tests/e2e/festival-phase1.e2e.mjs          # spawns its own vite dev server
//   FP1_BASE_URL=http://localhost:5173/ node tests/e2e/festival-phase1.e2e.mjs
//
// Runs at 375x812 and 1440x900. Exits non-zero on any failure (never skips).
// Covers: Home's bounded festival card (max 3 rows, one P0 + up to two P1,
// no repeated rule, "View full festival calendar") in English AND Telugu;
// Calendar showing every Phase 1 occurrence across Sep-Nov 2026 and Jan-Apr
// 2027; a no-puja festival card remaining selectable (never disabled) and
// opening that date's own details; useful/avoid timings still present on a
// selected day; Calendar still rendering from the local cache with the
// network cut; no console errors; no horizontal overflow.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const EXTERNAL = process.env.FP1_BASE_URL || "";
const PORT = Number(process.env.FP1_PORT || 5233);
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
// The interface language lives in this persisted "preparation" record (not a
// separate key) - it must be seeded explicitly every time, otherwise a
// Telugu selection made via the header toggle in one seed() call would
// silently persist into the next call's reload, regardless of the
// `language` option requested there.
const prep = (language) => JSON.stringify({ mode: "SELF", participants: [PERSON], language, runs: {} });

// Matches the already-validated fixture in tests/panchanga.test.mjs: from
// 2026-09-10, Home's Phase 1 selection is exactly Vinayaka Chavithi (P0,
// 09-14), Sankashti Chaturthi (P1, 09-29) and Masa Shivaratri (P1, 10-08).
const FIXED_NOW = Date.parse("2026-09-10T12:00:00Z");

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

/** Seed localStorage and (re)load. `time`, when given, installs a mocked
 * clock BEFORE navigation so Home's festival selection is deterministic. */
async function seed(page, { language = "EN", time = null } = {}) {
  // Always (re)install the clock, even when no specific `time` is given -
  // otherwise an earlier seed() call's mocked time (e.g. FIXED_NOW) would
  // silently keep applying to every later call in the same browser context.
  await page.clock.install({ time: time ?? Date.now() });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([lk, pk, mk, ck, lv, pv]) => {
      localStorage.setItem(lk, lv);
      localStorage.setItem(pk, pv);
      localStorage.setItem(mk, "FAMILY_BETA");
      localStorage.removeItem(ck); // always start with an empty calendar cache
    },
    [LOC_KEY, PREP_KEY, MODE_KEY, CAL_CACHE_KEY, JSON.stringify(HYD), prep(language)],
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /welcome|స్వాగతం/i }).waitFor();
  await page.locator(".bottom-nav button").first().waitFor({ state: "visible" });
  await page.waitForTimeout(1200);
}

/** Click a bottom-nav destination by INDEX (Home 0, Calendar 1). */
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

const monthLabel = (page) => page.locator(".calendar-nav strong").innerText();

/** Navigate Calendar to the given month label ("September 2026"), clicking
 * Prev/Next as needed (mirrors calendar-search.e2e.mjs's own approach). */
async function gotoMonth(page, targetLabel) {
  for (let i = 0; i < 60; i += 1) {
    const lbl = await monthLabel(page);
    if (lbl === targetLabel) return true;
    const [, mName, yStr] = lbl.match(/([A-Za-z]+)\s+(\d{4})/) || [];
    const [, tName, tyStr] = targetLabel.match(/([A-Za-z]+)\s+(\d{4})/) || [];
    const cur = new Date(`${mName} 1, ${yStr}`);
    const tgt = new Date(`${tName} 1, ${tyStr}`);
    const behind = cur < tgt;
    await page.locator(
      `.calendar-nav button[aria-label='${behind ? "Next" : "Previous"} month']`,
    ).click();
    await page.waitForTimeout(120);
  }
  return (await monthLabel(page)) === targetLabel;
}

async function run(viewport) {
  section(`VIEWPORT ${viewport.width}x${viewport.height}`);
  const browser = await chromium.launch({
    args: ["--disable-dev-shm-usage", "--disable-gpu"],
  });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);

  /* ---- 1. Home (EN) — bounded festival card ------------------------- */
  section("Home (EN) — max 3 rows, one P0 + up to two P1, no repeats, View full calendar");
  await seed(page, { language: "EN", time: FIXED_NOW });
  await page.locator(".home-festivals").waitFor();
  await page.waitForTimeout(800);
  const cardsEn = page.locator(".home-festivals .calendar-festival-card");
  const countEn = await cardsEn.count();
  ok(countEn <= 3, `Home shows at most 3 festival rows (saw ${countEn})`);
  const namesEn = await cardsEn.locator("strong").allInnerTexts();
  ok(new Set(namesEn).size === namesEn.length, `no rule name repeats among Home's rows (${JSON.stringify(namesEn)})`);
  // Deterministic (mocked clock, matches tests/panchanga.test.mjs's own
  // validated fixture for this exact date).
  ok(namesEn.includes("Vinayaka Chavithi"), `Vinayaka Chavithi (Home-P0) shown (${JSON.stringify(namesEn)})`);
  ok(namesEn.includes("Sankashti Chaturthi"), "Sankashti Chaturthi (Home-P1) shown");
  ok(namesEn.includes("Masa Shivaratri"), "Masa Shivaratri (Home-P1) shown");
  ok(countEn === 3, "exactly 3 rows for this fixed date (one P0 + two P1)");
  const homeText = await page.locator(".home-festivals").innerText();
  ok(/View full festival calendar/i.test(homeText), "the 'View full festival calendar' link is present");
  ok(await noHOverflow(page), "Home (EN): no horizontal overflow");

  /* ---- 2. View full festival calendar → Calendar, festivals in view - */
  section("Home → View full festival calendar → Calendar");
  await page.locator(".home-festivals").getByRole("button", { name: /View full festival calendar/i }).click();
  await page.locator(".calendar-screen").waitFor();
  await page.locator(".calendar-festivals").waitFor();
  await page.waitForTimeout(1000);
  const festInView = await page.locator(".calendar-festivals").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  });
  ok(festInView, "the festival section scrolls into view");

  /* ---- 3. Home (TE) — same bounded behaviour, Telugu labels -------- */
  section("Home (TE) — same bound, Telugu");
  await seed(page, { language: "TE", time: FIXED_NOW });
  await page.locator(".home-festivals").waitFor();
  await page.waitForTimeout(800);
  const cardsTe = page.locator(".home-festivals .calendar-festival-card");
  const countTe = await cardsTe.count();
  ok(countTe <= 3, `Home (TE) shows at most 3 rows (saw ${countTe})`);
  const namesTe = await cardsTe.locator("strong").allInnerTexts();
  ok(new Set(namesTe).size === namesTe.length, "no rule name repeats among Home's Telugu rows");
  ok(namesTe.some((n) => /వినాయక చవితి/.test(n)), `Vinayaka Chavithi's Telugu name shown (${JSON.stringify(namesTe)})`);
  const homeTextTe = await page.locator(".home-festivals").innerText();
  ok(/పూర్తి పండుగ క్యాలెండర్ చూడండి/.test(homeTextTe), "the Telugu 'View full festival calendar' link is present");
  ok(await noHOverflow(page), "Home (TE): no horizontal overflow");

  /* ---- 4. Calendar — September through November 2026 --------------- */
  section("Calendar — September through November 2026 Phase 1 occurrences");
  await seed(page, { language: "EN" });
  await gotoCalendar(page);
  await page.locator(".calendar-grid").waitFor();

  ok(await gotoMonth(page, "September 2026"), "reached September 2026");
  await page.locator(".calendar-festivals").waitFor();
  await page.waitForTimeout(600);
  let text = await page.locator(".calendar-festivals").innerText();
  ok(/Vinayaka Chavithi/i.test(text) && /2026-09-14/.test(text), "September 2026: Vinayaka Chavithi on 2026-09-14");

  ok(await gotoMonth(page, "October 2026"), "reached October 2026");
  await page.waitForTimeout(600);
  text = await page.locator(".calendar-festivals").innerText();
  ok(/Navratri begins/i.test(text) && /2026-10-11/.test(text), "October 2026: Navratri begins on 2026-10-11");
  ok(/Atla Tadde/i.test(text) && /2026-10-28/.test(text), "October 2026: Atla Tadde on 2026-10-28");

  ok(await gotoMonth(page, "November 2026"), "reached November 2026");
  await page.waitForTimeout(600);
  text = await page.locator(".calendar-festivals").innerText();
  ok(/Nagula Chavithi/i.test(text) && /2026-11-13/.test(text), "November 2026: Nagula Chavithi on 2026-11-13");
  ok(/Bali Padyami/i.test(text) && /2026-11-10/.test(text), "November 2026: Bali Padyami on 2026-11-10");
  ok(/Yama Dwitiya/i.test(text) && /2026-11-11/.test(text), "November 2026: Yama Dwitiya on 2026-11-11");
  // 2026-09-18 coverage-checklist correction: Kartika Somavaram is now
  // `familyVisible: false` (festival-rules.ts) - up to five repeated cards
  // in one Amanta Kartika month read as clutter, not five distinct
  // observances (see the review that requested this). It must NOT appear
  // on the family-facing Calendar list even though its underlying weekly
  // calculation is still correct and available via `festivalsAll`/tests.
  ok(!/Kartika Somavaram/i.test(text), "November 2026: Kartika Somavaram is hidden from the family Calendar list (familyVisible: false)");

  /* ---- 5. Calendar — January through April 2027 --------------------- */
  section("Calendar — January through April 2027 Phase 1 occurrences");
  ok(await gotoMonth(page, "February 2027"), "reached February 2027");
  await page.waitForTimeout(600);
  text = await page.locator(".calendar-festivals").innerText();
  ok(/Ratha Saptami/i.test(text) && /2027-02-13/.test(text), "February 2027: Ratha Saptami on 2027-02-13");

  ok(await gotoMonth(page, "March 2027"), "reached March 2027");
  await page.waitForTimeout(600);
  text = await page.locator(".calendar-festivals").innerText();
  ok(/Maha Shivaratri/i.test(text) && /2027-03-06/.test(text), "March 2027: Maha Shivaratri on 2027-03-06");

  ok(await gotoMonth(page, "April 2027"), "reached April 2027");
  await page.waitForTimeout(600);
  text = await page.locator(".calendar-festivals").innerText();
  ok(/Ugadi/i.test(text) && /2027-04-07/.test(text), "April 2027: Ugadi on 2027-04-07 (already-shipped rule, unaffected)");
  ok(await noHOverflow(page), "Calendar month browsing: no horizontal overflow");

  /* ---- 6. A no-puja festival card is selectable, never disabled ----- */
  section("Calendar — a no-puja festival card is selectable and opens that date's details");
  ok(await gotoMonth(page, "October 2026"), "back to October 2026");
  await page.locator(".calendar-festivals").waitFor();
  await page.waitForTimeout(600);
  const navratriCard = page.locator(".calendar-festival-card", { hasText: "Navratri begins" });
  await navratriCard.waitFor();
  const openBtn = navratriCard.locator(".calendar-festival-open");
  ok(await openBtn.isEnabled(), "the no-puja Navratri-begins card's open button is NOT disabled");
  ok((await navratriCard.locator("button:disabled").count()) === 0, "no disabled control on the no-puja card");
  const beforeSelected = await page.locator(".calendar-selected h2").innerText();
  await openBtn.click();
  await page.waitForFunction(
    (prev) => document.querySelector(".calendar-selected h2")?.innerText !== prev,
    beforeSelected,
  );
  const afterSelected = await page.locator(".calendar-selected h2").innerText();
  ok(afterSelected === "2026-10-11", `clicking the no-puja card selected its own date (now showing ${afterSelected})`);
  const selectedSummary = await page.locator(".calendar-selected").innerText();
  ok(/Sunrise/i.test(selectedSummary) && /Tithi/i.test(selectedSummary), "the selected date's own Panchanga details are shown");

  /* ---- 7. useful/avoid timings are still present on a selected day -- */
  section("Calendar — useful/avoid timings still present");
  ok(/Rahu Kalam/i.test(selectedSummary), "Rahu Kalam (avoid) is still shown");
  ok(/Useful times/i.test(selectedSummary) || /Avoid starting important activities/i.test(selectedSummary),
    "the useful/avoid section headings are still present");

  /* ---- 8. Calendar keeps working with the network cut --------------- */
  section("Calendar — cached month AND a fresh, never-before-seen month both work with the network cut");
  // No production service worker on the dev server this suite runs
  // against, so a page RELOAD while offline is not a meaningful check here
  // (a lazily-loaded JS chunk can fail to fetch, an infrastructure
  // limitation of the dev server, not of Calendar's own logic) - that full
  // offline-boot-from-a-service-worker-cache path is already covered by
  // tests/e2e/offline.e2e.mjs against a real production server. What
  // Calendar's own Phase 1 rules must prove here, WITHOUT reloading (the
  // already-mounted app, its in-memory state, and its local calendar-months
  // cache all stay intact): neither re-reading an already-cached month NOR
  // computing a brand-new one needs the network at all — every Panchanga/
  // festival calculation is pure client-side JavaScript (mhah-panchang +
  // suncalc), never an API call.
  const cachedMonthLabel = await monthLabel(page);
  await ctx.setOffline(true);
  // (a) re-visit the already-cached month (October 2026) - no page load, no
  // network, must render instantly and unchanged from local cache.
  ok(await gotoMonth(page, cachedMonthLabel), `re-navigated to the already-cached ${cachedMonthLabel} offline`);
  await page.locator(".calendar-grid").waitFor({ timeout: 20000 });
  const offlineFestivals = await page.locator(".calendar-festivals").innerText();
  ok(/Navratri begins/i.test(offlineFestivals), "the cached Phase 1 festival list is still shown offline, unchanged");
  // (b) a BRAND NEW month (never computed before) still computes and
  // renders correctly with the network cut - proving the computation
  // itself, not merely the cache read, has no network dependency.
  ok(await gotoMonth(page, "May 2027"), "navigated to a never-before-cached month while offline");
  await page.locator(".calendar-grid").waitFor({ timeout: 20000 });
  await page.locator(".calendar-selected .calendar-panchanga").first().waitFor({ timeout: 20000 });
  const offlineFreshSummary = await page.locator(".calendar-selected").innerText();
  ok(/Sunrise/i.test(offlineFreshSummary) && /Tithi/i.test(offlineFreshSummary),
    "a never-before-seen month computes its full Panchanga offline, no network needed");
  await ctx.setOffline(false);

  /* ---- 9. switching location recomputes, no stale cross-location data */
  section("Calendar — switching Frisco <-> Hyderabad recomputes the location-specific date, never a stale one");
  // Hyderabad's own November 2026 (already viewed and cached above, WITHOUT
  // clearing that cache here) shows Nagula Chavithi on the 13th. Switching
  // the saved location to Frisco - a real, direct localStorage change plus
  // reload, the same mechanism a genuine "Edit location" save produces -
  // and revisiting the SAME November 2026 must show Frisco's own 12th, not
  // a leftover Hyderabad value served from a location-keyed cache collision.
  await page.evaluate(([lk, lv]) => localStorage.setItem(lk, lv), ["vedasaarathi:location:v1", JSON.stringify({
    status: "READY", latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago",
    city: "Frisco", region: "Texas", country: "United States", source: "MANUAL",
    accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
  })]);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /welcome|స్వాగతం/i }).waitFor();
  await page.locator(".bottom-nav button").first().waitFor({ state: "visible" });
  await page.waitForTimeout(1200);
  await gotoCalendar(page);
  await page.locator(".calendar-grid").waitFor();
  ok(await gotoMonth(page, "November 2026"), "reached November 2026 again, now as Frisco");
  await page.locator(".calendar-festivals").waitFor();
  await page.waitForTimeout(600);
  const friscoNagulaCard = await page.locator(".calendar-festival-card", { hasText: "Nagula Chavithi" }).innerText();
  ok(/2026-11-12/.test(friscoNagulaCard), `Frisco's own Nagula Chavithi shows 2026-11-12, not Hyderabad's 13th (got: ${friscoNagulaCard.replace(/\n/g, " | ")})`);
  ok(!/2026-11-13/.test(friscoNagulaCard), "no stale Hyderabad date (2026-11-13) on Frisco's own Nagula Chavithi card");
  ok(await noHOverflow(page), "after switching location: no horizontal overflow");

  /* ---- 10. console + overflow ---------------------------------------- */
  section("console + overflow");
  ok(errors.length === 0, `no console / page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);
  ok(await noHOverflow(page), "final state: no horizontal overflow");

  await browser.close();
}

let server = null;
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
  console.log(`\n${fails === 0 ? "ALL FESTIVAL PHASE 1 E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

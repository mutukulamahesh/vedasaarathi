// Production-browser checks for the presentation-correction batch:
//   BASE_URL=http://localhost:8910/ node tests/e2e/presentation-corrections.e2e.mjs
//
// A controlled browser clock makes past / today / future deterministic. The
// browser's OWN time zone is set to Los Angeles throughout so that anything
// decided by the browser (rather than the saved location) would show up.
//
// Covers: Passed festivals (English + Telugu), puja CTA and timing promotion
// removed for past ones, historical details kept, Pujas still offering the
// puja, Home only today/upcoming, festival vs collapsed "Monthly observances",
// search revealing a monthly observance + exact date, exact overlap intervals
// (partial and whole), identical Home/Calendar timing text, the Dhanurmasam
// source note in "About this calculation", an old cached month updating
// without clearing storage, phone-width overflow, console errors.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:8910/").replace(/\/?$/, "/");
const HYD = { city: "Hyderabad", region: "Telangana", country: "India", timezone: "Asia/Kolkata", latitude: "17.385", longitude: "78.4867" };
const FRISCO = { city: "Frisco", region: "Texas", country: "United States", timezone: "America/Chicago", latitude: "33.1507", longitude: "-96.8236" };
const CACHE_KEY = "vedasaarathi:calendar-months:v1";

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails += 1; console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); };
const section = (t) => console.log(`\n— ${t}`);

async function setLocation(page, loc) {
  await page.locator(".bottom-nav button").nth(0).click({ force: true }).catch(() => {});
  await page.waitForTimeout(300);
  const setBtn = page.locator("button", { hasText: /set your location/i }).first();
  if (await setBtn.count()) await setBtn.click();
  else await page.locator(".location-button").first().click();
  await Promise.race([
    page.locator(".location-current").waitFor({ timeout: 10000 }),
    page.locator("form.location-form").waitFor({ timeout: 10000 }),
  ]).catch(() => {});
  if (await page.locator(".location-current").count()) await page.locator("button", { hasText: /edit location/i }).click();
  await page.locator("form.location-form").waitFor({ timeout: 10000 });
  const f = async (label, v) => page.locator("label", { hasText: label }).locator("input").fill(String(v));
  await f("City", loc.city); await f("State or region", loc.region); await f("Country", loc.country);
  await f("Time zone", loc.timezone); await f("Latitude", loc.latitude); await f("Longitude", loc.longitude);
  await page.locator("button", { hasText: /^Save location$/ }).click();
  await page.waitForTimeout(800);
}
const nav = async (page, i) => { await page.locator(".bottom-nav button").nth(i).click({ force: true }); await page.waitForTimeout(400); };
const gotoHome = async (p) => { await nav(p, 0); await p.locator(".today-card").waitFor({ timeout: 30000 }); };
const gotoCalendar = async (p) => { await nav(p, 1); await p.locator(".calendar-grid").waitFor({ timeout: 40000 }); };
const gotoSearch = async (p) => { await nav(p, 2); await p.locator(".search-field input").waitFor(); };
const noHOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const monthLabel = (p) => p.locator(".calendar-nav strong").innerText();
async function gotoMonth(page, target) {
  for (let i = 0; i < 40; i += 1) {
    const lbl = await monthLabel(page);
    if (lbl === target) { await page.locator(".calendar-grid").waitFor({ timeout: 40000 }); return true; }
    const [, mn, y] = lbl.match(/([A-Za-z]+)\s+(\d{4})/) || [];
    const [, tn, ty] = target.match(/([A-Za-z]+)\s+(\d{4})/) || [];
    const behind = new Date(`${mn} 1, ${y}`) < new Date(`${tn} 1, ${ty}`);
    await page.locator(`.calendar-nav button[aria-label='${behind ? "Next" : "Previous"} month']`).click();
    await page.waitForTimeout(150);
  }
  return false;
}
// Telugu month labels differ; step by clicking until the grid label contains the year+month text.
async function gotoMonthByShift(page, shifts) {
  const dir = shifts >= 0 ? "Next" : "Previous";
  const teDir = shifts >= 0 ? "వచ్చే నెల" : "గత నెల";
  for (let i = 0; i < Math.abs(shifts); i += 1) {
    await page.locator(`.calendar-nav button[aria-label='${dir} month'], .calendar-nav button[aria-label='${teDir}']`).click();
    await page.waitForTimeout(150);
  }
  await page.locator(".calendar-grid").waitFor({ timeout: 40000 });
}
const setLang = async (p, te) => { await p.locator("button", { hasText: te ? "తెలుగు" : "English" }).first().click(); await p.waitForTimeout(400); };
const annualCards = (p) => p.locator(".calendar-festivals > .calendar-festival-card");
const monthlyCards = (p) => p.locator(".calendar-monthly .calendar-festival-card");
const cardByName = (loc, name) => loc.filter({ hasText: name }).first();
async function selectedISO(p) { return p.locator(".calendar-selected h2").innerText(); }
async function search(page, q) { const i = page.locator(".search-field input"); await i.fill(""); await i.fill(q); await page.waitForTimeout(250); }
async function openFirstResult(page) { await page.locator(".search-results li button").first().click(); await page.locator(".calendar-selected h2").waitFor({ timeout: 40000 }); }

async function newSession(browser, viewport, clockISO) {
  const ctx = await browser.newContext({ viewport, timezoneId: "America/Los_Angeles" });
  await ctx.clock.install({ time: new Date(clockISO) });
  const errors = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  const page = await ctx.newPage();
  page.setDefaultTimeout(40000);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  return { ctx, page, errors };
}

async function run(viewport, label) {
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });

  /* ---------------- Session A: 16 Sep 2026 (Hyderabad), Vinayaka passed --------------- */
  let { ctx, page, errors } = await newSession(browser, viewport, "2026-09-16T10:00:00Z");
  await setLocation(page, HYD);
  await gotoCalendar(page);
  await gotoMonth(page, "September 2026");

  section("Past festival stays in its month, marked Passed; puja promotion removed");
  const vinayaka = cardByName(annualCards(page), "Vinayaka Chavithi");
  const vText = await vinayaka.innerText();
  ok(/2026-09-14/.test(vText) && /Passed/.test(vText), "Vinayaka Chavithi (14 Sep) stays in September, marked 'Passed'");
  ok(!/Madhyahna puja window/i.test(vText), "the puja-window promotion is gone from the past card");
  ok((await vinayaka.locator("button.link-button").count()) === 0, "the 'Open the puja' call-to-action is gone from the past card");
  await vinayaka.locator(".calendar-festival-open").click();
  await page.locator(".calendar-selected h2").waitFor();
  const sel = await page.locator(".calendar-selected").innerText();
  ok((await selectedISO(page)) === "2026-09-14", "clicking the past card selects its date (it does not open the puja)");
  ok(/Sunrise/i.test(sel) && /Tithi at sunrise/i.test(sel) && /Sunset/i.test(sel), "historical Panchanga details are kept for the past date");

  section("Grouping: festivals vs a collapsed 'Monthly observances' section");
  ok((await annualCards(page).filter({ hasText: /Pradosham|Masa Shivaratri|Sankashti/ }).count()) === 0, "no monthly observance is listed among the festivals");
  const monthly = page.locator(".calendar-monthly");
  ok((await monthly.count()) === 1, "one 'Monthly observances' section");
  ok((await monthly.getAttribute("open")) === null, "it is collapsed initially");
  const summaryText = await monthly.locator("summary").innerText();
  ok(/Monthly observances \(\d+\)/.test(summaryText), `its summary reads '${summaryText}'`);
  await monthly.locator("summary").click();
  ok((await monthly.getAttribute("open")) !== null, "it expands on demand");
  const mAll = await monthly.innerText();
  ok(/Pradosham/.test(mAll) && /Masa Shivaratri/.test(mAll) && /Sankashti Chaturthi/.test(mAll), "Pradosham, Masa Shivaratri and Sankashti Chaturthi are inside it");
  const masaText = await cardByName(monthlyCards(page), "Masa Shivaratri").innerText();
  ok(/2026-09-09/.test(masaText) && /Passed/.test(masaText), "Masa Shivaratri (9 Sep) is marked Passed inside the section");
  ok(!/Passed/.test(await cardByName(monthlyCards(page), "Sankashti Chaturthi").innerText()), "Sankashti Chaturthi (29 Sep) is upcoming - not Passed");
  ok(/festival/.test((await page.locator(".calendar-fest-dot").first().getAttribute("aria-label")) ?? ""), "calendar markers are kept for these dates");
  ok(await noHOverflow(page), "no horizontal overflow with the section open");
  await page.screenshot({ path: `.review-shots/pres-${label}-calendar-en.png` }).catch(() => {});

  section("Pujas still offers the Vinayaka puja");
  await nav(page, 3);
  ok(/Vinayaka/i.test(await page.locator(".content, .flow-content").first().innerText()), "the Vinayaka puja remains available under Pujas");

  section("Home lists only today / upcoming (saved location's date = 2026-09-16)");
  await gotoHome(page);
  await page.locator(".home-festivals").waitFor();
  const homeDates = (await page.locator(".home-festivals .calendar-festival-card").allInnerTexts()).map((t) => (t.match(/\d{4}-\d{2}-\d{2}/) || [])[0]);
  ok(homeDates.length >= 1 && homeDates.every((d) => d >= "2026-09-16"), `Home rows are all today or later: ${homeDates.join(", ")}`);
  ok(!/Passed/.test(await page.locator(".home-festivals").innerText()), "Home never shows a Passed occurrence");
  ok(!/Vinayaka/.test(await page.locator(".home-festivals").innerText()), "the 14 Sep Vinayaka Chavithi is not on Home");

  section("Search reveals a monthly observance on its exact date");
  await gotoSearch(page); await search(page, "Sankashti"); await openFirstResult(page);
  ok((await selectedISO(page)) === "2026-09-29", "search 'Sankashti' opens Calendar on 2026-09-29");
  ok((await page.locator(".calendar-monthly").getAttribute("open")) !== null, "the collapsed 'Monthly observances' section was revealed");
  ok(await cardByName(monthlyCards(page), "Sankashti Chaturthi").isVisible(), "the observance card is visible");

  section("Telugu: Passed + Monthly observances");
  await setLang(page, true);
  await gotoCalendar(page);
  await gotoMonthByShift(page, 0);
  ok(/గడిచింది/.test(await cardByName(annualCards(page), "వినాయక చవితి").innerText()), "Telugu 'గడిచింది' on the past festival");
  ok(/నెలవారీ వ్రతాలు \(\d+\)/.test(await page.locator(".calendar-monthly summary").innerText()), "Telugu 'నెలవారీ వ్రతాలు (n)'");
  ok(!/పూజ తెరవండి/.test(await cardByName(annualCards(page), "వినాయక చవితి").innerText()), "no Telugu puja CTA on the past card");
  await gotoSearch(page); await search(page, "ప్రదోషం"); await openFirstResult(page);
  ok((await page.locator(".calendar-monthly").getAttribute("open")) !== null, "Telugu search reveals the monthly section");
  await setLang(page, false);
  ok(errors.length === 0, `session A: no console/page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""})`);
  await ctx.close();

  /* ---------------- Session B: today vs passed by the SAVED location's date ------------ */
  ({ ctx, page, errors } = await newSession(browser, viewport, "2026-09-15T02:00:00Z"));
  section("Today / passed decided by the saved location, not the browser (browser is in Los Angeles: 14 Sep 19:00)");
  await setLocation(page, HYD); // 15 Sep 07:30 IST: Vinayaka (14 Sep) has passed
  await gotoCalendar(page); await gotoMonth(page, "September 2026");
  let v = await cardByName(annualCards(page), "Vinayaka Chavithi").innerText();
  ok(/Passed/.test(v) && !/puja window/i.test(v), "Hyderabad (15 Sep there): Vinayaka Chavithi is Passed");
  await setLocation(page, FRISCO); // 14 Sep 21:00 CDT: Vinayaka is TODAY
  await gotoCalendar(page); await gotoMonth(page, "September 2026");
  v = await cardByName(annualCards(page), "Vinayaka Chavithi").innerText();
  ok(!/Passed/.test(v), "Frisco (14 Sep there): the same festival is TODAY - not Passed");
  ok(/Madhyahna puja window/i.test(v) && (await cardByName(annualCards(page), "Vinayaka Chavithi").locator("button.link-button").count()) === 1, "today's occurrence keeps its puja window and 'Open the puja'");
  await gotoHome(page);
  ok(/Vinayaka/.test(await page.locator(".home-festivals").innerText()), "Home (Frisco, 14 Sep) still shows today's Vinayaka Chavithi");
  await setLocation(page, HYD);
  await gotoHome(page);
  ok(!/Vinayaka/.test(await page.locator(".home-festivals").innerText()), "Home (Hyderabad, 15 Sep) does not show the passed one");
  ok(errors.length === 0, `session B: no console/page errors (${errors.length})`);
  await ctx.close();

  /* ---------------- Session C: 21 Sep 2026 - overlaps, Home == Calendar, sources ------- */
  ({ ctx, page, errors } = await newSession(browser, viewport, "2026-09-21T06:00:00Z"));
  await setLocation(page, HYD);
  await gotoHome(page);
  section("Exact overlap intervals on Home (Hyderabad, Mon 21 Sep)");
  const homeUseful = await page.locator(".today-card .home-times").first().innerText();
  ok(/Overlaps Yamaganda from 11:46 AM to 12:10 PM\./.test(homeUseful), "Abhijit: partial overlap named and timed exactly");
  ok(/All of this falls within Gulika Kalam \(2:12 PM – 3:00 PM\)\./.test(homeUseful), "Vijaya: fully overlapping period says so, with the interval");
  ok(/not marked unsuitable/i.test(homeUseful), "the coverage note is shown (missing mornings are not 'unsuitable')");
  ok(!/auspicious/i.test(homeUseful), "the remaining portion is never labelled auspicious");
  const homeOv = await page.locator(".today-card .home-period-overlap").allInnerTexts();
  const homePeriodTimes = (await page.locator(".today-card .home-period-time").allInnerTexts()).join("|");
  await gotoCalendar(page);
  await page.locator(".calendar-grid [role=gridcell]", { hasText: /^21/ }).first().click();
  await page.waitForTimeout(300);
  section("Identical guidance on Calendar");
  const calOv = await page.locator(".calendar-selected .cal-period-overlap").allInnerTexts();
  ok(homeOv.length === 2 && JSON.stringify(homeOv) === JSON.stringify(calOv), `Home and Calendar overlap text identical: ${JSON.stringify(calOv)}`);
  ok(/not marked unsuitable/i.test(await page.locator(".calendar-selected .cal-times").first().innerText()), "Calendar shows the same coverage note");
  const calPeriodTimes = (await page.locator(".calendar-selected .cal-period-time").allInnerTexts()).join("|");
  ok(homePeriodTimes === calPeriodTimes, `identical period times on Home and Calendar (${calPeriodTimes})`);

  section("Dhanurmasam source note inside 'About this calculation'");
  await page.locator(".calendar-about-calc > summary").click();
  const about = await page.locator(".calendar-about-calc").innerText();
  ok(/astronomical moment/.test(about) && /convention/.test(about), "ingress vs observance-date convention explained");
  ok(/15 Dec/.test(about) && /16 Dec/.test(about) && /not proof of a universal start date/.test(about) && /unresolved/.test(about), "Frisco difference and the temple's limits stated briefly");
  ok(/not a published Kanuma date/.test(about), "Kanuma's provisional evidence is stated accurately");
  await setLang(page, true);
  await gotoCalendar(page);
  if ((await page.locator(".calendar-about-calc").getAttribute("open")) === null) await page.locator(".calendar-about-calc > summary").click();
  ok(/డిసెంబర్ 15/.test(await page.locator(".calendar-about-calc").innerText()), "the same note is present in Telugu");
  await page.locator(".calendar-grid [role=gridcell]", { hasText: /^21/ }).first().click();
  ok(/యమగండం/.test(await page.locator(".calendar-selected").innerText()), "Telugu overlap wording names Yamaganda");
  await setLang(page, false);
  ok(await noHOverflow(page), "no horizontal overflow");

  section("An old cached month updates without clearing storage (cal-13 -> cal-14)");
  await page.evaluate(({ key, loc }) => {
    const obj = JSON.parse(localStorage.getItem(key) || "{}");
    const days = Array.from({ length: 30 }, (_, i) => ({
      dateISO: `2026-09-${String(i + 1).padStart(2, "0")}`, day: i + 1, weekday: 0, vaara: "x", paksha: "x", masa: "x", masaAmanta: "x",
      isAdhikaMasa: false, ritu: null, ayana: null, samvatsara: null, sunrise: "6:00 AM", sunset: "6:00 PM", tithi: null, nakshatra: null,
      useful: [{ id: "abhijit", kind: "useful", start: "11:46 AM", end: "12:34 PM", overlapsAvoid: true }], avoid: [], festivalSlugs: [],
    }));
    obj[`cal-13+deadbeefcafe|${loc.latitude}|${loc.longitude}|${loc.timezone}|2026-09`] = {
      at: Date.now(),
      month: { year: 2026, month: 9, timezone: loc.timezone, latitude: Number(loc.latitude), longitude: Number(loc.longitude), engineVersion: "cal-13+deadbeefcafe", days, festivals: [], festivalsAll: [],
        released: { sunrise: true, sunset: true, tithi: true, nakshatra: true, vaara: true, ritu: true, ayana: true, samvatsara: true, festival: true, pujaWindow: true } },
    };
    localStorage.setItem(key, JSON.stringify(obj));
  }, { key: CACHE_KEY, loc: HYD });
  const keysOf = () => page.evaluate((k) => Object.keys(localStorage).filter((x) => x !== k).sort(), CACHE_KEY);
  const keysBefore = await keysOf();
  await page.reload({ waitUntil: "domcontentloaded" });
  await gotoCalendar(page);
  await gotoMonth(page, "September 2026");
  await page.locator(".calendar-grid [role=gridcell]", { hasText: /^21/ }).first().click();
  await page.waitForTimeout(300);
  ok(/Overlaps Yamaganda from 11:46 AM to 12:10 PM/.test(await page.locator(".calendar-selected").innerText()), "the stale entry was recomputed: exact overlap wording appears");
  ok(JSON.stringify(keysBefore) === JSON.stringify(await keysOf()), "no other stored data was cleared");
  await page.screenshot({ path: `.review-shots/pres-${label}-overlap.png` }).catch(() => {});
  ok(errors.length === 0, `session C: no console/page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 2).join(" | ") : ""})`);
  await ctx.close();
  await browser.close();
}

async function main() {
  const { mkdirSync } = await import("node:fs");
  mkdirSync(".review-shots", { recursive: true });
  await run({ width: 375, height: 812 }, "phone");
  await run({ width: 1440, height: 900 }, "desktop");
  console.log(`\n${fails === 0 ? "ALL PRESENTATION-CORRECTION E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}
await main();

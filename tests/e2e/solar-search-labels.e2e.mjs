// Production-browser checks for the solar-ingress + search + sunrise-label
// batch. Run against a production server:
//   BASE_URL=http://localhost:8910/ node tests/e2e/solar-search-labels.e2e.mjs
//
// Covers, at 375x812 and 1440x900: English and Telugu festival search with
// exact-date navigation; "Tithi/Nakshatra at sunrise" labels and ending times;
// the four new observances at Hyderabad and Frisco; Hyderabad <-> Frisco
// switching without stale dates; December -> January navigation; Home's
// compact list; saved location + language after refresh; a stale (cal-12)
// cached month upgrading without clearing storage; real offline behaviour;
// console errors; horizontal overflow.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:8910/").replace(/\/?$/, "/");
const HYD = { city: "Hyderabad", region: "Telangana", country: "India", timezone: "Asia/Kolkata", latitude: "17.385", longitude: "78.4867" };
const FRISCO = { city: "Frisco", region: "Texas", country: "United States", timezone: "America/Chicago", latitude: "33.1507", longitude: "-96.8236" };
const CACHE_KEY = "vedasaarathi:calendar-months:v1";

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails += 1; console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); };
const section = (t) => console.log(`\n— ${t}`);
const beforeDate = (iso) => Date.now() < Date.parse(`${iso}T00:00:00Z`);

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
const gotoHome = (p) => nav(p, 0);
const gotoCalendar = async (p) => { await nav(p, 1); await p.locator(".calendar-grid").waitFor({ timeout: 30000 }); };
const gotoSearch = async (p) => { await nav(p, 2); await p.locator(".search-field input").waitFor(); };
const noHOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const monthLabel = (p) => p.locator(".calendar-nav strong").innerText();

async function gotoMonth(page, target) {
  for (let i = 0; i < 40; i += 1) {
    const lbl = await monthLabel(page);
    if (lbl === target) {
      // A month not yet computed shows a progress line first; the grid appears once it is done.
      await page.locator(".calendar-grid").waitFor({ timeout: 40000 });
      return true;
    }
    const [, mn, y] = lbl.match(/([A-Za-z]+)\s+(\d{4})/) || [];
    const [, tn, ty] = target.match(/([A-Za-z]+)\s+(\d{4})/) || [];
    const behind = new Date(`${mn} 1, ${y}`) < new Date(`${tn} 1, ${ty}`);
    await page.locator(`.calendar-nav button[aria-label='${behind ? "Next" : "Previous"} month']`).click();
    await page.waitForTimeout(150);
  }
  return (await monthLabel(page)) === target;
}
async function cardDate(page, name) {
  const card = page.locator(".calendar-festival-card", { hasText: name }).first();
  if (!(await card.count())) return null;
  return ((await card.innerText()).match(/\d{4}-\d{2}-\d{2}/) || [])[0] ?? null;
}
async function search(page, q) {
  const input = page.locator(".search-field input");
  await input.fill("");
  await input.fill(q);
  await page.waitForTimeout(250);
}
async function openFirstResult(page) {
  await page.locator(".search-results li button").first().click();
  await page.locator(".calendar-selected h2").waitFor({ timeout: 40000 });
}
const selectedISO = (p) => p.locator(".calendar-selected h2").innerText();
const setLang = async (p, te) => { await p.locator("button", { hasText: te ? "తెలుగు" : "English" }).first().click(); await p.waitForTimeout(400); };

async function run(viewport, label) {
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  const page = await ctx.newPage();
  page.setDefaultTimeout(40000);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  await setLocation(page, HYD);

  section("English search: Diwali opens Calendar on Diwali's exact date (Hyderabad)");
  await gotoSearch(page);
  await search(page, "Diwali");
  ok((await page.locator(".search-results li").count()) >= 1, "'Diwali' returns a result (was: no match)");
  ok(/Diwali/i.test(await page.locator(".search-results").innerText()), "the result is named Diwali / Lakshmi Puja");
  await openFirstResult(page);
  const dSel = await selectedISO(page);
  const dCard = await cardDate(page, "Diwali");
  ok(dCard === dSel, `Calendar opened on the exact occurrence date ${dSel} (Diwali card says ${dCard})`);
  if (beforeDate("2026-11-08")) ok(dSel === "2026-11-08", "Hyderabad Diwali is 2026-11-08");
  ok(await noHOverflow(page), "no horizontal overflow after opening a festival from search");

  section("Sunrise labels + ending times (Hyderabad, Diwali day)");
  const summary = await page.locator(".calendar-selected").innerText();
  ok(/Tithi at sunrise/i.test(summary), "summary says 'Tithi at sunrise'");
  ok(/Nakshatra at sunrise/i.test(summary), "summary says 'Nakshatra at sunrise'");
  ok((summary.match(/ends /gi) || []).length >= 2, "ending times are kept for Tithi and Nakshatra");
  if (dSel === "2026-11-08") ok(/Chaturdasi|Chaturdashi/i.test(summary), "Hyderabad 8 Nov shows the sunrise Tithi (Chaturdashi) - now clearly labelled, not contradicting Diwali");
  await page.screenshot({ path: `.review-shots/solar-${label}-diwali-en.png` }).catch(() => {});

  section("Telugu search + labels");
  await setLang(page, true);
  await gotoSearch(page);
  await search(page, "దీపావళి");
  ok((await page.locator(".search-results li").count()) >= 1, "Telugu 'దీపావళి' returns a result");
  await openFirstResult(page);
  const teSummary = await page.locator(".calendar-selected").innerText();
  ok(/సూర్యోదయ తిథి/.test(teSummary) && /సూర్యోదయ నక్షత్రం/.test(teSummary), "Telugu summary: సూర్యోదయ తిథి / సూర్యోదయ నక్షత్రం");
  ok(/ముగింపు/.test(teSummary), "Telugu ending times retained (ముగింపు)");
  ok((await selectedISO(page)) === dSel, "same exact date in Telugu");
  await page.screenshot({ path: `.review-shots/solar-${label}-diwali-te.png` }).catch(() => {});
  await gotoSearch(page); await search(page, "భోగి");
  ok((await page.locator(".search-results li").count()) >= 1, "Telugu 'భోగి' (a festival with no puja) is searchable");
  await setLang(page, false);

  section("Festival with no puja: Bhogi opens Calendar on its exact date");
  await gotoSearch(page); await search(page, "Bhogi"); await openFirstResult(page);
  const bSel = await selectedISO(page);
  ok((await cardDate(page, "Bhogi")) === bSel, `Bhogi opened on its own card date ${bSel}`);
  if (beforeDate("2027-01-14")) ok(bSel === "2027-01-14", "Hyderabad Bhogi is 2027-01-14");

  section("December -> January (Hyderabad): the four new observances");
  await gotoCalendar(page);
  await gotoMonth(page, "December 2026");
  await page.waitForTimeout(500);
  const decText = await page.locator(".calendar-festivals").innerText();
  ok(/Dhanurmasam begins/i.test(decText) && (await cardDate(page, "Dhanurmasam")) === "2026-12-16", "December: Dhanurmasam begins 2026-12-16");
  await page.locator(".calendar-nav button[aria-label='Next month']").click();
  await page.locator(".calendar-grid").waitFor({ timeout: 30000 });
  ok((await monthLabel(page)) === "January 2027", "Next month from December lands on January 2027");
  await page.waitForTimeout(600);
  ok((await cardDate(page, "Bhogi")) === "2027-01-14", "January (Hyderabad): Bhogi 2027-01-14");
  ok((await cardDate(page, "Makara Sankranti")) === "2027-01-15", "January (Hyderabad): Makara Sankranti 2027-01-15");
  ok((await cardDate(page, "Kanuma")) === "2027-01-16", "January (Hyderabad): Kanuma 2027-01-16");
  ok(!/Dhanurmasam/i.test(await page.locator(".calendar-festivals").innerText()), "January carries no stale December card");
  await page.screenshot({ path: `.review-shots/solar-${label}-jan-hyd.png` }).catch(() => {});

  section("About this calculation carries the conventions (no new card)");
  await page.locator(".calendar-about-calc > summary").click();
  const about = await page.locator(".calendar-about-calc").innerText();
  ok(/at that day's sunrise/i.test(about) && /after sunset/i.test(about) && /Bhogi/i.test(about), "sunrise + solar conventions explained inside 'About this calculation'");

  section("Home's compact list");
  await gotoHome(page);
  await page.locator(".home-festivals").waitFor();
  const rows = await page.locator(".home-festivals .calendar-festival-card").count();
  ok(rows >= 1 && rows <= 3, `Home shows a compact list (${rows} rows, max 3)`);
  ok(!/Dhanurmasam|Bhogi|Kanuma/i.test(await page.locator(".home-festivals").innerText()), "Home is not crowded by the new Calendar-only observances");
  ok(await noHOverflow(page), "Home: no horizontal overflow");

  section("Switch to Frisco: no stale Hyderabad dates");
  await setLocation(page, FRISCO);
  await gotoCalendar(page);
  await gotoMonth(page, "December 2026");
  await page.waitForTimeout(500);
  ok((await cardDate(page, "Dhanurmasam")) === "2026-12-16", "Frisco December: Dhanurmasam begins 2026-12-16");
  await page.locator(".calendar-nav button[aria-label='Next month']").click();
  await page.locator(".calendar-grid").waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  ok((await cardDate(page, "Bhogi")) === "2027-01-13", "Frisco January: Bhogi 2027-01-13 (not Hyderabad's 01-14)");
  ok((await cardDate(page, "Makara Sankranti")) === "2027-01-14", "Frisco January: Makara Sankranti 2027-01-14 (not 01-15)");
  ok((await cardDate(page, "Kanuma")) === "2027-01-15", "Frisco January: Kanuma 2027-01-15 (not 01-16)");
  await page.screenshot({ path: `.review-shots/solar-${label}-jan-frisco.png` }).catch(() => {});
  await gotoSearch(page); await search(page, "Sankranti"); await openFirstResult(page);
  if (beforeDate("2027-01-14")) ok((await selectedISO(page)) === "2027-01-14", "Frisco search 'Sankranti' opens 2027-01-14");

  section("Saved location + language survive a refresh");
  await setLang(page, true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".today-card").waitFor({ timeout: 30000 });
  // Saved state hydrates a moment after first paint: poll instead of a single read.
  const persisted = async (re, sel) => {
    for (let i = 0; i < 50; i += 1) {
      if (re.test(await page.locator(sel).innerText().catch(() => ""))) return true;
      await page.waitForTimeout(100);
    }
    return false;
  };
  ok(await persisted(/FRISCO/i, ".today-card"), "location (Frisco) persisted after refresh");
  ok(await persisted(/[\u0C00-\u0C7F]/, ".bottom-nav"), "Telugu language persisted after refresh");
  await setLang(page, false);

  section("Stale cached month upgrades WITHOUT clearing storage (cal-12 entries -> cal-13)");
  const before = await page.evaluate((k) => Object.keys(localStorage).filter((x) => x !== k).sort(), CACHE_KEY);
  await page.evaluate(({ key, loc }) => {
    const obj = JSON.parse(localStorage.getItem(key) || "{}");
    for (const [y, m, n] of [[2026, 12, 31], [2027, 1, 31]]) {
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      obj[`cal-12+deadbeefcafe|${loc.latitude}|${loc.longitude}|${loc.timezone}|${ym}`] = {
        at: Date.now(),
        month: {
          year: y, month: m, timezone: loc.timezone, latitude: Number(loc.latitude), longitude: Number(loc.longitude),
          engineVersion: "cal-12+deadbeefcafe",
          days: Array.from({ length: n }, (_, i) => ({
            dateISO: `${ym}-${String(i + 1).padStart(2, "0")}`, day: i + 1, weekday: 0, vaara: "x", paksha: "x", masa: "x", masaAmanta: "x",
            isAdhikaMasa: false, ritu: null, ayana: null, samvatsara: null, sunrise: null, sunset: null, tithi: null, nakshatra: null,
            useful: [], avoid: [], festivalSlugs: [],
          })),
          festivals: [], festivalsAll: [],
          released: { sunrise: true, sunset: true, tithi: true, nakshatra: true, vaara: true, ritu: true, ayana: true, samvatsara: true, festival: true, pujaWindow: true },
        },
      };
    }
    localStorage.setItem(key, JSON.stringify(obj));
  }, { key: CACHE_KEY, loc: FRISCO });
  await page.reload({ waitUntil: "domcontentloaded" });
  await gotoCalendar(page);
  await gotoMonth(page, "December 2026");
  await page.waitForTimeout(700);
  ok((await cardDate(page, "Dhanurmasam")) === "2026-12-16", "stale December entry was discarded and recomputed: Dhanurmasam appears");
  await page.locator(".calendar-nav button[aria-label='Next month']").click();
  await page.locator(".calendar-grid").waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  ok((await cardDate(page, "Makara Sankranti")) === "2027-01-14", "stale January entry was discarded and recomputed: Makara Sankranti appears");
  const after = await page.evaluate((k) => Object.keys(localStorage).filter((x) => x !== k).sort(), CACHE_KEY);
  ok(JSON.stringify(before) === JSON.stringify(after), "no other stored data (location, language, progress) was cleared");

  section("Offline (real network cut, CDP): warmed month + on-device search");
  await gotoSearch(page); await search(page, "Diwali");
  await ctx.setOffline(true);
  await gotoCalendar(page);
  await gotoMonth(page, "January 2027");
  ok((await page.locator(".calendar-grid").count()) > 0, "an already-computed month still renders with the network cut");
  ok((await cardDate(page, "Makara Sankranti")) === "2027-01-14", "its new-observance cards are present offline");
  await gotoSearch(page); await search(page, "Dhanteras");
  ok((await page.locator(".search-results li").count()) >= 1, "festival search matches offline (names come from the bundled catalogue)");
  await openFirstResult(page);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(await selectedISO(page)), "opening a search result computes its date on-device and opens Calendar offline");
  await ctx.setOffline(false);
  console.log("  NOTE  offline coverage above = a live network cut in an already-loaded session. It does NOT prove a cold start from the service-worker cache or an installed app; that path is covered by the separate offline suites.");

  section("Health");
  ok(errors.length === 0, `no console/page errors (${errors.length}${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""})`);
  ok(await noHOverflow(page), "final screen: no horizontal overflow");
  await browser.close();
}

async function main() {
  const { mkdirSync } = await import("node:fs");
  mkdirSync(".review-shots", { recursive: true });
  await run({ width: 375, height: 812 }, "phone");
  await run({ width: 1440, height: 900 }, "desktop");
  console.log(`\n${fails === 0 ? "ALL SOLAR/SEARCH/LABEL E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}
await main();

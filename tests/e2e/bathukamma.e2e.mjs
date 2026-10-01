// Real-browser coverage for the Bathukamma 2026 schedule.
//
//   npm run dev &
//   node tests/e2e/bathukamma.e2e.mjs
//
// Hyderabad and Frisco (supported), Houston (unsupported, same time zone as
// Frisco); English and Telugu; mobile and desktop. Calendar October 2026,
// Home's upcoming list, festival search in both languages with exact-date
// navigation, the one short schedule note, no observance time on any
// Bathukamma card, Saddula and Durga Ashtami together at Hyderabad, no
// console errors and no horizontal overflow.
//
// DETERMINISTIC CLOCK: pinned (Playwright Clock) to 2026-10-12T12:00:00Z -
// 17:30 IST and 07:00 CDT, civil date 2026-10-12 in every checked location -
// so Calendar opens on October 2026 and "today" is day 3 (Muddapappu).

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:5173/").replace(/\/?$/, "/");
const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";
const PINNED_NOW = new Date("2026-10-12T12:00:00Z");

const place = (city, region, country, latitude, longitude, timezone) => ({
  status: "READY", latitude, longitude, timezone, city, region, country,
  source: "MANUAL", accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
});
const HYD = place("Hyderabad", "Telangana", "India", 17.385, 78.4867, "Asia/Kolkata");
const FRISCO = place("Frisco", "Texas", "United States", 33.1507, -96.8236, "America/Chicago");
const HOUSTON = place("Houston", "Texas", "United States", 29.7633, -95.3633, "America/Chicago");

const prepValue = (language) => JSON.stringify({
  mode: "FAMILY",
  participants: [{
    id: "p1", name: "Mahesh",
    gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" },
    sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
  }],
  language, runs: {},
});

const DAYS = [
  ["Engili Poola Bathukamma", "ఎంగిలిపూల బతుకమ్మ", "2026-10-10"],
  ["Atukula Bathukamma", "అటుకుల బతుకమ్మ", "2026-10-11"],
  ["Muddapappu Bathukamma", "ముద్దపప్పు బతుకమ్మ", "2026-10-12"],
  ["Nanabiyyam Bathukamma", "నానబియ్యం బతుకమ్మ", "2026-10-13"],
  ["Atla Bathukamma", "అట్ల బతుకమ్మ", "2026-10-14"],
  ["Aligina Bathukamma", "అలిగిన బతుకమ్మ", "2026-10-15"],
  ["Vepakayala Bathukamma", "వేపకాయల బతుకమ్మ", "2026-10-16"],
  ["Vennamuddala Bathukamma", "వెన్నముద్దల బతుకమ్మ", "2026-10-17"],
  ["Saddula Bathukamma", "సద్దుల బతుకమ్మ", "2026-10-18"],
];
const NOTE_EN = "This calendar follows the selected nine-day Bathukamma schedule. Local traditions and community celebration dates may differ.";
const NOTE_TE_FRAGMENT = "ఎంచుకున్న తొమ్మిది రోజుల బతుకమ్మ తేదీలను";

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

async function seedAndOpen(page, location, language = "EN") {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([lk, pk, lv, pv]) => {
      localStorage.clear();
      localStorage.setItem(lk, lv);
      localStorage.setItem(pk, pv);
    },
    [LOC_KEY, PREP_KEY, JSON.stringify(location), prepValue(language)],
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome|స్వాగతం/i }).waitFor();
  await page.locator(".bottom-nav button").first().waitFor({ state: "visible" });
}

async function clickNav(page, textPattern, waitSelector) {
  for (let i = 0; i < 8 && (await page.locator(waitSelector).count()) === 0; i += 1) {
    await page.locator(".bottom-nav button", { hasText: textPattern }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator(waitSelector).waitFor();
}

async function openCalendarOctober(page, heading) {
  await clickNav(page, /calendar|క్యాలెండర్/i, ".calendar-screen");
  await page.locator(".calendar-nav strong").waitFor();
  const h = ((await page.locator(".calendar-nav strong").textContent()) || "").trim();
  ok(h === heading, `Calendar opens on "${heading}" (pinned clock) - got "${h}"`);
  await page.waitForSelector(".calendar-festivals .calendar-festival-card", { timeout: 30000 }).catch(() => {});
}

async function checkCalendar(page, label, te) {
  for (const [en, teName, dateISO] of DAYS) {
    const name = te ? teName : en;
    const cards = page.locator(".calendar-festivals .calendar-festival-card", { hasText: name });
    const n = await cards.count();
    ok(n === 1, `${label}: "${name}" card appears exactly once (got ${n})`);
    if (n !== 1) continue;
    const text = (await cards.first().textContent()) || "";
    ok(text.includes(dateISO), `${label}: "${name}" shows ${dateISO}`);
    ok(!/Observance time|ఆచరణ సమయం/.test(text), `${label}: "${name}" has no observance time`);
  }
  const notes = page.locator(".calendar-schedule-note");
  ok(await notes.count() === 1, `${label}: the short schedule note appears exactly once`);
  const noteText = ((await notes.first().textContent().catch(() => "")) || "").trim();
  ok(te ? noteText.includes(NOTE_TE_FRAGMENT) : noteText === NOTE_EN, `${label}: note text (${te ? "Telugu" : "English"}) is the agreed sentence`);
  // Readable, not just present: the note's text colour must differ clearly
  // from the light page background (a white-on-cream note would pass a text
  // check while being invisible to a real reader).
  const color = await notes.first().evaluate((el) => getComputedStyle(el).color).catch(() => "");
  const [r, g, b] = (color.match(/\d+(\.\d+)?/g) || ["255", "255", "255"]).map(Number);
  ok(r + g + b < 450, `${label}: note text colour is dark enough to read on the light background (got ${color})`);
  ok(await noHOverflow(page), `${label}: no horizontal overflow`);
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
  await page.clock.setFixedTime(PINNED_NOW);

  for (const [loc, label] of [[HYD, "Hyderabad"], [FRISCO, "Frisco"]]) {
    for (const te of [false, true]) {
      section(`${label}, ${te ? "Telugu" : "English"}: Calendar October 2026`);
      await seedAndOpen(page, loc, te ? "TE" : "EN");
      await openCalendarOctober(page, te ? "అక్టోబర్ 2026" : "October 2026");
      await checkCalendar(page, `${label} ${te ? "TE" : "EN"}`, te);
      if (loc === HYD && !te) {
        const ashtami = page.locator(".calendar-festivals .calendar-festival-card", { hasText: "Durga Ashtami" });
        ok(await ashtami.count() === 1, "Hyderabad: Durga Ashtami still appears exactly once");
        ok(((await ashtami.first().textContent()) || "").includes("2026-10-19"), "Hyderabad: Durga Ashtami stays on 2026-10-19 next to Saddula on 2026-10-18");
        const passed = page.locator(".calendar-festival-card.is-past", { hasText: "Atukula Bathukamma" });
        ok(await passed.count() === 1, "Hyderabad: 11 Oct (Atukula) is marked Passed on 12 Oct");
      }

      section(`${label}, ${te ? "Telugu" : "English"}: Home upcoming list`);
      await clickNav(page, /home|హోమ్/i, ".about-link");
      await page.waitForSelector(".home-festivals .calendar-festival-card", { timeout: 30000 }).catch(() => {});
      const homeText = (await page.locator(".home-festivals").textContent()) || "";
      const today = te ? "ముద్దపప్పు బతుకమ్మ" : "Muddapappu Bathukamma";
      ok(homeText.includes(today) && homeText.includes("2026-10-12"), `${label}: Home shows today's ${today} (2026-10-12)`);
      const rows = await page.locator(".home-festivals .calendar-festival-card").count();
      ok(rows >= 1 && rows <= 3, `${label}: Home shows 1-3 rows (got ${rows})`);
      ok(!/Engili Poola|ఎంగిలిపూల|Atukula|అటుకుల/.test(homeText), `${label}: Home never lists an already-passed Bathukamma day`);
      ok(!/Observance time|ఆచరణ సమయం/.test(
        (await page.locator(".home-festivals .calendar-festival-card", { hasText: today }).first().textContent()) || "",
      ), `${label}: Home's Bathukamma row has no observance time`);
      ok(await noHOverflow(page), `${label}: Home has no horizontal overflow`);

      section(`${label}, ${te ? "Telugu" : "English"}: Search`);
      await clickNav(page, /search|వెతకండి/i, ".search-screen");
      await page.locator(".search-screen input").fill(te ? "బతుకమ్మ" : "bathukamma");
      await page.locator(".search-results li").first().waitFor({ timeout: 10000 });
      const resultText = (await page.locator(".search-results").textContent()) || "";
      const allNine = DAYS.every(([en, teName]) => resultText.includes(te ? teName : en));
      ok(allNine, `${label}: searching "${te ? "బతుకమ్మ" : "bathukamma"}" lists all nine by name`);
      await page.locator(".search-results li button", { hasText: te ? "సద్దుల బతుకమ్మ" : "Saddula Bathukamma" }).click();
      await page.locator(".calendar-screen").waitFor({ timeout: 15000 });
      await page.waitForTimeout(600);
      const sel = ((await page.locator(".calendar-selected h2").textContent().catch(() => "")) || "").trim();
      ok(sel === "2026-10-18", `${label}: Saddula search result opens Calendar on exactly 2026-10-18 (got "${sel}")`);
    }
  }

  section("Houston (unsupported, same time zone as Frisco): no Bathukamma anywhere");
  await seedAndOpen(page, HOUSTON);
  await openCalendarOctober(page, "October 2026");
  const houstonCards = await page.locator(".calendar-festivals .calendar-festival-card", { hasText: "Bathukamma" }).count();
  ok(houstonCards === 0, `Houston Calendar October 2026 has no Bathukamma card (got ${houstonCards})`);
  ok(await page.locator(".calendar-schedule-note").count() === 0, "Houston: no schedule note");
  ok(await page.locator(".calendar-festivals .calendar-festival-card", { hasText: "Durga Ashtami" }).count() === 1,
    "Houston: other festivals still render (Durga Ashtami)");
  await clickNav(page, /home|హోమ్/i, ".about-link");
  await page.waitForTimeout(1500);
  ok(!((await page.locator(".home-festivals").textContent().catch(() => "")) || "").includes("Bathukamma"),
    "Houston: Home lists no Bathukamma day");
  await clickNav(page, /search|వెతకండి/i, ".search-screen");
  await page.locator(".search-screen input").fill("Saddula");
  await page.locator(".search-results li button", { hasText: "Saddula Bathukamma" }).click();
  await page.locator(".search-screen [role=status]").last().waitFor({ timeout: 15000 });
  const notice = (await page.locator(".search-screen [role=status]").last().textContent()) || "";
  ok(/No date could be found/.test(notice), `Houston: search says no date for this location (got "${notice.trim()}")`);

  const relevant = errors.filter((e) => !/favicon|Failed to load resource/i.test(e));
  ok(relevant.length === 0, `no console errors (got ${relevant.length}: ${relevant.slice(0, 3).join(" | ")})`);
  await browser.close();
}

await run({ width: 390, height: 844 });
await run({ width: 1280, height: 900 });
console.log(`\n${checks - fails}/${checks} checks passed`);
if (fails > 0) process.exit(1);

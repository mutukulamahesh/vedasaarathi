// Real-browser coverage for the Bathukamma 2026 schedule.
//
//   npm run build && npm run start &   (or npm run dev &)
//   BASE_URL=http://localhost:3000/ node tests/e2e/bathukamma.e2e.mjs
//
// Hyderabad and Frisco (supported), Houston (unsupported, same time zone as
// Frisco); English and Telugu; mobile and desktop. Calendar October 2026
// (the nine days grouped in one section, collapsed by default, keyboard
// expand/collapse with aria-expanded), Home's upcoming list (Bathukamma in
// exactly one slot, with its closing date), festival search in both
// languages with exact-date navigation (an intermediate day auto-expands the
// section and is scrolled into view), the one short schedule note, no
// observance time on any Bathukamma card, Saddula and Durga Ashtami together
// at Hyderabad, no console errors and no horizontal overflow.
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

const bathukammaCards = (page) =>
  page.locator(".calendar-festivals .calendar-festival-card", { hasText: /Bathukamma|బతుకమ్మ/ });

/** Collapsed by default: one section, range heading, first + last day, a
 * real toggle button; then keyboard-expand to the nine existing cards. */
async function checkCalendarGroup(page, label, te) {
  const groups = page.locator(".calendar-festivals .calendar-group");
  ok(await groups.count() === 1, `${label}: one Bathukamma section`);
  const heading = ((await groups.locator(".calendar-group-title").textContent()) || "").trim();
  const wantHeading = te ? "బతుకమ్మ · అక్టోబర్ 10–18, 2026" : "Bathukamma · October 10–18, 2026";
  ok(heading === wantHeading, `${label}: heading "${wantHeading}" (got "${heading}")`);
  const lines = (await groups.locator(".calendar-group-summary li").allTextContents()).map((s) => s.trim());
  const first = te ? "అక్టోబర్ 10: ఎంగిలిపూల బతుకమ్మ" : "October 10: Engili Poola Bathukamma";
  const last = te ? "అక్టోబర్ 18: సద్దుల బతుకమ్మ" : "October 18: Saddula Bathukamma";
  ok(lines.length === 2 && lines[0].startsWith(first) && lines[1] === last,
    `${label}: collapsed shows only the first and last day (got ${JSON.stringify(lines)})`);
  ok(/Passed|గడిచింది/.test(lines[0] || ""), `${label}: 10 Oct is marked passed on 12 Oct (collapsed)`);
  const toggle = page.getByRole("button", { name: te ? "మొత్తం 9 రోజులు చూడండి" : "Show all 9 days" });
  ok(await toggle.count() === 1, `${label}: "${te ? "మొత్తం 9 రోజులు చూడండి" : "Show all 9 days"}" is a button with that accessible name`);
  ok(await toggle.getAttribute("aria-expanded") === "false", `${label}: aria-expanded=false while collapsed`);
  ok(await bathukammaCards(page).count() === 0, `${label}: no per-day Bathukamma card while collapsed`);
  ok(await page.locator(".calendar-schedule-note").isVisible(), `${label}: schedule note visible while collapsed`);
  for (const [, , dateISO] of DAYS) {
    const day = String(Number(dateISO.slice(8)));
    const cell = page.locator(".calendar-cell.has-festival .calendar-daynum", { hasText: new RegExp(`^${day}$`) });
    ok(await cell.count() === 1, `${label}: grid marker kept on ${dateISO} while collapsed`);
  }
  // Keyboard: focus the button and press Enter to expand.
  await toggle.focus();
  await page.keyboard.press("Enter");
  const expanded = page.locator(".calendar-group-toggle");
  ok(await expanded.getAttribute("aria-expanded") === "true", `${label}: Enter expands (aria-expanded=true)`);
  const dates = await bathukammaCards(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-date")));
  ok(JSON.stringify(dates) === JSON.stringify(DAYS.map((d) => d[2])), `${label}: nine cards in date order once expanded`);
}

async function checkCalendar(page, label, te) {
  await checkCalendarGroup(page, label, te);
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
  // Space collapses again (still a real button).
  await page.locator(".calendar-group-toggle").focus();
  await page.keyboard.press("Space");
  ok(await page.locator(".calendar-group-toggle").getAttribute("aria-expanded") === "false", `${label}: Space collapses (aria-expanded=false)`);
  ok(await bathukammaCards(page).count() === 0, `${label}: cards hidden again after collapsing`);
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
        await page.locator(".calendar-group-toggle").click();
        const passed = page.locator(".calendar-festival-card.is-past", { hasText: "Atukula Bathukamma" });
        ok(await passed.count() === 1, "Hyderabad: 11 Oct (Atukula) is marked Passed on 12 Oct (inside the expanded section)");
        await page.locator(".calendar-group-toggle").click();
      }

      section(`${label}, ${te ? "Telugu" : "English"}: Home upcoming list`);
      await clickNav(page, /home|హోమ్/i, ".about-link");
      await page.waitForSelector(".home-festivals .calendar-festival-card", { timeout: 30000 }).catch(() => {});
      const homeText = (await page.locator(".home-festivals").textContent()) || "";
      const today = te ? "ముద్దపప్పు బతుకమ్మ" : "Muddapappu Bathukamma";
      ok(homeText.includes(today) && homeText.includes("2026-10-12"), `${label}: Home shows today's ${today} (2026-10-12)`);
      const rows = await page.locator(".home-festivals .calendar-festival-card").count();
      ok(rows >= 1 && rows <= 3, `${label}: Home shows 1-3 rows (got ${rows})`);
      const homeBathukamma = page.locator(".home-festivals .calendar-festival-card", { hasText: /Bathukamma|బతుకమ్మ/ });
      ok(await homeBathukamma.count() === 1, `${label}: Bathukamma holds exactly one Home slot (got ${await homeBathukamma.count()})`);
      const closing = ((await homeBathukamma.first().locator(".home-festival-closing").textContent().catch(() => "")) || "").trim();
      const wantClosing = te
        ? "పండుగ 2026-10-18న సద్దుల బతుకమ్మతో ముగుస్తుంది."
        : "The festival concludes on 2026-10-18 with Saddula Bathukamma.";
      ok(closing === wantClosing, `${label}: Home card names the closing date (got "${closing}")`);
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

      // An intermediate day: Calendar must open the section and reveal it.
      section(`${label}, ${te ? "Telugu" : "English"}: Search opens an intermediate day`);
      await clickNav(page, /search|వెతకండి/i, ".search-screen");
      const mid = te ? "ముద్దపప్పు బతుకమ్మ" : "Muddapappu Bathukamma";
      await page.locator(".search-screen input").fill(mid);
      await page.locator(".search-results li button", { hasText: mid }).first().click();
      await page.locator(".calendar-screen").waitFor({ timeout: 15000 });
      await page.locator(".calendar-group").waitFor({ timeout: 30000 });
      await page.waitForTimeout(1200); // let the smooth scroll settle
      ok(await page.locator(".calendar-group-toggle").getAttribute("aria-expanded") === "true",
        `${label}: the Bathukamma section is expanded automatically`);
      const focused = page.locator(".calendar-festival-card.is-focused");
      ok(await focused.count() === 1 && ((await focused.textContent()) || "").includes(mid),
        `${label}: ${mid} is the highlighted entry`);
      const inView = await focused.first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      }).catch(() => false);
      ok(inView, `${label}: ${mid} is scrolled into view`);
      ok(await noHOverflow(page), `${label}: no horizontal overflow with the section expanded`);

      // Back/Forward keeps the Muddapappu target: Calendar -> Home -> Back.
      await clickNav(page, /home|హోమ్/i, ".about-link");
      await page.goBack();
      await page.locator(".calendar-group").waitFor({ timeout: 30000 });
      await page.waitForTimeout(800);
      ok(await page.locator(".calendar-group-toggle").getAttribute("aria-expanded") === "true",
        `${label}: Back to the Muddapappu Calendar entry re-expands Bathukamma`);
      const backFocused = page.locator(".calendar-festival-card.is-focused");
      ok(await backFocused.count() === 1 && await backFocused.getAttribute("data-rule-id") === "bathukamma-muddapappu",
        `${label}: after Back, Muddapappu (by rule id) is the highlighted entry`);

    }
  }
  await checkHouston(page);
  await ctx.close();

  // A different festival on a date inside the Bathukamma range must NOT open
  // the Bathukamma section (Navratri begins, 11 Oct 2026). Pinned to 2 Oct
  // so both festivals are still upcoming (on 12 Oct Navratri begins has
  // passed and Search would look for its 2027 date instead).
  const ctx2 = await browser.newContext({ viewport });
  ctx2.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx2.on("pageerror", (e) => errors.push(String(e)));
  const page2 = await ctx2.newPage();
  page2.setDefaultTimeout(60000);
  await page2.clock.setFixedTime(new Date("2026-10-02T12:00:00Z"));
  for (const [loc, label] of [[HYD, "Hyderabad"], [FRISCO, "Frisco"]]) {
    for (const te of [false, true]) {
      section(`${label}, ${te ? "Telugu" : "English"} (2 Oct): Search opens Navratri begins, then Back/Forward`);
      await seedAndOpen(page2, loc, te ? "TE" : "EN");
      await checkNavratriFlow(page2, `${label} ${te ? "TE" : "EN"}`, te);
    }
  }
  await ctx2.close();
  await finish(browser, errors);
}

async function checkNavratriFlow(page, label, te) {
  await clickNav(page, /search|వెతకండి/i, ".search-screen");
  const navratri = te ? "శరన్నవరాత్రులు ప్రారంభం" : "Navratri begins";
  await page.locator(".search-screen input").fill(navratri);
  await page.locator(".search-results li button", { hasText: navratri }).first().click();
  await page.locator(".calendar-screen").waitFor({ timeout: 30000 });
  await page.locator(".calendar-group").waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  const checkView = async (when) => {
    const s = ((await page.locator(".calendar-selected h2").textContent().catch(() => "")) || "").trim();
    ok(s === "2026-10-11", `${label}: ${when}: Navratri begins selects 2026-10-11 (got "${s}")`);
    ok(await page.locator(".calendar-group-toggle").getAttribute("aria-expanded") === "false",
      `${label}: ${when}: Bathukamma stays collapsed`);
    ok(await bathukammaCards(page).count() === 0 && await page.locator(".calendar-festival-card.is-focused").count() === 0,
      `${label}: ${when}: no Bathukamma day shown or highlighted`);
    ok(await page.locator(".calendar-festivals .calendar-festival-card", { hasText: navratri }).count() === 1,
      `${label}: ${when}: the Navratri begins card itself is listed`);
  };
  await checkView("from Search");
  // Back/Forward through the Navratri entry keeps it collapsed.
  await clickNav(page, /home|హోమ్/i, ".about-link");
  await page.goBack();
  await page.locator(".calendar-group").waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  await checkView("after Back");
  await page.goBack(); // -> Search
  await page.locator(".search-screen").waitFor({ timeout: 15000 });
  await page.goForward(); // -> Navratri Calendar again
  await page.locator(".calendar-group").waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
  await checkView("after Forward");
}

async function finish(browser, errors) {
  const relevant = errors.filter((e) => !/favicon|Failed to load resource/i.test(e));
  ok(relevant.length === 0, `no console errors (got ${relevant.length}: ${relevant.slice(0, 3).join(" | ")})`);
  await browser.close();
}

async function checkHouston(page) {
  section("Houston (unsupported, same time zone as Frisco): no Bathukamma anywhere");
  await seedAndOpen(page, HOUSTON);
  await openCalendarOctober(page, "October 2026");
  const houstonCards = await page.locator(".calendar-festivals .calendar-festival-card", { hasText: "Bathukamma" }).count();
  ok(houstonCards === 0, `Houston Calendar October 2026 has no Bathukamma card (got ${houstonCards})`);
  ok(await page.locator(".calendar-schedule-note").count() === 0, "Houston: no schedule note");
  ok(await page.locator(".calendar-group").count() === 0, "Houston: no (empty) Bathukamma section");
  ok(await page.getByRole("button", { name: /Show all \d+ days/ }).count() === 0, "Houston: no Bathukamma toggle");
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
}

await run({ width: 390, height: 844 });
await run({ width: 1280, height: 900 });
console.log(`\n${checks - fails}/${checks} checks passed`);
if (fails > 0) process.exit(1);

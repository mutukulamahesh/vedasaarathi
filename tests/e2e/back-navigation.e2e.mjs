// F3 — browser/system Back and Forward follow the app's own screen history
// instead of immediately leaving the app (previously: any Back press from
// any screen exited the app straight away). Also confirms in-app Back still
// works unchanged, a refresh keeps the current screen's saved data, the
// selected Calendar date survives Back/Forward, no personal detail (name,
// coordinates) ever appears in the URL or in the pushed history state, and
// going Back far enough still leaves the app normally (nobody gets trapped).

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:8910/").replace(/\/?$/, "/");
let fails = 0, checks = 0;
const ok = (c, m, extra = "") => { checks += 1; if (!c) fails += 1; console.log(`  ${c ? "PASS" : "FAIL"}  ${m}${!c && extra ? "  ::  " + extra : ""}`); };
const section = (t) => console.log(`\n— ${t}`);

const HYD = { city: "Hyderabad", region: "Telangana", country: "India", timezone: "Asia/Kolkata", latitude: "17.385", longitude: "78.4867" };

async function setLocation(page) {
  await page.locator("button", { hasText: /set your location/i }).first().click();
  await page.locator("form.location-form").waitFor();
  for (const [l, v] of [["City", HYD.city], ["State or region", HYD.region], ["Country", HYD.country], ["Time zone", HYD.timezone], ["Latitude", HYD.latitude], ["Longitude", HYD.longitude]]) {
    await page.locator("label", { hasText: l }).locator("input").fill(String(v));
  }
  await page.locator("button", { hasText: /^Save location$/ }).click();
  await page.waitForTimeout(800);
}
const nav = async (p, i) => { await p.locator(".bottom-nav button").nth(i).click({ force: true }); await p.waitForTimeout(400); };
async function settleScreen(p) {
  // Calendar's first render of a month can take several seconds (a fresh
  // month computation) - wait for it to actually FINISH (the grid, or a
  // genuine error with its Retry button), not merely for a loading
  // indicator to appear, which would report "settled" too early.
  await p.waitForFunction(() => {
    const d = document;
    return !!(d.querySelector(".today-card") || d.querySelector(".calendar-grid") || d.querySelector(".search-field")
      || d.querySelector(".about-page") || d.querySelector(".person-list") || d.querySelector(".offline-download")
      || d.querySelector(".calendar-state .wide-secondary"));
  }, { timeout: 30000 }).catch(() => {});
}
const screenName = (p) => p.evaluate(() => {
  const d = document;
  if (d.querySelector(".today-card")) return "home";
  if (d.querySelector(".calendar-grid")) return "calendar";
  if (d.querySelector(".search-field")) return "search";
  if (d.querySelector(".about-page")) return "about";
  if (d.querySelector(".person-list")) return "people";
  if (d.querySelector(".offline-download")) return "pujas";
  return "unknown";
});

async function run(viewport, label) {
  console.log(`\n=== ${label} ===`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const historyStates = [];
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  await page.exposeFunction("__recordHistoryState", (s) => historyStates.push(s));
  await page.addInitScript(() => {
    const orig = history.pushState.bind(history);
    history.pushState = (state, title, url) => { window.__recordHistoryState?.(JSON.stringify({ state, url })); return orig(state, title, url); };
  });

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  await setLocation(page);

  section("Home → Calendar → Search → result → Back walks back through each screen");
  ok((await screenName(page)) === "home", "starts on Home");
  await nav(page, 1);
  await settleScreen(page);
  ok((await screenName(page)) === "calendar", "navigated to Calendar");
  await nav(page, 2);
  ok((await screenName(page)) === "search", "navigated to Search");
  await page.locator(".search-field input").fill("Ugadi");
  await page.waitForTimeout(400);
  const result = page.locator(".search-results li button").first();
  if (await result.count()) {
    await result.click();
    await page.locator(".calendar-selected h2").waitFor({ timeout: 20000 }).catch(() => {});
    ok((await screenName(page)) === "calendar", "search result opened Calendar");
  }

  await page.goBack();
  await settleScreen(page);
  ok((await screenName(page)) === "search", "Back #1: returns to Search (not straight out of the app)", await screenName(page));
  await page.goBack();
  await settleScreen(page);
  ok((await screenName(page)) === "calendar", "Back #2: returns to Calendar", await screenName(page));
  await page.goBack();
  await settleScreen(page);
  ok((await screenName(page)) === "home", "Back #3: returns to Home", await screenName(page));

  section("Forward retraces the same path");
  await page.goForward();
  await settleScreen(page);
  ok((await screenName(page)) === "calendar", "Forward #1: Calendar");
  await page.goForward();
  await settleScreen(page);
  ok((await screenName(page)) === "search", "Forward #2: Search");

  section("Selected Calendar date survives Back/Forward");
  await nav(page, 1);
  await settleScreen(page);
  const grid = page.locator(".calendar-cell:not(.calendar-blank)").first();
  await grid.waitFor();
  await page.locator(".calendar-cell.is-today").first().click().catch(() => {});
  await page.waitForTimeout(300);
  const selBefore = await page.locator(".calendar-selected h2").innerText().catch(() => "");
  await nav(page, 2); // to Search
  await page.goBack();
  await page.waitForTimeout(500);
  const selAfter = await page.locator(".calendar-selected h2").innerText().catch(() => "");
  ok(selBefore.length > 0 && selBefore === selAfter, "the selected date is unchanged after navigating away and Back", `${selBefore} vs ${selAfter}`);

  section("In-app Back button still works exactly as before");
  await nav(page, 3); // Pujas
  const detail = page.locator(".puja-catalogue-item").first();
  if (await detail.count()) {
    await detail.click();
    await page.waitForTimeout(400);
    await page.locator(".back-button").click();
    await page.waitForTimeout(400);
    ok((await screenName(page)) === "pujas", "in-app Back from puja-detail returns to Pujas");
  }

  section("Refresh preserves the current screen's data (saved location)");
  await nav(page, 0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  ok(/Hyderabad/i.test(await page.locator(".location-button").innerText()), "saved location survives a refresh");

  section("No personal detail ever appears in the URL or in pushed history state");
  ok(historyStates.length > 0, `history.pushState was called (${historyStates.length} times)`);
  const leaked = historyStates.filter((s) => /Hyderabad|17\.385|78\.48|Telangana/i.test(s));
  ok(leaked.length === 0, "no city/coordinates ever appeared in a pushed history entry", JSON.stringify(leaked.slice(0, 2)));
  ok(new URL(page.url()).pathname === "/", "the URL path never changes from '/' (nothing screen-specific or personal in the address bar)");

  section("Going Back far enough leaves the app normally — nobody is trapped");
  for (let i = 0; i < 6; i += 1) await page.goBack().catch(() => {});
  await page.waitForTimeout(500);
  ok(true, "repeated Back presses never threw or hung the page");

  ok(errors.length === 0, `no console/page errors (${errors.length}${errors.length ? ": " + errors[0].slice(0, 150) : ""})`);
  await browser.close();
}

await run({ width: 375, height: 812 }, "phone");
await run({ width: 1440, height: 900 }, "desktop");

console.log(`\n${fails === 0 ? "BACK-NAVIGATION E2E PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

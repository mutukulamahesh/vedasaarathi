// Home Tithi/Nakshatra clarification - live transitions, no reload.
//
// Mounts the real app once (a single navigation), then advances the browser's
// mocked clock through a real Tithi transition, a real Nakshatra transition,
// and local midnight, WITHOUT ever reloading the page and WITHOUT reopening
// "See full Panchanga" again after the first open - proving the compact card
// recomputes live from the SAME mounted React tree and the SAME DOM subtree
// (the existing per-minute clock store, lib/puja/clock.ts, no longer tears
// the reading area down on every tick). Also checks that a genuine location
// change still shows that location's own data, never a leftover value from
// the previous one.
//
//   node tests/e2e/home-tithi-nakshatra-transitions.e2e.mjs
//   HTN_BASE_URL=http://localhost:5173/ node tests/e2e/home-tithi-nakshatra-transitions.e2e.mjs

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const EXTERNAL = process.env.HTN_BASE_URL || "";
const PORT = Number(process.env.HTN_PORT || 5261);
const BASE = (EXTERNAL || `http://localhost:${PORT}/`).replace(/\/?$/, "/");

const LOC_KEY = "vedasaarathi:location:v1";
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const FRISCO = {
  city: "Frisco", region: "Texas", country: "United States", timezone: "America/Chicago",
  latitude: "33.1507", longitude: "-96.8236",
};

// Hyderabad, 11 September 2026 (verified in this branch's own Panchanga
// verification docs): sunrise ~6:04 AM; Tithi (Amavasya -> Shukla Padyami)
// transitions at 8:56 AM; Nakshatra (Purva Phalguni -> Uttara Phalguni)
// transitions at 1:16 PM. Local midnight into 12 September is 18:30 UTC.
const T_BEFORE_TITHI = Date.parse("2026-09-11T01:30:00Z"); // 7:00 AM IST
const T_AFTER_TITHI = Date.parse("2026-09-11T04:00:00Z"); // 9:30 AM IST
const T_AFTER_NAKSHATRA = Date.parse("2026-09-11T08:30:00Z"); // 2:00 PM IST
const T_JUST_BEFORE_MIDNIGHT = Date.parse("2026-09-11T18:29:00Z"); // 11:59 PM IST
const T_JUST_AFTER_MIDNIGHT = Date.parse("2026-09-11T18:35:00Z"); // 12:05 AM IST, 12 Sep

let fails = 0;
let checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails += 1; console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); };
const section = (t) => console.log(`\n— ${t}`);

async function waitForServer(url, ms = 120000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return true; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const tithiBlock = (page) => page.locator(".home-tithi").innerText();
const nakshatraBlock = (page) => page.locator(".home-nakshatra").innerText();
const dateHeading = (page) => page.locator(".today-card h2").innerText();
const sunriseValue = (page) => page.locator(".panchanga-values dd").first().innerText();
const fullPanchangaOpen = (page) => page.locator(".home-see-full").evaluate((el) => el.open);

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

  section("Mount once, before the Tithi transition (7:00 AM)");
  await page.clock.install({ time: T_BEFORE_TITHI });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [LOC_KEY, JSON.stringify(HYD)]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".home-tithi").waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);

  let tithiText = await tithiBlock(page);
  console.log(`  tithi block: ${tithiText.replace(/\n/g, " | ")}`);
  ok(/Today.s Tithi:/.test(tithiText), "same-value state: single 'Today's Tithi:' line");
  ok(/until 8:56 AM/.test(tithiText), "English 'until' phrase reads 'until 8:56 AM'");
  ok(!/Tithi at sunrise:|Tithi now:/.test(tithiText), "no sunrise/now split before the transition");

  let heading = await dateHeading(page);
  ok(/September 11/.test(heading), `date heading shows September 11 (got: ${heading.split("\n")[0]})`);

  section("Open 'See full Panchanga' ONCE - it must stay open for the rest of this session");
  await page.locator(".home-see-full > summary").click();
  await page.waitForTimeout(300);
  ok(await fullPanchangaOpen(page), "Full Panchangam is open right after clicking it");
  const hydSunrise = await sunriseValue(page);
  console.log(`  Hyderabad sunrise: ${hydSunrise}`);

  let nakshatraText = await nakshatraBlock(page);
  console.log(`  nakshatra block: ${nakshatraText.replace(/\n/g, " | ")}`);
  ok(/Today.s Nakshatra:/.test(nakshatraText), "Nakshatra also single-line same-value before its own (later) transition");

  section("Advance the clock past 8:56 AM, SAME mount, no reload, no re-opening");
  await page.clock.fastForward(T_AFTER_TITHI - T_BEFORE_TITHI);
  await page.waitForTimeout(500);

  ok(await fullPanchangaOpen(page), "Full Panchangam is STILL open after a minute-tick Tithi transition - no re-click");

  tithiText = await tithiBlock(page);
  console.log(`  tithi block: ${tithiText.replace(/\n/g, " | ")}`);
  ok(/Tithi at sunrise:/.test(tithiText), "Tithi label stays visible on the 'at sunrise' line");
  ok(/Tithi now:/.test(tithiText), "Tithi label stays visible on the 'now' line");
  ok(/changed at 8:56 AM/.test(tithiText), "reads the real transition instant (8:56 AM), not the current element's own end");
  ok(!/Today.s Tithi:/.test(tithiText), "the single-line same-value form is gone now that they differ");

  nakshatraText = await nakshatraBlock(page);
  ok(/Today.s Nakshatra:/.test(nakshatraText), "Nakshatra is still same-value at 9:30 AM (transitions later, at 1:16 PM), read without reopening anything");

  section("Advance past 1:16 PM too - Nakshatra now also differs, SAME mount, still no re-opening");
  await page.clock.fastForward(T_AFTER_NAKSHATRA - T_AFTER_TITHI);
  await page.waitForTimeout(500);

  ok(await fullPanchangaOpen(page), "Full Panchangam is STILL open after the Nakshatra transition too");

  nakshatraText = await nakshatraBlock(page);
  console.log(`  nakshatra block: ${nakshatraText.replace(/\n/g, " | ")}`);
  ok(/Nakshatra at sunrise:/.test(nakshatraText), "Nakshatra label stays visible on the 'at sunrise' line");
  ok(/Nakshatra now:/.test(nakshatraText), "Nakshatra label stays visible on the 'now' line");
  ok(/changed at 1:16 PM/.test(nakshatraText), "Nakshatra reads its own real transition instant");

  tithiText = await tithiBlock(page);
  ok(/Tithi at sunrise:.*Tithi now:.*changed at 8:56 AM/s.test(tithiText), "Tithi's own earlier transition is still shown correctly, unaffected by Nakshatra's later one");

  section("Advance across local midnight (11 -> 12 September), SAME mount, still no re-opening");
  await page.clock.fastForward(T_JUST_BEFORE_MIDNIGHT - T_AFTER_NAKSHATRA);
  await page.waitForTimeout(500);
  heading = await dateHeading(page);
  ok(/September 11/.test(heading), `still 11 September just before midnight (got: ${heading.split("\n")[0]})`);
  ok(await fullPanchangaOpen(page), "Full Panchangam is still open just before midnight");

  await page.clock.fastForward(T_JUST_AFTER_MIDNIGHT - T_JUST_BEFORE_MIDNIGHT);
  await page.waitForTimeout(800);
  heading = await dateHeading(page);
  console.log(`  date heading after midnight: ${heading.split("\n")[0]}`);
  ok(/September 12/.test(heading), `local date rolled over to 12 September on its own (got: ${heading.split("\n")[0]})`);
  ok(await fullPanchangaOpen(page), "Full Panchangam is STILL open right across midnight - the civil-day rollover updates data in place, it does not tear the reading area down");

  tithiText = await tithiBlock(page);
  console.log(`  tithi block after midnight: ${tithiText.replace(/\n/g, " | ")}`);
  ok(/Tithi/.test(tithiText), "Tithi label is present after the date rollover (recomputed for the new day, still labelled)");
  nakshatraText = await nakshatraBlock(page);
  ok(/Nakshatra/.test(nakshatraText), "Nakshatra label is present after the date rollover (recomputed for the new day, still labelled)");

  const hydSunriseAfterMidnight = await sunriseValue(page);
  console.log(`  Hyderabad sunrise, 12 September: ${hydSunriseAfterMidnight}`);
  ok(hydSunriseAfterMidnight.length > 0, "sunrise value is present and non-empty after the day rollover (not left stale/blank)");

  section("A genuine location change (Hyderabad -> Frisco) still shows the NEW location's own data");
  await page.locator(".location-button").click();
  await page.locator(".location-current").waitFor({ timeout: 10000 });
  await page.locator("button", { hasText: "Edit location" }).click();
  await page.locator("form.location-form").waitFor({ timeout: 10000 });
  const setField = async (labelText, value) => {
    await page.locator("label", { hasText: labelText }).locator("input").fill(String(value));
  };
  await setField("City", FRISCO.city);
  await setField("State or region", FRISCO.region);
  await setField("Country", FRISCO.country);
  await setField("Time zone", FRISCO.timezone);
  await setField("Latitude", FRISCO.latitude);
  await setField("Longitude", FRISCO.longitude);
  await page.locator("button", { hasText: "Save location" }).click();
  // LocationScreen is given onSaved={goHome} here, which it calls itself via
  // a real setTimeout (LOCATION_SAVED_NAVIGATE_DELAY_MS, 400ms) after a
  // successful save - it navigates back to Home on its own, no Back click
  // needed. With the page's clock mocked (page.clock.install above), that
  // timer never fires from real wall-clock time passing, so the mocked
  // clock has to be advanced through it explicitly.
  await page.clock.fastForward(600);
  await page.locator(".home-tithi").waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);

  const locButtonText = await page.locator(".location-button").innerText();
  ok(/Frisco/.test(locButtonText), `topbar now shows Frisco, not Hyderabad (got: ${locButtonText})`);
  ok(!/Hyderabad/.test(locButtonText), "no leftover Hyderabad text in the location summary");

  // Full Panchangam is a FRESH <details> here (a genuine location change is
  // expected to reset the reading area, per the "never show a previous
  // location's results" protection) - re-open it to read Frisco's sunrise.
  await page.locator(".home-see-full > summary").click();
  await page.waitForTimeout(400);
  const friscoSunrise = await sunriseValue(page);
  console.log(`  Frisco sunrise: ${friscoSunrise}`);
  ok(friscoSunrise.length > 0 && friscoSunrise !== hydSunriseAfterMidnight, `Frisco's own sunrise is shown, not Hyderabad's leftover value (Hyderabad was: ${hydSunriseAfterMidnight})`);

  ok(errors.length === 0, `no console / page errors across the whole session (${errors.slice(0, 3).join(" | ")})`);

  await browser.close();
  killServer();
  console.log(`\n${fails === 0 ? "ALL HOME TRANSITION CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

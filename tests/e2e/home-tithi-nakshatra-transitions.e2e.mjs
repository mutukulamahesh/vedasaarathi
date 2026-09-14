// Home Tithi/Nakshatra clarification - live transitions, no reload.
//
// Mounts the real app once (a single navigation), then advances the browser's
// mocked clock through a real Tithi transition, a real Nakshatra transition,
// and local midnight, WITHOUT ever reloading the page - proving the compact
// card recomputes live from the same mounted React tree (the existing
// per-minute clock store, lib/puja/clock.ts), not just on a fresh load.
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

// The "See full Panchanga" <details> is native/uncontrolled - but the
// surrounding Panchanga block synchronously resets to a brief "loading"
// state on every minute tick (the existing render-time key/reset pattern in
// home-screen.tsx), unmounting and remounting that subtree each time, which
// closes the <details> again. Re-open it before every Nakshatra read rather
// than relying on it staying open across a clock advance - that reset is
// pre-existing app behaviour, not something this correction touches.
async function readNakshatra(page) {
  const details = page.locator(".home-see-full");
  if (!(await details.evaluate((el) => el.open))) {
    await page.locator(".home-see-full > summary").click();
    await page.waitForTimeout(300);
  }
  return nakshatraBlock(page);
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

  // Nakshatra lives inside the "See full Panchanga" <details>, collapsed by
  // default - a closed <details>' non-summary content is hidden, so
  // .innerText() on it returns "" until it is opened (see readNakshatra()).
  let nakshatraText = await readNakshatra(page);
  console.log(`  nakshatra block: ${nakshatraText.replace(/\n/g, " | ")}`);
  ok(/Today.s Nakshatra:/.test(nakshatraText), "Nakshatra also single-line same-value before its own (later) transition");

  section("Advance the clock past 8:56 AM, SAME mount, no reload");
  await page.clock.fastForward(T_AFTER_TITHI - T_BEFORE_TITHI);
  await page.waitForTimeout(500);

  tithiText = await tithiBlock(page);
  console.log(`  tithi block: ${tithiText.replace(/\n/g, " | ")}`);
  ok(/Tithi at sunrise:/.test(tithiText), "Tithi label stays visible on the 'at sunrise' line");
  ok(/Tithi now:/.test(tithiText), "Tithi label stays visible on the 'now' line");
  ok(/changed at 8:56 AM/.test(tithiText), "reads the real transition instant (8:56 AM), not the current element's own end");
  ok(!/Today.s Tithi:/.test(tithiText), "the single-line same-value form is gone now that they differ");

  nakshatraText = await readNakshatra(page);
  ok(/Today.s Nakshatra:/.test(nakshatraText), "Nakshatra is still same-value at 9:30 AM (transitions later, at 1:16 PM)");

  section("Advance past 1:16 PM too - Nakshatra now also differs, SAME mount");
  await page.clock.fastForward(T_AFTER_NAKSHATRA - T_AFTER_TITHI);
  await page.waitForTimeout(500);

  nakshatraText = await readNakshatra(page);
  console.log(`  nakshatra block: ${nakshatraText.replace(/\n/g, " | ")}`);
  ok(/Nakshatra at sunrise:/.test(nakshatraText), "Nakshatra label stays visible on the 'at sunrise' line");
  ok(/Nakshatra now:/.test(nakshatraText), "Nakshatra label stays visible on the 'now' line");
  ok(/changed at 1:16 PM/.test(nakshatraText), "Nakshatra reads its own real transition instant");

  tithiText = await tithiBlock(page);
  ok(/Tithi at sunrise:.*Tithi now:.*changed at 8:56 AM/s.test(tithiText), "Tithi's own earlier transition is still shown correctly, unaffected by Nakshatra's later one");

  section("Advance across local midnight (11 -> 12 September), SAME mount");
  await page.clock.fastForward(T_JUST_BEFORE_MIDNIGHT - T_AFTER_NAKSHATRA);
  await page.waitForTimeout(500);
  heading = await dateHeading(page);
  ok(/September 11/.test(heading), `still 11 September just before midnight (got: ${heading.split("\n")[0]})`);

  await page.clock.fastForward(T_JUST_AFTER_MIDNIGHT - T_JUST_BEFORE_MIDNIGHT);
  await page.waitForTimeout(800);
  heading = await dateHeading(page);
  console.log(`  date heading after midnight: ${heading.split("\n")[0]}`);
  ok(/September 12/.test(heading), `local date rolled over to 12 September on its own (got: ${heading.split("\n")[0]})`);

  tithiText = await tithiBlock(page);
  console.log(`  tithi block after midnight: ${tithiText.replace(/\n/g, " | ")}`);
  ok(/Tithi/.test(tithiText), "Tithi label is present after the date rollover (recomputed for the new day, still labelled)");
  nakshatraText = await readNakshatra(page);
  ok(/Nakshatra/.test(nakshatraText), "Nakshatra label is present after the date rollover (recomputed for the new day, still labelled)");

  ok(errors.length === 0, `no console / page errors across the whole session (${errors.slice(0, 3).join(" | ")})`);

  await browser.close();
  killServer();
  console.log(`\n${fails === 0 ? "ALL HOME TRANSITION CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

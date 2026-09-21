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
// A form-valid (latitude 90 passes -90..90 validation), real-world edge
// coordinate where mhah-panchang's sunTimer genuinely throws ("Invalid time
// value") because the sun neither rises nor sets there on a given civil
// date. Used to force a WARM (already-succeeded-once) recompute to reject
// through the app's own, unmodified Edit-location flow - never a test-only
// hook into panchangaForLocation itself.
const NORTH_POLE = { city: "North Pole", region: "", country: "Arctic", timezone: "UTC", latitude: "90", longitude: "0" };

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

/** Records, via MutationObserver, whether each `selectors` element's text
 * EVER contained "Updating…" between this call and `readUpdatingTranscript`.
 *
 * Earlier version of this check raced `page.waitForFunction(..., {polling:
 * "raf"})` against an un-awaited `page.clock.fastForward(...)` promise.
 * That is unreliable specifically under a MOCKED clock + CPU throttling
 * together: `requestAnimationFrame`-based polling only observes a state
 * that the browser actually PAINTS, and confirmed directly (by pushing the
 * throttle rate far higher and re-running) that the pending "Updating…"
 * state genuinely occurs and is genuinely correct - it just does not
 * reliably get its own paint before the next state supersedes it while
 * Sinon's fake-timer callback is driving a long synchronous-ish JS burst on
 * the same thread `requestAnimationFrame` needs to fire on. A
 * MutationObserver instead watches the DOM subtree directly and its
 * callback fires for every actual mutation batch, independent of whether a
 * frame was ever painted for it - so it catches a transient DOM state a
 * paint-gated poll can miss entirely. This is a change to how the test
 * OBSERVES the already-real pending mechanism, not a change to what is
 * being asserted. */
async function installUpdatingTranscript(page, selectors) {
  await page.evaluate((sels) => {
    window.__updatingSeen = Object.fromEntries(sels.map((s) => [s, false]));
    window.__updatingObservers = sels.map((s) => {
      const check = () => {
        const el = document.querySelector(s);
        if (el && /Updating/.test(el.textContent || "")) window.__updatingSeen[s] = true;
      };
      const el = document.querySelector(s);
      const obs = new MutationObserver(check);
      if (el) obs.observe(el, { childList: true, subtree: true, characterData: true });
      check(); // in case it is already showing "Updating…" this instant
      return obs;
    });
  }, selectors);
}

/** Reads back what `installUpdatingTranscript` recorded, as
 * `{ [selector]: sawUpdating }`, and tears the observers down. */
async function readUpdatingTranscript(page, selectors) {
  return page.evaluate((sels) => {
    const out = Object.fromEntries(sels.map((s) => [s, window.__updatingSeen?.[s] ?? false]));
    for (const obs of window.__updatingObservers || []) obs.disconnect();
    return out;
  }, selectors);
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

  section("Routine minute tick: keyboard focus and scroll position survive it");
  // Focus something inside the reading area (the Tithi disclosure's own
  // <summary>) and scroll the page, BEFORE a routine (same-day) tick - then
  // confirm neither was disturbed by the resulting re-render.
  await page.locator(".home-tithi-learn > summary").focus();
  ok(
    await page.locator(".home-tithi-learn > summary").evaluate((el) => el === document.activeElement),
    "the Tithi disclosure's <summary> is actually focused before the tick",
  );
  await page.evaluate(() => window.scrollTo(0, 250));
  const scrollBefore = await page.evaluate(() => window.scrollY);

  await page.clock.fastForward(60_000); // exactly one routine minute tick, nothing transitions

  const stillFocused = await page.locator(".home-tithi-learn > summary").evaluate((el) => el === document.activeElement);
  ok(stillFocused, "keyboard focus is still on the same element after a routine minute-tick re-render");
  const scrollAfter = await page.evaluate(() => window.scrollY);
  ok(scrollAfter === scrollBefore, `scroll position is unchanged by a routine minute tick (before: ${scrollBefore}, after: ${scrollAfter})`);
  ok(await fullPanchangaOpen(page), "Full Panchangam is still open after the routine tick too");

  section("Deliberately delay the midnight calculation (CPU-throttled) and inspect the pending state");
  const cdp = await ctx.newCDPSession(page);
  await page.clock.fastForward(T_JUST_BEFORE_MIDNIGHT - T_AFTER_NAKSHATRA - 60_000); // account for the routine tick above
  await page.waitForTimeout(500);
  heading = await dateHeading(page);
  ok(/September 11/.test(heading), `still 11 September just before midnight (got: ${heading.split("\n")[0]})`);
  ok(await fullPanchangaOpen(page), "Full Panchangam is still open just before midnight");

  // Slow the page's own JS execution enough that the midnight recompute is
  // genuinely still in flight for a while - a warm recompute is local,
  // synchronous computation (the mhah-panchang chunk is already cached), so
  // there is no network gap to intercept; throttling is what widens the
  // window. A MutationObserver transcript (installed BEFORE advancing the
  // clock) records every DOM state the pending fields pass through, so the
  // check does not depend on a browser paint happening to land during the
  // narrow window - see `installUpdatingTranscript`'s own doc comment for
  // why an rAF-polling race was unreliable here specifically. Checked across
  // EVERY date-dependent section at once, not just Tithi/Nakshatra - the
  // duplicate Tithi row and sunrise/sunset inside "Full Panchangam" (open
  // throughout this pass - the EXPANDED view) and the daily useful-times
  // list must all hold the same pending protection.
  const pendingSelectors = [".home-tithi", ".home-nakshatra", ".home-full-panchanga > .panchanga-values", ".home-times"];
  await installUpdatingTranscript(page, pendingSelectors);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 20 });
  await page.clock.fastForward(T_JUST_AFTER_MIDNIGHT - T_JUST_BEFORE_MIDNIGHT);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  // Throttle is back to normal now - let the (possibly still in-flight)
  // recompute actually settle to the real 12-September value before reading
  // the transcript, rather than a fixed, potentially-too-short wait.
  await page.waitForFunction(
    () => /Shukla Padyami/.test(document.querySelector(".home-tithi")?.textContent || ""),
    { timeout: 15000 },
  );
  const pendingSeen = await readUpdatingTranscript(page, pendingSelectors);
  ok(pendingSeen[".home-tithi"], "Tithi showed the 'Updating…' pending state while the midnight recompute was still in flight, not yesterday's value");
  ok(pendingSeen[".home-nakshatra"], "Nakshatra showed the 'Updating…' pending state too, under the SAME visible field label");
  ok(pendingSeen[".home-full-panchanga > .panchanga-values"], "the duplicate Tithi row and sunrise/sunset inside 'Full Panchangam' (expanded view) also showed 'Updating…', not yesterday's values");
  ok(pendingSeen[".home-times"], "the daily useful-times list also showed 'Updating…' rather than yesterday's periods");
  ok(await fullPanchangaOpen(page), "Full Panchangam stayed open THROUGH the pending state - only the affected values changed, not the reading area");

  heading = await dateHeading(page);
  console.log(`  date heading after midnight: ${heading.split("\n")[0]}`);
  ok(/September 12/.test(heading), `local date rolled over to 12 September on its own (got: ${heading.split("\n")[0]})`);
  ok(await fullPanchangaOpen(page), "Full Panchangam is STILL open right across midnight - the civil-day rollover updates data in place, it does not tear the reading area down");

  // Assert the ACTUAL expected 12-September values (verified independently
  // via a direct engine query against this branch's panchangaForLocation),
  // not merely that some non-empty, labelled text is present.
  tithiText = await tithiBlock(page);
  console.log(`  tithi block after midnight: ${tithiText.replace(/\n/g, " | ")}`);
  ok(/Today.s Tithi: Shukla Padyami/.test(tithiText), `Tithi shows the EXACT expected 12-September value, Shukla Padyami (got: ${tithiText.split("\n")[0]})`);
  ok(/until 7:46 AM/.test(tithiText), "Tithi's new end time is the exact expected 7:46 AM, not yesterday's 8:56 AM");
  nakshatraText = await nakshatraBlock(page);
  ok(/Today.s Nakshatra: Uttara Phalguni/.test(nakshatraText), `Nakshatra shows the EXACT expected 12-September value, Uttara Phalguni (got: ${nakshatraText.split("\n")[0]})`);
  ok(/until 12:55 PM/.test(nakshatraText), "Nakshatra's new end time is the exact expected 12:55 PM");

  const hydSunriseAfterMidnight = await sunriseValue(page);
  console.log(`  Hyderabad sunrise, 12 September: ${hydSunriseAfterMidnight}`);
  ok(hydSunriseAfterMidnight === "6:05 AM", `sunrise shows the exact expected 12-September value, 6:05 AM (got: ${hydSunriseAfterMidnight})`);

  section("Collapsed Home: the SAME midnight pending protection applies with 'See full Panchanga' never opened");
  // A fresh context/page so this pass starts genuinely collapsed - the main
  // session above proves the EXPANDED case (open throughout); this proves
  // the OUTER, always-visible sections (Tithi, useful times) are protected
  // even when the reader never opens the disclosure at all.
  const collapsedCtx = await browser.newContext({ viewport: { width: 390, height: 1400 } });
  const collapsedErrors = [];
  collapsedCtx.on("pageerror", (e) => collapsedErrors.push(String(e)));
  const collapsedPage = await collapsedCtx.newPage();
  collapsedPage.setDefaultTimeout(30000);
  await collapsedPage.clock.install({ time: T_JUST_BEFORE_MIDNIGHT });
  await collapsedPage.goto(BASE, { waitUntil: "domcontentloaded" });
  await collapsedPage.evaluate(([k, v]) => localStorage.setItem(k, v), [LOC_KEY, JSON.stringify(HYD)]);
  await collapsedPage.reload({ waitUntil: "domcontentloaded" });
  await collapsedPage.locator(".home-tithi").waitFor({ timeout: 15000 });
  await collapsedPage.waitForTimeout(500);
  ok(!(await fullPanchangaOpen(collapsedPage)), "Full Panchangam starts collapsed (never opened) in this pass");

  const collapsedSelectors = [".home-tithi", ".home-times"];
  await installUpdatingTranscript(collapsedPage, collapsedSelectors);
  const collapsedCdp = await collapsedCtx.newCDPSession(collapsedPage);
  await collapsedCdp.send("Emulation.setCPUThrottlingRate", { rate: 20 });
  await collapsedPage.clock.fastForward(T_JUST_AFTER_MIDNIGHT - T_JUST_BEFORE_MIDNIGHT);
  await collapsedCdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await collapsedPage.waitForFunction(
    () => /Shukla Padyami/.test(document.querySelector(".home-tithi")?.textContent || ""),
    { timeout: 15000 },
  );
  const collapsedSeen = await readUpdatingTranscript(collapsedPage, collapsedSelectors);
  ok(collapsedSeen[".home-tithi"], "collapsed Home: Tithi showed 'Updating…' during the midnight recompute even though 'Full Panchangam' was never opened");
  ok(collapsedSeen[".home-times"], "collapsed Home: the useful-times list also showed 'Updating…', not yesterday's periods");
  ok(!(await fullPanchangaOpen(collapsedPage)), "the midnight refresh never auto-opens 'Full Panchangam' on its own");

  const collapsedHeading = await dateHeading(collapsedPage);
  ok(/September 12/.test(collapsedHeading), `collapsed Home also rolls over to 12 September on its own (got: ${collapsedHeading.split("\n")[0]})`);
  const collapsedTithiText = await tithiBlock(collapsedPage);
  ok(/Today.s Tithi: Shukla Padyami/.test(collapsedTithiText), `collapsed Home shows the exact expected 12-September Tithi after settling (got: ${collapsedTithiText.split("\n")[0]})`);
  ok(collapsedErrors.length === 0, `no console/page errors in the collapsed-view pass (${collapsedErrors.slice(0, 2).join(" | ")})`);
  await collapsedCtx.close();

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

  section("A rejected refresh still clears to the error state - never a fabricated or stale result");
  // A FRESH context/page, so mhah-panchang (module-level cached once loaded -
  // see lib/panchanga/engine.ts's `enginePromise`) has not been fetched yet
  // in this browser session. Failing that one request forces a genuine
  // rejection through panchangaForLocation's real .catch handler - the same
  // unconditional error-clearing code path that governs every failure,
  // whichever recompute triggers it.
  const failCtx = await browser.newContext({ viewport: { width: 390, height: 1400 } });
  const failErrors = [];
  failCtx.on("pageerror", (e) => failErrors.push(String(e)));
  const failPage = await failCtx.newPage();
  failPage.setDefaultTimeout(30000);
  await failPage.route("**/*mhah*panchang*", (route) => route.abort("failed"));
  await failPage.goto(BASE, { waitUntil: "domcontentloaded" });
  await failPage.evaluate(([k, v]) => localStorage.setItem(k, v), [LOC_KEY, JSON.stringify(HYD)]);
  await failPage.reload({ waitUntil: "domcontentloaded" });
  await failPage.waitForTimeout(1500);

  const failBodyText = await failPage.locator("body").innerText();
  ok((await failPage.locator(".home-tithi").count()) === 0, "no Tithi card is rendered at all when the calculation failed - never a fabricated value");
  ok(/could not be calculated/i.test(failBodyText), `the explicit "could not be calculated" error state is shown instead (body snippet: ${failBodyText.replace(/\n/g, " | ").slice(0, 200)})`);
  ok(!/Krishna|Shukla|Amavasya|Padyami/.test(failBodyText), "no Tithi/Paksha name leaked into the page from a stale or partial result");

  // Unblock the route and reload once more: the SAME failed request is
  // retried fresh (nothing was permanently poisoned by the earlier failure),
  // and a normal, correct result appears - proving the error state is
  // recoverable, not a dead end.
  await failPage.unroute("**/*mhah*panchang*");
  await failPage.reload({ waitUntil: "domcontentloaded" });
  await failPage.locator(".home-tithi").waitFor({ timeout: 15000 });
  const recoveredTithi = await failPage.locator(".home-tithi").innerText();
  ok(/Tithi/.test(recoveredTithi), `after unblocking, a real Tithi result appears (recovered, not stuck in the error state): ${recoveredTithi.split("\n")[0]}`);
  ok(failErrors.length === 0, `the aborted request is handled gracefully by panchangaForLocation's own .catch - no raw uncaught page error (${failErrors.slice(0, 2).join(" | ")})`);
  await failCtx.close();

  section("Warm session: force the NEXT calculation to reject after a successful one, then recover live (no reload)");
  // The section above forces the FIRST-ever calculation in a session to
  // fail (mhah-panchang itself never loads). That cannot exercise "clear a
  // result that was already showing": lib/panchanga/engine.ts caches its
  // loaded engine at module scope for the rest of the page's life, and a
  // warm recompute is pure local computation with no network step left to
  // intercept. Instead, force the SECOND calculation to reject with a
  // form-valid, real-world location the app's own validation accepts
  // (latitude 90) but mhah-panchang's sunTimer cannot resolve a sunrise for
  // - a genuine failure reached through the ordinary Edit-location flow,
  // not a test-only hook.
  const warmCtx = await browser.newContext({ viewport: { width: 390, height: 1400 } });
  const warmErrors = [];
  warmCtx.on("pageerror", (e) => warmErrors.push(String(e)));
  const warmPage = await warmCtx.newPage();
  warmPage.setDefaultTimeout(30000);
  await warmPage.clock.install({ time: T_BEFORE_TITHI });
  await warmPage.goto(BASE, { waitUntil: "domcontentloaded" });
  await warmPage.evaluate(([k, v]) => localStorage.setItem(k, v), [LOC_KEY, JSON.stringify(HYD)]);
  await warmPage.reload({ waitUntil: "domcontentloaded" });
  await warmPage.locator(".home-tithi").waitFor({ timeout: 15000 });
  await warmPage.waitForTimeout(500);
  ok(
    /Today.s Tithi:/.test(await warmPage.locator(".home-tithi").innerText()),
    "warm session: a real Tithi result is displayed first, before forcing any failure",
  );

  const setWarmField = async (labelText, value) => {
    await warmPage.locator("label", { hasText: labelText }).locator("input").fill(String(value));
  };
  const editWarmLocation = async (loc) => {
    await warmPage.locator(".location-button").click();
    await warmPage.locator(".location-current").waitFor({ timeout: 10000 });
    await warmPage.locator("button", { hasText: "Edit location" }).click();
    await warmPage.locator("form.location-form").waitFor({ timeout: 10000 });
    await setWarmField("City", loc.city);
    await setWarmField("State or region", loc.region);
    await setWarmField("Country", loc.country);
    await setWarmField("Time zone", loc.timezone);
    await setWarmField("Latitude", loc.latitude);
    await setWarmField("Longitude", loc.longitude);
    await warmPage.locator("button", { hasText: "Save location" }).click();
    await warmPage.clock.fastForward(600); // LOCATION_SAVED_NAVIGATE_DELAY_MS
    await warmPage.waitForTimeout(600);
  };

  await editWarmLocation(NORTH_POLE);
  ok(
    (await warmPage.locator(".home-tithi").count()) === 0
      && (await warmPage.locator(".home-times").count()) === 0
      && (await warmPage.locator(".home-see-full").count()) === 0,
    "the OLD (Hyderabad) result and the whole reading area are cleared, not left on screen once the new location's calculation fails",
  );
  const warmBodyText = await warmPage.locator("body").innerText();
  ok(/could not be calculated/i.test(warmBodyText), "the explicit error state appears for the failed (North Pole) location");

  await editWarmLocation({
    city: HYD.city, region: HYD.region, country: HYD.country, timezone: HYD.timezone,
    latitude: String(HYD.latitude), longitude: String(HYD.longitude),
  });
  await warmPage.locator(".home-tithi").waitFor({ timeout: 15000 });
  const warmTithiAfter = await warmPage.locator(".home-tithi").innerText();
  ok(
    /Today.s Tithi:/.test(warmTithiAfter),
    `recovers to a real Tithi result after editing back to a valid location, live - no page reload (got: ${warmTithiAfter.split("\n")[0]})`,
  );
  ok(warmErrors.length === 0, `no raw uncaught page error from the forced failure or the recovery (${warmErrors.slice(0, 2).join(" | ")})`);
  await warmCtx.close();

  await browser.close();
  killServer();
  console.log(`\n${fails === 0 ? "ALL HOME TRANSITION CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

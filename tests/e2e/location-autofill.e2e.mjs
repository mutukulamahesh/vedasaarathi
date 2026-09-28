// End-to-end browser test for the on-device location auto-suggestion: after
// "Use my location" grants device coordinates, the app tries to match them
// against a bundled, same-origin place list (lib/location/reverse-geocode.ts)
// and offers city/state/country as an editable, confirm-before-save
// suggestion - never sent anywhere, never authoritative.
//
// Geolocation itself is mocked via page.addInitScript (there is no real GPS
// in CI), so every outcome (granted, denied, timeout) is deterministic. The
// on-device place-list fetch is same-origin and real; a "lookup failure"
// scenario blocks it with route interception rather than waiting out the
// module's real 5s timeout - the timeout TIMING itself is covered by
// tests/reverse-geocode.test.mjs's injected-fetch unit tests, so this suite
// only needs to prove the UI degrades the same way on either failure mode.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:8910/").replace(/\/?$/, "/");
let fails = 0, checks = 0;
const ok = (c, m, extra = "") => { checks += 1; if (!c) fails += 1; console.log(`  ${c ? "PASS" : "FAIL"}  ${m}${!c && extra ? "  ::  " + extra : ""}`); };
const section = (t) => console.log(`\n— ${t}`);

const HYDERABAD_COORDS = { latitude: 17.385, longitude: 78.4867, accuracy: 20 };
const FRISCO_COORDS = { latitude: 33.1507, longitude: -96.8236, accuracy: 20 };
const HYD_MANUAL = { city: "Hyderabad", region: "Telangana", country: "India", timezone: "Asia/Kolkata", latitude: "17.385", longitude: "78.4867" };
const FRISCO_MANUAL = { city: "Frisco", region: "Texas", country: "United States", timezone: "America/Chicago", latitude: "33.1507", longitude: "-96.8236" };

/** Overrides navigator.geolocation before the app's first script runs, so
 * "Use my location" resolves deterministically to exactly the outcome asked
 * for - no real device, no flaky CI GPS. */
async function mockGeolocation(page, outcome) {
  await page.addInitScript((outcome) => {
    const CODE = { PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
    Object.defineProperty(window.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(onSuccess, onError) {
          if (outcome.kind === "GRANTED") {
            onSuccess({ coords: { latitude: outcome.latitude, longitude: outcome.longitude, accuracy: outcome.accuracy } });
          } else {
            onError({ code: CODE[outcome.kind] ?? CODE.POSITION_UNAVAILABLE });
          }
        },
      },
    });
  }, outcome);
}

async function openLocationScreen(page) {
  await page.locator("button", { hasText: /set your location/i }).first().click();
  await page.locator("form.location-form, article.location-current").first().waitFor();
}

async function clickUseMyLocation(page) {
  await page.locator("button", { hasText: /use my location|నా స్థానాన్ని ఉపయోగించండి/i }).click();
}

function fieldInput(page, labelPattern) {
  return page.locator("label", { hasText: labelPattern }).first().locator("input");
}

async function fillManual(page, loc) {
  await fieldInput(page, /^City$/).fill(loc.city);
  await fieldInput(page, /State or region/).fill(loc.region);
  await fieldInput(page, /^Country$/).fill(loc.country);
  await fieldInput(page, /Time zone/).fill(loc.timezone);
  await fieldInput(page, /^Latitude$/).fill(loc.latitude);
  await fieldInput(page, /^Longitude$/).fill(loc.longitude);
}

async function save(page) {
  await page.locator("button", { hasText: /^Save location$|ప్రదేశాన్ని సేవ్ చేయండి/ }).click();
  await page.waitForTimeout(700);
}

/** After a save, onSaved navigates back to Home - the saved city/region is
 * then shown in the topbar's button.location-button (always present on
 * Home), not on the Location screen itself (which is no longer mounted). */
function savedLocationText(page) {
  return page.locator("button.location-button").innerText();
}

async function newContext(browser, viewport, extra = {}) {
  const ctx = await browser.newContext({ viewport, ...extra });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  return { ctx, page, errors };
}

const noHOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function run(viewport, label) {
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });

  /* ---------------------------------------------------------------- */
  section("Permission granted, lookup succeeds — Hyderabad");
  {
    const { ctx, page, errors } = await newContext(browser, viewport);
    await mockGeolocation(page, { kind: "GRANTED", ...HYDERABAD_COORDS });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await openLocationScreen(page);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /Hyderabad/ }).waitFor({ timeout: 10000 });
    ok(await fieldInput(page, /^City$/).inputValue() === "Hyderabad", "city auto-filled with Hyderabad");
    ok(await fieldInput(page, /^Country$/).inputValue() === "India", "country auto-filled with India");
    ok((await fieldInput(page, /State or region/).inputValue()).includes("Telangana"), "region auto-filled with Telangana");
    ok(await fieldInput(page, /^Latitude$/).inputValue() === "17.385", "latitude set from the device fix");
    const cityInput = fieldInput(page, /^City$/);
    ok(await cityInput.isEnabled(), "the auto-filled city field remains a normal editable input");
    ok(await noHOverflow(page), "no horizontal overflow after auto-fill");
    ok(errors.length === 0, `no console/page errors (${errors.length})`);
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  section("Permission granted, lookup succeeds — Frisco, TX");
  {
    const { ctx, page } = await newContext(browser, viewport);
    await mockGeolocation(page, { kind: "GRANTED", ...FRISCO_COORDS });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await openLocationScreen(page);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /Frisco/ }).waitFor({ timeout: 10000 });
    ok(await fieldInput(page, /^City$/).inputValue() === "Frisco", "city auto-filled with Frisco, exactly (not a neighboring city)");
    ok(await fieldInput(page, /^Country$/).inputValue() === "United States", "country auto-filled with United States");
    ok((await fieldInput(page, /State or region/).inputValue()).includes("Texas"), "region auto-filled with Texas");
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  section("Editing an automatically populated city before saving");
  {
    const { ctx, page } = await newContext(browser, viewport);
    await mockGeolocation(page, { kind: "GRANTED", ...HYDERABAD_COORDS });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await openLocationScreen(page);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /Hyderabad/ }).waitFor({ timeout: 10000 });
    const cityInput = fieldInput(page, /^City$/);
    await cityInput.fill("Secunderabad");
    ok(await cityInput.inputValue() === "Secunderabad", "the suggested city can be overwritten before saving");
    await save(page);
    ok((await savedLocationText(page)).includes("Secunderabad"),
      "the edited value, not the original suggestion, is what gets saved");
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  section("No stale place name when coordinates change (two fixes in a row)");
  {
    const { ctx, page } = await newContext(browser, viewport);
    await mockGeolocation(page, { kind: "GRANTED", ...HYDERABAD_COORDS });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await openLocationScreen(page);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /Hyderabad/ }).waitFor({ timeout: 10000 });
    ok(await fieldInput(page, /^City$/).inputValue() === "Hyderabad", "first fix: Hyderabad");

    // A second, different fix - override geolocation again in-page (no reload).
    await page.evaluate((coords) => {
      Object.defineProperty(window.navigator, "geolocation", {
        configurable: true,
        value: { getCurrentPosition: (onSuccess) => onSuccess({ coords }) },
      });
    }, FRISCO_COORDS);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /Frisco/ }).waitFor({ timeout: 10000 });
    ok(await fieldInput(page, /^City$/).inputValue() === "Frisco", "second fix replaces the city with Frisco");
    ok(await fieldInput(page, /^Country$/).inputValue() === "United States", "country also updates, no leftover India");
    ok(!(await fieldInput(page, /State or region/).inputValue()).includes("Telangana"), "no stale Telangana left behind");
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  section("Permission denied");
  {
    const { ctx, page } = await newContext(browser, viewport);
    await mockGeolocation(page, { kind: "PERMISSION_DENIED" });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await openLocationScreen(page);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /denied/i }).waitFor({ timeout: 10000 });
    ok(await fieldInput(page, /^City$/).inputValue() === "", "no city guessed after a denied permission");
    await fillManual(page, HYD_MANUAL);
    await save(page);
    ok((await savedLocationText(page)).includes("Hyderabad"), "manual entry still works after a denied permission");
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  section("Geolocation timeout");
  {
    const { ctx, page } = await newContext(browser, viewport);
    await mockGeolocation(page, { kind: "TIMEOUT" });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await openLocationScreen(page);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /timed out/i }).waitFor({ timeout: 10000 });
    ok(await fieldInput(page, /^City$/).inputValue() === "", "no city guessed after a timed-out request");
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  section("Coordinates granted, but the on-device place lookup itself fails");
  {
    const { ctx, page } = await newContext(browser, viewport);
    await ctx.route("**/geodata/places-v1.json", (route) => route.abort());
    await mockGeolocation(page, { kind: "GRANTED", ...HYDERABAD_COORDS });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await openLocationScreen(page);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /could not match|latitude|longitude/i }).waitFor({ timeout: 10000 });
    ok(await fieldInput(page, /^City$/).inputValue() === "", "city stays blank, never a wrong guess, when the lookup itself fails");
    ok(await fieldInput(page, /^Latitude$/).inputValue() === "17.385", "coordinates are still kept even though the place lookup failed");
    await fillManual(page, HYD_MANUAL);
    await save(page);
    ok((await savedLocationText(page)).includes("Hyderabad"), "manual entry still works after a failed lookup");
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  section("Offline use: device fix succeeds, on-device lookup degrades cleanly, manual entry still works");
  {
    const { ctx, page } = await newContext(browser, viewport);
    await mockGeolocation(page, { kind: "GRANTED", ...HYDERABAD_COORDS });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await ctx.setOffline(true);
    await openLocationScreen(page);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /could not match|latitude|longitude/i }).waitFor({ timeout: 10000 });
    ok(await fieldInput(page, /^City$/).inputValue() === "", "offline: no city guessed when the place list cannot be fetched");
    await fillManual(page, FRISCO_MANUAL);
    await save(page);
    ok((await savedLocationText(page)).includes("Frisco"), "offline: manual entry and save still work with no network at all");
    await ctx.setOffline(false);
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  section("Manual entry still works exactly as before — Hyderabad and Frisco");
  {
    const { ctx, page } = await newContext(browser, viewport);
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await openLocationScreen(page);
    await fillManual(page, HYD_MANUAL);
    await save(page);
    ok((await savedLocationText(page)).includes("Hyderabad, Telangana"), "manual Hyderabad entry saves correctly");

    // Save navigated back to Home - re-open the Location screen via the
    // always-present topbar button to reach the saved-location card and edit it.
    await page.locator("button.location-button").click();
    await page.locator("article.location-current").waitFor();
    await page.locator("button", { hasText: /Edit location/ }).click();
    await fillManual(page, FRISCO_MANUAL);
    await save(page);
    ok((await savedLocationText(page)).includes("Frisco, Texas"), "manual Frisco entry saves correctly");
    await ctx.close();
  }

  /* ---------------------------------------------------------------- */
  section("Refresh preserves the saved location (auto-filled, then saved)");
  {
    const { ctx, page } = await newContext(browser, viewport);
    await mockGeolocation(page, { kind: "GRANTED", ...HYDERABAD_COORDS });
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    await openLocationScreen(page);
    await clickUseMyLocation(page);
    await page.locator(".location-status", { hasText: /Hyderabad/ }).waitFor({ timeout: 10000 });
    await save(page);
    ok((await savedLocationText(page)).includes("Hyderabad"), "saved before refresh");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /welcome/i }).waitFor();
    ok((await savedLocationText(page)).includes("Hyderabad"), "the auto-filled-then-saved location survives a refresh");
    await ctx.close();
  }

  await browser.close();
}

async function runTelugu(viewport, label) {
  console.log(`\n=== ${label} Telugu (${viewport.width}x${viewport.height}) ===`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const { ctx, page, errors } = await newContext(browser, viewport);
  await mockGeolocation(page, { kind: "GRANTED", ...HYDERABAD_COORDS });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  await page.locator("button", { hasText: /^తెలుగు$/ }).first().click();
  await page.waitForTimeout(300);

  section("[TE] Use my location — auto-suggestion renders in Telugu");
  // The Home screen's own entry button (home-screen.tsx's t.setLocation),
  // not this component's own title text.
  await page.locator("button", { hasText: /మీ స్థానం సెట్ చేయండి/ }).first().click();
  await page.locator("form.location-form, article.location-current").first().waitFor();
  ok(!/Set your location|Use my location/.test(await page.locator(".flow-content").innerText()), "[TE] no English leak in the location screen chrome");
  await clickUseMyLocation(page);
  await page.locator(".location-status", { hasText: /Hyderabad/ }).waitFor({ timeout: 10000 });
  ok(await fieldInput(page, /నగరం/).inputValue() === "Hyderabad", "[TE] city auto-filled (place names themselves stay in their own script/Latin form)");
  const statusText = await page.locator(".location-status").innerText();
  ok(/సరిపోల్చాము|సూచించబడ్డాయి/.test(statusText) || /సరిపోల్చ/.test(statusText), "[TE] the matched-place status message is in Telugu");
  ok(await noHOverflow(page), "[TE] no horizontal overflow");
  ok(errors.length === 0, `[TE] no console/page errors (${errors.length})`);
  await ctx.close();
  await browser.close();
}

await run({ width: 375, height: 812 }, "phone");
await run({ width: 1440, height: 900 }, "desktop");
await runTelugu({ width: 375, height: 812 }, "phone");
await runTelugu({ width: 1440, height: 900 }, "desktop");

console.log(`\n${fails === 0 ? "LOCATION AUTO-SUGGEST E2E PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

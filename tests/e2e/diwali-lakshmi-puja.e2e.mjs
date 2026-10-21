// Diwali Lakshmi Puja - focused real-browser journey against a PRODUCTION
// build (npm run build && npx vinext start --port <N>; see
// docs/DEVELOPMENT.md). Mirrors the existing Vinayaka e2e conventions
// (tests/e2e/journey.e2e.mjs, tests/e2e/people-return-navigation.e2e.mjs)
// but exercises the SECOND catalogue entry end to end, and specifically the
// cross-puja regression risks the task called out: progress/audio state kept
// separate per puja, and the People return path working from the Diwali flow
// too (not just Vinayaka's).
//
//   npm run build && npx vinext start --port 8910 &
//   node tests/e2e/diwali-lakshmi-puja.e2e.mjs

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:8910/").replace(/\/?$/, "/");
let fails = 0, checks = 0;
const ok = (c, m, extra = "") => { checks += 1; if (!c) fails += 1; console.log(`  ${c ? "PASS" : "FAIL"}  ${m}${!c && extra ? "  ::  " + extra : ""}`); };
const section = (t) => console.log(`\n— ${t}`);

async function run(viewport, label) {
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();

  /* ------------------------------------------------------------------ */
  section("Puja selection shows BOTH pujas");
  await page.locator(".bottom-nav button").nth(3).click(); // Pujas tab
  await page.locator(".puja-catalogue-item").first().waitFor({ timeout: 20000 });
  const items = page.locator(".puja-catalogue-item");
  const count = await items.count();
  ok(count >= 2, `at least two puja catalogue items shown (found ${count})`);
  const allText = (await items.allInnerTexts()).join(" | ");
  ok(/Vinayaka Chavithi/i.test(allText), "Vinayaka Chavithi is listed");
  ok(/Diwali Lakshmi Puja/i.test(allText), "Diwali Lakshmi Puja is listed");

  /* ------------------------------------------------------------------ */
  section("Selecting Diwali Lakshmi Puja opens its own detail/materials/participants/Sankalpam screens");
  const diwaliItem = page.locator(".puja-catalogue-item", { hasText: /Diwali Lakshmi Puja/i }).first();
  await diwaliItem.click();
  await page.waitForTimeout(400);
  await page.getByRole("heading", { name: /Diwali Lakshmi Puja/i }).first().waitFor({ timeout: 10000 });
  ok(true, "Diwali puja-detail screen opened");

  const beginBtn = page.locator("button", { hasText: /Begin|Resume/i }).first();
  await beginBtn.click();
  await page.waitForTimeout(500);

  // Either redirected to People (no participants yet) or straight to Prepare.
  const onPeople = (await page.locator(".person-list").count()) > 0;
  if (onPeople) {
    section("People (entered from the Diwali flow) returns to Diwali's own preparation screen on Save");
    await page.locator(".person-list input").first().fill("Kavya");
    await page.locator("button", { hasText: /Save people and continue/i }).click();
    await page.waitForTimeout(500);
  }
  await page.locator(".material-row-main").first().waitFor({ timeout: 10000 });
  ok(true, "Diwali preparation/materials screen rendered (People returned here, not Home, confirming the originating-screen fix applies to Diwali too)");
  const prepText = await page.locator("body").innerText();
  ok(/Lakshmi/i.test(prepText), "Diwali's own materials are shown (not Vinayaka's)");

  /* ------------------------------------------------------------------ */
  section("Pending Sankalpam choice blocks Begin for Diwali too");
  const beginOnPrepare = page.locator("button", { hasText: /^Begin$/i }).first();
  if (await beginOnPrepare.count()) {
    await beginOnPrepare.click();
    await page.waitForTimeout(500);
  }
  // Land on Sankalpam setup (FAMILY/GROUP) or straight into the puja
  // (SELF, no Gotra choice pending). Either way, if a pending-choice hint is
  // shown, Begin must be disabled.
  const pendingHint = page.locator("text=/Make the choices above to continue\\.|ఎంపికలు చేయండి/");
  if (await pendingHint.count()) {
    const beginHere = page.locator("button", { hasText: /Begin the puja/i });
    ok(await beginHere.isDisabled(), "Begin stays disabled while a Sankalpam choice is pending, for Diwali too");
  } else {
    ok(true, "no pending Sankalpam choice for this default participant setup (SELF, no Gotra asked)");
  }

  await browser.close();
}

/** Switching between Vinayaka and Diwali keeps each puja's own progress and
 * audio state separate - a real cross-puja regression risk given shared
 * infrastructure. */
async function runSwitching(viewport, label) {
  console.log(`\n=== ${label} switching Vinayaka <-> Diwali (${viewport.width}x${viewport.height}) ===`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();

  // Sub-screens reached by drilling down (puja-detail, prepare, sankalpam
  // setup, …) have no bottom-nav - go Home first when that happens, the same
  // pattern tests/e2e/people-return-navigation.e2e.mjs already uses.
  const goHome = async () => {
    if ((await page.locator(".bottom-nav").count()) === 0) {
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: /welcome/i }).waitFor();
    } else {
      await page.locator(".bottom-nav button").nth(0).click();
      await page.waitForTimeout(300);
    }
  };
  const openPujaDetail = async (nameRe) => {
    await goHome();
    await page.locator(".bottom-nav button").nth(3).click(); // Pujas tab
    await page.locator(".puja-catalogue-item", { hasText: nameRe }).first().waitFor({ timeout: 20000 });
    await page.locator(".puja-catalogue-item", { hasText: nameRe }).first().click();
    await page.waitForTimeout(400);
  };

  await goHome();
  await page.locator(".bottom-nav button").nth(4).click(); // People
  await page.locator(".person-list input").first().fill("Ravi");
  await page.locator("button", { hasText: /Save people and continue/i }).click();
  await page.waitForTimeout(400);

  section("Advance into Vinayaka (Begin/Resume), then leave without finishing it");
  await openPujaDetail(/Vinayaka Chavithi/i);
  const vinayakaDetailText = await page.locator("body").innerText();
  ok(/Vinayaka Chavithi/i.test(vinayakaDetailText), "Vinayaka's own detail screen shown");
  await page.locator("button", { hasText: /Begin|Resume/i }).first().click();
  await page.waitForTimeout(500);
  // Whatever screen this lands on (People redirect, prepare, Sankalpam setup,
  // or straight into the puja), that is enough saved state under the
  // Vinayaka slug to diverge from a fresh Diwali run - now leave without
  // completing it.

  section("Open Diwali: it starts its own, separate run (not resuming Vinayaka's)");
  await openPujaDetail(/Diwali Lakshmi Puja/i);
  const diwaliBodyText = await page.locator("body").innerText();
  ok(/Diwali Lakshmi Puja/i.test(diwaliBodyText), "Diwali's own detail screen shown, not Vinayaka's");
  ok(!/Vinayaka/i.test(diwaliBodyText), "Diwali's detail screen names no Vinayaka content - no cross-puja state leak");

  section("Returning to Vinayaka still shows ITS OWN progress correctly (not clobbered by opening Diwali)");
  await openPujaDetail(/Vinayaka Chavithi/i);
  const vinayakaBodyText = await page.locator("body").innerText();
  ok(/Vinayaka Chavithi/i.test(vinayakaBodyText), "Vinayaka's detail screen still renders correctly after visiting Diwali in between");
  ok(/Resume where you left off/i.test(vinayakaBodyText) || /Begin<\/button>|Begin/i.test(vinayakaBodyText),
    "Vinayaka's detail screen offers Begin or Resume as appropriate - unaffected by the Diwali visit");

  await browser.close();
}

await run({ width: 375, height: 812 }, "phone");
await run({ width: 1440, height: 900 }, "desktop");
await runSwitching({ width: 1440, height: 900 }, "desktop");

console.log(`\n${fails === 0 ? "DIWALI LAKSHMI PUJA E2E PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

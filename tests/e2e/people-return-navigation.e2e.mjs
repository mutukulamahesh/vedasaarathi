// People return-navigation: Save must go to whichever screen actually sent
// the user to People (Home for a direct/primary visit, a puja's own
// preparation screen for a puja-flow redirect) - never a hardcoded
// destination. Also verifies Cancel/Back (browser history) returns to the
// screen that opened People, and that this survives a Back/Forward round
// trip and a refresh without silently changing.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:8910/").replace(/\/?$/, "/");
let fails = 0, checks = 0;
const ok = (c, m, extra = "") => { checks += 1; if (!c) fails += 1; console.log(`  ${c ? "PASS" : "FAIL"}  ${m}${!c && extra ? "  ::  " + extra : ""}`); };
const section = (t) => console.log(`\n— ${t}`);

// Sub-screens reached by drilling down (puja-detail, prepare, people itself,
// …) have no bottom-nav - go via Home first when that happens, so this can
// be called from anywhere in the flow.
const nav = async (p, i) => {
  if ((await p.locator(".bottom-nav").count()) === 0) {
    await p.goto(BASE, { waitUntil: "domcontentloaded" });
    await p.getByRole("heading", { name: /welcome/i }).waitFor();
  }
  await p.locator(".bottom-nav button").nth(i).click({ force: true });
  await p.waitForTimeout(400);
};
const screenName = (p) => p.evaluate(() => {
  const d = document;
  if (d.querySelector(".today-card")) return "home";
  if (d.querySelector(".person-list")) return "people";
  if (d.querySelector(".material-row-main")) return "prepare";
  if (d.querySelector(".puja-catalogue-item, .offline-download")) return "pujas";
  const h1 = d.querySelector("h1")?.textContent || "";
  const hasBeginOrResume = [...d.querySelectorAll("button")].some((b) => /Begin|Resume/i.test(b.textContent || ""));
  if (/Vinayaka Chavithi/i.test(h1) && hasBeginOrResume) return "puja-detail";
  return "unknown";
});
const fillName = (p, name) => p.locator('label:has-text("Name") input').first().fill(name);
const save = async (p) => { await p.locator("button", { hasText: /Save people and continue/i }).click(); await p.waitForTimeout(500); };
const clearAndSave = async (p) => {
  // Emptying the name makes participants invalid again for the NEXT test
  // section's redirect, without needing to reload/reset app state. Goes to
  // People first if not already there - the caller may currently be on
  // whatever screen the previous section's Save landed on, not People
  // itself.
  if ((await screenName(p)) !== "people") await nav(p, 4);
  await fillName(p, "");
  await p.locator("button", { hasText: /Save people and continue/i }).click().catch(() => {});
  await p.waitForTimeout(300);
};
const openPujaDetail = async (p) => {
  await nav(p, 3); // Pujas tab
  const detailLink = p.locator(".puja-catalogue-item", { hasText: /View details/i }).first();
  await detailLink.waitFor({ timeout: 20000 });
  await detailLink.click();
  await p.waitForTimeout(400);
};

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

  /* ---------------------------------------------------------------- */
  section("Home / primary-nav People -> Save -> Home");
  await nav(page, 4); // People tab
  ok((await screenName(page)) === "people", "bottom-nav People opens the People screen");
  await fillName(page, "Priya");
  await save(page);
  ok((await screenName(page)) === "home", "saving from a primary-nav visit returns to Home, not into any puja");

  /* ---------------------------------------------------------------- */
  section("Vinayaka Puja -> People (invalid participants) -> Save -> Vinayaka preparation");
  await nav(page, 4);
  await clearAndSave(page);
  await openPujaDetail(page);
  await page.locator("button", { hasText: /Begin|Resume/i }).click();
  await page.waitForTimeout(500);
  ok((await screenName(page)) === "people", "an invalid 'Begin' from the puja detail redirects to People", await screenName(page));
  ok((await page.locator(".info-note").count()) > 0, "the redirect shows the 'add people before preparation' hint");
  await fillName(page, "Ananya");
  await save(page);
  ok((await screenName(page)) === "prepare", "saving from the Vinayaka redirect returns to Vinayaka's OWN preparation screen, not Home", await screenName(page));

  /* ---------------------------------------------------------------- */
  section("Cancel/Back (browser history) returns to the screen that opened People, distinct from where Save goes");
  await clearAndSave(page);
  await openPujaDetail(page);
  ok((await screenName(page)) === "puja-detail", "on the puja detail screen before Begin");
  await page.locator("button", { hasText: /Begin|Resume/i }).click();
  await page.waitForTimeout(500);
  ok((await screenName(page)) === "people", "Begin (invalid) redirected to People again");
  await page.goBack();
  await page.waitForTimeout(400);
  ok((await screenName(page)) === "puja-detail", "Back from this People visit returns to puja-detail (where Begin was clicked) - not Vinayaka's preparation, which is only where SAVE goes", await screenName(page));

  // Primary-nav case: Home -> People -> Back -> Home.
  await nav(page, 0); // Home
  await nav(page, 4); // People
  await page.goBack();
  await page.waitForTimeout(400);
  ok((await screenName(page)) === "home", "Back from a primary-nav People visit returns to Home");

  /* ---------------------------------------------------------------- */
  section("Back/Forward round trip does not silently change the Save destination");
  await nav(page, 4);
  await clearAndSave(page);
  await openPujaDetail(page);
  await page.locator("button", { hasText: /Begin|Resume/i }).click();
  await page.waitForTimeout(500);
  ok((await screenName(page)) === "people", "redirected to People again (puja-flow)");
  // Back twice (People -> puja-detail -> pujas), then Forward twice, landing
  // back on the SAME People history entry.
  await page.goBack();
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForTimeout(300);
  await page.goForward();
  await page.waitForTimeout(300);
  await page.goForward();
  await page.waitForTimeout(400);
  ok((await screenName(page)) === "people", "Forward returns to the same People entry after a round trip", await screenName(page));
  await fillName(page, "Kavya");
  await save(page);
  ok((await screenName(page)) === "prepare", "after a Back/Forward round trip, Save still returns to Vinayaka's preparation, not Home", await screenName(page));

  /* ---------------------------------------------------------------- */
  section("Refresh mid-People does not leave a stale return destination");
  await clearAndSave(page);
  await nav(page, 4); // primary-nav People (return-to-Home context)
  ok((await screenName(page)) === "people", "on People via the primary nav before refreshing");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor({ timeout: 20000 }).catch(() => {});
  ok((await screenName(page)) === "home", "a refresh mid-People lands on Home (the app's existing refresh behavior), not a stale People view");
  // Confirm no leftover mismatch: entering People again fresh and saving
  // still goes to Home, not some earlier puja-flow destination.
  await nav(page, 4);
  await fillName(page, "Meera");
  await save(page);
  ok((await screenName(page)) === "home", "after the refresh, a fresh primary-nav People visit still saves to Home");

  ok(errors.length === 0, `no console/page errors (${errors.length}${errors.length ? ": " + errors[0].slice(0, 150) : ""})`);
  await browser.close();
}

await run({ width: 375, height: 812 }, "phone");
await run({ width: 1440, height: 900 }, "desktop");

console.log(`\n${fails === 0 ? "PEOPLE RETURN-NAVIGATION E2E PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

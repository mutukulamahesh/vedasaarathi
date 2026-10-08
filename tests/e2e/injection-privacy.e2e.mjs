// Free-text injection and data-locality checks for the People screen
// (participant names and custom lineage values), through a real
// type -> save -> reload -> read-back cycle in the production build.
//
//   BASE_URL=http://localhost:8910/ node tests/e2e/injection-privacy.e2e.mjs
//
// Point BASE_URL at a server that runs worker/index.ts (e.g. `vite preview`
// after `npm run build`) to also exercise the real Content-Security-Policy.
//
// What it proves, at phone and desktop widths:
//   1. Script-shaped text typed into a participant name, a KNOWN Gotra, and a
//      "My value is not listed" Veda value is stored, reloaded and shown back
//      as the exact characters typed - inert text, never markup: no script
//      runs, no element is injected, no dialog opens.
//   2. The saved Gotra is shown back as plain literal text on the guided
//      puja's Sankalpam step, not just in the input it was typed into, and
//      every screen walked on the way stays clean.
//   3. Nothing typed here ever leaves the device: no request is made to any
//      other origin, no request other than GET is made, and no request URL or
//      body carries any of the typed values - across typing, saving, reloading
//      and opening the puja.
//
// Run it against a local build, not production: on vedasaarathi.com the
// hosting layer (not this app) injects its own bot-detection script, which
// POSTs browser signals to /cdn-cgi/challenge-platform/... (same origin).
// That would trip the "GET only" check. Saved names/Gotra were not found in
// it in plain or base64 form on 2026-10-07, but its payload is obfuscated, so
// that is evidence, not proof. See
// docs/temp/security-privacy-licensing-review-2026-10-07.md.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:8910/").replace(/\/?$/, "/");
const ORIGIN = new URL(BASE).origin;
let fails = 0, checks = 0;
const ok = (c, m, extra = "") => { checks += 1; if (!c) fails += 1; console.log(`  ${c ? "PASS" : "FAIL"}  ${m}${!c && extra ? "  ::  " + extra : ""}`); };
const section = (t) => console.log(`\n— ${t}`);

const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};

// Every payload, if it were ever parsed as HTML or run as script, sets
// window.__vsXss - so "never executed" is checked directly, not inferred.
// Names stay within the 80-character name limit.
const NAME_1 = `<script>window.__vsXss=1</script>Ravi`;
const NAME_2 = `"><img src=x onerror="window.__vsXss=2">`;
const GOTRA = `</label><svg onload="window.__vsXss=3"><b>G</b>`;
const VEDA = `'><iframe srcdoc="<script>parent.__vsXss=4</script>">`;
const PAYLOADS = [NAME_1, NAME_2, GOTRA, VEDA];
// Distinctive fragments to look for in any outgoing request.
const MARKERS = ["__vsXss", "onerror", "srcdoc", "svg onload", "Ravi"];

const injected = (page) => page.evaluate(() => ({
  flag: typeof window.__vsXss === "undefined" ? null : window.__vsXss,
  img: document.querySelectorAll('img[src="x"]').length,
  svg: document.querySelectorAll("svg[onload]").length,
  iframe: document.querySelectorAll("iframe").length,
  scriptWithPayload: [...document.scripts].filter((s) => s.textContent.includes("__vsXss")).length,
}));
const clean = (r) => r.flag === null && r.img === 0 && r.svg === 0 && r.iframe === 0 && r.scriptWithPayload === 0;

const goPeople = async (page) => {
  for (let i = 0; i < 8 && (await page.locator(".person-list").count()) === 0; i += 1) {
    await page.locator(".bottom-nav button").nth(4).click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator(".person-list").waitFor();
};
const card = (page, n) => page.locator(".person-list .form-card").nth(n);
const knownSelect = (scope, label) =>
  scope.locator(".lineage-group", { has: scope.page().locator("label", { hasText: `Do you know the ${label}?` }) })
    .locator("select").first();

async function run(viewport, label, browser) {
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  const dialogs = [];
  const requests = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("request", (r) => requests.push({ url: r.url(), method: r.method(), body: r.postData() ?? "" }));
  const page = await ctx.newPage();
  page.on("dialog", async (d) => { dialogs.push(d.message()); await d.dismiss(); });
  page.setDefaultTimeout(20000);

  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  // Location is not under test here; seed it so the puja can open.
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [LOC_KEY, JSON.stringify(HYD)]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();

  section("type the payloads into the real People form and save");
  await goPeople(page);
  await page.locator(".mode-option", { hasText: /My family/ }).click();
  await card(page, 0).locator("label", { hasText: /^Name/ }).locator("input").fill(NAME_1);
  await knownSelect(card(page, 0), "Gotra").selectOption("KNOWN");
  await card(page, 0).locator("label", { hasText: "Gotra name" }).locator("input").fill(GOTRA);
  await card(page, 0).locator("summary", { hasText: /Optional family tradition details/ }).click();
  await knownSelect(card(page, 0), "Veda").selectOption("KNOWN");
  await card(page, 0).locator("label", { hasText: /^Veda/ }).locator("select").selectOption("__lineage_not_listed__");
  await card(page, 0).locator("label", { hasText: "Veda (your own value)" }).locator("input").fill(VEDA);
  await page.locator(".add-button").click();
  await card(page, 1).locator("label", { hasText: /^Name/ }).locator("input").fill(NAME_2);
  ok(clean(await injected(page)), "while typing: nothing executed or injected", JSON.stringify(await injected(page)));
  await page.locator("button", { hasText: /Save people and continue/i }).click();
  await page.waitForTimeout(600);

  const stored = await page.evaluate((k) => localStorage.getItem(k), PREP_KEY);
  ok(stored !== null && PAYLOADS.every((p) => JSON.parse(stored).participants.some((x) =>
    x.name === p || x.gotra?.name === p || x.veda?.name === p)), "every value is stored exactly as typed (data, not markup)");

  section("reload and read the saved values back");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  await page.waitForTimeout(500);
  ok(clean(await injected(page)), "Home after reload: nothing executed or injected", JSON.stringify(await injected(page)));

  await goPeople(page);
  ok(await card(page, 0).locator("label", { hasText: /^Name/ }).locator("input").inputValue() === NAME_1, "name 1 reads back exactly");
  ok(await card(page, 1).locator("label", { hasText: /^Name/ }).locator("input").inputValue() === NAME_2, "name 2 reads back exactly");
  ok(await card(page, 0).locator("label", { hasText: "Gotra name" }).locator("input").inputValue() === GOTRA, "custom Gotra reads back exactly");
  await card(page, 0).locator("summary", { hasText: /Optional family tradition details/ }).click();
  ok(await card(page, 0).locator("label", { hasText: "Veda (your own value)" }).locator("input").inputValue() === VEDA, "custom Veda value reads back exactly");
  ok(clean(await injected(page)), "People after reload: nothing executed or injected", JSON.stringify(await injected(page)));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "long markup-like values do not break the layout (no horizontal overflow)");

  section("the saved values as later displayed in the guided puja");
  await page.locator("button", { hasText: /Save people and continue/i }).click();
  await page.waitForTimeout(500);
  for (let i = 0; i < 8 && (await page.locator(".puja-catalogue-list").count()) === 0; i += 1) {
    await page.locator(".bottom-nav button", { hasText: /pujas/i }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator(".puja-catalogue-item").first().click();
  await page.getByRole("button", { name: /begin|start|resume/i }).first().click();
  for (let i = 0; i < 8; i += 1) {
    if (await page.locator(".puja-card h1").count()) break;
    const cont = page.getByRole("button", { name: /save people and continue|start .* puja|continue|begin/i });
    if (await cont.count()) await cont.first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
  // Walk the opening steps up to and past the Sankalpam step, which shows a
  // KNOWN Gotra back to the family; every screen on the way must stay clean.
  let gotraShownLiterally = false;
  let allClean = true;
  for (let i = 0; i < 8; i += 1) {
    const text = await page.locator("body").innerText();
    if (text.includes(GOTRA)) gotraShownLiterally = true;
    if (!clean(await injected(page))) { allClean = false; break; }
    const next = page.locator(".step-actions .primary-action");
    if (!(await next.count())) break;
    await next.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  ok(gotraShownLiterally, "the Sankalpam step shows the custom Gotra as the exact literal characters typed");
  ok(allClean && clean(await injected(page)), "guided puja: nothing executed or injected on any step walked", JSON.stringify(await injected(page)));

  section("nothing typed here leaves the device");
  const external = requests.filter((r) => /^https?:/.test(r.url) && new URL(r.url).origin !== ORIGIN);
  ok(external.length === 0, `no request to any other origin (${external.length})`, JSON.stringify(external.slice(0, 3)));
  const nonGet = requests.filter((r) => r.method !== "GET");
  ok(nonGet.length === 0, `no request other than GET (${nonGet.length})`, JSON.stringify(nonGet.slice(0, 3).map((r) => `${r.method} ${r.url}`)));
  const leaking = requests.filter((r) => {
    const hay = `${decodeURIComponent(r.url)} ${r.body}`;
    return MARKERS.some((m) => hay.includes(m)) || PAYLOADS.some((p) => hay.includes(p));
  });
  ok(leaking.length === 0, `no request URL or body carries a typed value (${leaking.length})`, JSON.stringify(leaking.slice(0, 3)));
  ok(dialogs.length === 0, `no dialog was opened by the payloads (${dialogs.length})`, dialogs.join(" | "));
  ok(errors.length === 0, `no console/page errors (${errors.length})`, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
await run({ width: 375, height: 812 }, "phone", browser);
await run({ width: 1440, height: 900 }, "desktop", browser);
await browser.close();
console.log(`\n${fails === 0 ? "ALL INJECTION/PRIVACY E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

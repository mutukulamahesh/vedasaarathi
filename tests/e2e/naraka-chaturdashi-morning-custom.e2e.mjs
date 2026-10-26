// Production-browser checks for the Naraka Chaturdashi morning-custom note
// (festival-rules.ts `regionalCustomNote` — Abhyanga Snanam / Mangala
// Harathi). Run against a production server:
//
//   npm run build && npx vinext start --port 8931
//   NCMC_BASE_URL=http://localhost:8931/ node tests/e2e/naraka-chaturdashi-morning-custom.e2e.mjs
//
// or let this file spawn its own `vinext start` from an existing `dist/`
// (fails loudly, never skips, if no production build exists yet).
//
// Covers, at 375x812 (phone) and 1440x900 (desktop), for BOTH Hyderabad and
// Frisco and BOTH English and Telugu:
//   - Calendar: the note is collapsed by default (compact list), its summary
//     carries the exact bilingual label, expanding it shows the exact note
//     body + source line, collapsing it again actually closes it (the
//     expand/collapse interaction, not just a static snapshot);
//   - the note never refers to Diwali/Lakshmi Puja by relative screen
//     position ("above"/"below") and carries no separate English-only
//     region tag (2026-10-27 owner corrections #1 and #2);
//   - the Diwali/Lakshmi Puja card never carries the note;
//   - the dates shown match the independently re-verified Drik Panchang
//     findings: Hyderabad Naraka Chaturdashi = Diwali/Lakshmi Puja =
//     2026-11-08 (coincide); Frisco Naraka Chaturdashi = 2026-11-07, Frisco
//     Diwali/Lakshmi Puja = 2026-11-08 (diverge);
//   - Search's own deep link ("Naraka"/"నరక" ) opens Calendar on the exact
//     occurrence date and that date's card carries the note;
//   - the public /festivals and /te/festivals entry pages (the same
//     Calendar component, reached by their real public URL) show the same
//     note for both locations;
//   - no horizontal overflow, and — using the existing, narrowly-scoped
//     non-production Cloudflare Analytics mock this project already uses in
//     tests/e2e/about.e2e.mjs — no console/page errors.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

// Set NCMC_SCREENSHOTS=1 to also save a full-page screenshot (note expanded)
// for each location/language/viewport combination to .review-shots/ (this
// project's existing, never-committed local-artifact convention - see
// about.e2e.mjs). Off by default so an ordinary CI run stays fast and does
// not touch disk beyond the usual test output.
const SCREENSHOTS = process.env.NCMC_SCREENSHOTS === "1";
if (SCREENSHOTS) mkdirSync(".review-shots", { recursive: true });

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const EXTERNAL = process.env.NCMC_BASE_URL || "";
const PORT = Number(process.env.NCMC_PORT || 8931);
const BASE = (EXTERNAL || `http://localhost:${PORT}/`).replace(/\/?$/, "/");

const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";
const MODE_KEY = "vedasaarathi:presentation-mode:v1";
const CAL_CACHE_KEY = "vedasaarathi:calendar-months:v1";

const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const FRISCO = {
  status: "READY", latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago",
  city: "Frisco", region: "Texas", country: "USA", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const PERSON = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const prep = (language) => JSON.stringify({ mode: "SELF", participants: [PERSON], language, runs: {} });

const EXPECT = {
  Hyderabad: { nkDate: "2026-11-08", dlpDate: "2026-11-08" },
  Frisco: { nkDate: "2026-11-07", dlpDate: "2026-11-08" },
};
const LABEL_EN = "Morning oil bath and family Mangala Harathi";
const LABEL_TE = "అభ్యంగన స్నానం · కుటుంబ మంగళహారతులు";

let fails = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
};
const section = (t) => console.log(`\n— ${t}`);

async function waitForServer(url, ms = 90000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: "GET" });
      if (r.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const noHOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/** Seed location + interface language via localStorage (the same keys and
 * shape this project's other e2e tests already use) and load `path`
 * ("/", "festivals", "te/festivals", …). An entry page's own language
 * (EN for /festivals, TE for /te/festivals) overrides whatever language was
 * seeded here, exactly as the real app does (app/page.tsx `entryLanguage`). */
async function seed(page, { loc, language = "EN", path = "" } = {}) {
  await page.goto(BASE + path.replace(/^\//, ""), { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([lk, pk, mk, ck, lv, pv]) => {
      localStorage.setItem(lk, lv);
      localStorage.setItem(pk, pv);
      localStorage.setItem(mk, "FAMILY_BETA");
      localStorage.removeItem(ck); // always start with an empty calendar cache
    },
    [LOC_KEY, PREP_KEY, MODE_KEY, CAL_CACHE_KEY, JSON.stringify(loc), prep(language)],
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
}

const nav = async (page, i) => { await page.locator(".bottom-nav button").nth(i).click({ force: true }); await page.waitForTimeout(400); };
const gotoCalendar = async (page) => { await nav(page, 1); await page.locator(".calendar-grid").waitFor({ timeout: 30000 }); };
const gotoSearch = async (page) => { await nav(page, 2); await page.locator(".search-field input").waitFor(); };

const monthLabel = (page) => page.locator(".calendar-nav strong").innerText();
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_TE = ["జనవరి", "ఫిబ్రవరి", "మార్చి", "ఏప్రిల్", "మే", "జూన్", "జూలై", "ఆగస్టు", "సెప్టెంబర్", "అక్టోబర్", "నవంబర్", "డిసెంబర్"];

async function gotoMonth(page, targetLabel) {
  for (let i = 0; i < 60; i += 1) {
    const lbl = await monthLabel(page);
    if (lbl === targetLabel) {
      await page.locator(".calendar-grid").waitFor({ timeout: 40000 });
      return true;
    }
    const [, mName, yStr] = lbl.match(/(\S+)\s+(\d{4})/) || [];
    const [, tName, tyStr] = targetLabel.match(/(\S+)\s+(\d{4})/) || [];
    const idx = (n) => (MONTHS_EN.includes(n) ? MONTHS_EN.indexOf(n) : MONTHS_TE.indexOf(n));
    const cur = Number(yStr) * 12 + idx(mName);
    const tgt = Number(tyStr) * 12 + idx(tName);
    const behind = cur < tgt;
    await page.locator(".calendar-nav button").nth(behind ? 1 : 0).click();
    await page.waitForTimeout(150);
  }
  return (await monthLabel(page)) === targetLabel;
}

async function search(page, q) {
  const input = page.locator(".search-field input");
  await input.fill("");
  await input.fill(q);
  await page.waitForTimeout(250);
}
async function openFirstResult(page) {
  await page.locator(".search-results li button").first().click();
  await page.locator(".calendar-selected h2").waitFor({ timeout: 40000 });
}
const selectedISO = (page) => page.locator(".calendar-selected h2").innerText();

/** The `.calendar-festival-card` for a given rule id, inside the currently
 * displayed month — NOT by visible text (the Telugu name differs), and never
 * ambiguous between Naraka Chaturdashi and Diwali/Lakshmi Puja. */
const ruleCard = (page, ruleId) => page.locator(`.calendar-festival-card[data-rule-id="${ruleId}"]`);

async function cardDateISO(page, ruleId) {
  const card = ruleCard(page, ruleId);
  if (!(await card.count())) return null;
  const txt = await card.locator(".calendar-festival-open span").innerText();
  return (txt.match(/\d{4}-\d{2}-\d{2}/) || [])[0] ?? null;
}

/** All the per-card assertions for Naraka Chaturdashi's morning-custom note,
 * once the month containing it is already open and in view. */
async function checkNarakaCard(page, { locName, lang, viewport, shotTag = null }) {
  const nk = ruleCard(page, "naraka-chaturdashi");
  await nk.waitFor({ state: "visible" });
  const note = nk.locator(".calendar-regional-custom");
  ok((await note.count()) === 1, `${locName} ${lang} ${viewport}: Naraka Chaturdashi card carries exactly one regional-custom note`);

  // Collapsed by default - the monthly list stays compact.
  ok((await note.getAttribute("open")) === null, `${locName} ${lang} ${viewport}: the note starts COLLAPSED (compact list)`);

  const expectLabel = lang === "TE" ? LABEL_TE : LABEL_EN;
  ok((await note.locator("summary").innerText()) === expectLabel, `${locName} ${lang} ${viewport}: summary label is exact ("${expectLabel}")`);

  // Expand.
  await note.locator("summary").click();
  await page.waitForTimeout(150);
  ok((await note.getAttribute("open")) !== null, `${locName} ${lang} ${viewport}: clicking the summary OPENS the note`);
  const bodyText = await note.innerText();
  if (lang === "TE") {
    ok(bodyText.includes("మంగళహారతి"), `${locName} TE ${viewport}: expanded body mentions మంగళహారతి`);
    ok(bodyText.includes("దీపావళి") || bodyText.includes("లక్ష్మీ పూజ"), `${locName} TE ${viewport}: expanded body names Diwali/Lakshmi Puja`);
  } else {
    ok(bodyText.includes("Mangala Harathi"), `${locName} EN ${viewport}: expanded body mentions Mangala Harathi`);
    ok(/Diwali|Lakshmi Puja/.test(bodyText), `${locName} EN ${viewport}: expanded body names Diwali/Lakshmi Puja`);
  }
  // Owner correction #1 (2026-10-27): never a relative-position reference.
  ok(!/\babove\b|\bbelow\b/i.test(bodyText), `${locName} ${lang} ${viewport}: note never says "above"/"below" (no layout-position assumption)`);
  // Owner correction #2 (2026-10-27): no separate English-only region tag.
  ok((await note.locator(".calendar-regional-custom-tag").count()) === 0, `${locName} ${lang} ${viewport}: no separate regionTag element rendered`);
  ok(bodyText.includes("sanatan.org/telugu/475.html"), `${locName} ${lang} ${viewport}: source URL shown`);
  ok(bodyText.includes("2026-10-26"), `${locName} ${lang} ${viewport}: accessed date shown`);

  // Review artifact only (NCMC_SCREENSHOTS=1) - captured with the note OPEN
  // so the reviewer can see its actual content, not just the collapsed row.
  if (SCREENSHOTS && shotTag) {
    await page.screenshot({ path: `.review-shots/ncmc-${shotTag}.png`, fullPage: true }).catch(() => {});
  }

  // Collapse again - the expand/collapse interaction actually works both ways.
  await note.locator("summary").click();
  await page.waitForTimeout(150);
  ok((await note.getAttribute("open")) === null, `${locName} ${lang} ${viewport}: clicking the summary again CLOSES the note`);

  // Diwali/Lakshmi Puja never carries the note.
  const dlp = ruleCard(page, "diwali-lakshmi-puja");
  await dlp.waitFor({ state: "visible" });
  ok((await dlp.locator(".calendar-regional-custom").count()) === 0, `${locName} ${lang} ${viewport}: Diwali/Lakshmi Puja card has NO morning-custom note`);

  // Dates match the independently re-verified Drik Panchang findings.
  const nkDate = await cardDateISO(page, "naraka-chaturdashi");
  const dlpDate = await cardDateISO(page, "diwali-lakshmi-puja");
  const expect = EXPECT[locName.replace(/-entrypage$/, "")];
  ok(nkDate === expect.nkDate, `${locName} ${lang} ${viewport}: Naraka Chaturdashi date is ${expect.nkDate} (saw ${nkDate})`);
  ok(dlpDate === expect.dlpDate, `${locName} ${lang} ${viewport}: Diwali/Lakshmi Puja date is ${expect.dlpDate} (saw ${dlpDate})`);

  ok(await noHOverflow(page), `${locName} ${lang} ${viewport}: no horizontal overflow`);
}

async function run(viewport, label, browser) {
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  const ctx = await browser.newContext({ viewport });
  const errors = [];

  // The same narrowly-scoped, non-production-only Cloudflare Web Analytics
  // mock as tests/e2e/about.e2e.mjs - intercepts ONLY the exact RUM beacon
  // URL, and ONLY when BASE is not the real production origin. NEVER applied
  // against vedasaarathi.com itself. See about.e2e.mjs's own comment for the
  // full reasoning (request-level intercept, not console-message filtering).
  const ANALYTICS_RUM_URL = "https://cloudflareinsights.com/cdn-cgi/rum";
  const isProductionOrigin = new URL(BASE).hostname === "vedasaarathi.com";
  if (!isProductionOrigin) {
    await ctx.route(ANALYTICS_RUM_URL, (route) => route.fulfill({ status: 204, body: "" }));
  }

  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  // pageerror is never filtered or discounted for any reason.
  ctx.on("pageerror", (e) => errors.push(String(e)));
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);

  const v = `${viewport.width}x${viewport.height}`;

  /* ---- 1. Calendar screen: both locations, both languages ----------- */
  for (const [locName, loc] of [["Hyderabad", HYD], ["Frisco", FRISCO]]) {
    for (const lang of ["EN", "TE"]) {
      section(`Calendar — ${locName} — ${lang} — ${v}`);
      await seed(page, { loc, language: lang });
      await gotoCalendar(page);
      const target = lang === "TE" ? "నవంబర్ 2026" : "November 2026";
      ok(await gotoMonth(page, target), `${locName} ${lang} ${v}: reached ${target}`);
      await page.waitForTimeout(500);
      await checkNarakaCard(page, {
        locName, lang, viewport: v,
        shotTag: `calendar-${locName.toLowerCase()}-${lang.toLowerCase()}-${v}`,
      });
    }
  }

  /* ---- 2. Search's own deep link into the festival ------------------ */
  for (const [locName, loc, lang, query] of [
    ["Hyderabad", HYD, "EN", "Naraka"],
    ["Frisco", FRISCO, "TE", "నరక"],
  ]) {
    section(`Search deep link — ${locName} — ${lang} — ${v}`);
    await seed(page, { loc, language: lang });
    await gotoSearch(page);
    await search(page, query);
    ok((await page.locator(".search-results li").count()) >= 1, `${locName} ${lang} ${v}: "${query}" returns a result`);
    await openFirstResult(page);
    const sel = await selectedISO(page);
    const expect = EXPECT[locName];
    ok(sel === expect.nkDate, `${locName} ${lang} ${v}: search opened Calendar on ${expect.nkDate} (saw ${sel})`);
    await page.waitForTimeout(300);
    await checkNarakaCard(page, { locName, lang, viewport: v });
  }

  /* ---- 3. Public /festivals and /te/festivals entry pages ----------- */
  for (const [locName, loc, path] of [
    ["Hyderabad-entrypage", HYD, "festivals"],
    ["Frisco-entrypage", FRISCO, "festivals"],
    ["Hyderabad-entrypage", HYD, "te/festivals"],
    ["Frisco-entrypage", FRISCO, "te/festivals"],
  ]) {
    const lang = path.startsWith("te/") ? "TE" : "EN";
    section(`Public /${path} — ${locName} — ${lang} — ${v}`);
    // Seeded language is irrelevant here - the entry path's own language wins.
    await seed(page, { loc, language: lang === "TE" ? "EN" : "TE", path });
    await page.locator(".calendar-grid").waitFor({ timeout: 30000 });
    const target = lang === "TE" ? "నవంబర్ 2026" : "November 2026";
    ok(await gotoMonth(page, target), `/${path} ${locName} ${v}: reached ${target}`);
    await page.waitForTimeout(500);
    await checkNarakaCard(page, {
      locName, lang, viewport: v,
      shotTag: `entrypage-${path.replace(/\//g, "-")}-${locName.toLowerCase()}-${v}`,
    });
  }

  section(`Health — ${v}`);
  ok(errors.length === 0, `no console/page errors (${v}) [${JSON.stringify(errors.slice(0, 5))}]`);
  await ctx.close();
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
    if (!existsSync(`${REPO}dist/client/sw.js`)) {
      console.error("FAIL  no production build — run `npm run build` first (dist/client/sw.js missing).");
      process.exit(1);
    }
    console.log(`— starting vinext start on :${PORT}`);
    server = spawn("npx", ["vinext", "start", "--port", String(PORT)], {
      cwd: REPO, env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
      stdio: ["ignore", "pipe", "pipe"], detached: true,
    });
    server.stdout.on("data", () => {});
    server.stderr.on("data", () => {});
  }

  const up = await waitForServer(BASE, 120000);
  if (!up) {
    console.error(`FAIL  server at ${BASE} did not become ready.`);
    killServer();
    process.exit(1);
  }

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  try {
    await run({ width: 375, height: 812 }, "phone", browser);
    await run({ width: 1440, height: 900 }, "desktop", browser);
  } finally {
    await browser.close();
    killServer();
  }

  console.log(`\n${fails === 0 ? "ALL NARAKA CHATURDASHI MORNING-CUSTOM E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

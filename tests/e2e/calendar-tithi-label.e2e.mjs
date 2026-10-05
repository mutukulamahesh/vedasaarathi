// Regression: Calendar month-grid tithi labels must never be clipped or spill
// out of their day cell on a phone.
//
//   node tests/e2e/calendar-tithi-label.e2e.mjs          # spawns its own vite dev server
//   CT_BASE_URL=http://localhost:5173/ node tests/e2e/calendar-tithi-label.e2e.mjs
//
// The bug: each day cell is ~43px wide at 360px, but a tithi name is one long
// word ("Trayodasi", "Chaturdasi", "అమావాస్య"). The label could not wrap, so it
// spilled past the cell edges and the neighbouring cell painted over it
// ("Trayodas", "Chaturdas"). This checks October 2026 (Hyderabad), which has
// Trayodasi on 8 and 24 Oct and Chaturdasi on 9 and 25 Oct, at 360px and
// 390px, in English and Telugu, at the default text size and at a larger
// root font size (simulating a bigger OS/browser text setting).
//
// For every tithi label it asserts: the rendered text box lies inside its
// cell (no clipping / overlap with the next cell), the label sits below the
// date number, the label's full text is present, and the page has no
// horizontal overflow. Exits non-zero on any failure (never skips).

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const EXTERNAL = process.env.CT_BASE_URL || "";
const PORT = Number(process.env.CT_PORT || 5223);
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
const PERSON = {
  id: "p1", name: "Test",
  gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const prep = (language) => JSON.stringify({ mode: "SELF", participants: [PERSON], language, runs: {} });

// Long labels that were visibly cut off before the fix (Oct 2026, Hyderabad).
const LONG = {
  EN: [["8", "Trayodasi"], ["9", "Chaturdasi"], ["24", "Trayodasi"], ["25", "Chaturdasi"]],
  TE: [["8", "త్రయోదశి"], ["9", "చతుర్దశి"], ["10", "అమావాస్య"]],
};

let fails = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
};
const section = (t) => console.log(`\n— ${t}`);

async function waitForServer(url, ms = 120000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: "GET" });
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function openCalendar(page, language) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([lk, pk, mk, ck, lv, pv]) => {
      localStorage.setItem(lk, lv);
      localStorage.setItem(pk, pv);
      localStorage.setItem(mk, "FAMILY_BETA");
      localStorage.removeItem(ck);
    },
    [LOC_KEY, PREP_KEY, MODE_KEY, CAL_CACHE_KEY, JSON.stringify(HYD), prep(language)],
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.locator(".bottom-nav button").first().waitFor({ state: "visible" });
  await page.waitForTimeout(1500);
  const btn = page.locator(".bottom-nav button").nth(1); // Calendar
  for (let i = 0; i < 8 && !(await page.locator(".calendar-screen").count()); i += 1) {
    await btn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator(".calendar-cell:not(.calendar-blank) .calendar-tithi").first().waitFor();
}

/** Measure every tithi label against its own cell. */
const measure = (page) =>
  page.evaluate(() => {
    const out = [];
    for (const cell of document.querySelectorAll(".calendar-cell:not(.calendar-blank)")) {
      const label = cell.querySelector(".calendar-tithi");
      if (!label) continue;
      const c = cell.getBoundingClientRect();
      const n = cell.querySelector(".calendar-daynum").getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(label);
      const t = range.getBoundingClientRect(); // the text's own box
      out.push({
        day: cell.querySelector(".calendar-daynum").textContent,
        text: label.textContent,
        inside: t.left >= c.left - 0.5 && t.right <= c.right + 0.5 && t.bottom <= c.bottom + 0.5,
        belowNumber: t.top >= n.bottom - 0.5,
        notScrolled: label.scrollWidth <= label.clientWidth + 1 && label.scrollHeight <= label.clientHeight + 1,
      });
    }
    return {
      labels: out,
      hOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });

async function run(browser, language, width, rootPercent) {
  section(`${language} · ${width}px · root font ${rootPercent}%`);
  const ctx = await browser.newContext({ viewport: { width, height: 800 } });
  // Fixed clock inside October 2026 so the calendar opens on that month.
  await ctx.clock.install({ time: new Date("2026-10-05T06:00:00Z") });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  await openCalendar(page, language);
  ok(/October|అక్టోబర్/.test(await page.locator(".calendar-nav strong").innerText()),
    "the calendar opened on October 2026");
  if (rootPercent !== 100) {
    await page.addStyleTag({ content: `html{font-size:${rootPercent}% !important}` });
    await page.waitForTimeout(200);
  }
  const { labels, hOverflow } = await measure(page);
  ok(labels.length >= 28, `every day cell has a tithi label (${labels.length})`);
  const clipped = labels.filter((l) => !l.inside);
  ok(clipped.length === 0,
    `no tithi label spills outside its cell (${clipped.map((l) => `${l.day}:${l.text}`).join(", ") || "none"})`);
  const overlapping = labels.filter((l) => !l.belowNumber);
  ok(overlapping.length === 0, "no tithi label overlaps its date number");
  const scrolled = labels.filter((l) => !l.notScrolled);
  ok(scrolled.length === 0, "no tithi label has hidden (scrolled-off) content");
  for (const [day, name] of LONG[language]) {
    const l = labels.find((x) => x.day === day);
    ok(Boolean(l) && l.text === name && l.inside,
      `${day} Oct shows the full "${name}" inside its cell`);
  }
  ok(!hOverflow, "no horizontal page overflow");
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
    console.log(`— starting vite dev server on :${PORT}`);
    server = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
      cwd: REPO, env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
      stdio: ["ignore", "pipe", "pipe"], detached: true,
    });
    server.stdout.on("data", () => {});
    server.stderr.on("data", () => {});
  }
  if (!(await waitForServer(BASE))) {
    console.error(`FAIL  server at ${BASE} did not become ready.`);
    killServer();
    process.exit(1);
  }
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  try {
    for (const language of ["EN", "TE"]) {
      for (const width of [360, 390]) {
        for (const rootPercent of [100, 130]) {
          await run(browser, language, width, rootPercent);
        }
      }
    }
  } finally {
    await browser.close();
    killServer();
  }
  console.log(`\n${fails === 0 ? "ALL CALENDAR TITHI-LABEL CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

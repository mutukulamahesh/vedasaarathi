// Real-browser (Chromium, desktop viewport) verification companion to
// browser-verify-batch.mjs - manual, not part of `npm test` (needs a running
// dev server). Run: npx vite --port 5174 &   then   node tests/browser-verify-desktop.mjs
//
// Configurable via env vars, same as browser-verify-batch.mjs:
//   VS_BASE_URL, VS_SCREENSHOT_DIR
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = process.env.VS_BASE_URL || "http://localhost:5174";
const OUT = process.env.VS_SCREENSHOT_DIR
  || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".tmp", "browser-shots");

const LOCATION = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: 20, savedAt: "2026-09-10T00:00:00.000Z",
};
const results = [];
function check(name, ok, detail = "") { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`); }

async function waitForHomeReady(page) {
  await page.waitForSelector(".today-card", { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector(".panchanga-loading"), { timeout: 20000 });
}
async function waitForCalendarReady(page) {
  await page.waitForSelector(".calendar-festivals", { timeout: 15000 });
  await page.waitForFunction(
    () => !document.querySelector('[role="status"][aria-live="polite"].calendar-state'),
    { timeout: 20000 },
  );
}

(async () => {
  const fs = await import("node:fs");
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage","--disable-gpu","--no-sandbox","--disable-extensions","--mute-audio"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); // desktop
  await page.addInitScript(([loc]) => {
    localStorage.setItem("vedasaarathi:location:v1", JSON.stringify(loc));
  }, [LOCATION]);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await waitForHomeReady(page);
  check("Desktop Home: no Featured puja section", await page.locator("h2:has-text('Featured puja')").count() === 0);
  check("Desktop Home: no offline-download on Home", await page.locator("#offline-download").count() === 0);
  const fest = await page.locator(".panchanga-festival").first().textContent().catch(() => null);
  check("Desktop Home: festival line present", fest !== null, fest ?? "");
  await page.screenshot({ path: `${OUT}/20-home-desktop.png`, fullPage: true });

  const paraText = await page.locator(".panchanga-festival").first().textContent();
  const isoMatch = (paraText ?? "").match(/\d{4}-\d{2}-\d{2}/);
  const expectedISO = isoMatch ? isoMatch[0] : null;

  await page.locator(".panchanga-festival-link").first().click();
  await waitForCalendarReady(page);
  check("Desktop: festival click opens Calendar", await page.locator(".calendar-festival-card").count() > 0);
  const selectedHeading = await page.locator(".calendar-selected h2").first().textContent().catch(() => "");
  check(
    "Desktop: festival click selects the exact festival date",
    expectedISO !== null && selectedHeading?.trim() === expectedISO,
    `expected ${expectedISO}, got "${selectedHeading}"`,
  );
  await page.screenshot({ path: `${OUT}/21-calendar-desktop.png`, fullPage: true });

  await page.locator("button:has-text('Pujas')").first().click();
  await page.waitForSelector("#offline-download", { timeout: 10000 });
  check("Desktop Pujas: offline-download present", await page.locator("#offline-download").count() > 0);
  await page.screenshot({ path: `${OUT}/22-pujas-desktop.png`, fullPage: true });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} desktop checks passed`);
  if (failed.length) process.exitCode = 1;
})();

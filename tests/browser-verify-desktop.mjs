// Real-browser (Chromium, desktop viewport) verification companion to
// browser-verify-batch.mjs - manual, not part of `npm test` (needs a running
// dev server). Run: npx vite --port 5174 &   then   node tests/browser-verify-desktop.mjs
import { chromium } from "playwright";
const BASE = "http://localhost:5174";
const OUT = "/tmp/claude-1000/-workspaces-vedasaarathi/9307cfaf-4cf9-414f-8c2a-2dd652c961f7/scratchpad/shots";
const LOCATION = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: 20, savedAt: "2026-09-10T00:00:00.000Z",
};
const results = [];
function check(name, ok, detail = "") { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`); }

(async () => {
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage","--disable-gpu","--no-sandbox","--disable-extensions","--mute-audio"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); // desktop
  await page.addInitScript(([loc]) => {
    localStorage.setItem("vedasaarathi:location:v1", JSON.stringify(loc));
  }, [LOCATION]);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".today-card");
  await page.waitForTimeout(1500);
  check("Desktop Home: no Featured puja section", await page.locator("h2:has-text('Featured puja')").count() === 0);
  check("Desktop Home: no offline-download on Home", await page.locator("#offline-download").count() === 0);
  const fest = await page.locator(".panchanga-festival").first().textContent().catch(() => null);
  check("Desktop Home: festival line present", fest !== null, fest ?? "");
  await page.screenshot({ path: `${OUT}/10-home-desktop.png`, fullPage: true });

  await page.locator(".panchanga-festival-link").first().click();
  await page.waitForSelector(".calendar-festivals", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  check("Desktop: festival click opens Calendar", await page.locator(".calendar-festival-card").count() > 0);
  await page.screenshot({ path: `${OUT}/11-calendar-desktop.png`, fullPage: true });

  await page.locator("button:has-text('Pujas')").first().click();
  await page.waitForTimeout(500);
  check("Desktop Pujas: offline-download present", await page.locator("#offline-download").count() > 0);
  await page.screenshot({ path: `${OUT}/12-pujas-desktop.png`, fullPage: true });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} desktop checks passed`);
  if (failed.length) process.exitCode = 1;
})();

// Real-browser (Chromium) verification for the "Home follows the calendar"
// batch - manual, not part of `npm test` (needs a running dev server).
// Run: npx vite --port 5174 &   then   node tests/browser-verify-batch.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:5174";
const OUT = "/tmp/claude-1000/-workspaces-vedasaarathi/9307cfaf-4cf9-414f-8c2a-2dd652c961f7/scratchpad/shots";

const LOCATION = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: 20, savedAt: "2026-09-10T00:00:00.000Z",
};

async function seed(page, extra = {}) {
  await page.addInitScript(([loc, ex]) => {
    localStorage.setItem("vedasaarathi:location:v1", JSON.stringify(loc));
    for (const [k, v] of Object.entries(ex)) localStorage.setItem(k, v);
  }, [LOCATION, extra]);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " :: " + detail : ""}`);
}

(async () => {
  const browser = await chromium.launch({
    args: [
      "--disable-dev-shm-usage", "--disable-gpu", "--no-sandbox",
      "--disable-extensions", "--disable-background-networking",
      "--disable-default-apps", "--disable-sync", "--metrics-recording-only", "--mute-audio",
    ],
  });
  const fs = await import("node:fs");
  fs.mkdirSync(OUT, { recursive: true });

  try {
    // ---------------------------------------------------------------
    // 1. Home (EN): no Featured Puja card, no offline-download, festival line present
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // mobile
      await seed(page);
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.waitForSelector(".today-card", { timeout: 15000 });
      await page.waitForTimeout(1500); // let the panchanga/festival scan settle

      const hasFeaturedHeading = await page.locator("h2:has-text('Featured puja')").count();
      check("Home (mobile, EN): no 'Featured puja' section", hasFeaturedHeading === 0);

      const hasOfflineOnHome = await page.locator("#offline-download").count();
      check("Home (mobile, EN): no offline-download control", hasOfflineOnHome === 0);

      const festivalLine = await page.locator(".panchanga-festival").first();
      const festivalText = await festivalLine.textContent().catch(() => null);
      check("Home (mobile, EN): festival line present", festivalText !== null, festivalText ?? "");

      await page.screenshot({ path: `${OUT}/01-home-mobile-en.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 2. Home: click festival name -> opens Calendar on the right month/day
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page);
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.waitForSelector(".today-card");
      await page.waitForTimeout(1500);

      const link = page.locator(".panchanga-festival-link").first();
      const linkCount = await link.count();
      check("Home: festival name is a clickable link", linkCount > 0);
      if (linkCount > 0) {
        const linkText = await link.textContent();
        await link.click();
        await page.waitForSelector(".calendar-festivals", { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(800);
        const calendarHeading = await page.locator("h1, .kicker").first().textContent().catch(() => "");
        const festivalCard = await page.locator(".calendar-festival-card").count();
        check(
          "Home->Calendar: clicking the festival name opens Calendar with festival cards visible",
          festivalCard > 0,
          `clicked "${linkText}", calendar heading area: "${calendarHeading}", ${festivalCard} festival card(s)`,
        );
        await page.screenshot({ path: `${OUT}/02-calendar-from-home-click.png`, fullPage: true });
      }
      await page.close();
    }

    // ---------------------------------------------------------------
    // 3. Calendar: "Why these times?" disclosure present (Section 4 fix)
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page);
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      await page.waitForSelector(".today-card");
      await page.locator("button:has-text('Calendar')").first().click();
      await page.waitForSelector(".calendar-festivals", { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);
      const whyDisclosure = await page.locator(".calendar-why").count();
      check("Calendar: 'Why these times?' disclosure present (matches Home)", whyDisclosure > 0);
      if (whyDisclosure > 0) {
        await page.locator(".calendar-why summary").first().click();
        await page.waitForTimeout(200);
        const aboutText = await page.locator(".calendar-why dd").first().textContent().catch(() => "");
        check("Calendar: 'Why these times?' shows a real explanation", (aboutText ?? "").length > 20, aboutText ?? "");
      }
      await page.screenshot({ path: `${OUT}/03-calendar-why.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 4. Pujas tab: Vinayaka listed, offline-download present here now
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page);
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.waitForSelector(".today-card");
      await page.locator("button:has-text('Pujas')").first().click();
      await page.waitForTimeout(500);
      const pujaListed = await page.locator("text=Vinayaka Chavithi").count();
      check("Pujas tab: Vinayaka Chavithi listed", pujaListed > 0);
      const offlineOnPujas = await page.locator("#offline-download").count();
      check("Pujas tab: offline-download control present (moved from Home)", offlineOnPujas > 0);
      await page.screenshot({ path: `${OUT}/04-pujas-tab.png`, fullPage: true });

      // Into detail
      await page.locator(".puja-catalogue-item").first().click();
      await page.waitForTimeout(500);
      const beginBtn = await page.locator("button:has-text('Begin')").count();
      check("Pujas -> detail: 'Begin' button present (no run yet)", beginBtn > 0);
      await page.screenshot({ path: `${OUT}/05-puja-detail.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 5. Resume awareness on PujaDetailScreen (Section 1 relocation)
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page, {
        "vedasaarathi:preparation:v3": JSON.stringify({
          mode: "SELF", participants: [{ id: "p1", name: "Test", gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } }],
          language: "EN",
          runs: { "vinayaka-chavithi": { runState: "IN_PROGRESS", stepIndex: 5, pujaPath: "SIMPLE", availableMaterialIds: [], patriSelfReport: null } },
        }),
      });
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.waitForSelector(".today-card");
      await page.locator("button:has-text('Pujas')").first().click();
      await page.waitForTimeout(500);
      await page.locator(".puja-catalogue-item").first().click();
      await page.waitForTimeout(500);
      const resumeBtn = await page.locator("button:has-text('Resume where you left off')").count();
      check("Pujas -> detail: 'Resume where you left off' shown for an IN_PROGRESS run", resumeBtn > 0);
      await page.screenshot({ path: `${OUT}/06-puja-detail-resume.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 6. Telugu: Home + Calendar render without crashing, key text is Telugu
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page, { "vedasaarathi:preparation:v3": JSON.stringify({ mode: "SELF", participants: [], language: "TE", runs: {} }) });
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.waitForSelector(".today-card");
      await page.waitForTimeout(1500);
      const teluguWelcome = await page.locator("text=స్వాగతం").count();
      check("Home (TE): renders Telugu welcome text", teluguWelcome > 0);
      await page.screenshot({ path: `${OUT}/07-home-telugu.png`, fullPage: true });

      await page.locator("button:has-text('క్యాలెండర్')").first().click();
      await page.waitForSelector(".calendar-festivals", { timeout: 15000 }).catch(() => {});
      // Wait for the progressive per-day month calculation to actually finish
      // (not just the section to appear) before checking for the disclosure.
      await page.waitForFunction(
        () => !document.body.textContent.includes("లెక్కిస్తోంది"),
        { timeout: 15000 },
      ).catch(() => {});
      await page.waitForTimeout(500);
      const calWhyTe = await page.locator(".calendar-why summary").count();
      check("Calendar (TE): 'ఈ సమయాలు ఎందుకు?' disclosure present", calWhyTe > 0);
      await page.screenshot({ path: `${OUT}/08-calendar-telugu.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 7. Audio playback-speed toggle on PujaScreen, both languages, persists
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page, {
        "vedasaarathi:preparation:v3": JSON.stringify({
          mode: "SELF", participants: [{ id: "p1", name: "Test", gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } }],
          language: "EN", runs: {},
        }),
      });
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.waitForSelector(".today-card");
      await page.locator("button:has-text('Pujas')").first().click();
      await page.waitForTimeout(500);
      await page.locator(".puja-catalogue-item").first().click();
      await page.waitForTimeout(500);
      // Real flow: Begin -> Prepare (materials) -> Start Simple puja ->
      // Sankalpam setup -> Begin the puja -> the actual guided PujaScreen.
      await page.locator("button:has-text('Begin')").click();
      await page.waitForTimeout(600);
      await page.locator("button:has-text('Start Simple puja')").click();
      await page.waitForTimeout(600);
      await page.locator("button:has-text('Begin the puja')").click();
      await page.waitForTimeout(800);
      const speedToggle = await page.locator(".playback-speed-toggle").count();
      check("PujaScreen: playback-speed toggle renders", speedToggle > 0);
      if (speedToggle > 0) {
        const before = await page.evaluate(() => localStorage.getItem("vedasaarathi:playback-speed:v1"));
        await page.locator(".playback-speed-toggle button:has-text('1.0x')").click();
        await page.waitForTimeout(200);
        const after = await page.evaluate(() => localStorage.getItem("vedasaarathi:playback-speed:v1"));
        check("PujaScreen: clicking 1.0x persists to localStorage", after === "1", `before=${before} after=${after}`);
        const audioRate = await page.evaluate(() => {
          const el = document.querySelector("audio");
          return el ? el.playbackRate : null;
        });
        check("PujaScreen: the mounted <audio> element's playbackRate reflects the choice", audioRate === 1, `audioRate=${audioRate}`);
      }
      await page.screenshot({ path: `${OUT}/09-puja-screen-speed-toggle.png`, fullPage: true });
      await page.close();
    }
  } catch (err) {
    console.error("SCRIPT ERROR:", err);
    check("script completed without throwing", false, String(err));
  } finally {
    await browser.close();
  }

  console.log("\n=== SUMMARY ===");
  const failed = results.filter((r) => !r.ok);
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("FAILED:");
    for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
    process.exitCode = 1;
  }
})();

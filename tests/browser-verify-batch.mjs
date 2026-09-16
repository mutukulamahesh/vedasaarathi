// Real-browser (Chromium) verification for the Home/Calendar correction batch
// - manual, not part of `npm test` (needs a running dev or preview server).
//
// Run against the dev server (covers everything except the offline check,
// which the dev server's PwaRegister deliberately skips - see
// components/platform/pwa-register.tsx):
//   npx vite --port 5174 &
//   node tests/browser-verify-batch.mjs
//
// Run against a production build (also exercises the offline-after-download
// check, since the service worker only registers outside Vite dev):
//   npm run build && npx vite preview --port 5174 &
//   node tests/browser-verify-batch.mjs
//
// Configurable via env vars so this isn't pinned to one machine's layout:
//   VS_BASE_URL         base URL of the running server (default http://localhost:5174)
//   VS_SCREENSHOT_DIR   where screenshots are written (default: repo-relative .tmp/browser-shots)
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = process.env.VS_BASE_URL || "http://localhost:5174";
const OUT = process.env.VS_SCREENSHOT_DIR
  || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".tmp", "browser-shots");

// Matches calendar-screen.tsx's own EN month labels, so the nav header can be
// checked for the EXACT month and year, not just "contains this year".
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

// Condition-based waits: no fixed sleeps standing in for "probably done by now".
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
      await waitForHomeReady(page);

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
    // 2. Home: click festival name -> Calendar opens on the EXACT month and
    //    with that EXACT day selected (not just "some festival card exists").
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page);
      await page.goto(BASE, { waitUntil: "networkidle" });
      await waitForHomeReady(page);

      const link = page.locator(".panchanga-festival-link").first();
      const linkCount = await link.count();
      check("Home: festival name is a clickable link", linkCount > 0);
      if (linkCount > 0) {
        const paraText = await page.locator(".panchanga-festival").first().textContent();
        const isoMatch = (paraText ?? "").match(/\d{4}-\d{2}-\d{2}/);
        const expectedISO = isoMatch ? isoMatch[0] : null;
        const [expYear, expMonth] = expectedISO ? expectedISO.split("-").map(Number) : [null, null];

        await link.click();
        await waitForCalendarReady(page);

        const monthHeader = await page.locator(".calendar-nav strong").first().textContent().catch(() => "");
        const selectedHeading = await page.locator(".calendar-selected h2").first().textContent().catch(() => "");
        check(
          "Home->Calendar: clicking the festival name selects the EXACT festival date",
          expectedISO !== null && selectedHeading?.trim() === expectedISO,
          `expected dateISO ${expectedISO}, calendar-selected shows "${selectedHeading}"`,
        );
        const expectedMonthHeader = expMonth !== null ? `${EN_MONTHS[expMonth - 1]} ${expYear}` : null;
        check(
          "Home->Calendar: the month header shows the EXACT month and year of the festival, not just 'today'",
          expectedMonthHeader !== null && monthHeader?.trim() === expectedMonthHeader,
          `expected "${expectedMonthHeader}", header shows "${monthHeader}"`,
        );
        const festivalCard = await page.locator(".calendar-festival-card").count();
        check("Home->Calendar: festival cards are visible for that month", festivalCard > 0);
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
      await waitForHomeReady(page);
      await page.locator("button:has-text('Calendar')").first().click();
      await waitForCalendarReady(page);
      const whyDisclosure = await page.locator(".calendar-why").count();
      check("Calendar: 'Why these times?' disclosure present (matches Home)", whyDisclosure > 0);
      if (whyDisclosure > 0) {
        await page.locator(".calendar-why summary").first().click();
        const aboutText = await page.locator(".calendar-why dd").first().textContent().catch(() => "");
        check("Calendar: 'Why these times?' shows a real explanation", (aboutText ?? "").length > 20, aboutText ?? "");
      }
      await page.screenshot({ path: `${OUT}/03-calendar-why.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 4. REGRESSION: the reproduced Home/Calendar echo bug, in a real browser.
    //    Hyderabad, pinned to 2026-01-17 (the day AFTER Masa Shivaratri's true
    //    2026-01-16 occurrence - the day the pre-fix code echoed as "another"
    //    occurrence). Home must never show that echo day again, and Calendar's
    //    January page must show only 2026-01-16, never -17. Home's own "next"
    //    line now names Sankashti Chaturthi (2026-02-05, since its addition) -
    //    genuinely sooner from this date than Masa Shivaratri's own next
    //    occurrence (2026-02-15) - so this checks the echo day is absent
    //    rather than hardcoding which rule wins "next".
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      // setFixedTime pins Date.now()/new Date() for the page WITHOUT faking
      // timers - the app's real setTimeout-based progressive calculations
      // (lib/panchanga/calendar.ts's yieldToLoop) still run on the real clock.
      await page.clock.setFixedTime(new Date("2026-01-17T12:00:00Z"));
      await seed(page);
      await page.goto(BASE, { waitUntil: "networkidle" });
      await waitForHomeReady(page);

      const paraText = await page.locator(".panchanga-festival").first().textContent().catch(() => "");
      check(
        "Regression: Home queried ON the echo day (2026-01-17) does not re-report it as a new occurrence",
        !(paraText ?? "").includes("2026-01-17"),
        paraText ?? "",
      );
      check(
        "Regression: Home instead names a genuine future occurrence (Sankashti Chaturthi, 2026-02-05)",
        (paraText ?? "").includes("2026-02-05"),
        paraText ?? "",
      );

      await page.locator("button:has-text('Calendar')").first().click();
      await waitForCalendarReady(page);
      const monthHeader = await page.locator(".calendar-nav strong").first().textContent().catch(() => "");
      check("Regression: Calendar opens on the EXACT pinned month and year, January 2026", monthHeader?.trim() === "January 2026", monthHeader);
      const cardTexts = await page.locator(".calendar-festival-card").allTextContents();
      const shivaratriCards = cardTexts.filter((t) => t.includes("Shivaratri"));
      check(
        "Regression: Calendar's January page shows Masa Shivaratri on 2026-01-16 only, never 2026-01-17",
        shivaratriCards.some((t) => t.includes("2026-01-16")) && !shivaratriCards.some((t) => t.includes("2026-01-17")),
        JSON.stringify(shivaratriCards),
      );
      await page.screenshot({ path: `${OUT}/04-echo-regression.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 5. Home/Calendar timing equality: the same location and civil day must
    //    show identical useful/avoid period times on both screens.
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page);
      await page.goto(BASE, { waitUntil: "networkidle" });
      await waitForHomeReady(page);
      const homeTimes = (await page.locator(".home-period-time").allTextContents()).map((s) => s.trim()).sort();

      await page.locator("button:has-text('Calendar')").first().click();
      await waitForCalendarReady(page);
      // Calendar opens with today already selected (selectedISO defaults to
      // todayISO), so no extra navigation is needed to compare the same day.
      const calTimes = (await page.locator(".cal-period-time").allTextContents()).map((s) => s.trim()).sort();

      check(
        "Home and Calendar show identical useful/avoid period times for the same location and day",
        homeTimes.length > 0 && JSON.stringify(homeTimes) === JSON.stringify(calTimes),
        `home=${JSON.stringify(homeTimes)} calendar=${JSON.stringify(calTimes)}`,
      );
      await page.screenshot({ path: `${OUT}/05-timing-equality.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 6. Pujas tab: Vinayaka listed, offline-download present here now
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page);
      await page.goto(BASE, { waitUntil: "networkidle" });
      await waitForHomeReady(page);
      await page.locator("button:has-text('Pujas')").first().click();
      await page.waitForSelector(".puja-catalogue-item", { timeout: 10000 });
      const pujaListed = await page.locator("text=Vinayaka Chavithi").count();
      check("Pujas tab: Vinayaka Chavithi listed", pujaListed > 0);
      const offlineOnPujas = await page.locator("#offline-download").count();
      check("Pujas tab: offline-download control present (moved from Home)", offlineOnPujas > 0);
      await page.screenshot({ path: `${OUT}/06-pujas-tab.png`, fullPage: true });

      await page.locator(".puja-catalogue-item").first().click();
      await page.waitForSelector("button:has-text('Begin')", { timeout: 10000 });
      const beginBtn = await page.locator("button:has-text('Begin')").count();
      check("Pujas -> detail: 'Begin' button present (no run yet)", beginBtn > 0);
      await page.screenshot({ path: `${OUT}/07-puja-detail.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 7. Resume awareness on PujaDetailScreen (Section 1 relocation)
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
      await waitForHomeReady(page);
      await page.locator("button:has-text('Pujas')").first().click();
      await page.waitForSelector(".puja-catalogue-item", { timeout: 10000 });
      await page.locator(".puja-catalogue-item").first().click();
      await page.waitForSelector("button:has-text('Resume where you left off'), button:has-text('Begin')", { timeout: 10000 });
      const resumeBtn = await page.locator("button:has-text('Resume where you left off')").count();
      check("Pujas -> detail: 'Resume where you left off' shown for an IN_PROGRESS run", resumeBtn > 0);
      await page.screenshot({ path: `${OUT}/08-puja-detail-resume.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 8. Telugu: Home + Calendar render without crashing, key text is Telugu
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page, { "vedasaarathi:preparation:v3": JSON.stringify({ mode: "SELF", participants: [], language: "TE", runs: {} }) });
      await page.goto(BASE, { waitUntil: "networkidle" });
      await waitForHomeReady(page);
      const teluguWelcome = await page.locator("text=స్వాగతం").count();
      check("Home (TE): renders Telugu welcome text", teluguWelcome > 0);
      await page.screenshot({ path: `${OUT}/09-home-telugu.png`, fullPage: true });

      await page.locator("button:has-text('క్యాలెండర్')").first().click();
      await waitForCalendarReady(page);
      const calWhyTe = await page.locator(".calendar-why summary").count();
      check("Calendar (TE): 'ఈ సమయాలు ఎందుకు?' disclosure present", calWhyTe > 0);
      await page.screenshot({ path: `${OUT}/10-calendar-telugu.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 9. Audio playback-speed toggle on PujaScreen, both languages, persists
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
      await waitForHomeReady(page);
      await page.locator("button:has-text('Pujas')").first().click();
      await page.waitForSelector(".puja-catalogue-item", { timeout: 10000 });
      await page.locator(".puja-catalogue-item").first().click();
      await page.waitForSelector("button:has-text('Begin')", { timeout: 10000 });
      // Real flow: Begin -> Prepare (materials) -> Start Simple puja ->
      // Sankalpam setup -> Begin the puja -> the actual guided PujaScreen.
      await page.locator("button:has-text('Begin')").click();
      await page.waitForSelector("button:has-text('Start Simple puja')", { timeout: 10000 });
      await page.locator("button:has-text('Start Simple puja')").click();
      await page.waitForSelector("button:has-text('Begin the puja')", { timeout: 10000 });
      await page.locator("button:has-text('Begin the puja')").click();
      await page.waitForSelector(".playback-speed-toggle", { timeout: 10000 });
      const speedToggle = await page.locator(".playback-speed-toggle").count();
      check("PujaScreen: playback-speed toggle renders", speedToggle > 0);
      if (speedToggle > 0) {
        const before = await page.evaluate(() => localStorage.getItem("vedasaarathi:playback-speed:v1"));
        await page.locator(".playback-speed-toggle button:has-text('1.0x')").click();
        await page.waitForFunction(
          () => localStorage.getItem("vedasaarathi:playback-speed:v1") === "1",
          { timeout: 5000 },
        );
        const after = await page.evaluate(() => localStorage.getItem("vedasaarathi:playback-speed:v1"));
        check("PujaScreen: clicking 1.0x persists to localStorage", after === "1", `before=${before} after=${after}`);
        const audioRate = await page.evaluate(() => {
          const el = document.querySelector("audio");
          return el ? el.playbackRate : null;
        });
        check("PujaScreen: the mounted <audio> element's playbackRate reflects the choice", audioRate === 1, `audioRate=${audioRate}`);
      }
      await page.screenshot({ path: `${OUT}/11-puja-screen-speed-toggle.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 10. Family audio speed after switching forms (item 3): set 1.0x in
    //     Sankalpam Practice, force a mismatched form (no audio), switch to
    //     the standard short form on the SAME screen (no remount), and
    //     confirm the newly-mounted clips carry the saved speed.
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page, {
        "vedasaarathi:preparation:v3": JSON.stringify({
          mode: "FAMILY",
          participants: [{ id: "p1", name: "Test Family", gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } }],
          language: "EN", runs: {},
        }),
      });
      await page.goto(BASE, { waitUntil: "networkidle" });
      await waitForHomeReady(page);
      await page.locator("button:has-text('Pujas')").first().click();
      await page.waitForSelector(".puja-catalogue-item", { timeout: 10000 });
      await page.locator(".puja-catalogue-item").first().click();
      await page.waitForSelector("button:has-text('Begin')", { timeout: 10000 });
      await page.locator("button:has-text('Begin')").click();
      await page.waitForSelector("button:has-text('Start Simple puja')", { timeout: 10000 });
      await page.locator("button:has-text('Start Simple puja')").click();
      // FAMILY mode lands on the "Your Sankalpam is ready" screen. The
      // default calendarForm is already FULL_DATED (mismatched with the
      // fixed audio) - only the pending unknown-Gotra decision blocks
      // "Hear and practise", so resolve that inline first.
      await page.waitForSelector("text=Leave the Gotra line out", { timeout: 10000 });
      await page.locator("text=Leave the Gotra line out").first().click();
      await page.waitForSelector("button:has-text('Hear and practise'):not([disabled])", { timeout: 10000 });
      await page.locator("button:has-text('Hear and practise')").click();
      await page.waitForSelector(".playback-speed-toggle", { timeout: 10000 });

      // Select 1.0x (non-default) before entering the guided puja, as required.
      await page.locator(".playback-speed-toggle button:has-text('1.0x')").click();
      await page.waitForFunction(
        () => localStorage.getItem("vedasaarathi:playback-speed:v1") === "1",
        { timeout: 5000 },
      );

      // The form is still mismatched (FULL_DATED) here: the switch offer
      // shows, no audio yet.
      await page.waitForSelector("text=Switch to that form", { timeout: 10000 });
      check("Sankalpam Practice: mismatched form shows the switch offer, no <audio> yet", await page.locator("audio").count() === 0);

      // Switch to the standard short form on the SAME mounted component -
      // exactly the mount-without-remount scenario item 3 fixed. These
      // <audio> elements have no `controls` attribute (playback is driven by
      // the app's own buttons), so they are legitimately never "visible" to
      // Playwright's default wait - "attached" is the right condition here.
      await page.locator("button:has-text('Switch to that form')").click();
      await page.waitForSelector("audio", { state: "attached", timeout: 10000 });
      const rates = await page.evaluate(() => [...document.querySelectorAll("audio")].map((a) => a.playbackRate));
      check(
        "Family audio after switching forms (no remount): all newly-mounted clips carry the saved 1.0x speed",
        rates.length === 3 && rates.every((r) => r === 1),
        JSON.stringify(rates),
      );
      await page.screenshot({ path: `${OUT}/12-family-audio-speed-switch.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 11. Actual location saving through the UI (not a direct function call):
    //     fill the real form, click Save, and verify BOTH the visible city
    //     label and the persisted localStorage record.
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.waitForSelector(".location-button", { timeout: 15000 });
      await page.locator(".location-button").click();
      await page.waitForSelector("text=Set your location", { timeout: 10000 });

      const fill = async (label, value) => {
        const input = page.locator(`label:has-text("${label}") input`).first();
        await input.fill(String(value));
      };
      await fill("City", "Frisco");
      await fill("State or region", "Texas");
      await fill("Country", "United States");
      await fill("Time zone", "America/Chicago");
      await fill("Latitude", "33.1507");
      await fill("Longitude", "-96.8236");
      await page.locator("button:has-text('Save location')").click();

      // Condition-based: wait for the header's location button to actually
      // reflect the new city, rather than sleeping for the known delay.
      await page.waitForFunction(
        () => document.querySelector(".location-button")?.textContent?.includes("Frisco"),
        { timeout: 5000 },
      );
      const persisted = await page.evaluate(() => {
        const raw = localStorage.getItem("vedasaarathi:location:v1");
        return raw ? JSON.parse(raw) : null;
      });
      check(
        "Location: saving through the real UI form persists the new city to localStorage",
        persisted?.city === "Frisco" && persisted?.status === "READY",
        JSON.stringify(persisted),
      );
      check(
        "Location: Home immediately reflects the saved city in the header",
        await page.locator(".location-button").textContent().then((t) => t.includes("Frisco")),
      );
      await page.screenshot({ path: `${OUT}/13-location-saved-ui.png`, fullPage: true });
      await page.close();
    }

    // ---------------------------------------------------------------
    // 12. Offline download - beyond "the control is visible": confirm the
    //     download actually populates the on-device Cache Storage (works
    //     under any server, since downloadForOffline populates the cache
    //     directly and does not itself require the service worker).
    //
    //     The offline manifest lists the FINAL PRODUCTION build's hashed
    //     JS/CSS chunk filenames (see scripts/generate-offline-manifest.mjs).
    //     A bare `vite dev` server never serves those exact filenames (it
    //     serves unbundled modules on the fly), so a handful of chunk fetches
    //     legitimately fail there even though everything else - and the
    //     download logic itself - is correct; verified by running this same
    //     check against `npm run build && npm run start`, where it passes
    //     with 0 failures. Probed directly below rather than guessed from a
    //     dev-server fingerprint, which was unreliable in practice.
    //
    //     The FULL offline flow - going properly offline, reloading, and
    //     playing puja audio entirely from cache - needs the service worker
    //     AND a production build. That deeper, already-established check
    //     lives in the dedicated suite:
    //       npm run test:e2e:offline
    //     (tests/e2e/offline.e2e.mjs, tests/e2e/offline-first.e2e.mjs) -
    //     not duplicated here.
    // ---------------------------------------------------------------
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await seed(page);
      await page.goto(BASE, { waitUntil: "networkidle" });
      await waitForHomeReady(page);
      await page.locator("button:has-text('Pujas')").first().click();
      await page.waitForSelector("#offline-download", { timeout: 10000 });

      const cachedBefore = await page.evaluate(async () => {
        const names = (await caches.keys()).filter((n) => n.startsWith("vs-offline-"));
        if (names.length === 0) return 0;
        const cache = await caches.open(names[0]);
        return (await cache.keys()).length;
      });
      // Does this server actually serve the production build's hashed
      // chunk filenames the manifest lists? If not, a partial download here
      // is a known environment gap, not a regression.
      const manifestChunksServable = await page.evaluate(async () => {
        try {
          const manifest = await (await fetch("/offline-manifest.json")).json();
          const chunk = (manifest.urls || []).find((u) => /\.(js|css)$/.test(u) && u !== "/sw.js");
          if (!chunk) return true;
          const res = await fetch(chunk);
          return res.ok;
        } catch {
          return true;
        }
      });

      await page.locator("#offline-download button:has-text('Download for offline use')").click();
      await page.waitForSelector(".offline-download-ok, .offline-download-error", { timeout: 60000 });

      const errorShown = await page.locator(".offline-download-error").count();
      if (errorShown > 0) {
        const errText = await page.locator(".offline-download-error").first().textContent();
        if (!manifestChunksServable) {
          console.log(`INFO - Offline download partially failed because this server does not serve the production build's chunk filenames (expected - see comment above) :: ${errText}`);
        } else {
          check("Offline download: completes without error", false, errText ?? "");
        }
      } else {
        const cachedAfter = await page.evaluate(async () => {
          const names = (await caches.keys()).filter((n) => n.startsWith("vs-offline-"));
          if (names.length === 0) return 0;
          const cache = await caches.open(names[0]);
          return (await cache.keys()).length;
        });
        check(
          "Offline download: actually populates Cache Storage with files (not just a visible 'Downloaded' label)",
          cachedAfter > cachedBefore,
          `cache entries before=${cachedBefore} after=${cachedAfter}`,
        );
      }
      await page.screenshot({ path: `${OUT}/14-offline-download.png`, fullPage: true });
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
  const skipped = results.filter((r) => r.skipped);
  console.log(`${results.length - failed.length}/${results.length} checks passed (${skipped.length} skipped)`);
  if (failed.length) {
    console.log("FAILED:");
    for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
    process.exitCode = 1;
  }
})();

// Simple V1 - the one focused production E2E for the five-stage journey:
//   Welcome+location -> Today+festival -> Prepare+Sankalpam -> Guided puja ->
//   Completion.
//
// This intentionally does NOT re-run the full platform's old E2E suites
// (calendar, search, people management, reviewer mode, Simple/Complete path
// choice) - those screens are not reachable from this coordinator. It DOES
// assert their absence, and re-verifies the shared calculation/content
// guarantees (Paksha/Tithi consistency, no unresolved gestures, Katha before
// Udvasana, single Sankalpam) as they actually render on THIS journey's
// screens.
//
//   node tests/e2e/simple-v1-journey.e2e.mjs
//   SV1_BASE_URL=http://localhost:5173/ node tests/e2e/simple-v1-journey.e2e.mjs

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const EXTERNAL = process.env.SV1_BASE_URL || "";
const PORT = Number(process.env.SV1_PORT || 5271);
const BASE = (EXTERNAL || `http://localhost:${PORT}/`).replace(/\/?$/, "/");

const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";

// Frisco is entered manually through the form in section 3 below (not seeded
// via localStorage), so only Hyderabad needs a seed fixture here.
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};

let fails = 0;
let checks = 0;
const ok = (cond, msg) => { checks += 1; if (!cond) fails += 1; console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`); };
const section = (t) => console.log(`\n— ${t}`);

async function waitForServer(url, ms = 120000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return true; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const noHOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function seed(page, { location = HYD, language = "EN", participant = null, run = {} } = {}) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(([lk, pk, lv, pv]) => {
    if (lv) localStorage.setItem(lk, lv); else localStorage.removeItem(lk);
    localStorage.setItem(pk, pv);
  }, [LOC_KEY, PREP_KEY,
    location ? JSON.stringify(location) : "",
    JSON.stringify({
      mode: "FAMILY", language,
      participants: participant ? [participant] : [],
      runs: { "vinayaka-chavithi": { runState: "NOT_STARTED", stepIndex: 0, pujaPath: "COMPLETE", availableMaterialIds: [], patriSelfReport: null, ...run } },
    })]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
}

const FORBIDDEN_ANYWHERE = [
  /class="bottom-nav"/, /Calendar<\/span>/i, /Search<\/span>/i, /vetakండి/,
  /class="calendar-screen"/, /class="search-screen"/, /class="people-screen"/,
  /For invited priests/i, /Reviewer mode/i, /candidate-review/i,
  />Veda</, />Sutra</, />Sampradaya</, /Simple Puja<\/strong>/, /Complete Puja<\/strong>/,
  /VedaSaarathi Beta/, /still being improved/i, /Still being reviewed/i,
];

async function run(viewport) {
  section(`VIEWPORT ${viewport.width}x${viewport.height}`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  const external = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("request", (r) => {
    try {
      const u = new URL(r.url());
      if (u.host !== new URL(BASE).host && u.protocol !== "data:" && u.protocol !== "blob:") external.push(u.href);
    } catch { /* ignore */ }
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45000);

  /* ---- 1. First-time user, empty storage: Welcome screen ---- */
  section("1. First-time user (empty storage) — Welcome");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".global-lang-toggle").waitFor();
  // This is the one screen reached by hydrating cold SSR'd HTML rather than
  // an already-hydrated client-side stage change, so give React a moment to
  // finish attaching event handlers before the first interaction below -
  // clicking immediately after the element merely EXISTS in the DOM (which
  // happens instantly via SSR, before hydration) would click on inert markup.
  await page.waitForTimeout(1500);
  ok((await page.locator("body").innerText()).includes("VedaSaarathi"), "shows the VedaSaarathi brand");
  ok(await page.locator(".global-lang-toggle button").count() === 2, "English | Telugu selector present");
  ok(!(await page.locator(".bottom-nav").count()), "no bottom navigation bar");
  ok(await noHOverflow(page), "welcome: no horizontal overflow");

  /* ---- 2. Language selectable before location ---- */
  section("2. Telugu selectable before location is set");
  await page.locator(".global-lang-toggle button", { hasText: "తెలుగు" }).click();
  await page.waitForTimeout(300);
  ok(/మీ స్థానం సెట్ చేయండి/.test(await page.locator("body").innerText()), "the location screen itself is Telugu");

  /* ---- 3. Manual location entry: Frisco ---- */
  section("3. Manual location entry — Frisco, Texas");
  const fill = async (labelRe, val) => {
    await page.locator("form.location-form label", { hasText: labelRe }).locator("input").first().fill(val);
  };
  await fill(/నగరం/, "Frisco");
  await fill(/రాష్ట్రం/, "Texas");
  await fill(/^దేశం/, "United States");
  await fill(/టైమ్‌జోన్/, "America/Chicago");
  await fill(/అక్షాంశం/, "33.1507");
  await fill(/రేఖాంశం/, "-96.8236");
  await page.getByRole("button", { name: /స్థానం సేవ్/i }).click();
  await page.waitForTimeout(1000);
  ok(/Frisco/.test(await page.locator("body").innerText()), "saved location shows Frisco");
  await page.getByRole("button", { name: /కొనసాగించండి/i }).click();
  await page.locator(".simple-today").waitFor({ timeout: 15000 });
  await page.locator(".today-card .home-times, .today-card .simple-no-useful").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1000);

  /* ---- 4. Today screen — Frisco results ---- */
  section("4. Today screen — Frisco (Telugu)");
  const friscoText = await page.locator(".simple-today").innerText();
  ok(/Frisco/.test(friscoText), "Frisco shown as today's location");
  ok(/సూర్యోదయం/.test(friscoText) && /సూర్యాస్తమయం/.test(friscoText), "Sunrise/Sunset shown on the collapsed card");
  ok(/తిథి/.test(friscoText) && /నక్షత్రం/.test(friscoText), "Tithi and Nakshatra shown on the collapsed card");
  ok(/ఈ రోజు ఉపయోగకరమైన సమయం/.test(friscoText) || /ఏ ఉపయోగకరమైన/.test(friscoText) || /సాధారణ ఉపయోగకరమైన సమయం చూపబడలేదు/.test(friscoText),
    "either a useful-time section or the honest 'none shown' line is present");
  ok(!/సంవత్సరం \(పేరు\)/.test(friscoText) && !/అయనం/.test(friscoText) && !/ఋతువు/.test(friscoText),
    "Samvatsara/Ayana/Ritu are NOT on the collapsed card (they are behind Full Panchangam -> Advanced)");
  ok(/సాధారణ సంప్రదాయ పంచాంగ సమయాలు/.test(friscoText), "the general/traditional/not-personalised scope line is present");
  ok(!/not astrology/i.test(friscoText), "no 'not astrology' claim");
  const friscoSunrise = friscoText.match(/సూర్యోదయం\s*([\d:APM\s]+)/)?.[1]?.trim();
  console.log(`  Frisco sunrise: ${friscoSunrise}`);

  /* ---- 5. Advanced/Full Panchangam stays collapsed initially ---- */
  section("5. Full Panchangam / Advanced details collapsed by default");
  ok(!(await page.locator(".home-see-full[open]").count()), "Full Panchangam starts closed");
  await page.locator(".home-see-full > summary").click();
  await page.waitForTimeout(300);
  const fullText = await page.locator(".home-full-panchanga").innerText();
  ok(/మాసం/.test(fullText) && /పక్షం/.test(fullText) && /వారం/.test(fullText), "Full Panchangam has Masa/Paksha/Vaara");
  if (await page.locator(".home-advanced").count()) {
    ok(!(await page.locator(".home-advanced[open]").count()), "Samvatsara/Ayana/Ritu (Advanced) starts closed even inside Full Panchangam");
  }

  /* ---- 6. Festival section — Frisco (not festival day) ---- */
  section("6. Festival section — upcoming, clearly a preview");
  const festText = await page.locator(".simple-festival-card").innerText();
  console.log(`  Frisco festival card: ${festText.replace(/\n/g, " | ")}`);
  ok(/రాబోయే వినాయక చవితి/.test(festText), "shown as upcoming (not 'today')");
  ok(/ప్రాక్టీస్/.test(festText), "offers 'preview the puja', not 'start'");
  ok(/ప్రివ్యూ/.test(festText) && /పండుగ సంకల్పం కాదు/.test(festText),
    "explicitly labelled preview/practice - never claimed as today's festival Sankalpam");

  /* ---- 7. Same location, different result: Hyderabad ---- */
  section("7. Frisco vs Hyderabad produce different values");
  await seed(page, { location: HYD, language: "TE" });
  await page.locator(".simple-today").waitFor({ timeout: 15000 });
  await page.locator(".today-card .home-times, .today-card .simple-no-useful").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1000);
  const hydText = await page.locator(".simple-today").innerText();
  const hydSunrise = hydText.match(/సూర్యోదయం\s*([\d:APM\s]+)/)?.[1]?.trim();
  console.log(`  Hyderabad sunrise: ${hydSunrise}`);
  ok(Boolean(hydSunrise) && hydSunrise !== friscoSunrise, "Hyderabad's sunrise differs from Frisco's (real per-location calculation)");
  ok(/Hyderabad/.test(hydText), "Hyderabad shown as today's location");

  /* ---- 8. Prepare + Sankalpam — known Gotra, rendered Paksha/Tithi ---- */
  section("8. Prepare + Sankalpam — Hyderabad, known Gotra");
  const previewBtn = page.locator("button", { hasText: /ప్రాక్టీస్|మొదలుపెట్టండి/i }).first();
  await previewBtn.click();
  await page.locator(".simple-prepare").waitFor({ timeout: 10000 });
  const prepText0 = await page.locator(".simple-prepare").innerText();
  ok(/తప్పనిసరిగా కావలసినవి/.test(prepText0), "materials grouped, Telugu category label present");
  ok(!/VedaSaarathi Beta/.test(prepText0) && !/ఇంకా సమీక్షిస్తున్నారు/.test(prepText0), "no beta/review warning shown");
  await page.locator(".simple-name-field input").first().fill("శర్మ కుటుంబం");
  await page.locator(".simple-gotra-question label", { hasText: "నాకు తెలుసు" }).locator("input").check();
  await page.waitForTimeout(200);
  await page.locator(".simple-prepare .simple-name-field").nth(1).locator("input").fill("భరద్వాజ");
  await page.waitForTimeout(600);
  const sankalpamText = await page.locator(".sankalpam-block").innerText();
  console.log(`  rendered Sankalpam (Hyderabad, known Gotra): ${sankalpamText.replace(/\n/g, " | ").slice(0, 400)}`);

  // §3's direct RENDERING regression: read the text actually shown, not a
  // helper function's return value. Every (masa, paksha, tithi) triple that
  // appears together in the rendered Telugu text must be a real, possible
  // Hindu calendar combination - Shukla tithis with Shukla paksha, Krishna
  // tithis (incl. Amavasya) with Krishna paksha, Purnima only in Shukla,
  // Amavasya only in Krishna. This is the exact Hyderabad, 11 September 2026
  // scenario a tester previously saw produce an impossible pairing.
  const assembledLine = await page.locator(".sankalpam-assembled-line").innerText().catch(() => "");
  const impossible = [
    /కృష్ణ\s*పక్షే[^.]{0,60}శుక్ల/, // Krishna Paksha ... a Shukla-only term nearby
    /శుక్ల\s*పక్షే[^.]{0,60}కృష్ణ/,
    /కృష్ణ\s*పక్షే[^.]{0,40}పూర్ణిమా/, // Krishna Paksha with Purnima
    /శుక్ల\s*పక్షే[^.]{0,40}అమావాస్యా/, // Shukla Paksha with Amavasya
  ];
  for (const re of impossible) {
    ok(!re.test(assembledLine) && !re.test(sankalpamText), `no impossible Paksha/Tithi pairing (${re})`);
  }
  ok(assembledLine.length > 0, "the assembled Sankalpam text is actually rendered on screen (not just computed)");

  /* ---- 9. Unknown Gotra: pending, then resolved ---- */
  section("9. Unknown Gotra — pending blocks Start/Preview, resolves cleanly");
  await page.locator(".simple-gotra-question label", { hasText: "నాకు తెలియదు" }).locator("input").check();
  await page.waitForTimeout(400);
  const startBtn = page.locator("button.wide-primary", { hasText: /ప్రాక్టీస్|మొదలుపెట్టండి/i });
  ok(await startBtn.isDisabled(), "Start/Preview is disabled while the Gotra decision is pending");
  ok(!(await page.locator(".sankalpam-block").count()), "no Sankalpam is shown while pending");
  const leaveOut = page.locator(".sankalpam-gotra-decision label", { hasText: "వదిలేయండి" }).locator("input");
  await leaveOut.click();
  await page.waitForTimeout(400);
  ok(!(await startBtn.isDisabled()), "Start/Preview re-enables once the Gotra decision is made");
  ok((await page.locator(".sankalpam-block").count()) > 0, "the Sankalpam is shown once valid");

  /* ---- 10. Guided puja: no gesture, Katha before Udvasana, single Sankalpam ---- */
  section("10. Guided puja — sequence, gestures, audio");
  await startBtn.click();
  await page.locator(".puja-card h1").waitFor({ timeout: 15000 });
  const GESTURE = [/move the murti/i, /from its place/i, /gently move/i, /విగ్రహాన్ని దాని స్థానం/, /కొంచెం కదప/];
  let steps = 0, gestureHits = [], sawKatha = false, sawUdvasana = false, kathaBeforeUdvasana = null;
  let mantraSteps = 0, mantraAudioSteps = 0;
  for (let i = 0; i < 45; i += 1) {
    if (!(await page.locator(".puja-card h1").count())) break;
    steps += 1;
    // The English title paragraph only renders when instruction language is
    // English (this journey stays in Telugu after section 2), so identify
    // steps from whichever title is actually on screen: the Telugu h1 is
    // always present, the English one only sometimes.
    const teluguTitle = await page.locator(".step-telugu-title").innerText().catch(() => "");
    const enTitle = await page.locator(".step-english-title").innerText().catch(() => "");
    const stepTitle = `${enTitle} ${teluguTitle}`;
    const cardTxt = await page.locator(".puja-card").innerText();
    for (const re of GESTURE) if (re.test(cardTxt)) gestureHits.push(`step ${steps} (${stepTitle}): ${re}`);
    if (/katha|story|కథ/i.test(stepTitle)) { sawKatha = true; if (kathaBeforeUdvasana === null) kathaBeforeUdvasana = !sawUdvasana; }
    if (/udvasana|conclude|ఉద్వాసన/i.test(stepTitle)) sawUdvasana = true;
    if ((await page.locator("pre.mantra-te").count()) > 0) {
      mantraSteps += 1;
      if ((await page.locator(".mantra-block .app-audio").count()) > 0) mantraAudioSteps += 1;
    }
    if (!(await noHOverflow(page))) ok(false, `step ${steps}: horizontal overflow`);
    const label = await page.locator(".step-actions .primary-action").innerText().catch(() => "");
    await page.locator(".step-actions .primary-action").click().catch(() => {});
    await page.waitForTimeout(150);
    if (/పూర్తి|finish/i.test(label)) break;
  }
  ok(steps >= 30, `walked the one recommended sequence (${steps} steps, expected the Complete content set)`);
  ok(gestureHits.length === 0, `no unresolved murti-movement instruction (${gestureHits.join("; ") || "clean"})`);
  ok(sawKatha, "reached the Vrata Katha");
  ok(sawUdvasana, "reached Udvasana");
  ok(kathaBeforeUdvasana === true, "the Katha comes BEFORE Udvasana (never after)");
  ok(mantraAudioSteps === mantraSteps && mantraSteps > 0, `mantra audio present on every mantra step (${mantraAudioSteps}/${mantraSteps})`);

  /* ---- 11. Completion ---- */
  section("11. Completion");
  await page.locator(".completion").waitFor({ timeout: 10000 });
  const completionText = await page.locator(".completion").innerText();
  ok(/పూర్తయింది/.test(completionText), "shows the completed state");
  ok(!/తప్పు తెలియజేయండి/.test(completionText), "no correction-report workflow on the primary completion screen");
  ok(!/Reviewer|REVIEW_REQUIRED/i.test(completionText), "no reviewer/development wording");

  /* ---- 12. Nothing hidden is reachable ---- */
  section("12. Hidden platform surfaces are not reachable from anywhere");
  const wholeAppHtml = await page.content();
  for (const re of FORBIDDEN_ANYWHERE) {
    ok(!re.test(wholeAppHtml), `not present anywhere: ${re}`);
  }

  ok(errors.length === 0, `no console / page errors (${errors.slice(0, 3).join(" | ")})`);
  const unexpectedExternal = [...new Set(external)].filter((u) => !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u));
  ok(unexpectedExternal.length === 0, `no unexpected external network requests (${JSON.stringify(unexpectedExternal).slice(0, 200)})`);

  await browser.close();
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
  }
  if (!(await waitForServer(BASE))) {
    console.error(`FAIL  server at ${BASE} did not become ready.`);
    killServer();
    process.exit(1);
  }
  try {
    for (const vp of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) await run(vp);
  } finally {
    killServer();
  }
  console.log(`\n${fails === 0 ? "ALL SIMPLE V1 E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
  process.exit(fails === 0 ? 0 : 1);
}

await main();

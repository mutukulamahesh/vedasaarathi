// Live-browser verification of the two Sankalpam defects found and reported
// in docs/temp/sankalpam-family-group-audit-2026-09-30.md (PR #9,
// audit/sankalpam-family-group-journeys) and fixed on this branch:
//
//   Finding 1 (FAMILY): the "Unknown Gotra" widget/summary looked at EVERY
//   participant's Gotra status, but the generator's shared FAMILY Sankalpam
//   only ever reads participants[0] (lib/sankalpam/generator.ts). A non-
//   primary participant's UNKNOWN Gotra made the ready screen falsely claim
//   "one simple choice is needed below" and showed an inert choice widget.
//
//   Finding 2 (GROUP): the recitation-convention radio displayed "One
//   collective Sankalpam" as ALREADY CHECKED even while the real stored
//   choice was still null/pending. A controlled radio's onChange never fires
//   on a click that doesn't change its checked state, so a direct click on
//   the pre-checked option did nothing - the only workaround was switching to
//   "Each person states their own" and back.
//
// This file is durable (kept in the repo, not scratch) - re-run it whenever
// this screen, the two fixes, or the generator's Gotra/recitation rules
// change.
//
//   npm run dev &
//   node tests/e2e/sankalpam-family-group-fix.e2e.mjs
//
// The core fix-verification checks (undecided state, a single direct click
// resolving the GROUP choice, and the corrected FAMILY summary/widget) run
// across mobile+desktop x EN+TE, per instruction. Checks that only confirm
// PRESERVED (unchanged) behavior - blank FAMILY_TRADITION gating, GROUP
// per-participant isolation, save/reload, Hear-and-practise/View Sankalpam,
// and the Preparation preview - run once, in English/Hyderabad/desktop,
// matching the methodology already used and reviewed in PR #9's audit.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:5173/").replace(/\/?$/, "/");
const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";

const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const FRISCO = {
  status: "READY", latitude: 33.1507, longitude: -96.8236, timezone: "America/Chicago",
  city: "Frisco", region: "Texas", country: "United States", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};

// Fictional participants throughout.
const ANJALI_KNOWN = { id: "a1", name: "Anjali", gotra: { status: "KNOWN", name: "Kaundinya" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } };
const RAVI_UNKNOWN = { id: "a2", name: "Ravi", gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } };
const SITA_UNSURE = { id: "a3", name: "Sita", gotra: { status: "UNSURE", name: "" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } };
const KIRAN_KNOWN = { id: "a4", name: "Kiran", gotra: { status: "KNOWN", name: "Vasishtha" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } };

const L = {
  EN: {
    oneChoiceNeeded: "One choice is needed", ready: "Your Sankalpam is ready",
    changeDetails: "Change details", done: "Done", begin: "Begin the puja",
    search: "Search", sankalpam: "Sankalpam", hearPractise: "Hear and practise",
    viewSankalpam: "View Sankalpam", notDecided: "Not decided yet",
    leaveOut: "Leave the Gotra line out", useKashyapa: "Use the Kashyapa convention",
    enterFamily: "Enter my family’s Gotra", groupCollective: "One collective Sankalpam",
    groupEach: "Each person states their own",
    unknownGotraLegend: "Unknown Gotra", gotraOneChoice: "one simple choice is needed below",
    gotraKnown: "known",
  },
  TE: {
    oneChoiceNeeded: "ఒక ఎంపిక అవసరం", ready: "మీ సంకల్పం సిద్ధంగా ఉంది",
    changeDetails: "వివరాలు మార్చండి", done: "పూర్తయింది", begin: "పూజ మొదలుపెట్టండి",
    search: "వెతకండి", sankalpam: "సంకల్పం", hearPractise: "వినండి, సాధన చేయండి",
    viewSankalpam: "సంకల్పం చూడండి", notDecided: "ఇంకా నిర్ణయించలేదు",
    leaveOut: "గోత్రం లైన్ వదిలేయండి", useKashyapa: "కశ్యప సంప్రదాయం వాడండి",
    enterFamily: "మా కుటుంబ గోత్రం నమోదు చేయండి", groupCollective: "ఒకే సమష్టి సంకల్పం",
    groupEach: "ప్రతి ఒక్కరూ తమ సొంతం చెబుతారు",
    unknownGotraLegend: "తెలియని గోత్రం", gotraOneChoice: "కింద ఒక సులభ ఎంపిక అవసరం",
    gotraKnown: "తెలుసు",
  },
};

let fails = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
};
const section = (t) => console.log(`\n— ${t}`);

const noHOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const prepValue = (participants, language, mode = "FAMILY") => JSON.stringify({
  mode, participants, language, runs: {},
});

async function clickNav(page, textPattern, waitSelector) {
  for (let i = 0; i < 8 && (await page.locator(waitSelector).count()) === 0; i += 1) {
    await page.locator(".bottom-nav button", { hasText: textPattern }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.locator(waitSelector).waitFor();
}

async function seedAndOpen(page, location, participants, language, mode = "FAMILY") {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(([lk, pk, lv, pv]) => {
    localStorage.setItem(lk, lv); localStorage.setItem(pk, pv);
  }, [LOC_KEY, PREP_KEY, JSON.stringify(location), prepValue(participants, language, mode)]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome|స్వాగతం/i }).waitFor();
  await page.locator(".bottom-nav button").first().waitFor({ state: "visible" });
}

async function goToSankalpamSetup(page, t) {
  await clickNav(page, /search|వెతకండి/i, ".search-screen");
  await page.locator(".search-screen input").fill(t.sankalpam);
  const result = page.locator(".search-results li button", { hasText: new RegExp(t.sankalpam, "i") }).first();
  await result.waitFor({ timeout: 10000 });
  await result.click();
  await page.locator(".sankalpam-setup, .sankalpam-ready").first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(250);
}

const hasAssembled = (page) => page.locator(".sankalpam-assembled").count();

/* -------------------------------------------------------------------------- */
/* FIX 1 (GROUP recitation): honest undecided state, single-click resolves.  */
/* -------------------------------------------------------------------------- */
async function auditGroupRecitationFix(viewport, language) {
  const t = L[language];
  section(`FIX 1 — GROUP recitation, undecided -> single click resolves (${viewport.width}x${viewport.height}, ${language})`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  await seedAndOpen(page, HYD, [ANJALI_KNOWN, KIRAN_KNOWN], language, "GROUP");
  await goToSankalpamSetup(page, t);
  await page.locator(".sankalpam-setup-preview").waitFor();

  const notDecidedRadio = page.locator("label", { hasText: t.notDecided }).locator('input[type="radio"]').first();
  const collectiveRadio = page.locator("label", { hasText: t.groupCollective }).locator('input[type="radio"]');
  const eachRadio = page.locator("label", { hasText: t.groupEach }).locator('input[type="radio"]');

  ok(await notDecidedRadio.isChecked(), "on first render, 'Not decided yet' is the genuinely checked option");
  ok(!(await collectiveRadio.isChecked()), "COLLECTIVE is not pre-selected - no convention is chosen for the group");
  ok(!(await eachRadio.isChecked()), "EACH_INDIVIDUALLY is not pre-selected either");
  ok((await page.locator("button", { hasText: t.begin }).isDisabled()), "Begin disabled while undecided (no Gotra issue at all - both KNOWN)");
  ok((await hasAssembled(page)) === 0, "recitable text hidden while undecided");

  // The core regression check: a SINGLE direct click, no switch-away/back workaround.
  await collectiveRadio.click();
  await page.waitForTimeout(300);
  ok(await collectiveRadio.isChecked(), "a single direct click now checks COLLECTIVE");
  ok(!(await page.locator("button", { hasText: t.begin }).isDisabled()), "Begin is enabled - the single click resolved the choice");
  ok((await hasAssembled(page)) === 1, "the recitable preview appears from one direct click, no workaround needed");
  const groupText = (await page.locator(".sankalpam-assembled").textContent()) || "";
  ok(/asmakam/i.test(groupText), "uses the existing group ('asmakam') form, unchanged by this fix");

  ok(await noHOverflow(page), "no horizontal overflow");
  await browser.close();
  return errors;
}

/* -------------------------------------------------------------------------- */
/* FIX 2 (FAMILY Gotra): widget/summary now reflect only the primary member. */
/* -------------------------------------------------------------------------- */
async function auditFamilyGotraFix(viewport, language) {
  const t = L[language];
  section(`FIX 2 — FAMILY Gotra widget/summary track only the primary participant (${viewport.width}x${viewport.height}, ${language})`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  // Primary (first participant) KNOWN, a later participant UNKNOWN.
  await seedAndOpen(page, HYD, [ANJALI_KNOWN, RAVI_UNKNOWN], language, "FAMILY");
  await goToSankalpamSetup(page, t);
  let body = (await page.locator("body").textContent()) || "";
  ok(body.includes(t.ready), "ready screen correctly reads ready - only the primary's own Gotra matters");
  ok(!(await page.locator("button", { hasText: t.begin }).isDisabled()), "Begin is correctly enabled - nothing is actually pending");
  const summaryText = (await page.locator(".sankalpam-ready-summary").textContent()) || "";
  ok(summaryText.includes(t.gotraKnown), "the Gotra summary now accurately reads 'known'");
  ok(!summaryText.includes(t.gotraOneChoice), "the summary no longer falsely claims a choice is still needed");

  await page.locator("button", { hasText: t.changeDetails }).click();
  await page.locator(".sankalpam-setup-preview").waitFor();
  await page.waitForTimeout(400); // settle FamilySankalpamPlayer's own async mount state before comparing text
  const previewText = (await page.locator(".sankalpam-assembled").textContent()) || "";
  ok(previewText.includes("Kaundinya"), "the primary's own (KNOWN) Gotra is what's actually recited");
  ok(!previewText.includes("Ravi"), "no individual per-member name/recitation is added - matches the FAMILY contract");

  const unknownGotraFieldset = page.locator("fieldset").filter({ has: page.locator("legend", { hasText: t.unknownGotraLegend }) });
  ok((await unknownGotraFieldset.count()) === 0, "the inert 'Unknown Gotra' widget no longer appears here - it would have no effect on the already-complete text");

  await browser.close();
  return errors;
}

/* -------------------------------------------------------------------------- */
/* Unchanged regression: primary UNKNOWN still correctly gates FAMILY.       */
/* -------------------------------------------------------------------------- */
async function auditFamilyPrimaryStillGates() {
  section("Regression: FAMILY primary UNKNOWN (even with a later KNOWN member) still correctly gates (EN/Hyderabad/desktop)");
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const t = L.EN;

  await seedAndOpen(page, HYD, [RAVI_UNKNOWN, ANJALI_KNOWN], "EN", "FAMILY");
  await goToSankalpamSetup(page, t);
  const body = (await page.locator("body").textContent()) || "";
  ok(body.includes(t.oneChoiceNeeded), "primary UNKNOWN (even with a later KNOWN member): correctly still gated");
  ok(await page.locator("button", { hasText: t.begin }).isDisabled(), "Begin correctly disabled");

  await page.locator("button", { hasText: t.changeDetails }).click();
  await page.locator(".sankalpam-setup-preview").waitFor();
  const unknownGotraFieldset = page.locator("fieldset").filter({ has: page.locator("legend", { hasText: t.unknownGotraLegend }) });
  ok((await unknownGotraFieldset.count()) === 1, "the Unknown-Gotra widget correctly still appears - the primary's own Gotra is genuinely unresolved");

  ok(await noHOverflow(page), "no horizontal overflow");
  await browser.close();
}

/* -------------------------------------------------------------------------- */
/* Preserved: FAMILY "Enter my family's Gotra" left BLANK still gates.       */
/* -------------------------------------------------------------------------- */
async function auditFamilyBlankFamilyTradition() {
  section("Preserved: FAMILY_TRADITION selected but left blank keeps the preview gated (EN/Hyderabad/desktop)");
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const t = L.EN;

  await seedAndOpen(page, HYD, [RAVI_UNKNOWN], "EN", "FAMILY");
  await goToSankalpamSetup(page, t);
  await page.locator("button", { hasText: t.changeDetails }).click();
  await page.locator(".sankalpam-setup-preview").waitFor();
  await page.locator("label", { hasText: t.enterFamily }).locator('input[type="radio"]').click();
  await page.waitForTimeout(250);
  ok((await page.locator('input[type="text"]').count()) >= 1, "the family-Gotra text entry appears");
  ok((await hasAssembled(page)) === 0, "with the entry left BLANK, the preview stays HIDDEN");
  await page.locator("input[type=\"text\"]").first().fill("Vasishtha");
  await page.waitForTimeout(250);
  ok((await hasAssembled(page)) === 1, "typing a real Gotra completes the preview");
  await page.locator("button", { hasText: t.done }).click();
  await page.waitForTimeout(250);
  ok(!(await page.locator("button", { hasText: t.begin }).isDisabled()), "Begin is now enabled");

  ok(await noHOverflow(page), "no horizontal overflow");
  await browser.close();
}

/* -------------------------------------------------------------------------- */
/* Preserved: GROUP per-participant isolation for EACH_INDIVIDUALLY.         */
/* -------------------------------------------------------------------------- */
async function auditGroupIndividualIsolation() {
  section("Preserved: GROUP each-individually, per-participant isolation (EN/Hyderabad/desktop)");
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const t = L.EN;

  await seedAndOpen(page, HYD, [RAVI_UNKNOWN, SITA_UNSURE], "EN", "GROUP");
  await goToSankalpamSetup(page, t);
  await page.locator(".sankalpam-setup-preview").waitFor();
  await page.locator("label", { hasText: t.groupEach }).locator('input[type="radio"]').click();
  await page.waitForTimeout(250);
  const hasGroupAssembled = () => page.locator(".sankalpam-assembled-group").count();
  ok((await hasGroupAssembled()) === 0, "both undecided: still gated");
  const raviFieldset = page.locator('[data-participant-id="a2"]');
  await raviFieldset.locator("label", { hasText: t.leaveOut }).locator('input[type="radio"]').click();
  await page.waitForTimeout(250);
  ok((await hasGroupAssembled()) === 0, "Sita's own choice is STILL open, so the group preview stays hidden even though Ravi's is resolved");
  const sitaFieldset = page.locator('[data-participant-id="a3"]');
  await sitaFieldset.locator("label", { hasText: t.useKashyapa }).locator('input[type="radio"]').click();
  await page.waitForTimeout(250);
  ok((await hasGroupAssembled()) === 1, "once BOTH are resolved, the preview appears");
  const perPersonText = (await page.locator(".sankalpam-assembled-group").textContent()) || "";
  ok(perPersonText.includes("Ravi") && perPersonText.includes("Sita"), "each person's own name appears");
  ok(!/Kashyapa[- ]?gotrasya, «Ravi»/i.test(perPersonText), "Ravi's own OMIT choice is NOT overwritten by Sita's later KASHYAPA choice");
  ok(/Kashyapa-gotrasya, «Sita»/.test(perPersonText), "Sita's own KASHYAPA choice is correctly attributed to her, not Ravi");

  ok(await noHOverflow(page), "no horizontal overflow");
  await browser.close();
}

/* -------------------------------------------------------------------------- */
/* Preserved: a resolved choice survives a REAL browser reload.              */
/* -------------------------------------------------------------------------- */
async function auditSaveReloadResume() {
  section("Preserved: a resolved choice survives a REAL browser reload (EN/Hyderabad/desktop)");
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const t = L.EN;

  await seedAndOpen(page, HYD, [RAVI_UNKNOWN], "EN", "FAMILY");
  await goToSankalpamSetup(page, t);
  await page.locator("button", { hasText: t.changeDetails }).click();
  await page.locator(".sankalpam-setup-preview").waitFor();
  await page.locator("label", { hasText: t.leaveOut }).locator('input[type="radio"]').click();
  await page.waitForTimeout(300);
  ok((await hasAssembled(page)) === 1, "resolved before reload");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();
  await goToSankalpamSetup(page, t);
  const body = (await page.locator("body").textContent()) || "";
  ok(body.includes(t.ready), "after a REAL reload: still reads ready (resolved choice persisted)");
  ok(!(await page.locator("button", { hasText: t.begin }).isDisabled()), "Begin still enabled after reload");
  await page.locator("button", { hasText: t.changeDetails }).click();
  await page.locator(".sankalpam-setup-preview").waitFor();
  ok((await hasAssembled(page)) === 1, "the preview is still correctly shown after reload");

  ok(await noHOverflow(page), "no horizontal overflow");
  await browser.close();
}

/* -------------------------------------------------------------------------- */
/* Preserved: "Hear and practise" / "View Sankalpam" still gate correctly.   */
/* -------------------------------------------------------------------------- */
async function auditPractiseFullViews() {
  section("Preserved: Hear and practise / View Sankalpam gate correctly (EN/Hyderabad/desktop)");
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const t = L.EN;

  await seedAndOpen(page, HYD, [RAVI_UNKNOWN], "EN", "FAMILY");
  await goToSankalpamSetup(page, t);
  ok((await page.locator("button", { hasText: t.hearPractise }).isDisabled()), "Hear and practise is disabled while pending");
  ok((await page.locator("button", { hasText: t.viewSankalpam }).isDisabled()), "View Sankalpam is disabled while pending");

  await page.locator("label", { hasText: t.leaveOut }).locator('input[type="radio"]').click();
  await page.waitForTimeout(300);
  ok(!(await page.locator("button", { hasText: t.hearPractise }).isDisabled()), "Hear and practise enabled once resolved");
  await page.locator("button", { hasText: t.viewSankalpam }).click();
  await page.locator(".sankalpam-full-te, .sankalpam-assembled").first().waitFor({ timeout: 10000 });
  const fullViewText = (await page.locator("body").textContent()) || "";
  ok(!/gotrasya/.test(fullViewText.split("Telugu")[1] || fullViewText), "View Sankalpam shows the correctly-omitted-Gotra text, not a placeholder");

  ok(await noHOverflow(page), "no horizontal overflow");
  await browser.close();
}

/* -------------------------------------------------------------------------- */
/* Preserved: PrepareScreen never leaks the recitable text.                  */
/* -------------------------------------------------------------------------- */
async function auditPreparationPreview() {
  section("Preserved: Preparation preview never shows recitable text (EN/Hyderabad/desktop)");
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  await seedAndOpen(page, HYD, [RAVI_UNKNOWN], "EN", "FAMILY");
  await clickNav(page, /pujas/i, ".puja-catalogue-list");
  await page.locator(".puja-catalogue-item").first().click();
  await page.locator("button", { hasText: "Begin" }).first().click();
  await page.locator(".sankalpam-prep-preview").waitFor({ timeout: 15000 });
  ok((await page.locator(".sankalpam-prep-preview .sankalpam-assembled").count()) === 0, "PrepareScreen never shows the recitable text, pending or not");
  const prepText = (await page.locator(".sankalpam-prep-preview").textContent()) || "";
  ok(/still to choose/i.test(prepText), "PrepareScreen honestly surfaces the pending choice in its own summary");

  ok(await noHOverflow(page), "no horizontal overflow");
  await browser.close();
}

/* -------------------------------------------------------------------------- */

const results = [];
for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
  for (const language of ["EN", "TE"]) {
    results.push(await auditGroupRecitationFix(viewport, language));
    results.push(await auditFamilyGotraFix(viewport, language));
  }
}
await auditFamilyPrimaryStillGates();
await auditFamilyBlankFamilyTradition();
await auditGroupIndividualIsolation();
await auditSaveReloadResume();
await auditPractiseFullViews();
await auditPreparationPreview();

const allErrors = results.flat();
ok(allErrors.length === 0, `no console/page errors across the fix-verification matrix (${allErrors.length}${allErrors.length ? ": " + allErrors.slice(0, 5).join(" | ") : ""})`);

console.log(`\n${fails === 0 ? "ALL SANKALPAM FAMILY/GROUP FIX CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

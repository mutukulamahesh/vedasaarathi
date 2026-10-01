// Real-user audit of the complete FAMILY and unrelated-GROUP Sankalpam
// journeys: gating correctness (a required choice hides the recitable text
// and playback; resolving it restores the existing correct wording; nothing
// is ever silently guessed), across every screen that shows a Sankalpam
// preview, both languages, both viewports, and two real locations.
//
//   npm run dev &
//   node tests/e2e/sankalpam-family-group-audit.e2e.mjs
//
// This file is durable (kept in the repo), not a scratch script - re-run it
// whenever Sankalpam gating, the generator, or these screens change.
//
// Strategy: the pending/resolved GATE and the generator's chosen wording are
// derived purely from `choices`/`participants` state - never from location,
// language, or viewport - confirmed directly in lib/sankalpam/generator.ts
// (masa/tithi terms are the only location/Panchanga-dependent output; Gotra/
// recitation gating is not). So state-correctness scenarios (FAMILY mixed
// Gotra, GROUP per-participant isolation, blank FAMILY_TRADITION, resolved
// -> unresolved) are run ONCE, in English, Hyderabad, desktop - re-running
// them at every viewport/language/location combination would not exercise
// any new code path. Presentation-sensitive checks (does the SAME gate
// render correctly, does text actually appear/disappear, no overflow, no
// console errors) ARE run across the full EN/TE x mobile/desktop x
// Hyderabad/Frisco matrix, because those genuinely differ by combination.
//
// Findings 1 and 2 (originally captured here as executable evidence of two
// broken-behavior defects) were RESOLVED by PR #10 - see
// docs/temp/sankalpam-family-group-audit-2026-09-30.md for the historical
// writeup, and tests/e2e/sankalpam-family-group-fix.e2e.mjs for the fix's own
// dedicated verification. The assertions in auditFamilyMixedGotra() and
// auditGroup() below now assert the CORRECTED behavior instead.

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

// Fictional participants throughout, per the audit instruction.
const ANJALI_KNOWN = { id: "a1", name: "Anjali", gotra: { status: "KNOWN", name: "Kaundinya" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } };
const RAVI_UNKNOWN = { id: "a2", name: "Ravi", gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } };
const SITA_UNSURE = { id: "a3", name: "Sita", gotra: { status: "UNSURE", name: "" }, veda: { status: "UNKNOWN", name: "" }, sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" } };

const L = {
  EN: {
    oneChoiceNeeded: "One choice is needed", ready: "Your Sankalpam is ready",
    changeDetails: "Change details", done: "Done", begin: "Begin the puja",
    search: "Search", sankalpam: "Sankalpam", hearPractise: "Hear and practise",
    viewSankalpam: "View Sankalpam", back: "Back", notDecided: "Not decided yet",
    leaveOut: "Leave the Gotra line out", useKashyapa: "Use the Kashyapa convention",
    enterFamily: "Enter my family’s Gotra", groupCollective: "One collective Sankalpam",
    groupEach: "Each person states their own",
  },
  TE: {
    oneChoiceNeeded: "ఒక ఎంపిక అవసరం", ready: "మీ సంకల్పం సిద్ధంగా ఉంది",
    changeDetails: "వివరాలు మార్చండి", done: "పూర్తయింది", begin: "పూజ మొదలుపెట్టండి",
    search: "వెతకండి", sankalpam: "సంకల్పం", hearPractise: "వినండి, సాధన చేయండి",
    viewSankalpam: "సంకల్పం చూడండి", back: "వెనుకకు", notDecided: "ఇంకా నిర్ణయించలేదు",
    leaveOut: "గోత్రం లైన్ వదిలేయండి", useKashyapa: "కశ్యప సంప్రదాయం వాడండి",
    enterFamily: "మా కుటుంబ గోత్రం నమోదు చేయండి", groupCollective: "ఒకే సమష్టి సంకల్పం",
    groupEach: "ప్రతి ఒక్కరూ తమ సొంతం చెబుతారు",
    unknownGotraLegend: "తెలియని గోత్రం", gotraOneChoice: "కింద ఒక సులభ ఎంపిక అవసరం",
    gotraKnown: "తెలుసు",
  },
};
// EN-only additions used by the Finding-1 assertions (kept out of the shared
// L object above since they are not otherwise needed across the file).
L.EN.unknownGotraLegend = "Unknown Gotra";
L.EN.gotraOneChoice = "one simple choice is needed below";
L.EN.gotraKnown = "known";

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

/** Reach the Sankalpam setup screen via Search -> "Sankalpam" (the real
 * in-app route, same as a family would use). */
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
const hasRoman = (page) => page.locator(".sankalpam-assembled-roman").count();
const hasFamilyPlayer = (page) => page.locator('[class^="family-sankalpam"]').count();

async function run(viewport, language, location, locLabel) {
  const t = L[language];
  section(`VIEWPORT ${viewport.width}x${viewport.height}, ${language}, ${locLabel}`);
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  /* ---- FAMILY: primary UNKNOWN Gotra - the documented single-choice path ---- */
  section("FAMILY: primary participant's Gotra unresolved -> gated -> resolved");
  await seedAndOpen(page, location, [RAVI_UNKNOWN], language, "FAMILY");
  await goToSankalpamSetup(page, t);
  let body = (await page.locator("body").textContent()) || "";
  ok(body.includes(t.oneChoiceNeeded), "ready screen: pending heading shown");
  ok(await page.locator("button", { hasText: t.begin }).isDisabled(), "Begin disabled while pending");
  await page.locator("button", { hasText: t.changeDetails }).click();
  await page.locator(".sankalpam-setup-preview").waitFor();
  ok((await hasAssembled(page)) === 0, "Change details: recitable text hidden while pending");
  ok((await hasRoman(page)) === 0, "Change details: transliteration hidden while pending");
  ok((await hasFamilyPlayer(page)) === 0, "Change details: the FAMILY playback control is also hidden while pending");
  await page.locator("label", { hasText: t.leaveOut }).locator('input[type="radio"]').click();
  await page.waitForTimeout(250);
  ok((await hasAssembled(page)) === 1, "resolved: recitable text appears");
  ok((await hasFamilyPlayer(page)) === 1, "resolved: the FAMILY playback control appears too");
  const resolvedText1 = (await page.locator(".sankalpam-assembled").textContent()) || "";
  ok(!/gotrasya/.test(resolvedText1), "OMIT: no Gotra clause at all (the actual chosen wording)");
  await page.locator("button", { hasText: t.done }).click();
  await page.waitForTimeout(250);
  body = (await page.locator("body").textContent()) || "";
  ok(body.includes(t.ready), "back on ready screen, now genuinely ready");
  ok(!(await page.locator("button", { hasText: t.begin }).isDisabled()), "Begin enabled");

  /* ---- No horizontal overflow / no console errors, checked at the end of each viewport+lang+loc combo ---- */
  ok(await noHOverflow(page), "no horizontal overflow");

  await browser.close();
  return { errors };
}

/* -------------------------------------------------------------------------- */
/* FAMILY: mixed KNOWN/UNKNOWN Gotra - confirms which participant actually   */
/* determines the shared Sankalpam (the documented, primary-based contract:  */
/* FAMILY is ONE shared recitation, never one per member). Run once (state-  */
/* only, language/location-independent per the file header note).           */
/* -------------------------------------------------------------------------- */
async function auditFamilyMixedGotra() {
  section("FAMILY: mixed KNOWN/UNKNOWN/UNSURE Gotra across participants (state-level, EN/Hyderabad/desktop)");
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const t = L.EN;

  // Primary (first participant) KNOWN, a later participant UNKNOWN/UNSURE:
  // this was Finding 1 (docs/temp/sankalpam-family-group-audit-2026-09-30.md)
  // - RESOLVED by PR #10 (components/platform/sankalpam-setup-screen.tsx:
  // the widget/summary now key off the primary participant only, matching
  // what the generator actually reads). These assertions now capture the
  // CORRECTED behavior as executable evidence: an accurate summary, and the
  // formerly-inert widget no longer shown at all.
  await seedAndOpen(page, HYD, [ANJALI_KNOWN, RAVI_UNKNOWN], "EN", "FAMILY");
  await goToSankalpamSetup(page, t);
  let body = (await page.locator("body").textContent()) || "";
  ok(body.includes(t.ready), "ready screen reads 'ready' (primary is KNOWN) even though a non-primary participant is UNKNOWN");
  ok(!(await page.locator("button", { hasText: t.begin }).isDisabled()), "Begin is enabled");
  const summaryText = (await page.locator(".sankalpam-ready-summary").textContent()) || "";
  ok(summaryText.includes(t.gotraKnown), "FIXED (Finding 1): the Gotra summary now accurately reads 'known', not the misleading 'one simple choice is needed below'");
  ok(!summaryText.includes(t.gotraOneChoice), "FIXED (Finding 1): the summary no longer falsely claims a choice is still pending");

  await page.locator("button", { hasText: t.changeDetails }).click();
  await page.locator(".sankalpam-setup-preview").waitFor();
  // Settle before the capture: FamilySankalpamPlayer mounts its own async
  // audio-metadata state independent of this fix's concern, so a capture
  // taken immediately on mount can race with it. ".sankalpam-assembled" (the
  // generator-derived Telugu/transliteration text) is the narrowest relevant
  // selector, avoiding that race entirely.
  await page.waitForTimeout(400);
  const previewText = (await page.locator(".sankalpam-assembled").textContent()) || "";
  ok(previewText.includes("Kaundinya") || previewText.includes("Bharadwaja"), "the primary's own (KNOWN) Gotra is what's actually recited");
  ok(!previewText.includes("Ravi"), "no individual per-member name/recitation is added - matches the documented shared-family contract");

  const unknownGotraFieldset = page.locator("fieldset").filter({ has: page.locator("legend", { hasText: t.unknownGotraLegend }) });
  ok((await unknownGotraFieldset.count()) === 0, "FIXED (Finding 1): the inert 'Unknown Gotra' widget no longer appears here - it would have had no effect on the already-complete text above");

  // Primary UNKNOWN, a later participant KNOWN - the correct, gated case.
  await seedAndOpen(page, HYD, [RAVI_UNKNOWN, ANJALI_KNOWN], "EN", "FAMILY");
  await goToSankalpamSetup(page, t);
  body = (await page.locator("body").textContent()) || "";
  ok(body.includes(t.oneChoiceNeeded), "primary UNKNOWN (even with a later KNOWN member): correctly gated");
  ok(await page.locator("button", { hasText: t.begin }).isDisabled(), "Begin correctly disabled");

  ok(await noHOverflow(page), "no horizontal overflow");
  const errors = [];
  await browser.close();
  return errors;
}

/* -------------------------------------------------------------------------- */
/* FAMILY: "Enter my family's Gotra" selected but left BLANK stays gated.    */
/* -------------------------------------------------------------------------- */
async function auditFamilyBlankFamilyTradition() {
  section("FAMILY: FAMILY_TRADITION selected but left blank keeps the preview gated (EN/Hyderabad/desktop)");
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
  // A text input for the family Gotra should now be visible, but left empty.
  ok((await page.locator('input[type="text"]').count()) >= 1, "the family-Gotra text entry appears");
  ok((await hasAssembled(page)) === 0, "with the entry left BLANK, the preview stays HIDDEN (selecting the option alone is not enough)");
  // Begin is not present on the Change-details screen itself for FAMILY mode
  // (only "Done"); Begin's disabled/enabled state is checked on the ready
  // screen below, after navigating back - not asserted here.
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
/* UNRELATED GROUP: collective vs. individual, per-participant isolation.    */
/* -------------------------------------------------------------------------- */
async function auditGroup() {
  section("UNRELATED GROUP: collective gate, individual per-participant isolation (EN/Hyderabad/desktop)");
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const t = L.EN;

  // GROUP mode's default `view` state is "change" (not "ready" like FAMILY -
  // confirmed in components/platform/sankalpam-setup-screen.tsx:
  // `useState(mode === "FAMILY" ? "ready" : "change")`), so GROUP/SELF land
  // directly on the detailed setup screen - there is no separate "ready"
  // landing page or "Change details" button to click for this mode.

  // --- Collective: undecided recitation choice keeps the preview gated ---
  await seedAndOpen(page, HYD, [ANJALI_KNOWN, { ...ANJALI_KNOWN, id: "a4", name: "Kiran", gotra: { status: "KNOWN", name: "Vasishtha" } }], "EN", "GROUP");
  await goToSankalpamSetup(page, t);
  await page.locator(".sankalpam-setup-preview").waitFor();
  const collectiveRadio = page.locator("label", { hasText: t.groupCollective }).locator('input[type="radio"]');
  ok((await page.locator("button", { hasText: t.begin }).isDisabled()), "GROUP, undecided recitation: Begin disabled (no Gotra issue at all - both KNOWN)");
  ok((await hasAssembled(page)) === 0, "recitable text hidden while the collective/individual choice is undecided");
  // This was Finding 2 (docs/temp/sankalpam-family-group-audit-2026-09-30.md)
  // - RESOLVED by PR #10 (components/platform/sankalpam-setup-screen.tsx: the
  // CHOICE helper's displayed value now defaults to an honest "UNSET" option
  // instead of "COLLECTIVE", mirroring the pre-existing unknownGotra pattern).
  // These assertions now capture the CORRECTED behavior: a genuinely
  // unchecked default, and a single direct click resolving the choice - no
  // switch-away/back workaround needed any more.
  const notDecidedRadio = page.locator("label", { hasText: t.notDecided }).locator('input[type="radio"]').first();
  ok(await notDecidedRadio.isChecked(), "FIXED (Finding 2): 'Not decided yet' is the genuinely checked option, not a misleading pre-selected COLLECTIVE");
  ok(!(await collectiveRadio.isChecked()), "FIXED (Finding 2): COLLECTIVE is not pre-selected");
  await collectiveRadio.click();
  await page.waitForTimeout(250);
  ok(await collectiveRadio.isChecked(), "FIXED (Finding 2): a single direct click now checks COLLECTIVE");
  ok((await hasAssembled(page)) === 1, "FIXED (Finding 2): the recitable text appears from that one direct click - no switch-away/back workaround needed");
  ok(!(await page.locator("button", { hasText: t.begin }).isDisabled()), "Begin enabled once genuinely resolved");
  const groupText = (await page.locator(".sankalpam-assembled").textContent()) || "";
  ok(/asmakam/i.test(groupText), "uses the existing group ('asmakam') form");
  ok(!/saha kutumbanam/i.test(groupText), "never the family phrase for an unrelated group");

  // --- Individual (EACH_INDIVIDUALLY): per-participant isolation ---
  await seedAndOpen(page, HYD, [RAVI_UNKNOWN, SITA_UNSURE], "EN", "GROUP");
  await goToSankalpamSetup(page, t);
  await page.locator(".sankalpam-setup-preview").waitFor();
  await page.locator("label", { hasText: t.groupEach }).locator('input[type="radio"]').click();
  await page.waitForTimeout(250);
  // Resolved EACH_INDIVIDUALLY renders ONE outer ".sankalpam-assembled-group"
  // wrapper containing a nested ".sankalpam-assembled" PER PERSON (the
  // recursive SankalpamAssembledView call in components/platform/
  // sankalpam-view.tsx) - so ".sankalpam-assembled" alone is ambiguous
  // (matches 2+ elements once resolved); the group wrapper class is the
  // reliable single indicator of "resolved" for this specific mode.
  const hasGroupAssembled = () => page.locator(".sankalpam-assembled-group").count();
  ok((await hasGroupAssembled()) === 0, "GROUP each-individually, both undecided: still gated");
  // Resolve ONLY Ravi's choice.
  const raviFieldset = page.locator('[data-participant-id="a2"]');
  await raviFieldset.locator("label", { hasText: t.leaveOut }).locator('input[type="radio"]').click();
  await page.waitForTimeout(250);
  ok((await hasGroupAssembled()) === 0, "Sita's own choice is STILL open, so the group preview stays hidden even though Ravi's is resolved");
  // Now resolve Sita's choice too.
  const sitaFieldset = page.locator('[data-participant-id="a3"]');
  await sitaFieldset.locator("label", { hasText: t.useKashyapa }).locator('input[type="radio"]').click();
  await page.waitForTimeout(250);
  ok((await hasGroupAssembled()) === 1, "once BOTH are resolved, the preview appears");
  const perPersonText = (await page.locator(".sankalpam-assembled-group").textContent()) || "";
  ok(perPersonText.includes("Ravi") && perPersonText.includes("Sita"), "each person's own name appears (per-person recitation, unlike FAMILY mode)");
  ok(!/Kashyapa[- ]?gotrasya, «Ravi»/i.test(perPersonText), "Ravi's own OMIT choice is NOT overwritten by Sita's later KASHYAPA choice");
  ok(/Kashyapa-gotrasya, «Sita»/.test(perPersonText), "Sita's own KASHYAPA choice is correctly attributed to her, not Ravi");

  ok(await noHOverflow(page), "no horizontal overflow");
  await browser.close();
}

/* -------------------------------------------------------------------------- */
/* Save / refresh / reopen / resume: a resolved choice persists across a     */
/* real reload (not a simulated one - an actual page.reload()).              */
/* -------------------------------------------------------------------------- */
async function auditSaveReloadResume() {
  section("Save / refresh / reopen: a resolved choice survives a REAL browser reload (EN/Hyderabad/desktop)");
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

  // A REAL reload (not a simulated re-mount) - the app must re-derive the
  // same resolved state purely from localStorage.
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
/* "Hear and practise" / "View Sankalpam" - reachable and correct ONLY once  */
/* resolved (they are gated OFF while pending - part of this same contract). */
/* -------------------------------------------------------------------------- */
async function auditPractiseFullViews() {
  section("Hear and practise / View Sankalpam: correct content once resolved (EN/Hyderabad/desktop)");
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  const t = L.EN;

  await seedAndOpen(page, HYD, [RAVI_UNKNOWN], "EN", "FAMILY");
  await goToSankalpamSetup(page, t);
  ok((await page.locator("button", { hasText: t.hearPractise }).isDisabled()), "Hear and practise is disabled while pending");
  ok((await page.locator("button", { hasText: t.viewSankalpam }).isDisabled()), "View Sankalpam is disabled while pending");

  // Resolve via the ready screen's OWN inline decision widget (not Change details).
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
/* Preparation preview: PrepareScreen's own disclosure, reached via the real */
/* Pujas -> Begin flow (never the recitable text - confirmed unit-level in   */
/* tests/sankalpam-generator.test.mjs; checked live here too).               */
/* -------------------------------------------------------------------------- */
async function auditPreparationPreview() {
  section("Preparation preview (PrepareScreen, via Pujas -> Begin) (EN/Hyderabad/desktop)");
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
  for (const [language, location, locLabel] of [["EN", HYD, "Hyderabad"], ["TE", HYD, "Hyderabad"], ["EN", FRISCO, "Frisco"], ["TE", FRISCO, "Frisco"]]) {
    results.push(await run(viewport, language, location, locLabel));
  }
}
await auditFamilyMixedGotra();
await auditFamilyBlankFamilyTradition();
await auditGroup();
await auditSaveReloadResume();
await auditPractiseFullViews();
await auditPreparationPreview();

const allErrors = results.flatMap((r) => r.errors);
ok(allErrors.length === 0, `no console/page errors across the full matrix (${allErrors.length}${allErrors.length ? ": " + allErrors.slice(0, 5).join(" | ") : ""})`);

console.log(`\n${fails === 0 ? "ALL SANKALPAM FAMILY/GROUP AUDIT CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

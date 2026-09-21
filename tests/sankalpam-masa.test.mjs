// The Sankalpam's month (Masa) slot must come from the validated Amanta
// result - the same one Home and Calendar show - never the legacy `masa`
// field (a same-instant solar-Raasi value historically mislabelled
// "Purnimanta" in this codebase; confirmed wrong during an Adhika-masa
// stretch). See docs/temp/amanta-masa-validation-2026-09-14.md for the
// directly-fetched drikpanchang.com values every fixture date below is drawn
// from, and lib/panchanga/engine.ts's amantaMasaFromMoonMasa doc comment for
// the underlying derivation.
//
// This file exercises the ACTUAL generated Sankalpam through the real
// pipeline (panchangaForLocation -> panchangaToSlots -> generateSankalpam),
// not just the panchangaToSlots helper in isolation - the requirement is
// that the intended month reaches the FINAL Telugu text and the Roman
// transliteration, not merely an intermediate slot value.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");
const { panchangaToSlots } = await vite.ssrLoadModule("/lib/sankalpam/from-app.ts");
const { generateSankalpam } = await vite.ssrLoadModule("/lib/sankalpam/generator.ts");
const { familyAudioMatchesGen, STANDARD_SHORT_FAMILY_CHOICES } =
  await vite.ssrLoadModule("/lib/sankalpam/family-audio.ts");
const { localWallToUtcMs } = await vite.ssrLoadModule("/lib/panchanga/engine.ts");
const { defaultSankalpamChoices } = await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const page = await vite.ssrLoadModule("/app/page.tsx");

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

const PERSON = {
  name: "Mahesh",
  lineage: {
    gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
    sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
  },
};

/** Real panchanga + real generated Sankalpam for a civil date/location. */
async function generatedFor(location, y, mo, da, choices) {
  const dateMs = localWallToUtcMs(y, mo, da, 12, 0, 0, location.timezone);
  const p = await panchangaForLocation(location, dateMs);
  const slots = panchangaToSlots(p);
  const gen = generateSankalpam({
    purpose: "Vinayaka Chavithi puja",
    groupMode: "INDIVIDUAL",
    people: [PERSON],
    place: { country: location.country, region: location.region, timezone: location.timezone },
    localDateISO: `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`,
    panchanga: slots,
    choices,
  });
  return { p, slots, gen };
}

test("Hyderabad, ordinary Krishna Paksha (2026-11-05): the generated Sankalpam speaks Ashvina, not the legacy Kartika", async () => {
  const { slots, gen } = await generatedFor(HYD, 2026, 11, 5);
  assert.equal(slots.masa, "Ashvina", "panchangaToSlots reads the Amanta value");
  assert.equal(gen.calendarForm, "FULL_DATED");
  assert.match(gen.teluguScript, /ఆశ్వయుజ మాసే/, "Telugu recitation speaks Ashvina");
  assert.match(gen.transliteration, /Ashvina-mase/i, "Roman transliteration speaks Ashvina");
  assert.doesNotMatch(gen.teluguScript, /కార్తీక మాసే/, "legacy Kartika (the wrong solar value) must never be spoken");
  assert.doesNotMatch(gen.transliteration, /Kartika-mase/i);
  const masaSlot = gen.slots.find((s) => s.key === "masa");
  assert.equal(masaSlot.status, "FILLED");
  assert.doesNotMatch(masaSlot.explanation, /Purnimanta reckoning\)\. Amanta traditions name the previous month/, "the stale explanation text must be gone");
});

test("Frisco, the SAME ordinary Krishna Paksha date: also speaks Ashvina (Amanta is not host-timezone-dependent)", async () => {
  const { slots, gen } = await generatedFor(FRISCO, 2026, 11, 5);
  assert.equal(slots.masa, "Ashvina");
  assert.match(gen.teluguScript, /ఆశ్వయుజ మాసే/);
  assert.match(gen.transliteration, /Ashvina-mase/i);
});

test("Hyderabad, a second ordinary Krishna Paksha date (2026-12-26): speaks Margashirsha, not legacy Pausha", async () => {
  const { slots, gen } = await generatedFor(HYD, 2026, 12, 26);
  assert.equal(slots.masa, "Margashirsha");
  assert.match(gen.teluguScript, /మార్గశిర మాసే/);
  assert.match(gen.transliteration, /Margashirsha-mase/i);
  assert.doesNotMatch(gen.teluguScript, /పుష్య మాసే/, "legacy Pausha must not be spoken");
});

test("Hyderabad, the 2026 Adhika Jyeshtha window: full dated form is not offered yet - falls back to SHORT with a bilingual, sourced explanation; nothing invented", async () => {
  for (const [y, mo, da] of [[2026, 5, 26], [2026, 5, 27]]) {
    const { slots, gen } = await generatedFor(HYD, y, mo, da);
    assert.equal(slots.masa, "Jyeshtha", "panchangaToSlots itself is unaffected - it still reads the real Amanta value");
    assert.equal(slots.isAdhikaMasa, true);
    // The user's requested choice (left at the default) is never silently
    // altered; only the DELIVERED form differs, recorded separately.
    assert.equal(gen.calendarForm, "SHORT", "full dated is not offered for an Adhika month until sourced wording exists");
    assert.equal(gen.calendarFallbackIsAdhika, true);
    assert.match(gen.calendarFallbackReason, /Adhika/i);
    assert.ok(
      gen.calendarFallbackReasonTe && /అధిక/.test(gen.calendarFallbackReasonTe),
      "a Telugu explanation is available, not English-only",
    );
    // SHORT form never speaks a calendar slot at all - so this is trivially
    // also "no invented Adhika wording spliced into the recited text".
    assert.doesNotMatch(gen.teluguScript, /జ్యేష్ఠ|అధిక/);
    assert.doesNotMatch(gen.transliteration, /jyeshtha|adhika/i);
    const masaSlot = gen.slots.find((s) => s.key === "masa");
    assert.equal(masaSlot.status, "OMITTED_BY_CHOICE");
    assert.match(masaSlot.explanation, /Adhika/);
    assert.ok(masaSlot.sourceIds.includes("wikipedia-adhika-masa"), "the Adhika note is itself sourced");
    // The ambiguity is still carried through as an open question too - the
    // SAME text as calendarFallbackReason (openQuestions.push reuses it,
    // not a second invented message).
    assert.ok(
      gen.openQuestions.includes(gen.calendarFallbackReason),
      `openQuestions should include the Adhika fallback reason: ${JSON.stringify(gen.openQuestions)}`,
    );
  }
});

test("Hyderabad, the regular Jyeshtha immediately after 2026's Adhika month: the full dated form is available again, normally", async () => {
  for (const [y, mo, da] of [[2026, 6, 24], [2026, 6, 25]]) {
    const { slots, gen } = await generatedFor(HYD, y, mo, da);
    assert.equal(slots.masa, "Jyeshtha");
    assert.equal(slots.isAdhikaMasa, false, "this is the Nija (regular) occurrence, not the leap one");
    assert.equal(gen.calendarForm, "FULL_DATED", "no reason to fall back - the full dated form recites normally");
    assert.equal(gen.calendarFallbackReason, null);
    assert.equal(gen.calendarFallbackIsAdhika, false);
    assert.match(gen.teluguScript, /జ్యేష్ఠ మాసే/);
    const masaSlot = gen.slots.find((s) => s.key === "masa");
    assert.equal(masaSlot.status, "FILLED");
    assert.doesNotMatch(masaSlot.explanation, /Adhika \(intercalary\)/, "no Adhika note on the regular occurrence");
    assert.ok(
      !gen.openQuestions.some((q) => /Adhika/i.test(q)),
      "no Adhika open question on the regular occurrence",
    );
  }
});

test("Hyderabad, the 2026 Ugadi year-rollover boundary: the sunrise-anchored month reaches the recitation correctly on both sides", async () => {
  const eve = await generatedFor(HYD, 2026, 3, 19); // sunrise still in Amavasya - Phalguna
  assert.equal(eve.slots.masa, "Phalguna");
  assert.match(eve.gen.teluguScript, /ఫాల్గుణ మాసే/);

  const rollover = await generatedFor(HYD, 2026, 3, 20); // Ugadi - Chaitra
  assert.equal(rollover.slots.masa, "Chaitra");
  assert.match(rollover.gen.teluguScript, /చైత్ర మాసే/);
  assert.doesNotMatch(rollover.gen.teluguScript, /ఫాల్గుణ మాసే/);
});

test("unavailable Amanta data: falls back honestly to the SHORT form, never recites the legacy solar value", async () => {
  // No `masaAmanta` context entry at all - simulating an engine result from
  // before this field existed, or a partial/degraded Panchanga.
  const p = {
    fields: [{ key: "tithi", value: "Shukla Chaturthi" }, { key: "nakshatra", value: "Hasta" }],
    context: [
      { key: "samvatsara", value: "Parabhava" }, { key: "ayana", value: "Dakshinayana" },
      { key: "ritu", value: "Varsha" }, { key: "masa", value: "Bhadraba" }, // legacy field present
      { key: "paksha", value: "Shukla" }, { key: "vaara", value: "Somavara" },
    ],
    hasAny: true, festivalUnavailable: false, validation: [],
  };
  const slots = panchangaToSlots(p);
  assert.equal(slots.masa, undefined, "masa must be undefined, never silently sourced from the legacy field");

  const gen = generateSankalpam({
    purpose: "Vinayaka Chavithi puja", groupMode: "INDIVIDUAL", people: [PERSON],
    place: { country: "India", region: "Telangana", timezone: "Asia/Kolkata" },
    localDateISO: "2026-09-14", panchanga: slots,
  });
  assert.equal(gen.calendarForm, "SHORT", "falls back to short form rather than reciting an incorrect month");
  assert.match(gen.calendarFallbackReason, /masa/, "the fallback reason names masa as the missing value");
  assert.doesNotMatch(gen.teluguScript, /భాద్రపద మాసే|Bhadraba/, "the legacy solar value is never recited");
  assert.doesNotMatch(gen.transliteration, /Bhadraba-mase/i);
});

const NO_GOTRA_PERSON = {
  name: "", lineage: {
    gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" },
    sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
  },
};

test("audio-matching safeguard: an Adhika-month FAMILY Sankalpam with standard settings matches the fixed audio via its EFFECTIVE (forced-short) form", async () => {
  // The user's requested choice is left at the default (FULL_DATED) - never
  // silently overridden in what's stored; only the DELIVERED text is
  // affected, and it is byte-identical to the standard short form because
  // SHORT never speaks a month name regardless of why it was chosen.
  const dateMs = localWallToUtcMs(2026, 5, 26, 12, 0, 0, HYD.timezone);
  const p = await panchangaForLocation(HYD, dateMs);
  const slots = panchangaToSlots(p);
  const familyGen = generateSankalpam({
    purpose: "Vinayaka Chavithi puja", purposeTe: "వినాయక చవితి పూజ",
    deity: "Sri Maha Ganapati", deityTe: "శ్రీ మహాగణపతి",
    groupMode: "FAMILY", people: [NO_GOTRA_PERSON],
    place: {}, localDateISO: "2026-05-26", panchanga: slots,
    choices: { familyGotra: "", groupRecitation: null, placeDetail: "OMIT", unknownGotra: "OMIT" },
  });
  assert.equal(familyGen.calendarForm, "SHORT", "effective form is SHORT (Adhika override), even though FULL_DATED was requested");
  assert.equal(familyGen.calendarFallbackIsAdhika, true);
  assert.equal(
    familyAudioMatchesGen(familyGen), true,
    "the delivered text is byte-identical to the standard short form, so the fixed audio correctly matches it",
  );
});

test("audio-matching safeguard: an Adhika-month FAMILY Sankalpam with a non-standard setting (place clause included) still does not match", async () => {
  const dateMs = localWallToUtcMs(2026, 5, 26, 12, 0, 0, HYD.timezone);
  const p = await panchangaForLocation(HYD, dateMs);
  const slots = panchangaToSlots(p);
  const familyGen = generateSankalpam({
    purpose: "Vinayaka Chavithi puja", purposeTe: "వినాయక చవితి పూజ",
    deity: "Sri Maha Ganapati", deityTe: "శ్రీ మహాగణపతి",
    groupMode: "FAMILY", people: [NO_GOTRA_PERSON],
    place: { country: "India" }, localDateISO: "2026-05-26", panchanga: slots,
    choices: { familyGotra: "", groupRecitation: null, placeDetail: "COUNTRY_ONLY", unknownGotra: "OMIT" },
  });
  assert.equal(familyGen.calendarForm, "SHORT");
  assert.equal(
    familyAudioMatchesGen(familyGen), false,
    "a place clause makes the effective text differ from the fixed audio, Adhika override or not",
  );
});

test("audio-matching safeguard: the plain, non-Adhika SHORT-form case still matches (unchanged, not weakened by this change)", async () => {
  const shortFamilyGen = generateSankalpam({
    purpose: "Vinayaka Chavithi puja", purposeTe: "వినాయక చవితి పూజ",
    deity: "Sri Maha Ganapati", deityTe: "శ్రీ మహాగణపతి",
    groupMode: "FAMILY", people: [NO_GOTRA_PERSON],
    place: {}, localDateISO: "2026-05-26", panchanga: {},
    choices: { familyGotra: "", groupRecitation: null, ...STANDARD_SHORT_FAMILY_CHOICES },
  });
  assert.equal(familyAudioMatchesGen(shortFamilyGen), true);
});

/* -------------------------------------------------------------------------- */
/* Through the rendered Sankalpam setup screen, not just generateSankalpam()  */
/*                                                                            */
/* The FAMILY "ready" view (SankalpamSetupScreen's default for mode=FAMILY)  */
/* renders panchangaSummary() - item 1's fix. Its "change" subview (reached  */
/* via a click, so not SSR-reachable for FAMILY mode's initial render; the   */
/* SAME shared detailedForm JSX is exercised here through a non-FAMILY       */
/* mode's default view instead) renders the calendar-detail form together   */
/* with the compact live preview and the new bilingual fallback note.       */
/* -------------------------------------------------------------------------- */

const PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};

function setupHtml({ mode = "FAMILY", panchanga, language = "EN" }) {
  return renderToStaticMarkup(
    React.createElement(page.SankalpamSetupScreen, {
      activeList: [PARTICIPANT], mode, location: HYD, panchanga,
      choices: defaultSankalpamChoices(), setChoices: () => {}, begin: () => {}, back: () => {},
      purpose: "Vinayaka Chavithi puja", language,
    }),
  );
}

async function panchangaOn(location, y, mo, da) {
  const dateMs = localWallToUtcMs(y, mo, da, 12, 0, 0, location.timezone);
  return panchangaForLocation(location, dateMs);
}

test("rendered family screen (ready view), ordinary Krishna date: the summary uses Amanta (Ashvina), never legacy Kartika", async () => {
  const p = await panchangaOn(HYD, 2026, 11, 5);
  const html = setupHtml({ panchanga: p });
  assert.match(html, /Ashvina/);
  assert.doesNotMatch(html, /Kartika/);
});

test("rendered family screen (ready view), Adhika date: the summary is qualified with '(Adhika)', EN and TE", async () => {
  const p = await panchangaOn(HYD, 2026, 5, 26);
  const en = setupHtml({ panchanga: p, language: "EN" });
  assert.match(en, /Jyeshtha \(Adhika\)/);
  const teHtml = setupHtml({ panchanga: p, language: "TE" });
  assert.match(teHtml, /జ్యేష్ఠ \(అధిక\)/);
});

test("rendered setup screen (default detailed view), Adhika date: the effective SHORT text and the bilingual explanation both appear near the form", async () => {
  const p = await panchangaOn(HYD, 2026, 5, 26);
  const en = setupHtml({ mode: "SELF", panchanga: p, language: "EN" });
  assert.match(en, /Calendar detail/, "the calendar-detail form is present");
  assert.match(en, /does not yet support the full dated/i, "the bilingual note (EN) appears near the form");
  assert.doesNotMatch(en, /జ్యేష్ఠ మాసే|Jyeshtha-mase/i, "the compact preview shows the effective SHORT text, not an invented full-dated one");

  const teHtml = setupHtml({ mode: "SELF", panchanga: p, language: "TE" });
  assert.match(teHtml, /అధిక మాసానికి పూర్తి తిథి సంకల్ప పాఠం/, "the bilingual note (TE) appears near the form");
});

test("rendered setup screen (default detailed view), the following Nija month: the normal full dated form is available again", async () => {
  const p = await panchangaOn(HYD, 2026, 6, 24);
  const html = setupHtml({ mode: "SELF", panchanga: p });
  assert.match(html, /జ్యేష్ఠ మాసే/, "the compact preview shows the real full-dated recitation, month included");
  assert.doesNotMatch(html, /does not yet support the full dated/i, "no Adhika fallback note when it is not an Adhika month");
});

test("rendered family screen (ready view), Amanta unavailable: no legacy month is ever shown", async () => {
  const p = {
    fields: [{ key: "tithi", value: "Shukla Chaturthi" }, { key: "nakshatra", value: "Hasta" }],
    context: [
      { key: "samvatsara", value: "Parabhava" }, { key: "ayana", value: "Dakshinayana" },
      { key: "ritu", value: "Varsha" }, { key: "masa", value: "Bhadraba" }, // legacy field present
      { key: "paksha", value: "Shukla" }, { key: "vaara", value: "Somavara" },
    ],
    hasAny: true, festivalUnavailable: false, validation: [],
  };
  const html = setupHtml({ panchanga: p });
  assert.doesNotMatch(html, /Bhadrapada|Bhadraba/, "the legacy month is never shown when Amanta data is unavailable");
});

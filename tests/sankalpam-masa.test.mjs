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

test("Hyderabad, the 2026 Adhika Jyeshtha window: month is spoken as usual, the Adhika ambiguity is flagged, no invented wording", async () => {
  for (const [y, mo, da] of [[2026, 5, 26], [2026, 5, 27]]) {
    const { slots, gen } = await generatedFor(HYD, y, mo, da);
    assert.equal(slots.masa, "Jyeshtha");
    assert.equal(slots.isAdhikaMasa, true);
    assert.match(gen.teluguScript, /జ్యేష్ఠ మాసే/, "the month name is spoken unmodified - no invented 'Adhika' prefix in the recited text");
    assert.match(gen.transliteration, /Jyeshtha-mase/i);
    // Not invented: no fabricated Sanskrit/Telugu "adhika" qualifier is
    // spliced into the recited phrase itself.
    assert.doesNotMatch(gen.transliteration, /adhika-jyeshtha|jyeshtha-adhika/i);
    assert.doesNotMatch(gen.teluguScript, /అధిక\s*జ్యేష్ఠ|జ్యేష్ఠ\s*అధిక/);
    // The ambiguity IS carried through, honestly, as an open question -
    // never silently lost.
    assert.ok(
      gen.openQuestions.some((q) => /Adhika.*intercalary.*month/i.test(q) && /Jyeshtha/.test(q)),
      `openQuestions should flag the Adhika month: ${JSON.stringify(gen.openQuestions)}`,
    );
    const masaSlot = gen.slots.find((s) => s.key === "masa");
    assert.match(masaSlot.explanation, /Adhika \(intercalary\) month/);
    assert.ok(masaSlot.sourceIds.includes("wikipedia-adhika-masa"), "the Adhika note is itself sourced");
  }
});

test("Hyderabad, the regular Jyeshtha immediately after 2026's Adhika month: no Adhika flag, no stray note", async () => {
  for (const [y, mo, da] of [[2026, 6, 24], [2026, 6, 25]]) {
    const { slots, gen } = await generatedFor(HYD, y, mo, da);
    assert.equal(slots.masa, "Jyeshtha");
    assert.equal(slots.isAdhikaMasa, false, "this is the Nija (regular) occurrence, not the leap one");
    assert.match(gen.teluguScript, /జ్యేష్ఠ మాసే/);
    const masaSlot = gen.slots.find((s) => s.key === "masa");
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

test("audio-matching safeguard: an Adhika-month Sankalpam is never presented as matching the fixed family audio", async () => {
  // A real, FAMILY, full-dated Sankalpam during the Adhika Jyeshtha window -
  // the case the fixed audio was never recorded for.
  const dateMs = localWallToUtcMs(2026, 5, 26, 12, 0, 0, HYD.timezone);
  const p = await panchangaForLocation(HYD, dateMs);
  const slots = panchangaToSlots(p);
  const familyGen = generateSankalpam({
    purpose: "Vinayaka Chavithi puja", purposeTe: "వినాయక చవితి పూజ",
    deity: "Sri Maha Ganapati", deityTe: "శ్రీ మహాగణపతి",
    groupMode: "FAMILY", people: [PERSON],
    place: { country: "India", region: "Telangana", timezone: "Asia/Kolkata" },
    localDateISO: "2026-05-26", panchanga: slots,
    choices: { calendarForm: "FULL_DATED", placeDetail: "OMIT", unknownGotra: "OMIT" },
  });
  assert.equal(familyGen.calendarForm, "FULL_DATED");
  assert.equal(
    familyAudioMatchesGen(familyGen), false,
    "a full-dated, Adhika-month Sankalpam must never match the fixed SHORT-form family audio",
  );

  // The legitimate SHORT-form case still matches, confirming the safeguard
  // itself was not weakened by this change - masa never appears in the
  // SHORT form's recited text at all, so its source is irrelevant there.
  // The fixed audio was recorded for an UNKNOWN/omitted Gotra (a KNOWN
  // Gotra always adds a spoken clause, regardless of the unknownGotra
  // choice - matching the standard fixture in family-sankalpam-audio.test.mjs).
  const NO_GOTRA_PERSON = {
    name: "", lineage: {
      gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" },
      sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
    },
  };
  const shortFamilyGen = generateSankalpam({
    purpose: "Vinayaka Chavithi puja", purposeTe: "వినాయక చవితి పూజ",
    deity: "Sri Maha Ganapati", deityTe: "శ్రీ మహాగణపతి",
    groupMode: "FAMILY", people: [NO_GOTRA_PERSON],
    place: {}, localDateISO: "2026-05-26", panchanga: slots,
    choices: { familyGotra: "", groupRecitation: null, ...STANDARD_SHORT_FAMILY_CHOICES },
  });
  assert.equal(familyAudioMatchesGen(shortFamilyGen), true);
});

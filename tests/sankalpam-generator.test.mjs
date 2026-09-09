// General-purpose Sankalpam generator (lib/sankalpam). Section 4.
//
// Behaviour matrix: individual / family / unrelated-group × KNOWN / UNKNOWN /
// UNSURE lineage × place detail × calendar form. Hard rules: never infer
// lineage from a name, a place, or the deity; explicitly-unknown values stay
// unknown; a tradition-specific unknown-Gotra fallback is a CHOICE only.

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

const { generateSankalpam, SANKALPAM_SOURCES, UNKNOWN_GOTRA_CONVENTION } =
  await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const page = await vite.ssrLoadModule("/app/page.tsx");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");

const L = (status, name = "") => ({ status, name });
const lineage = (over = {}) => ({
  gotra: L("UNKNOWN"), veda: L("UNKNOWN"), sutra: L("UNKNOWN"), sampradaya: L("UNKNOWN"),
  ...over,
});
const person = (name, over = {}) => ({ name, lineage: lineage(over) });

const FULL_PANCHANGA = {
  samvatsara: "Parabhava", ayana: "Dakshinayana", ritu: "Varsha", masa: "Bhadraba",
  paksha: "Shukla", tithi: "Chaturthi", vaara: "Somavara", nakshatra: "Hasta",
};

const base = (over = {}) => ({
  purpose: "Vinayaka Chavithi puja",
  deity: "Sri Maha Ganapati",
  groupMode: "INDIVIDUAL",
  people: [person("Mahesh", { gotra: L("KNOWN", "Bharadwaja") })],
  place: { country: "India", region: "Telangana", timezone: "Asia/Kolkata" },
  localDateISO: "2026-09-14",
  panchanga: FULL_PANCHANGA,
  ...over,
});

test("a full-dated individual Sankalpam fills every calendar slot and the known Gotra", () => {
  const s = generateSankalpam(base());
  assert.equal(s.calendarForm, "FULL_DATED");
  assert.equal(s.reviewStatus, "REVIEW_REQUIRED");
  assert.equal(s.betaStatus, "SOURCED_BETA_CANDIDATE");
  assert.equal(s.transcriptionCheckRequired, true);
  assert.match(s.transliteration, /Parabhava-nama-samvatsare/);
  assert.match(s.transliteration, /Chaturthi-tithau/);
  assert.match(s.transliteration, /Bharadwaja-gotrasya/);
  assert.match(s.transliteration, /Vinayaka Chavithi puja karishye\.$/);
  assert.match(s.teluguScript, /[ఀ-౿]/, "Telugu script present");
  assert.match(s.teluguScript, /నామ సంవత్సరే/);
  const cal = s.slots.filter((x) => ["samvatsara", "ayana", "ritu", "masa", "paksha", "tithi", "vaara", "nakshatra"].includes(x.key));
  assert.ok(cal.every((x) => x.status === "FILLED"));
  assert.equal(s.pendingChoices.length, 0);
});

test("the deity is only in the prityartham clause and never becomes a Gotra", () => {
  const s = generateSankalpam(base({ deity: "Sri Maha Ganapati" }));
  assert.match(s.transliteration, /Sri Maha Ganapati prityartham/);
  // The gotra slot must be the person's, not the deity's.
  const gotra = s.slots.find((x) => x.key === "gotra");
  assert.equal(gotra.value, "Bharadwaja");
  assert.doesNotMatch(s.transliteration, /Ganapati-gotrasya/i);
  assert.ok(s.openQuestions.some((q) => /deity.*Gotra is never used/i.test(q)));
});

test("an unknown Gotra is NOT filled automatically — it needs an explicit choice", () => {
  const s = generateSankalpam(base({ people: [person("Ravi", { gotra: L("UNKNOWN") })] }));
  const gotra = s.slots.find((x) => x.key === "gotra");
  assert.equal(gotra.status, "NEEDS_CHOICE");
  assert.doesNotMatch(s.transliteration, /-gotrasya/);
  assert.ok(s.pendingChoices.some((c) => /unknown Gotra/i.test(c)));
});

test("the Kashyapa convention is applied ONLY when the user explicitly chooses it, and is sourced", () => {
  const s = generateSankalpam(base({
    people: [person("Ravi", { gotra: L("UNSURE") })],
    choices: { unknownGotra: "KASHYAPA" },
  }));
  const gotra = s.slots.find((x) => x.key === "gotra");
  assert.equal(gotra.status, "FILLED");
  assert.equal(gotra.value, "Kashyapa");
  assert.match(s.transliteration, /Kashyapa-gotrasya/);
  assert.ok(gotra.sourceIds.length >= 1);
  assert.ok(gotra.explanation.includes(UNKNOWN_GOTRA_CONVENTION.rule));
});

test("choosing to omit the Gotra line leaves it out with an explanation, no guess", () => {
  const s = generateSankalpam(base({
    people: [person("Ravi", { gotra: L("UNKNOWN") })],
    choices: { unknownGotra: "OMIT" },
  }));
  const gotra = s.slots.find((x) => x.key === "gotra");
  assert.equal(gotra.status, "OMITTED_BY_CHOICE");
  assert.doesNotMatch(s.transliteration, /-gotrasya/);
  assert.equal(s.pendingChoices.length, 0);
});

test("a family tradition Gotra uses exactly what the user typed", () => {
  const s = generateSankalpam(base({
    people: [person("Ravi", { gotra: L("UNKNOWN") })],
    choices: { unknownGotra: "FAMILY_TRADITION", familyGotra: "Atreya" },
  }));
  assert.match(s.transliteration, /Atreya-gotrasya/);
});

test("Veda / Sutra / Sampradaya appear only when KNOWN, and are never inferred", () => {
  const s = generateSankalpam(base({
    people: [person("Mahesh", {
      gotra: L("KNOWN", "Bharadwaja"),
      veda: L("KNOWN", "Yajurveda"),
      sutra: L("UNSURE"),
      sampradaya: L("UNKNOWN"),
    })],
  }));
  assert.match(s.transliteration, /Yajurveda-shakhadhyayinah/);
  assert.doesNotMatch(s.transliteration, /-sutrasya/);
  assert.doesNotMatch(s.transliteration, /-sampradayasya/);
  const sutra = s.slots.find((x) => x.key === "sutra");
  assert.equal(sutra.status, "OMITTED_UNKNOWN");
});

test("lineage is never inferred from the person's name", () => {
  // A name that looks like a well-known Gotra surname must NOT populate the slot.
  const s = generateSankalpam(base({
    people: [person("Bharadwaj Sharma", { gotra: L("UNKNOWN") })],
    choices: {},
  }));
  const gotra = s.slots.find((x) => x.key === "gotra");
  assert.equal(gotra.status, "NEEDS_CHOICE");
  assert.doesNotMatch(s.transliteration, /Bharadwaj.*-gotrasya/);
});

test("family mode uses 'saha kutumbanam'; unrelated group does NOT", () => {
  const fam = generateSankalpam(base({
    groupMode: "FAMILY",
    people: [person("A", { gotra: L("KNOWN", "Kaundinya") }), person("B")],
  }));
  assert.match(fam.transliteration, /asmakam saha kutumbanam/);

  const grp = generateSankalpam(base({
    groupMode: "GROUP",
    people: [person("A", { gotra: L("KNOWN", "Kaundinya") }), person("B", { gotra: L("KNOWN", "Vasishtha") })],
    choices: { groupRecitation: "COLLECTIVE" },
  }));
  assert.doesNotMatch(grp.transliteration, /saha kutumbanam/);
  assert.match(grp.transliteration, /asmakam,/);
  assert.ok(grp.openQuestions.some((q) => /unrelated group/i.test(q)));
});

test("an unrelated group with no recitation choice is flagged as pending", () => {
  const grp = generateSankalpam(base({ groupMode: "GROUP", people: [person("A"), person("B")] }));
  assert.ok(grp.pendingChoices.some((c) => /unrelated group/i.test(c)));
});

test("missing Panchanga values fall back to the short form and are recorded, never guessed", () => {
  const s = generateSankalpam(base({ panchanga: { paksha: "Shukla", tithi: "Chaturthi" } }));
  assert.equal(s.calendarForm, "SHORT");
  const samv = s.slots.find((x) => x.key === "samvatsara");
  assert.equal(samv.status, "OMITTED_UNKNOWN");
  assert.doesNotMatch(s.transliteration, /-nama-samvatsare/);
  assert.ok(s.openQuestions.some((q) => /not available from the Panchanga/i.test(q)));
});

test("place detail: COUNTRY_ONLY names the country; OMIT stops at Bharata-khande; no city/tz ever", () => {
  const countryOnly = generateSankalpam(base({ choices: { placeDetail: "COUNTRY_ONLY" } }));
  assert.match(countryOnly.transliteration, /India deshe/);
  assert.doesNotMatch(countryOnly.transliteration, /Telangana pradeshe/);

  const omit = generateSankalpam(base({ choices: { placeDetail: "OMIT" } }));
  assert.doesNotMatch(omit.transliteration, /deshe/);
  assert.match(omit.transliteration, /Bharata-khande/);

  const region = generateSankalpam(base({ choices: { placeDetail: "REGION" } }));
  assert.match(region.transliteration, /Telangana pradeshe/);

  for (const s of [countryOnly, omit, region]) {
    assert.doesNotMatch(s.transliteration, /Asia\/Kolkata|timezone|17\.38|latitude/i);
  }
});

test("the preview and english explanation summarise who / when / where / purpose / lineage", () => {
  const s = generateSankalpam(base());
  assert.match(s.preview.spokenFor, /Mahesh/);
  assert.match(s.preview.where, /India/);
  assert.match(s.preview.purpose, /Vinayaka Chavithi puja/);
  assert.match(s.preview.lineageSummary, /Gotra: Bharadwaja/);
  assert.match(s.englishExplanation, /DRAFT Sankalpam/);
  assert.match(s.englishExplanation, /not priest-approved/i);
  assert.match(s.englishExplanation, /inferred from a name/i);
});

const L2 = (status, name = "") => ({ status, name });
const PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: L2("KNOWN", "Bharadwaja"), veda: L2("UNSURE"), sutra: L2("UNKNOWN"), sampradaya: L2("UNKNOWN"),
};
const READY_LOC = {
  status: "READY", latitude: 17.38, longitude: 78.48, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const PANCHANGA = {
  fields: [
    { key: "tithi", value: "Shukla Chaturthi" },
    { key: "nakshatra", value: "Hasta" },
  ],
  context: [
    { key: "samvatsara", value: "Parabhava" }, { key: "ayana", value: "Dakshinayana" },
    { key: "ritu", value: "Varsha" }, { key: "masa", value: "Bhadraba" },
    { key: "paksha", value: "Shukla" }, { key: "vaara", value: "Somavara" },
  ],
  hasAny: true, festivalUnavailable: false, validation: [],
};

test("PrepareScreen renders a Sankalpam preview from the general generator; sources only in reviewer mode", () => {
  const props = {
    puja: VINAYAKA_PUJA, activeList: [PARTICIPANT], availableMaterialIds: [],
    toggleMaterial: () => {}, patriSelfReport: null, setPatriSelfReport: () => {},
    pujaPath: "COMPLETE", setPujaPath: () => {}, goToPeople: () => {}, start: () => {},
    mode: "SELF", location: READY_LOC, panchanga: PANCHANGA,
  };
  const family = renderToStaticMarkup(React.createElement(page.PrepareScreen, { ...props, reviewMode: false }));
  assert.match(family, /Sankalpam preview/);
  assert.match(family, /individual form/);
  assert.match(family, /full dated/);
  assert.match(family, /DRAFT Sankalpam/);
  assert.doesNotMatch(family, /swayamvaraparvathi\.org/, "no source list in Family mode");

  const reviewer = renderToStaticMarkup(React.createElement(page.PrepareScreen, { ...props, reviewMode: true }));
  assert.match(reviewer, /Identified sources/);
  assert.match(reviewer, /pujayagna\.com|swayamvaraparvathi\.org|drikpanchang\.com/);
  assert.match(reviewer, /Samvatsara/);
});

test("every source carries a URL, an access date, the section used, tradition scope, and disagreements are recorded", () => {
  assert.ok(SANKALPAM_SOURCES.length >= 3);
  for (const src of SANKALPAM_SOURCES) {
    assert.match(src.url, /^https:\/\//);
    assert.match(src.accessedISO, /^\d{4}-\d\d-\d\d$/);
    assert.ok(src.section && src.section.length > 0);
    assert.ok(src.traditionScope && src.traditionScope.length > 0);
    assert.ok(src.usedFor && src.usedFor.length > 0);
    // `disagreement` may be null, but the field must exist.
    assert.ok("disagreement" in src);
  }
  assert.ok(SANKALPAM_SOURCES.some((s) => s.disagreement && /simplified|short form/i.test(s.disagreement)));
});

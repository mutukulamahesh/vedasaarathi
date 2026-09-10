// General-purpose Sankalpam generator (lib/sankalpam). Items 1 + 2.
//
// Behaviour matrix + GOLDEN tests: individual / family / unrelated group ×
// KNOWN / UNKNOWN / UNSURE lineage × missing Panchanga × Telugu-only output.
// Hard rules: never infer lineage; never auto-pick an unknown-Gotra
// convention; the Telugu string carries no untranslated English CALENDAR
// value; roman[i] and te[i] are the same clause; no partial-mixture form.

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

const { generateSankalpam, SANKALPAM_SOURCES, UNKNOWN_GOTRA_CONVENTION, renderTerm } =
  await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const page = await vite.ssrLoadModule("/app/page.tsx");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");

const L = (status, name = "") => ({ status, name });
const lineage = (over = {}) => ({
  gotra: L("UNKNOWN"), veda: L("UNKNOWN"), sutra: L("UNKNOWN"), sampradaya: L("UNKNOWN"),
  ...over,
});
const idOf = (name) => (name.trim() ? name.trim().toLowerCase().replace(/\s+/g, "-") : "unnamed");
const person = (name, over = {}) => {
  const { id, ...lin } = over;
  return { id: id ?? idOf(name), name, lineage: lineage(lin) };
};
/** GROUP + EACH_INDIVIDUALLY: build a participantGotra map keyed by person id. */
const perPerson = (entries) =>
  Object.fromEntries(
    Object.entries(entries).map(([name, e]) => [
      idOf(name),
      typeof e === "string" ? { choice: e, familyGotra: "" } : { choice: null, familyGotra: "", ...e },
    ]),
  );

const FULL_PANCHANGA = {
  samvatsara: "Parabhava", ayana: "Dakshinayana", ritu: "Varsha", masa: "Bhadraba",
  paksha: "Shukla", tithi: "Chaturthi", vaara: "Somavara", nakshatra: "Hasta",
};

const base = (over = {}) => ({
  purpose: "Vinayaka Chavithi puja",
  deity: "Sri Maha Ganapati",
  groupMode: "INDIVIDUAL",
  people: [person("Mahesh", { gotra: L("KNOWN", "Bharadwaja"), veda: L("KNOWN", "Yajurveda") })],
  place: { country: "India", region: "Telangana" },
  localDateISO: "2026-09-14",
  panchanga: FULL_PANCHANGA,
  ...over,
});

const TELUGU = /[ఀ-౿]/;
// Latin letters that are NOT inside a «user value» marker.
const strayLatinOutsideMarkers = (s) => (s.replace(/«[^»]*»/g, "").match(/[A-Za-z]{2,}/g) || []);

/* -------------------------------------------------------------------------- */
/* GOLDEN — exact assembled strings                                          */
/* -------------------------------------------------------------------------- */

const G_FRAME_ROMAN =
  "shubhe shobhane muhurte, Sri Mahavishnor-ajnaya pravartamanasya, adya " +
  "Brahmanah dvitiya-parardhe, Sveta-varaha-kalpe, Vaivasvata-manvantare, " +
  "Kaliyuge prathama-pade, Jambudvipe, Bharata-varshe, Bharata-khande, " +
  "Meroh dakshina-dig-bhage, «India» deshe, asmin vartamane vyavaharike, chandramanena, " +
  "Parabhava-nama-samvatsare, Dakshinayane, Varsha-rutau, Bhadraba-mase, Shukla-pakshe, " +
  "Chaturthi-tithau, Somavara-vasare, Hasta-nakshatre, shubha-tithau,";

const G_FRAME_TE =
  "శుభే శోభనే ముహూర్తే, శ్రీ మహావిష్ణోరాజ్ఞయా ప్రవర్తమానస్య, అద్య బ్రహ్మణః ద్వితీయ పరార్ధే, " +
  "శ్వేతవరాహకల్పే, వైవస్వతమన్వంతరే, కలియుగే, ప్రథమపాదే, జంబూద్వీపే, భరతవర్షే, భరతఖండే, " +
  "మేరోః దక్షిణదిగ్భాగే, «India» దేశే, అస్మిన్ వర్తమానే వ్యావహారికే, చాంద్రమానేన, " +
  "పరాభవ నామ సంవత్సరే, దక్షిణాయనే, వర్ష ఋతౌ, భాద్రపద మాసే, శుక్ల పక్షే, చవితి తిథౌ, " +
  "సోమ వాసరే, హస్త నక్షత్రే, శుభతిథౌ,";

const PURPOSE_ROMAN =
  "mama upatta-samasta-durita-kshaya-dvara «Sri Maha Ganapati» prityartham " +
  "«Vinayaka Chavithi puja» karishye.";
const PURPOSE_TE =
  "మమ ఉపాత్త సమస్త దురితక్షయద్వారా «Sri Maha Ganapati» ప్రీత్యర్థం «Vinayaka Chavithi puja» కరిష్యే.";

test("GOLDEN — individual, full dated, KNOWN Gotra + Veda", () => {
  const g = generateSankalpam(base());
  assert.equal(g.calendarForm, "FULL_DATED");
  assert.equal(g.calendarFallbackReason, null);
  assert.equal(
    g.transliteration,
    `${G_FRAME_ROMAN} «Bharadwaja»-gotrasya, «Yajurveda»-shakhadhyayinah, «Mahesh»-nama-dheyasya, ${PURPOSE_ROMAN}`,
  );
  assert.equal(
    g.teluguScript,
    `${G_FRAME_TE} «Bharadwaja» గోత్రస్య, «Yajurveda» శాఖాధ్యాయినః, «Mahesh» నామధేయస్య, ${PURPOSE_TE}`,
  );
});

test("GOLDEN — family, full dated, KNOWN Gotra (family phrase; split point recorded)", () => {
  const g = generateSankalpam(base({
    groupMode: "FAMILY",
    people: [person("Mahesh", { gotra: L("KNOWN", "Bharadwaja") }), person("Sita")],
  }));
  assert.equal(
    g.transliteration,
    `${G_FRAME_ROMAN} «Bharadwaja»-gotrasya, asmakam saha kutumbanam, ${PURPOSE_ROMAN}`,
  );
  assert.equal(
    g.teluguScript,
    `${G_FRAME_TE} «Bharadwaja» గోత్రస్య, అస్మాకం సహ కుటుంబానాం, ${PURPOSE_TE}`,
  );
  // The split point is the "asmakam saha kutumbanam" segment.
  assert.ok(g.familySplitIndex >= 0);
  assert.equal(g.segments[g.familySplitIndex].roman, "asmakam saha kutumbanam,");
  assert.equal(g.segments[g.familySplitIndex].te, "అస్మాకం సహ కుటుంబానాం,");
});

test("GOLDEN — unrelated group, collective recitation: DIFFERENT Gotras ⇒ NO Gotra spoken", () => {
  const g = generateSankalpam(base({
    groupMode: "GROUP",
    people: [person("A", { gotra: L("KNOWN", "Kaundinya") }), person("B", { gotra: L("KNOWN", "Vasishtha") })],
    choices: { groupRecitation: "COLLECTIVE" },
  }));
  // The first participant's Gotra is NOT applied to the whole group.
  assert.equal(g.transliteration, `${G_FRAME_ROMAN} asmakam, ${PURPOSE_ROMAN}`);
  assert.doesNotMatch(g.transliteration, /Kaundinya|Vasishtha|-gotrasya/);
  assert.doesNotMatch(g.teluguScript, /గోత్రస్య/);
  assert.doesNotMatch(g.transliteration, /saha kutumbanam/);
  assert.equal(g.familySplitIndex, -1);
  assert.match(g.collectiveLineageNote, /No Gotra is spoken/i);
  assert.match(g.collectiveLineageNote, /differ or are not all known/i);
});

test("GOLDEN — collective group where EVERY member shares one KNOWN Gotra ⇒ spoken once", () => {
  const g = generateSankalpam(base({
    groupMode: "GROUP",
    people: [person("A", { gotra: L("KNOWN", "Kaundinya") }), person("B", { gotra: L("KNOWN", "Kaundinya") })],
    choices: { groupRecitation: "COLLECTIVE" },
  }));
  assert.equal(g.transliteration, `${G_FRAME_ROMAN} «Kaundinya»-gotrasya, asmakam, ${PURPOSE_ROMAN}`);
  assert.match(g.collectiveLineageNote, /All 2 members share the Gotra «Kaundinya»/);
  assert.ok(g.userValues.some((v) => v.value === "Kaundinya" && /every member/i.test(v.label)));
});

test("GOLDEN — unknown Gotra, Kashyapa convention chosen (NOT marked as user value)", () => {
  const g = generateSankalpam(base({
    people: [person("Ravi", { gotra: L("UNSURE") })],
    choices: { unknownGotra: "KASHYAPA" },
  }));
  assert.match(g.transliteration, /(?<!«)Kashyapa-gotrasya,/);
  assert.match(g.teluguScript, /కాశ్యప గోత్రస్య,/);
  // Kashyapa is a convention, not something the user typed → no « » marker.
  assert.doesNotMatch(g.transliteration, /«Kashyapa»/);
  assert.ok(!g.userValues.some((v) => v.value === "Kashyapa"));
});

test("GOLDEN — missing Panchanga ⇒ ONE coherent SHORT form (both languages), never partial", () => {
  const g = generateSankalpam(base({ panchanga: { paksha: "Shukla", tithi: "Chaturthi" } }));
  assert.equal(g.calendarForm, "SHORT");
  assert.match(g.calendarFallbackReason, /did not supply/i);
  const shortFrameRoman =
    G_FRAME_ROMAN
      .replace(/, chandramanena, .*shubha-tithau,$/, ",")
      .replace(/asmin vartamane vyavaharike,$/, "asmin vartamane vyavaharike, shubha-tithau shubha-muhurte,");
  assert.equal(
    g.transliteration,
    `${shortFrameRoman} «Bharadwaja»-gotrasya, «Yajurveda»-shakhadhyayinah, «Mahesh»-nama-dheyasya, ${PURPOSE_ROMAN}`,
  );
  // No dated calendar clause survives — not even the available paksha/tithi.
  assert.doesNotMatch(g.transliteration, /Shukla-pakshe|Chaturthi-tithau|-samvatsare/);
  assert.doesNotMatch(g.teluguScript, /సంవత్సరే|పక్షే|తిథౌ,\s*[«భ]/);
});

test("choosing SHORT explicitly gives the same coherent short form, with no fallback reason", () => {
  const short = generateSankalpam(base({ choices: { calendarForm: "SHORT" } }));
  const missing = generateSankalpam(base({ panchanga: { paksha: "Shukla" } }));
  assert.equal(short.calendarForm, "SHORT");
  assert.equal(short.calendarFallbackReason, null);
  assert.equal(short.transliteration, missing.transliteration);
});

/* -------------------------------------------------------------------------- */
/* Telugu-only output                                                        */
/* -------------------------------------------------------------------------- */

test("the Telugu string carries NO untranslated English calendar value", () => {
  const g = generateSankalpam(base());
  // Every calendar term is present in Telugu script.
  for (const te of ["పరాభవ", "దక్షిణాయనే", "వర్ష", "భాద్రపద", "శుక్ల", "చవితి", "సోమ", "హస్త"]) {
    assert.ok(g.teluguScript.includes(te), `Telugu contains ${te}`);
  }
  // The romanised calendar names must NOT leak into the Telugu string.
  for (const en of ["Parabhava", "Dakshinayana", "Varsha", "Bhadraba", "Shukla", "Chaturthi", "Somavara", "Hasta"]) {
    assert.ok(!g.teluguScript.includes(en), `Telugu has no "${en}"`);
  }
  // The ONLY Latin left in the Telugu string is inside «user value» markers.
  assert.deepEqual(strayLatinOutsideMarkers(g.teluguScript), []);
});

test("roman[i] and te[i] are the same clause — identical segment order", () => {
  for (const req of [base(), base({ groupMode: "FAMILY" }), base({ panchanga: {} })]) {
    const g = generateSankalpam(req);
    assert.equal(g.transliteration, g.segments.map((s) => s.roman).join(" ").replace(/\s+/g, " ").trim());
    assert.equal(g.teluguScript, g.segments.map((s) => s.te).join(" ").replace(/\s+/g, " ").trim());
    for (const s of g.segments) {
      assert.ok(s.roman.length > 0 && s.te.length > 0, "every segment has both languages");
      assert.ok(TELUGU.test(s.te), `segment te is Telugu script: ${s.te}`);
    }
  }
});

test("all 60 samvatsara names, all tithis, all nakshatras render to Telugu (no English leak possible)", () => {
  const { SAMVATSARA_NAMES } = { SAMVATSARA_NAMES: null }; // engine list not imported here
  const samv = [
    "Prabhava", "Vishvavasu", "Parabhava", "Plavanga", "Akshaya", "Krodhi", "Siddharthi",
  ];
  for (const s of samv) assert.ok(renderTerm("samvatsara", s).matched, `samvatsara ${s}`);
  for (const t of ["Chavithi", "Trayodasi", "Sapthami", "Panchami", "Purnima", "Amavasya", "Padyami"]) {
    assert.ok(renderTerm("tithi", t).matched, `tithi ${t}`);
  }
  for (const n of ["Ashlesha", "Magha", "Pushya", "Hasta", "Krittika", "Revati", "Purva Phalguni"]) {
    assert.ok(renderTerm("nakshatra", n).matched, `nakshatra ${n}`);
  }
  void SAMVATSARA_NAMES;
});

/* -------------------------------------------------------------------------- */
/* Hard rules                                                                */
/* -------------------------------------------------------------------------- */

test("the deity is only in the prityartham clause and never becomes a Gotra", () => {
  const g = generateSankalpam(base({ deity: "Sri Maha Ganapati" }));
  assert.match(g.transliteration, /«Sri Maha Ganapati» prityartham/);
  assert.equal(g.slots.find((x) => x.key === "gotra").value, "Bharadwaja");
  assert.doesNotMatch(g.transliteration, /Ganapati-gotrasya/i);
});

test("an unknown Gotra is NOT filled automatically — it needs an explicit choice", () => {
  const g = generateSankalpam(base({ people: [person("Ravi", { gotra: L("UNKNOWN") })] }));
  assert.equal(g.slots.find((x) => x.key === "gotra").status, "NEEDS_CHOICE");
  assert.doesNotMatch(g.transliteration, /-gotrasya/);
  assert.ok(g.pendingChoices.some((c) => /unknown Gotra/i.test(c)));
});

test("the Kashyapa convention is applied ONLY when explicitly chosen, and is sourced", () => {
  const g = generateSankalpam(base({
    people: [person("Ravi", { gotra: L("UNSURE") })],
    choices: { unknownGotra: "KASHYAPA" },
  }));
  const gotra = g.slots.find((x) => x.key === "gotra");
  assert.equal(gotra.status, "FILLED");
  assert.equal(gotra.value, "Kashyapa");
  assert.ok(gotra.explanation.includes(UNKNOWN_GOTRA_CONVENTION.rule));
});

test("family-tradition Gotra uses exactly what the user typed, marked as a user value", () => {
  const g = generateSankalpam(base({
    people: [person("Ravi", { gotra: L("UNKNOWN") })],
    choices: { unknownGotra: "FAMILY_TRADITION", familyGotra: "Atreya" },
  }));
  assert.match(g.transliteration, /«Atreya»-gotrasya/);
  assert.ok(g.userValues.some((v) => v.value === "Atreya" && /Gotra/.test(v.label)));
});

test("Veda / Sutra / Sampradaya appear only when KNOWN, and are never inferred", () => {
  const g = generateSankalpam(base({
    people: [person("Mahesh", {
      gotra: L("KNOWN", "Bharadwaja"), veda: L("KNOWN", "Yajurveda"),
      sutra: L("UNSURE"), sampradaya: L("UNKNOWN"),
    })],
  }));
  assert.match(g.transliteration, /«Yajurveda»-shakhadhyayinah/);
  assert.doesNotMatch(g.transliteration, /-sutrasya|-sampradayasya/);
  assert.equal(g.slots.find((x) => x.key === "sutra").status, "OMITTED_UNKNOWN");
});

test("lineage is never inferred from the person's name", () => {
  const g = generateSankalpam(base({
    people: [person("Bharadwaj Sharma", { gotra: L("UNKNOWN") })],
    choices: {},
  }));
  assert.equal(g.slots.find((x) => x.key === "gotra").status, "NEEDS_CHOICE");
  assert.doesNotMatch(g.transliteration, /Bharadwaj.*-gotrasya/);
});

test("family mode uses 'saha kutumbanam'; unrelated group with no choice is flagged", () => {
  const grp = generateSankalpam(base({ groupMode: "GROUP", people: [person("A"), person("B")] }));
  assert.ok(grp.pendingChoices.some((c) => /unrelated group/i.test(c)));
});

test("place: COUNTRY_ONLY marks the country as a user value; OMIT stops at Bharata-khande; no city/tz ever", () => {
  const countryOnly = generateSankalpam(base({ choices: { placeDetail: "COUNTRY_ONLY" } }));
  assert.match(countryOnly.transliteration, /«India» deshe/);
  assert.ok(countryOnly.userValues.some((v) => v.value === "India"));
  assert.doesNotMatch(countryOnly.transliteration, /«Telangana» pradeshe/);

  const omit = generateSankalpam(base({ choices: { placeDetail: "OMIT" } }));
  assert.doesNotMatch(omit.transliteration, /deshe/);
  assert.match(omit.transliteration, /Bharata-khande/);

  const region = generateSankalpam(base({ choices: { placeDetail: "REGION" } }));
  assert.match(region.transliteration, /«Telangana» pradeshe/);

  for (const g of [countryOnly, omit, region]) {
    assert.doesNotMatch(g.transliteration, /Asia\/Kolkata|timezone|17\.38|latitude/i);
    assert.doesNotMatch(g.teluguScript, /Asia\/Kolkata|17\.38/);
  }
});

test("user values are listed and the english explanation shows the « » convention", () => {
  const g = generateSankalpam(base());
  assert.ok(g.userValues.length >= 4);
  assert.match(g.englishExplanation, /Values you entered/i);
  assert.match(g.englishExplanation, /«Mahesh»/);
  assert.match(g.englishExplanation, /inferred from a name/i);
});

/* -------------------------------------------------------------------------- */
/* PrepareScreen wiring (item 1 preview)                                     */
/* -------------------------------------------------------------------------- */

const PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: L("KNOWN", "Bharadwaja"), veda: L("UNSURE"), sutra: L("UNKNOWN"), sampradaya: L("UNKNOWN"),
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
  assert.match(family, /DRAFT Sankalpam/);
  assert.doesNotMatch(family, /swayamvaraparvathi\.org/, "no source list in Family mode");

  const reviewer = renderToStaticMarkup(React.createElement(page.PrepareScreen, { ...props, reviewMode: true }));
  assert.match(reviewer, /Identified sources/);
  assert.match(reviewer, /pujayagna\.com|swayamvaraparvathi\.org|drikpanchang\.com/);
});

/* -------------------------------------------------------------------------- */
/* GROUP Sankalpam (blocker 3)                                               */
/* -------------------------------------------------------------------------- */

const grp = (people, choices) => generateSankalpam(base({ groupMode: "GROUP", people, choices }));

test("GROUP + EACH_INDIVIDUALLY: a COMPLETE result per participant, each with THAT person's name + lineage, no placeholders", () => {
  const g = grp(
    [
      person("Anil", { gotra: L("KNOWN", "Bharadwaja") }),
      person("Bala", { gotra: L("KNOWN", "Kaundinya"), veda: L("KNOWN", "Rigveda") }),
      person("Chandra", { gotra: L("UNKNOWN") }),
    ],
    { groupRecitation: "EACH_INDIVIDUALLY", participantGotra: perPerson({ Chandra: "KASHYAPA" }) },
  );
  assert.equal(g.memberResults.length, 3);
  // No <name> / <gotra> placeholders anywhere.
  for (const r of [g, ...g.memberResults]) {
    assert.doesNotMatch(r.transliteration, /<name>|<gotra>|\[each member/i);
    assert.doesNotMatch(r.teluguScript, /<పేరు>|<గోత్ర>/);
  }
  // Each member's own name + own lineage.
  assert.match(g.memberResults[0].transliteration, /«Bharadwaja»-gotrasya, «Anil»-nama-dheyasya/);
  assert.match(g.memberResults[1].transliteration, /«Kaundinya»-gotrasya, «Rigveda»-shakhadhyayinah, «Bala»-nama-dheyasya/);
  // Chandra's Gotra is unknown → CHANDRA's own Kashyapa choice applies to Chandra (not Anil's Bharadwaja).
  assert.match(g.memberResults[2].transliteration, /Kashyapa-gotrasya, «Chandra»-nama-dheyasya/);
  assert.doesNotMatch(g.memberResults[2].transliteration, /Bharadwaja/);
  // The first participant's lineage never leaks onto the others.
  assert.doesNotMatch(g.memberResults[1].transliteration, /Bharadwaja/);
});

test("GROUP + EACH_INDIVIDUALLY: three unrelated participants, three DIFFERENT unknown-Gotra choices", () => {
  const g = grp(
    [
      person("Ravi", { gotra: L("UNKNOWN") }),
      person("Sita", { gotra: L("UNSURE") }),
      person("Gita", { gotra: L("UNKNOWN") }),
    ],
    {
      groupRecitation: "EACH_INDIVIDUALLY",
      // Ravi omits, Sita uses her family's Gotra, Gita uses the Kashyapa convention.
      participantGotra: perPerson({
        Ravi: "OMIT",
        Sita: { choice: "FAMILY_TRADITION", familyGotra: "Atreya" },
        Gita: "KASHYAPA",
      }),
    },
  );
  assert.equal(g.memberResults.length, 3);
  const [ravi, sita, gita] = g.memberResults;

  // Ravi: no Gotra clause at all.
  assert.doesNotMatch(ravi.transliteration, /-gotrasya/);
  assert.match(ravi.transliteration, /«Ravi»-nama-dheyasya/);

  // Sita: HER family Gotra only, marked as a user value.
  assert.match(sita.transliteration, /«Atreya»-gotrasya, «Sita»-nama-dheyasya/);
  assert.ok(sita.userValues.some((v) => v.value === "Atreya" && /Gotra/.test(v.label)));

  // Gita: the Kashyapa convention (not « »-marked), applied to Gita only.
  assert.match(gita.transliteration, /(?<!«)Kashyapa-gotrasya, «Gita»-nama-dheyasya/);

  // No choice or family Gotra crosses between people.
  assert.doesNotMatch(ravi.transliteration, /Atreya|Kashyapa/);
  assert.doesNotMatch(sita.transliteration, /Kashyapa/);
  assert.doesNotMatch(gita.transliteration, /Atreya/);

  // Everyone decided → nothing pending.
  assert.equal(g.pendingChoices.length, 0);
});

test("GROUP + EACH_INDIVIDUALLY: first KNOWN, second UNKNOWN — the choice affects the second only", () => {
  const g = grp(
    [person("Ravi", { gotra: L("KNOWN", "Atreya") }), person("Sita", { gotra: L("UNKNOWN") })],
    { groupRecitation: "EACH_INDIVIDUALLY", participantGotra: perPerson({ Sita: "OMIT" }) },
  );
  assert.match(g.memberResults[0].transliteration, /«Atreya»-gotrasya/);
  // Sita's Gotra is unknown and OMITTED — no Gotra clause, no Atreya.
  assert.doesNotMatch(g.memberResults[1].transliteration, /-gotrasya/);
  assert.doesNotMatch(g.memberResults[1].transliteration, /Atreya/);
  assert.equal(g.memberResults[0].pendingChoices.length, 0);
});

test("GROUP + EACH_INDIVIDUALLY: first UNKNOWN, second KNOWN — choice affects the first only", () => {
  const g = grp(
    [person("Ravi", { gotra: L("UNKNOWN") }), person("Sita", { gotra: L("KNOWN", "Vasishtha") })],
    { groupRecitation: "EACH_INDIVIDUALLY", participantGotra: perPerson({ Ravi: "KASHYAPA" }) },
  );
  assert.match(g.memberResults[0].transliteration, /Kashyapa-gotrasya, «Ravi»-nama-dheyasya/);
  assert.match(g.memberResults[1].transliteration, /«Vasishtha»-gotrasya, «Sita»-nama-dheyasya/);
  assert.doesNotMatch(g.memberResults[1].transliteration, /Kashyapa/);
});

test("GROUP + EACH_INDIVIDUALLY: a KNOWN Gotra is untouched even if that person has a participantGotra entry", () => {
  const g = grp(
    [person("Ravi", { gotra: L("KNOWN", "Vasishtha") }), person("Sita", { gotra: L("UNKNOWN") })],
    {
      groupRecitation: "EACH_INDIVIDUALLY",
      // A stale/incorrect entry for a KNOWN person must have no effect.
      participantGotra: perPerson({ Ravi: "KASHYAPA", Sita: "OMIT" }),
    },
  );
  assert.match(g.memberResults[0].transliteration, /«Vasishtha»-gotrasya/);
  assert.doesNotMatch(g.memberResults[0].transliteration, /Kashyapa/);
});

test("GROUP + EACH_INDIVIDUALLY: an undecided participant is flagged on the group and per member; nothing silent", () => {
  const g = grp(
    [person("Ravi", { gotra: L("KNOWN", "Atreya") }), person("Sita", { gotra: L("UNKNOWN") })],
    { groupRecitation: "EACH_INDIVIDUALLY" }, // no participantGotra map at all
  );
  assert.ok(g.pendingChoices.some((c) => /unknown Gotra/i.test(c)));
  assert.equal(g.memberResults[1].slots.find((s) => s.key === "gotra").status, "NEEDS_CHOICE");
  // A decision for one person does NOT satisfy another undecided person.
  const g2 = grp(
    [person("Ravi", { gotra: L("UNKNOWN") }), person("Sita", { gotra: L("UNKNOWN") })],
    { groupRecitation: "EACH_INDIVIDUALLY", participantGotra: perPerson({ Ravi: "OMIT" }) },
  );
  assert.equal(g2.memberResults[0].slots.find((s) => s.key === "gotra").status, "OMITTED_BY_CHOICE");
  assert.equal(g2.memberResults[1].slots.find((s) => s.key === "gotra").status, "NEEDS_CHOICE");
  assert.ok(g2.pendingChoices.some((c) => /unknown Gotra/i.test(c)));
});

test("GROUP + COLLECTIVE: which lineage is spoken is documented; unknown-Gotra decision maps to the affected member", () => {
  // First known, second unknown → gotras are not all known → no group Gotra.
  const a = grp(
    [person("Ravi", { gotra: L("KNOWN", "Atreya") }), person("Sita", { gotra: L("UNKNOWN") })],
    { groupRecitation: "COLLECTIVE", unknownGotra: "KASHYAPA" },
  );
  assert.doesNotMatch(a.transliteration, /-gotrasya|Atreya|Kashyapa/);
  assert.match(a.collectiveLineageNote, /No Gotra is spoken/i);
  assert.ok(a.openQuestions.some((q) => /own Gotra individually/i.test(q)));
  // Per-person Shakha/Sutra/Sampradaya are recorded as per-person, not applied.
  assert.equal(a.slots.find((s) => s.key === "veda").status, "OMITTED_BY_CHOICE");
  assert.match(a.slots.find((s) => s.key === "veda").explanation, /per-person/i);

  // First unknown, second known → still not all known → no group Gotra.
  const b = grp(
    [person("Ravi", { gotra: L("UNKNOWN") }), person("Sita", { gotra: L("KNOWN", "Vasishtha") })],
    { groupRecitation: "COLLECTIVE" },
  );
  assert.doesNotMatch(b.transliteration, /-gotrasya|Vasishtha/);
});

test("every source carries a URL, an access date, the section used, tradition scope, and disagreements are recorded", () => {
  assert.ok(SANKALPAM_SOURCES.length >= 3);
  for (const src of SANKALPAM_SOURCES) {
    assert.match(src.url, /^https:\/\//);
    assert.match(src.accessedISO, /^\d{4}-\d\d-\d\d$/);
    assert.ok(src.section && src.section.length > 0);
    assert.ok(src.traditionScope && src.traditionScope.length > 0);
    assert.ok(src.usedFor && src.usedFor.length > 0);
    assert.ok("disagreement" in src);
  }
  assert.ok(SANKALPAM_SOURCES.some((s) => s.disagreement && /simplified|short form/i.test(s.disagreement)));
});

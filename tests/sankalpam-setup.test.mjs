// The pre-puja Sankalpam setup screen + per-run persistence (item 1).

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

const page = await vite.ssrLoadModule("/app/page.tsx");
const prep = await vite.ssrLoadModule("/lib/storage/preparation.ts");
const { defaultSankalpamChoices, parseSankalpamChoices } =
  await vite.ssrLoadModule("/lib/sankalpam/index.ts");

const noop = () => {};
const PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};
const UNKNOWN_GOTRA_PERSON = { ...PARTICIPANT, id: "p2", name: "Ravi", gotra: { status: "UNKNOWN", name: "" } };
const LOC = {
  status: "READY", latitude: 17.38, longitude: 78.48, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const PANCHANGA = {
  fields: [{ key: "tithi", value: "Shukla Chaturthi" }, { key: "nakshatra", value: "Hasta" }],
  context: [
    { key: "samvatsara", value: "Parabhava" }, { key: "ayana", value: "Dakshinayana" },
    { key: "ritu", value: "Varsha" }, { key: "masa", value: "Bhadraba" },
    { key: "masaAmanta", value: "Bhadrapada", isAdhikaMasa: false },
    { key: "paksha", value: "Shukla" }, { key: "vaara", value: "Somavara" },
  ],
  hasAny: true, festivalUnavailable: false, validation: [],
};

const setup = (over = {}) =>
  renderToStaticMarkup(
    React.createElement(page.SankalpamSetupScreen, {
      activeList: [PARTICIPANT], mode: "SELF", location: LOC, panchanga: PANCHANGA,
      choices: defaultSankalpamChoices(), setChoices: noop, begin: noop, back: noop,
      purpose: "Vinayaka Chavithi", ...over,
    }),
  );

test("the setup screen offers all five choice groups and shows the live assembled Sankalpam", () => {
  const html = setup();
  assert.match(html, /Calendar detail/);
  assert.match(html, /Place detail/);
  assert.match(html, /class="sankalpam-assembled"/);
  assert.match(html, /Telugu/);
  assert.match(html, /Transliteration/);
  // Full dated by default (Panchanga is complete): calendar terms in Telugu.
  assert.match(html, /పరాభవ|భాద్రపద|చవితి/);
});

test("group recitation choice appears only for an unrelated group", () => {
  assert.doesNotMatch(setup({ mode: "SELF" }), /Group recitation/);
  assert.doesNotMatch(setup({ mode: "FAMILY" }), /Group recitation/);
  assert.match(setup({ mode: "GROUP", activeList: [PARTICIPANT, { ...PARTICIPANT, id: "p2", name: "B" }] }), /Group recitation/);
});

test("the unknown-Gotra choice appears only when a Gotra is not KNOWN, and nothing is pre-selected", () => {
  assert.doesNotMatch(setup({ activeList: [PARTICIPANT] }), /Unknown Gotra/);
  const html = setup({ activeList: [PARTICIPANT, UNKNOWN_GOTRA_PERSON] });
  assert.match(html, /Unknown Gotra/);
  assert.match(html, /Kashyapa convention/);
  assert.match(html, /avidita-gotranam kashyapa gotram/);
  // "Not decided yet" is the checked option — the convention is never auto-picked.
  const notDecided = html.match(/<input[^>]*value="UNSET"[^>]*>/)[0];
  assert.match(notDecided, /checked/);
  const kashyapa = html.match(/<input[^>]*value="KASHYAPA"[^>]*>/)[0];
  assert.doesNotMatch(kashyapa, /checked/);
});

test('"Begin the puja" is blocked while an unknown-Gotra choice is still pending', () => {
  const html = setup({ activeList: [UNKNOWN_GOTRA_PERSON], choices: defaultSankalpamChoices() });
  const beginBtn = html.match(/<button class="wide-primary"[^>]*>/)[0];
  assert.match(beginBtn, /disabled/);
});

test("SankalpamChoices round-trip through per-run storage (default + a full custom set)", () => {
  for (const choices of [
    defaultSankalpamChoices(),
    {
      placeDetail: "REGION", unknownGotra: "KASHYAPA", familyGotra: "Atreya",
      groupRecitation: "EACH_INDIVIDUALLY", calendarForm: "SHORT",
      participantGotra: {
        p2: { choice: "OMIT", familyGotra: "" },
        p3: { choice: "FAMILY_TRADITION", familyGotra: "Kaundinya" },
      },
    },
  ]) {
    const p = {
      ...prep.emptyProgress(),
      runs: {
        "vinayaka-chavithi": { ...prep.emptyRun(), sankalpamChoices: choices },
      },
    };
    const restored = prep.parseProgress(prep.serializeProgress(p));
    assert.deepEqual(restored.runs["vinayaka-chavithi"].sankalpamChoices, parseSankalpamChoices(choices));
  }
});

test("a damaged stored choices object falls back to the default — never guesses a Gotra convention", () => {
  const p = prep.parseProgress(JSON.stringify({
    mode: "SELF", participants: [],
    runs: { x: { runState: "NOT_STARTED", stepIndex: 0, pujaPath: "SIMPLE", sankalpamChoices: { unknownGotra: "NONSENSE", calendarForm: 42 } } },
  }));
  const c = p.runs.x.sankalpamChoices;
  assert.equal(c.unknownGotra, null);
  assert.equal(c.calendarForm, "FULL_DATED");
});

test("emptyRun carries default Sankalpam choices", () => {
  assert.deepEqual(prep.emptyRun().sankalpamChoices, defaultSankalpamChoices());
});

/* -------------------------------------------------------------------------- */
/* Per-participant unknown-Gotra (GROUP + each recites individually)          */
/* -------------------------------------------------------------------------- */

const RAVI = { ...UNKNOWN_GOTRA_PERSON, id: "grp-ravi", name: "Ravi" };
const SITA = { ...UNKNOWN_GOTRA_PERSON, id: "grp-sita", name: "Sita", gotra: { status: "UNSURE", name: "" } };
const ANIL_KNOWN = { ...PARTICIPANT, id: "grp-anil", name: "Anil", gotra: { status: "KNOWN", name: "Bharadwaja" } };

const groupEach = (over = {}) =>
  setup({
    mode: "GROUP",
    activeList: [RAVI, SITA, ANIL_KNOWN],
    choices: { ...defaultSankalpamChoices(), groupRecitation: "EACH_INDIVIDUALLY" },
    ...over,
  });

test("GROUP + each-individually: one NAMED per-person Gotra choice per unknown-Gotra participant, none pre-selected", () => {
  const html = groupEach();
  assert.match(html, /Unknown Gotra — one choice per person/);
  // Each affected person is named; the KNOWN-Gotra person is not offered a choice.
  assert.match(html, /Gotra for Ravi/);
  assert.match(html, /Gotra for Sita/);
  assert.doesNotMatch(html, /Gotra for Anil/);
  // Distinct radio groups, keyed by participant id.
  assert.match(html, /data-participant-id="grp-ravi"/);
  assert.match(html, /data-participant-id="grp-sita"/);
  assert.match(html, /name="participant-gotra-grp-ravi"/);
  assert.match(html, /name="participant-gotra-grp-sita"/);
  // Nothing is pre-selected for either person.
  const raviUnset = html.match(/<input[^>]*name="participant-gotra-grp-ravi"[^>]*value="UNSET"[^>]*>/)[0];
  assert.match(raviUnset, /checked/);
  const raviKashyapa = html.match(/<input[^>]*name="participant-gotra-grp-ravi"[^>]*value="KASHYAPA"[^>]*>/)[0];
  assert.doesNotMatch(raviKashyapa, /checked/);
  // The single shared "Unknown Gotra" block is NOT shown in this mode.
  assert.doesNotMatch(html, /A Gotra is not KNOWN for at least one person/);
});

test("GROUP + each-individually: a per-person choice is reflected and only that person's clause changes", () => {
  const html = groupEach({
    choices: {
      ...defaultSankalpamChoices(),
      groupRecitation: "EACH_INDIVIDUALLY",
      participantGotra: {
        "grp-ravi": { choice: "KASHYAPA", familyGotra: "" },
        "grp-sita": { choice: "OMIT", familyGotra: "" },
      },
    },
  });
  const raviKashyapa = html.match(/<input[^>]*name="participant-gotra-grp-ravi"[^>]*value="KASHYAPA"[^>]*>/)[0];
  assert.match(raviKashyapa, /checked/);
  const sitaOmit = html.match(/<input[^>]*name="participant-gotra-grp-sita"[^>]*value="OMIT"[^>]*>/)[0];
  assert.match(sitaOmit, /checked/);
  // Ravi's assembled clause uses the Kashyapa convention; Sita's has no Gotra clause.
  assert.match(html, /Kashyapa-gotrasya, «Ravi»/);
  assert.doesNotMatch(html, /«?Kashyapa»?-gotrasya, «Sita»/);
});

test("GROUP + each-individually: FAMILY_TRADITION shows that person's own Gotra input", () => {
  const html = groupEach({
    choices: {
      ...defaultSankalpamChoices(),
      groupRecitation: "EACH_INDIVIDUALLY",
      participantGotra: { "grp-sita": { choice: "FAMILY_TRADITION", familyGotra: "Kaundinya" } },
    },
  });
  assert.match(html, /Sita’s family Gotra \(as known\)<input type="text"/);
  assert.match(html, /value="Kaundinya"/);
  // Ravi (still undecided) does not get a text box.
  assert.doesNotMatch(html, /Ravi’s family Gotra \(as known\)/);
});

test("GROUP + each-individually: 'Begin the puja' stays blocked until every unknown-Gotra person is decided", () => {
  const undecided = groupEach();
  assert.match(undecided.match(/<button class="wide-primary"[^>]*>/)[0], /disabled/);
  const oneLeft = groupEach({
    choices: {
      ...defaultSankalpamChoices(),
      groupRecitation: "EACH_INDIVIDUALLY",
      participantGotra: { "grp-ravi": { choice: "OMIT", familyGotra: "" } },
    },
  });
  assert.match(oneLeft.match(/<button class="wide-primary"[^>]*>/)[0], /disabled/);
  const allDecided = groupEach({
    choices: {
      ...defaultSankalpamChoices(),
      groupRecitation: "EACH_INDIVIDUALLY",
      participantGotra: {
        "grp-ravi": { choice: "OMIT", familyGotra: "" },
        "grp-sita": { choice: "KASHYAPA", familyGotra: "" },
      },
    },
  });
  assert.doesNotMatch(allDecided.match(/<button class="wide-primary"[^>]*>/)[0], /disabled/);
});

test("per-participant Gotra choices are keyed by id and survive a storage round-trip", () => {
  const choices = {
    ...defaultSankalpamChoices(),
    groupRecitation: "EACH_INDIVIDUALLY",
    participantGotra: {
      "grp-ravi": { choice: "KASHYAPA", familyGotra: "" },
      "grp-sita": { choice: "FAMILY_TRADITION", familyGotra: "Kaundinya" },
    },
  };
  const p = {
    ...prep.emptyProgress(),
    runs: { "vinayaka-chavithi": { ...prep.emptyRun(), sankalpamChoices: choices } },
  };
  const restored = prep.parseProgress(prep.serializeProgress(p)).runs["vinayaka-chavithi"].sankalpamChoices;
  assert.deepEqual(restored.participantGotra, choices.participantGotra);
});

test("a damaged per-participant Gotra entry is dropped, never guessed", () => {
  const c = parseSankalpamChoices({
    groupRecitation: "EACH_INDIVIDUALLY",
    participantGotra: {
      good: { choice: "OMIT", familyGotra: "" },
      bad: { choice: "NONSENSE" },
      alsoBad: 42,
    },
  });
  assert.deepEqual(c.participantGotra.good, { choice: "OMIT", familyGotra: "" });
  assert.deepEqual(c.participantGotra.bad, { choice: null, familyGotra: "" });
  assert.ok(!("alsoBad" in c.participantGotra));
});

/* -------------------------------------------------------------------------- */
/* Premature preview: the recitable Sankalpam is never shown while a          */
/* required choice is pending — the generator OMITS the unresolved clause     */
/* rather than blocking output, so it used to read as smoothly complete.      */
/* -------------------------------------------------------------------------- */

const ASSEMBLED = /class="sankalpam-assembled"/;
const ROMAN = /sankalpam-assembled-roman/;
const PENDING_HINT_EN = /Make the choices above to continue\./;
const PENDING_HINT_TE = /కొనసాగడానికి పైన ఎంపికలు చేయండి\./;

test("SELF, pending: the recitable Telugu + transliteration are hidden; a short pending hint is shown instead (EN)", () => {
  const html = setup({ activeList: [UNKNOWN_GOTRA_PERSON] });
  assert.doesNotMatch(html, ASSEMBLED, "no recitable Telugu block while pending");
  assert.doesNotMatch(html, ROMAN, "no transliteration block while pending");
  assert.match(html, PENDING_HINT_EN);
  assert.match(html.match(/<button class="wide-primary"[^>]*>/)[0], /disabled/);
});

test("SELF, pending: the recitable text and its hint render in Telugu too, with no English leak", () => {
  const html = setup({ activeList: [UNKNOWN_GOTRA_PERSON], language: "TE" });
  assert.doesNotMatch(html, ASSEMBLED);
  assert.doesNotMatch(html, ROMAN);
  assert.match(html, PENDING_HINT_TE);
  assert.doesNotMatch(html, PENDING_HINT_EN);
});

test("SELF, each supported resolution: the recitable preview reappears with its existing correct wording and Begin is enabled", () => {
  for (const [choice, extra, expectGotraClause] of [
    ["OMIT", {}, false],
    ["KASHYAPA", {}, true],
    ["FAMILY_TRADITION", { familyGotra: "Atreya" }, true],
  ]) {
    const html = setup({
      activeList: [UNKNOWN_GOTRA_PERSON],
      choices: { ...defaultSankalpamChoices(), unknownGotra: choice, ...extra },
    });
    assert.match(html, ASSEMBLED, `${choice}: recitable preview is shown once resolved`);
    assert.match(html, ROMAN, `${choice}: transliteration is shown once resolved`);
    assert.doesNotMatch(html, PENDING_HINT_EN, `${choice}: pending hint is gone`);
    assert.doesNotMatch(html.match(/<button class="wide-primary"[^>]*>/)[0], /disabled/, `${choice}: Begin is enabled`);
    if (expectGotraClause) assert.match(html, /gotrasya/, `${choice}: the Gotra clause is present in the recitation`);
  }
});

test("SELF, FAMILY_TRADITION selected but left BLANK: the preview stays gated (the generator itself falls through to NEEDS_CHOICE - not a display-layer guess)", () => {
  const html = setup({
    activeList: [UNKNOWN_GOTRA_PERSON],
    choices: { ...defaultSankalpamChoices(), unknownGotra: "FAMILY_TRADITION", familyGotra: "" },
  });
  assert.doesNotMatch(html, ASSEMBLED, "a selected-but-blank FAMILY_TRADITION is NOT treated as resolved");
  assert.doesNotMatch(html, ROMAN);
  assert.match(html, PENDING_HINT_EN);
  assert.match(html.match(/<button class="wide-primary"[^>]*>/)[0], /disabled/, "Begin stays disabled too");
  // Whitespace-only counts as blank as well (choices.familyGotra.trim() in the generator).
  const whitespaceOnly = setup({
    activeList: [UNKNOWN_GOTRA_PERSON],
    choices: { ...defaultSankalpamChoices(), unknownGotra: "FAMILY_TRADITION", familyGotra: "   " },
  });
  assert.doesNotMatch(whitespaceOnly, ASSEMBLED, "whitespace-only is also treated as blank, not a real entry");
});

test("GROUP + COLLECTIVE (the default, not each-individually): an undecided recitation choice keeps the preview hidden; resolving it shows the correct group text", () => {
  const undecidedCollective = setup({
    mode: "GROUP", activeList: [PARTICIPANT, { ...PARTICIPANT, id: "p2", name: "Anita" }],
    choices: defaultSankalpamChoices(), // groupRecitation: null -> pending, purely a recitation-choice issue
  });
  assert.doesNotMatch(undecidedCollective, ASSEMBLED, "undecided collective-vs-individual choice hides the preview");
  assert.match(undecidedCollective, PENDING_HINT_EN);
  assert.match(undecidedCollective.match(/<button class="wide-primary"[^>]*>/)[0], /disabled/);

  const resolvedCollective = setup({
    mode: "GROUP", activeList: [PARTICIPANT, { ...PARTICIPANT, id: "p2", name: "Anita" }],
    choices: { ...defaultSankalpamChoices(), groupRecitation: "COLLECTIVE" },
  });
  assert.match(resolvedCollective, ASSEMBLED, "resolving to COLLECTIVE shows the group's assembled text");
  assert.doesNotMatch(resolvedCollective, PENDING_HINT_EN);
  // The existing group-form contract: 'asmakam', no family phrase.
  assert.match(resolvedCollective, /asmakam/i, "uses the existing group ('asmakam') framing, not the family phrase");
  assert.doesNotMatch(resolvedCollective, /saha kutumbanam/i, "never the family phrase for an unrelated group");
});

test("GROUP + each-individually: a REMOVED participant's orphaned choice entry does not corrupt the remaining participant's gating or text", () => {
  // Simulates: Ravi and Sita both had pending choices; Ravi is removed from
  // the family (e.g. via People) but the stored choices object still has his
  // old, now-orphaned participantGotra entry until the next save - exactly
  // the shape a stale localStorage write could leave behind. Only Sita
  // (still present) should determine whether the preview is gated, and her
  // own resolution must render correctly regardless of Ravi's leftover entry.
  const stillPending = setup({
    mode: "GROUP", activeList: [SITA], // Ravi removed from the active list
    choices: {
      ...defaultSankalpamChoices(), groupRecitation: "EACH_INDIVIDUALLY",
      participantGotra: {
        "grp-ravi": { choice: "OMIT", familyGotra: "" }, // orphaned - Ravi is gone
        // Sita's own choice intentionally left unresolved
      },
    },
  });
  assert.doesNotMatch(stillPending, ASSEMBLED, "Sita's own choice is still open, regardless of Ravi's leftover entry");
  assert.doesNotMatch(stillPending, /Gotra for Ravi/, "a removed participant is never shown a choice prompt");

  const resolved = setup({
    mode: "GROUP", activeList: [SITA],
    choices: {
      ...defaultSankalpamChoices(), groupRecitation: "EACH_INDIVIDUALLY",
      participantGotra: {
        "grp-ravi": { choice: "OMIT", familyGotra: "" }, // still orphaned
        "grp-sita": { choice: "KASHYAPA", familyGotra: "" },
      },
    },
  });
  assert.match(resolved, ASSEMBLED, "Sita's own resolution is sufficient once she is the only remaining participant");
  assert.match(resolved, /Kashyapa-gotrasya, «Sita»/, "Sita's own chosen wording is correct, unaffected by Ravi's orphaned entry");
});

test("SELF, a known valid Gotra (no pending choice at all) continues to show the preview and enable Begin — unchanged regression", () => {
  const html = setup({ activeList: [PARTICIPANT] });
  assert.match(html, ASSEMBLED);
  assert.doesNotMatch(html, PENDING_HINT_EN);
  assert.doesNotMatch(html.match(/<button class="wide-primary"[^>]*>/)[0], /disabled/);
});

test("GROUP + each-individually: the preview stays hidden while ANY one participant's choice is still open", () => {
  const undecided = groupEach();
  assert.doesNotMatch(undecided, ASSEMBLED);
  assert.match(undecided, PENDING_HINT_EN);

  const oneLeft = groupEach({
    choices: {
      ...defaultSankalpamChoices(), groupRecitation: "EACH_INDIVIDUALLY",
      participantGotra: { "grp-ravi": { choice: "OMIT", familyGotra: "" } },
    },
  });
  assert.doesNotMatch(oneLeft, ASSEMBLED, "Sita's choice is still open, so the group preview stays hidden");
  assert.match(oneLeft, PENDING_HINT_EN);
});

test("GROUP + each-individually: the preview appears, correctly, once every participant has decided", () => {
  const allDecided = groupEach({
    choices: {
      ...defaultSankalpamChoices(), groupRecitation: "EACH_INDIVIDUALLY",
      participantGotra: {
        "grp-ravi": { choice: "OMIT", familyGotra: "" },
        "grp-sita": { choice: "KASHYAPA", familyGotra: "" },
      },
    },
  });
  assert.match(allDecided, ASSEMBLED);
  assert.doesNotMatch(allDecided, PENDING_HINT_EN);
  // Each member's own resolved clause is visible (per-person text, matching
  // the existing "no placeholders" GROUP contract, unchanged by this fix).
  assert.match(allDecided, /Ravi/);
  assert.match(allDecided, /Kashyapa-gotrasya, «Sita»/);
});

test("both full-dated and short calendar forms respect the pending gate identically", () => {
  for (const calendarForm of ["FULL_DATED", "SHORT"]) {
    const pendingHtml = setup({
      activeList: [UNKNOWN_GOTRA_PERSON],
      choices: { ...defaultSankalpamChoices(), calendarForm },
    });
    assert.doesNotMatch(pendingHtml, ASSEMBLED, `${calendarForm}: hidden while pending`);
    const readyHtml = setup({
      activeList: [UNKNOWN_GOTRA_PERSON],
      choices: { ...defaultSankalpamChoices(), calendarForm, unknownGotra: "OMIT" },
    });
    assert.match(readyHtml, ASSEMBLED, `${calendarForm}: shown once resolved`);
  }
});

test("saved (round-tripped) UNRESOLVED choices stay gated after a simulated reload", () => {
  const p = {
    ...prep.emptyProgress(),
    runs: { "vinayaka-chavithi": { ...prep.emptyRun(), sankalpamChoices: defaultSankalpamChoices() } },
  };
  const restored = prep.parseProgress(prep.serializeProgress(p)).runs["vinayaka-chavithi"].sankalpamChoices;
  const html = setup({ activeList: [UNKNOWN_GOTRA_PERSON], choices: restored });
  assert.doesNotMatch(html, ASSEMBLED, "a freshly-reloaded default (unresolved) state is still gated");
  assert.match(html, PENDING_HINT_EN);
});

test("saved (round-tripped) RESOLVED choices restore the correct preview after a simulated reload", () => {
  const p = {
    ...prep.emptyProgress(),
    runs: {
      "vinayaka-chavithi": {
        ...prep.emptyRun(),
        sankalpamChoices: { ...defaultSankalpamChoices(), unknownGotra: "KASHYAPA" },
      },
    },
  };
  const restored = prep.parseProgress(prep.serializeProgress(p)).runs["vinayaka-chavithi"].sankalpamChoices;
  assert.equal(restored.unknownGotra, "KASHYAPA", "sanity check: the round trip itself preserved the resolved choice");
  const html = setup({ activeList: [UNKNOWN_GOTRA_PERSON], choices: restored });
  assert.match(html, ASSEMBLED, "a restored resolved choice shows the preview immediately, no re-decision needed");
  assert.doesNotMatch(html, PENDING_HINT_EN);
});

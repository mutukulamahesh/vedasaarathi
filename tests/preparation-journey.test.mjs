import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const participants = await vite.ssrLoadModule("/lib/content/participants.ts");
const materials = await vite.ssrLoadModule("/lib/content/materials.ts");
const leaves = await vite.ssrLoadModule("/lib/content/leaves.ts");
const steps = await vite.ssrLoadModule("/lib/content/steps.ts");
const reviewStatus = await vite.ssrLoadModule("/lib/content/review-status.ts");
const provenance = await vite.ssrLoadModule("/lib/content/provenance.ts");
const festival = await vite.ssrLoadModule("/lib/content/festival.ts");
const storage = await vite.ssrLoadModule("/lib/storage/preparation.ts");

const {
  PARTICIPANT_MODES,
  LINEAGE_FIELDS,
  activeParticipants,
  createParticipant,
  normalizeLineageField,
  normalizeParticipant,
  validateParticipant,
  validateParticipants,
  participantsReadyForPuja,
} = participants;

function personWithName(id, name) {
  return { ...createParticipant(id), name };
}

/* -------------------------------------------------------------------------- */
/* Participant modes                                                          */
/* -------------------------------------------------------------------------- */

test("offers exactly the three supported participant modes", () => {
  assert.deepEqual(
    PARTICIPANT_MODES.map((option) => option.mode),
    ["SELF", "FAMILY", "GROUP"],
  );
});

/* -------------------------------------------------------------------------- */
/* Individual participant                                                     */
/* -------------------------------------------------------------------------- */

test("individual participant: a name is all that is required", () => {
  const me = personWithName("p1", "Mahesh");
  const result = validateParticipant(me);
  assert.equal(result.valid, true);
  assert.equal(participantsReadyForPuja([me]), true);
});

test("individual participant: the default blank profile blocks preparation", () => {
  const fresh = storage.emptyProgress();
  assert.equal(fresh.participants.length, 1);
  assert.equal(fresh.participants[0].name, "");
  assert.equal(participantsReadyForPuja(fresh.participants), false);
});

/* -------------------------------------------------------------------------- */
/* Family                                                                     */
/* -------------------------------------------------------------------------- */

test("family: every member is validated and all need names", () => {
  const family = [
    personWithName("p1", "Mahesh"),
    personWithName("p2", "Lakshmi"),
    { ...createParticipant("p3"), name: "" },
  ];
  assert.equal(validateParticipants(family).valid, false);
  assert.equal(participantsReadyForPuja(family), false);

  family[2].name = "Anasuya";
  assert.equal(validateParticipants(family).valid, true);
  assert.equal(participantsReadyForPuja(family), true);
});

/* -------------------------------------------------------------------------- */
/* Students or friends group                                                  */
/* -------------------------------------------------------------------------- */

test("student/friends group: a group with names and no lineage is ready", () => {
  const group = [
    personWithName("p1", "Ravi"),
    personWithName("p2", "Sita"),
    personWithName("p3", "John"),
  ];
  for (const person of group) {
    for (const { key } of LINEAGE_FIELDS) {
      assert.equal(person[key].status, "UNKNOWN");
    }
  }
  assert.equal(validateParticipants(group).valid, true);
  assert.equal(participantsReadyForPuja(group), true);
});

/* -------------------------------------------------------------------------- */
/* Active participants / "Only me" must not delete profiles                   */
/* -------------------------------------------------------------------------- */

test("activeParticipants: SELF uses the first profile, family and group use all", () => {
  const list = [
    personWithName("p1", "Mahesh"),
    personWithName("p2", "Lakshmi"),
    personWithName("p3", "Anasuya"),
  ];
  assert.deepEqual(
    activeParticipants("SELF", list).map((p) => p.name),
    ["Mahesh"],
  );
  assert.equal(activeParticipants("FAMILY", list).length, 3);
  assert.equal(activeParticipants("GROUP", list).length, 3);
});

test("activeParticipants: switching mode does not mutate the stored list", () => {
  const list = [personWithName("p1", "Mahesh"), personWithName("p2", "Lakshmi")];
  activeParticipants("SELF", list);
  assert.equal(list.length, 2, "the full family list is preserved for a later switch back");
});

/* -------------------------------------------------------------------------- */
/* Known / unknown / partial Gotra                                            */
/* -------------------------------------------------------------------------- */

test("known Gotra: the typed name is kept and the participant is valid", () => {
  const person = normalizeParticipant({
    ...personWithName("p1", "Mahesh"),
    gotra: { status: "KNOWN", name: "  Bharadwaja  " },
  });
  assert.equal(person.gotra.name, "Bharadwaja");
  assert.equal(validateParticipant(person).valid, true);
});

test("known Gotra with a blank name is incomplete input, not 'unknown'", () => {
  const result = validateParticipant({
    ...personWithName("p1", "Mahesh"),
    gotra: { status: "KNOWN", name: "   " },
  });
  assert.equal(result.valid, false);
  assert.equal(result.lineageErrors[0].field, "gotra");
});

test("unknown Gotra: status preserved, no name added, puja not blocked", () => {
  const person = normalizeParticipant({
    ...personWithName("p1", "Mahesh"),
    gotra: { status: "UNKNOWN", name: "should be dropped" },
  });
  assert.deepEqual(person.gotra, { status: "UNKNOWN", name: "" });
  assert.equal(participantsReadyForPuja([person]), true);
});

test("unsure Gotra is preserved exactly and never resolved to a value", () => {
  assert.deepEqual(
    normalizeLineageField({ status: "UNSURE", name: "Kashyapa" }),
    { status: "UNSURE", name: "" },
  );
});

test("partial information: some known, others unknown/unsure, still valid", () => {
  const person = normalizeParticipant({
    ...personWithName("p1", "Mahesh"),
    gotra: { status: "KNOWN", name: "Kaundinya" },
    veda: { status: "UNSURE", name: "" },
    sutra: { status: "UNKNOWN", name: "" },
    sampradaya: { status: "KNOWN", name: "Smarta" },
  });
  assert.equal(validateParticipant(person).valid, true);
});

test("no lineage inference: surname, region and location never populate a field", () => {
  const person = normalizeParticipant({
    id: "p1",
    name: "Sharma from Tirupati, living in Frisco Texas, Telugu family",
    gotra: { status: "UNKNOWN", name: "" },
    veda: { status: "UNKNOWN", name: "" },
    sutra: { status: "UNSURE", name: "" },
    sampradaya: { status: "UNKNOWN", name: "" },
  });
  for (const { key } of LINEAGE_FIELDS) {
    assert.equal(person[key].name, "");
  }
});

/* -------------------------------------------------------------------------- */
/* Provenance and the guidance gate                                          */
/* -------------------------------------------------------------------------- */

test("draftProvenance carries a version but no reviewer", () => {
  const p = provenance.draftProvenance();
  assert.equal(p.contentVersion, provenance.DRAFT_CONTENT_VERSION);
  assert.equal(p.reviewer, null);
  assert.equal(p.reviewDate, null);
  assert.equal(provenance.hasReviewer(p), false);
});

test("canDisplayAsGuidance: practical guidance shows, unreviewed claims do not", () => {
  const draft = provenance.draftProvenance();
  assert.equal(provenance.canDisplayAsGuidance("GENERAL_GUIDANCE", draft), true);
  assert.equal(provenance.canDisplayAsGuidance("PRIEST_REVIEWED_PRACTICE", draft), false);
  assert.equal(provenance.canDisplayAsGuidance("REVIEW_REQUIRED", draft), false);

  // Reviewer + date alone is NOT enough for VERIFIED - it also needs a written
  // source, an exact reference, a qualification, and a confirmed source status.
  const reviewerOnly = provenance.draftProvenance({
    reviewer: "Test Priest",
    reviewerQualification: "temple priest",
    reviewDate: "2026-01-01",
  });
  assert.equal(provenance.canDisplayAsGuidance("VERIFIED", reviewerOnly), false);
  // ...but it is enough for PRIEST_REVIEWED_PRACTICE (source may be pending).
  assert.equal(
    provenance.canDisplayAsGuidance("PRIEST_REVIEWED_PRACTICE", reviewerOnly),
    true,
  );

  const fullyVerified = provenance.draftProvenance({
    source: "Named text",
    sourceReference: "1.2.3",
    reviewer: "Test Priest",
    reviewerQualification: "temple priest",
    reviewDate: "2026-01-01",
    traditionScope: "Telugu Smarta household",
    writtenSourceStatus: "CONFIRMED",
  });
  assert.equal(provenance.canDisplayAsGuidance("VERIFIED", fullyVerified), true);
  assert.equal(provenance.canDisplayAsGuidance("REVIEW_REQUIRED", fullyVerified), false);
});

test("AWAITING_REVIEW_NOTICE makes no recommendation", () => {
  assert.match(reviewStatus.AWAITING_REVIEW_NOTICE, /awaiting religious review/i);
  assert.match(reviewStatus.AWAITING_REVIEW_NOTICE, /no recommendation/i);
});

/* -------------------------------------------------------------------------- */
/* Materials checklist                                                        */
/* -------------------------------------------------------------------------- */

test("every material has a factual description, provenance and a review status", () => {
  const categories = new Set(["COMMON", "SOMETIMES", "TRADITION_SPECIFIC"]);
  for (const item of materials.MATERIALS) {
    assert.ok(item.description.length > 10, `${item.id} description`);
    assert.ok(categories.has(item.category), `${item.id} category`);
    assert.ok(reviewStatus.REVIEW_STATUS_LABEL[item.reviewStatus], `${item.id} status`);
    assert.ok(item.provenance, `${item.id} provenance`);
    assert.equal(item.provenance.contentVersion, provenance.DRAFT_CONTENT_VERSION);
    assert.equal(provenance.hasReviewer(item.provenance), false);
  }
});

test("materials use neutral language, never 'Needed' or 'Required'", () => {
  for (const label of Object.values(materials.MATERIAL_CATEGORY_LABEL)) {
    assert.doesNotMatch(label, /needed|required/i);
  }
  assert.match(materials.MATERIALS_DISCLAIMER, /draft/i);
  assert.match(materials.MATERIALS_DISCLAIMER, /not been decided/i);
});

test("contested items (durva, patri) are REVIEW_REQUIRED and gated off", () => {
  const byId = Object.fromEntries(materials.MATERIALS.map((m) => [m.id, m]));
  for (const id of ["durva", "patri-leaves"]) {
    assert.equal(byId[id].reviewStatus, "REVIEW_REQUIRED");
    assert.equal(
      provenance.canDisplayAsGuidance(byId[id].reviewStatus, byId[id].provenance),
      false,
    );
  }
});

test("factual object descriptions are GENERAL_GUIDANCE and displayable", () => {
  const byId = Object.fromEntries(materials.MATERIALS.map((m) => [m.id, m]));
  for (const id of ["idol", "lamp", "water", "akshata"]) {
    assert.equal(byId[id].reviewStatus, "GENERAL_GUIDANCE");
    assert.equal(
      provenance.canDisplayAsGuidance(byId[id].reviewStatus, byId[id].provenance),
      true,
    );
  }
});

test("missing materials are summarised but never block the puja", () => {
  const none = materials.getMaterialReadiness([]);
  assert.equal(none.available, 0);
  assert.ok(none.missingCommon.length > 0);
  assert.equal(materials.MISSING_MATERIALS_BLOCK_PUJA, false);

  const some = materials.getMaterialReadiness(["idol", "lamp", "water"]);
  assert.equal(some.available, 3);
  assert.equal(participantsReadyForPuja([personWithName("p1", "Mahesh")]), true);
});

/* -------------------------------------------------------------------------- */
/* Patri (leaves) section                                                     */
/* -------------------------------------------------------------------------- */

test("patri: no predefined leaf names are exposed by the module", () => {
  assert.equal(leaves.LEAF_OPTIONS, undefined);
  assert.equal(leaves.TRADITIONAL_LEAF_COUNT, undefined);
  const serialised = JSON.stringify(leaves);
  for (const banned of ["Tulasi", "curry leaf", "betel", "banana leaf", "mango leaf"]) {
    assert.doesNotMatch(serialised, new RegExp(banned, "i"), `must not mention ${banned}`);
  }
});

test("patri: user self-reports HAVE / NONE / UNSURE", () => {
  assert.deepEqual(
    leaves.PATRI_SELF_REPORT_OPTIONS.map((o) => o.value),
    ["HAVE", "NONE", "UNSURE"],
  );
  assert.equal(leaves.isValidPatriSelfReport("HAVE"), true);
  assert.equal(leaves.isValidPatriSelfReport("MAYBE"), false);
});

test("patri: section shows the awaiting-review notice and a safety warning", () => {
  assert.match(leaves.PATRI_REVIEW_NOTICE, /awaiting religious review/i);
  assert.match(leaves.PATRI_SAFETY_NOTE, /identify/i);
  assert.match(leaves.PATRI_SAFETY_NOTE, /unknown or unsafe/i);
  assert.match(leaves.PATRI_SAFETY_NOTE, /kitchen herbs/i);
  assert.equal(leaves.MISSING_PATRI_BLOCKS_PUJA, false);
});

/* -------------------------------------------------------------------------- */
/* Ritual steps                                                               */
/* -------------------------------------------------------------------------- */

test("every step is what / how / why and carries provenance", () => {
  for (const step of steps.RITUAL_STEPS) {
    assert.ok(step.what && step.how && step.why, `${step.id} content`);
    assert.ok(step.provenance, `${step.id} provenance`);
    assert.ok(step.provenance.contentVersion, `${step.id} content version`);
  }
});

test("only the two practical steps display as guidance; ritual steps are gated", () => {
  const shown = steps.RITUAL_STEPS.filter((step) =>
    provenance.canDisplayAsGuidance(step.reviewStatus, step.provenance),
  ).map((step) => step.id);
  assert.deepEqual(shown, ["get-ready", "light-lamp"]);
});

test("every religious candidate stays locked and REVIEW_REQUIRED", () => {
  const locked = steps.lockedSteps();
  assert.ok(locked.some((step) => step.id === "sankalpam"));
  assert.ok(locked.some((step) => step.id === "yatha-shakti"));
  for (const step of steps.lockedSteps()) {
    assert.equal(step.reviewStatus, "REVIEW_REQUIRED");
  }
});

test("no step object carries a mantra or Sankalpam wording field", () => {
  const allowed = new Set([
    "id", "title", "teluguTitle", "teluguInstruction", "what", "how", "why",
    "importance", "minutes", "termNote", "reviewStatus", "locked", "provenance",
  ]);
  for (const step of steps.RITUAL_STEPS) {
    for (const key of Object.keys(step)) {
      assert.ok(allowed.has(key), `unexpected field "${key}" on step ${step.id}`);
    }
  }
});

/* -------------------------------------------------------------------------- */
/* Festival date and countdown                                                */
/* -------------------------------------------------------------------------- */

test("festival countdown is computed from the configured date", () => {
  const day = (iso) => festival.epochDay(Date.parse(`${iso}T00:00:00Z`));
  assert.equal(festival.daysUntilFestival(day("2026-09-04")), 10);
  assert.equal(festival.daysUntilFestival(day("2026-09-13")), 1);
  assert.equal(festival.daysUntilFestival(day("2026-09-14")), 0);
  assert.equal(festival.daysUntilFestival(day("2026-09-20")), -6);
});

test("festival countdown is null when the current day is unknown (SSR)", () => {
  assert.equal(festival.daysUntilFestival(0), null);
  assert.equal(festival.formatEpochDay(0), null);
  assert.equal(festival.PILOT_FESTIVAL.isPilotData, true);
});

/* -------------------------------------------------------------------------- */
/* Milestone A safety corrections                                             */
/* -------------------------------------------------------------------------- */

// Correction 1: the preparation / start-puja gate uses full validation, not a
// name-only check. A KNOWN lineage field with a blank value must block.
test("gate: a KNOWN detail with a blank value blocks preparation", () => {
  const person = {
    ...personWithName("p1", "Mahesh"),
    gotra: { status: "KNOWN", name: "" },
  };

  // The old name-only helper would have let this through.
  assert.equal(participantsReadyForPuja([person]), true);
  // The gate the app now uses does not.
  assert.equal(validateParticipants([person]).valid, false);

  person.gotra.name = "Bharadwaja";
  assert.equal(validateParticipants([person]).valid, true);
});

test("gate: is evaluated over the active participants for the mode", () => {
  const list = [
    personWithName("p1", "Mahesh"),
    { ...personWithName("p2", "Lakshmi"), veda: { status: "KNOWN", name: "" } },
  ];

  // "Only me" uses just the first, valid profile -> gate open.
  assert.equal(
    validateParticipants(activeParticipants("SELF", list)).valid,
    true,
  );
  // Family uses everyone, and the second profile is incomplete -> gate closed.
  assert.equal(
    validateParticipants(activeParticipants("FAMILY", list)).valid,
    false,
  );
});

// Correction 5: the countdown never presents a negative number after the day.
test("festivalCountdown: states before, on, and after the festival", () => {
  const day = (iso) => festival.epochDay(Date.parse(`${iso}T00:00:00Z`));

  assert.deepEqual(festival.festivalCountdown(day("2026-09-04")), {
    state: "upcoming",
    days: 10,
  });
  assert.deepEqual(festival.festivalCountdown(day("2026-09-14")), {
    state: "today",
  });
  assert.deepEqual(festival.festivalCountdown(day("2026-09-20")), {
    state: "past",
    daysAgo: 6,
  });
  assert.deepEqual(festival.festivalCountdown(0), { state: "unknown" });

  // Nothing the countdown can surface is a negative number.
  for (const iso of ["2026-09-04", "2026-09-14", "2026-09-20", "2027-01-01"]) {
    const c = festival.festivalCountdown(day(iso));
    const shown = c.days ?? c.daysAgo ?? 0;
    assert.ok(shown >= 0, `${iso} -> ${JSON.stringify(c)}`);
  }
});

// Correction 4: progress is cleared only after the user confirms.
test("requestReset: does nothing when the user declines", () => {
  let cleared = 0;
  const done = storage.requestReset({
    confirm: () => false,
    onReset: () => { cleared += 1; },
  });
  assert.equal(done, false);
  assert.equal(cleared, 0);
});

test("requestReset: clears once when the user confirms", () => {
  let cleared = 0;
  const done = storage.requestReset({
    confirm: (message) => {
      assert.match(message, /clears/i);
      return true;
    },
    onReset: () => { cleared += 1; },
  });
  assert.equal(done, true);
  assert.equal(cleared, 1);
});

test("requestReset: does not clear when it cannot ask (no browser confirm)", () => {
  // In this Node test environment there is no `window`, so the default confirm
  // returns false and nothing is cleared.
  let cleared = 0;
  const done = storage.requestReset({ onReset: () => { cleared += 1; } });
  assert.equal(done, false);
  assert.equal(cleared, 0);
});

/* -------------------------------------------------------------------------- */
/* Saved progress                                                             */
/* -------------------------------------------------------------------------- */

function makeFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    get size() {
      return map.size;
    },
  };
}

test("saved progress: round-trips mode, participants, materials, patri and step", () => {
  const progress = {
    mode: "FAMILY",
    participants: [
      normalizeParticipant({
        ...personWithName("p1", "Mahesh"),
        gotra: { status: "KNOWN", name: "Bharadwaja" },
      }),
      normalizeParticipant(personWithName("p2", "Lakshmi")),
    ],
    availableMaterialIds: ["idol", "lamp"],
    patriSelfReport: "UNSURE",
    stepIndex: 2,
  };

  const store = makeFakeStorage();
  storage.saveProgress(progress, store);
  const loaded = storage.loadProgress(store);

  assert.equal(loaded.mode, "FAMILY");
  assert.equal(loaded.participants.length, 2);
  assert.equal(loaded.participants[0].gotra.name, "Bharadwaja");
  assert.deepEqual(loaded.availableMaterialIds, ["idol", "lamp"]);
  assert.equal(loaded.patriSelfReport, "UNSURE");
  assert.equal(loaded.stepIndex, 2);
});

test("saved progress: legacy named-leaf data is dropped, not migrated", () => {
  const store = makeFakeStorage({
    "vedasaarathi:preparation:v2": JSON.stringify({
      mode: "SELF",
      participants: [{ id: "p1", name: "Mahesh" }],
      availableMaterialIds: [],
      availableLeafIds: ["tulasi", "curry"],
      patriSelfReport: "bogus",
      stepIndex: 0,
    }),
  });
  const loaded = storage.loadProgress(store);
  assert.equal("availableLeafIds" in loaded, false);
  assert.equal(loaded.patriSelfReport, null);
});

test("saved progress: damaged or empty data falls back to a clean state", () => {
  assert.deepEqual(storage.parseProgress(null), storage.emptyProgress());
  assert.deepEqual(storage.parseProgress("{not json"), storage.emptyProgress());
  assert.deepEqual(storage.parseProgress("[]"), storage.emptyProgress());

  const weird = storage.parseProgress(
    JSON.stringify({ mode: "CULT", participants: "nope", stepIndex: -4 }),
  );
  assert.equal(weird.mode, "SELF");
  assert.equal(weird.participants.length, 1);
  assert.equal(weird.stepIndex, 0);
  assert.equal(weird.patriSelfReport, null);
});

test("saved progress: a stored UNKNOWN lineage never loads as a named value", () => {
  const store = makeFakeStorage({
    "vedasaarathi:preparation:v2": JSON.stringify({
      mode: "SELF",
      participants: [
        {
          id: "p1",
          name: "Mahesh",
          gotra: { status: "UNKNOWN", name: "Kashyapa" },
          veda: { status: "UNSURE", name: "Yajur" },
          sutra: { status: "KNOWN", name: "Apastamba" },
          sampradaya: { status: "UNKNOWN", name: "" },
        },
      ],
      availableMaterialIds: [],
      patriSelfReport: null,
      stepIndex: 0,
    }),
  });
  const loaded = storage.loadProgress(store);
  assert.deepEqual(loaded.participants[0].gotra, { status: "UNKNOWN", name: "" });
  assert.deepEqual(loaded.participants[0].veda, { status: "UNSURE", name: "" });
  assert.equal(loaded.participants[0].sutra.name, "Apastamba");
});

test("saved progress: clearProgress removes the stored entry", () => {
  const store = makeFakeStorage();
  storage.saveProgress(storage.emptyProgress(), store);
  assert.equal(store.size, 1);
  storage.clearProgress(store);
  assert.equal(store.size, 0);
});

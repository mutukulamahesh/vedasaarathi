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
const storage = await vite.ssrLoadModule("/lib/storage/preparation.ts");

const {
  PARTICIPANT_MODES,
  LINEAGE_FIELDS,
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
  for (const option of PARTICIPANT_MODES) {
    assert.ok(option.title.length > 0);
    assert.ok(option.description.length > 0);
  }
});

/* -------------------------------------------------------------------------- */
/* Individual participant                                                     */
/* -------------------------------------------------------------------------- */

test("individual participant: a name is all that is required", () => {
  const me = personWithName("p1", "Mahesh");
  const result = validateParticipant(me);

  assert.equal(result.valid, true);
  assert.equal(result.nameError, null);
  assert.deepEqual(result.lineageErrors, []);
  assert.equal(participantsReadyForPuja([me]), true);
});

test("individual participant: a missing name is reported and blocks progress", () => {
  const nameless = createParticipant("p1");
  const result = validateParticipant(nameless);

  assert.equal(result.valid, false);
  assert.match(result.nameError, /name/i);
  assert.equal(participantsReadyForPuja([nameless]), false);
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

  const summary = validateParticipants(family);
  assert.equal(summary.results.length, 3);
  assert.equal(summary.results[0].valid, true);
  assert.equal(summary.results[1].valid, true);
  assert.equal(summary.results[2].valid, false);
  assert.equal(summary.valid, false);
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
/* Known Gotra                                                                */
/* -------------------------------------------------------------------------- */

test("known Gotra: the typed name is kept and the participant is valid", () => {
  const person = {
    ...personWithName("p1", "Mahesh"),
    gotra: { status: "KNOWN", name: "  Bharadwaja  " },
  };

  const normalized = normalizeParticipant(person);
  assert.equal(normalized.gotra.status, "KNOWN");
  assert.equal(normalized.gotra.name, "Bharadwaja");
  assert.equal(validateParticipant(normalized).valid, true);
});

test("known Gotra with a blank name is incomplete input, not 'unknown'", () => {
  const person = {
    ...personWithName("p1", "Mahesh"),
    gotra: { status: "KNOWN", name: "   " },
  };

  const result = validateParticipant(person);
  assert.equal(result.valid, false);
  assert.equal(result.lineageErrors.length, 1);
  assert.equal(result.lineageErrors[0].field, "gotra");
  assert.match(result.lineageErrors[0].message, /don't know|not sure/i);
});

/* -------------------------------------------------------------------------- */
/* Unknown Gotra                                                              */
/* -------------------------------------------------------------------------- */

test("unknown Gotra: status is preserved, no name is added, puja is not blocked", () => {
  const person = {
    ...personWithName("p1", "Mahesh"),
    gotra: { status: "UNKNOWN", name: "should be dropped" },
  };

  const normalized = normalizeParticipant(person);
  assert.equal(normalized.gotra.status, "UNKNOWN");
  assert.equal(normalized.gotra.name, "");
  assert.equal(validateParticipant(normalized).valid, true);
  assert.equal(participantsReadyForPuja([normalized]), true);
});

test("unsure Gotra is preserved exactly and never resolved to a value", () => {
  const field = normalizeLineageField({ status: "UNSURE", name: "Kashyapa" });
  assert.deepEqual(field, { status: "UNSURE", name: "" });
});

/* -------------------------------------------------------------------------- */
/* Partial information                                                        */
/* -------------------------------------------------------------------------- */

test("partial information: some fields known, others unknown or unsure, still valid", () => {
  const person = normalizeParticipant({
    ...personWithName("p1", "Mahesh"),
    gotra: { status: "KNOWN", name: "Kaundinya" },
    veda: { status: "UNSURE", name: "" },
    sutra: { status: "UNKNOWN", name: "" },
    sampradaya: { status: "KNOWN", name: "Smarta" },
  });

  const result = validateParticipant(person);
  assert.equal(result.valid, true);
  assert.equal(person.gotra.name, "Kaundinya");
  assert.equal(person.veda.status, "UNSURE");
  assert.equal(person.sutra.status, "UNKNOWN");
  assert.equal(person.sampradaya.name, "Smarta");
});

/* -------------------------------------------------------------------------- */
/* No lineage inference                                                       */
/* -------------------------------------------------------------------------- */

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
    assert.ok(person[key].status === "UNKNOWN" || person[key].status === "UNSURE");
  }
  assert.equal(participantsReadyForPuja([person]), true);
});

/* -------------------------------------------------------------------------- */
/* Materials checklist                                                        */
/* -------------------------------------------------------------------------- */

test("every material has a plain explanation, a category and a review status", () => {
  const categories = new Set(["REQUIRED", "OPTIONAL", "TRADITION_SPECIFIC"]);
  for (const item of materials.MATERIALS) {
    assert.ok(item.id && item.name, `material needs id and name`);
    assert.ok(
      item.explanation.length > 20,
      `${item.id} needs a plain-language explanation`,
    );
    assert.ok(categories.has(item.category), `${item.id} category`);
    assert.ok(
      reviewStatus.REVIEW_STATUS_LABEL[item.reviewStatus],
      `${item.id} review status`,
    );
    assert.ok(
      "approvedAlternative" in item,
      `${item.id} must state its alternative (or null)`,
    );
  }
});

test("items whose basis is unconfirmed are marked REVIEW_REQUIRED", () => {
  const byId = Object.fromEntries(materials.MATERIALS.map((m) => [m.id, m]));
  assert.equal(byId["patri-leaves"].reviewStatus, "REVIEW_REQUIRED");
  assert.equal(byId["durva"].reviewStatus, "REVIEW_REQUIRED");
});

/* -------------------------------------------------------------------------- */
/* Missing materials                                                          */
/* -------------------------------------------------------------------------- */

test("missing materials are summarised but never block the puja", () => {
  const none = materials.getMaterialReadiness([]);
  assert.equal(none.available, 0);
  assert.ok(none.missingRequired.length > 0);
  assert.equal(materials.MISSING_MATERIALS_BLOCK_PUJA, false);

  const some = materials.getMaterialReadiness(["idol", "lamp", "water"]);
  assert.equal(some.available, 3);
  assert.ok(some.missingRequired.every((item) => item.category === "REQUIRED"));

  // A person with a name can still proceed with nothing gathered.
  const me = personWithName("p1", "Mahesh");
  assert.equal(participantsReadyForPuja([me]), true);
});

/* -------------------------------------------------------------------------- */
/* 21 leaves section                                                          */
/* -------------------------------------------------------------------------- */

test("21 leaves: preferred count is stated, list basis is under review", () => {
  assert.equal(leaves.TRADITIONAL_LEAF_COUNT, 21);
  assert.equal(leaves.LEAF_LIST_REVIEW_STATUS, "REVIEW_REQUIRED");
  assert.match(leaves.LEAF_BASIS_NOTE, /21/);
  assert.match(leaves.LEAF_BASIS_NOTE, /review/i);
  assert.match(leaves.LEAF_BASIS_NOTE, /everyone|not a rule/i);
});

test("21 leaves: safety note warns against unknown plants", () => {
  assert.match(leaves.LEAF_SAFETY_NOTE, /identify/i);
  assert.match(leaves.LEAF_SAFETY_NOTE, /unknown|unsafe/i);
});

test("21 leaves: flowers or akshata alternative is priest-reviewed practice", () => {
  assert.equal(leaves.LEAF_ALTERNATIVE.reviewStatus, "PRIEST_REVIEWED_PRACTICE");
  assert.match(leaves.LEAF_ALTERNATIVE.text, /flower|akshata/i);
});

test("21 leaves: user can record the leaves they have", () => {
  const readiness = leaves.getLeafReadiness(["tulasi", "mango", "unknown-id"]);
  assert.equal(readiness.preferredCount, 21);
  assert.equal(readiness.selectedCount, 2);
  assert.equal(readiness.hasAny, true);
  assert.equal(leaves.getLeafReadiness([]).hasAny, false);
  assert.equal(leaves.MISSING_LEAVES_BLOCK_PUJA, false);
});

/* -------------------------------------------------------------------------- */
/* Sacred content boundaries                                                  */
/* -------------------------------------------------------------------------- */

test("every ritual step is written as what / how / why with terms explained", () => {
  for (const step of steps.RITUAL_STEPS) {
    assert.ok(step.what.length > 0, `${step.id} what`);
    assert.ok(step.how.length > 0, `${step.id} how`);
    assert.ok(step.why.length > 0, `${step.id} why`);
    assert.ok(
      reviewStatus.REVIEW_STATUS_LABEL[step.reviewStatus],
      `${step.id} review status`,
    );
  }
});

test("Sankalpam and closing steps stay locked and REVIEW_REQUIRED", () => {
  const locked = steps.lockedSteps().map((step) => step.id);
  assert.deepEqual(locked.sort(), ["closing", "sankalpam"]);
  for (const step of steps.lockedSteps()) {
    assert.equal(step.reviewStatus, "REVIEW_REQUIRED");
    assert.equal(reviewStatus.isReleasable(step.reviewStatus), false);
  }
});

test("no step object carries a mantra or Sankalpam wording field", () => {
  const allowed = new Set([
    "id",
    "title",
    "teluguTitle",
    "what",
    "how",
    "why",
    "termNote",
    "reviewStatus",
    "locked",
  ]);
  for (const step of steps.RITUAL_STEPS) {
    for (const key of Object.keys(step)) {
      assert.ok(allowed.has(key), `unexpected field "${key}" on step ${step.id}`);
    }
  }
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

test("saved progress: round-trips mode, participants, materials, leaves and step", () => {
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
    availableLeafIds: ["tulasi"],
    stepIndex: 2,
  };

  const store = makeFakeStorage();
  storage.saveProgress(progress, store);
  const loaded = storage.loadProgress(store);

  assert.equal(loaded.mode, "FAMILY");
  assert.equal(loaded.participants.length, 2);
  assert.equal(loaded.participants[0].gotra.name, "Bharadwaja");
  assert.deepEqual(loaded.availableMaterialIds, ["idol", "lamp"]);
  assert.deepEqual(loaded.availableLeafIds, ["tulasi"]);
  assert.equal(loaded.stepIndex, 2);
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
      availableLeafIds: [],
      stepIndex: 0,
    }),
  });

  const loaded = storage.loadProgress(store);
  assert.equal(loaded.participants[0].gotra.status, "UNKNOWN");
  assert.equal(loaded.participants[0].gotra.name, "");
  assert.equal(loaded.participants[0].veda.status, "UNSURE");
  assert.equal(loaded.participants[0].veda.name, "");
  assert.equal(loaded.participants[0].sutra.status, "KNOWN");
  assert.equal(loaded.participants[0].sutra.name, "Apastamba");
});

test("saved progress: clearProgress removes the stored entry", () => {
  const store = makeFakeStorage();
  storage.saveProgress(storage.emptyProgress(), store);
  assert.equal(store.size, 1);
  storage.clearProgress(store);
  assert.equal(store.size, 0);
});

// The functional beta Sankalpam: individual / family / unrelated-group modes,
// only source-supported fields populated, unknown lineage never inferred, no
// city / timezone / coordinates, and every unsupported slot recorded as a
// priest question.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const { assembleSankalpam } =
  await vite.ssrLoadModule("/lib/pujas/vinayaka/sankalpam-assembly.ts");
const { SANKALPAM_TRANSLITERATION } =
  await vite.ssrLoadModule("/lib/pujas/vinayaka/sankalpam.ts");

const HYDERABAD = {
  status: "READY", latitude: 17.38, longitude: 78.48, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};

test("INDIVIDUAL: names the one performer, uses the plain 'asmaakaM' framing, no family phrase", () => {
  const s = assembleSankalpam("SELF", [{ name: "Mahesh" }], null);
  assert.equal(s.mode, "INDIVIDUAL");
  assert.ok(s.spokenFor.join(" ").includes("Mahesh"));
  assert.match(s.framingPhrase, /asmaakaM \(for us\)/);
  assert.doesNotMatch(s.framingPhrase, /kuTuMbaanaaM/);
});

test("FAMILY: uses the source-supported 'saha kuTuMbaanaaM' family phrase", () => {
  const s = assembleSankalpam("FAMILY", [{ name: "Mahesh" }, { name: "Sita" }], null);
  assert.equal(s.mode, "FAMILY");
  assert.match(s.framingPhrase, /saha kuTuMbaanaaM/);
  assert.match(s.framingPhraseTelugu, /సహ కుటుంబానాం/);
  assert.ok(s.spokenFor.join(" ").includes("Mahesh") && s.spokenFor.join(" ").includes("Sita"));
});

test("GROUP (unrelated): keeps 'asmaakaM', does NOT say 'with our families', and records the group question", () => {
  const s = assembleSankalpam("GROUP", [{ name: "A" }, { name: "B" }, { name: "C" }], null);
  assert.equal(s.mode, "GROUP");
  assert.doesNotMatch(s.framingPhrase, /kuTuMbaanaaM/);
  assert.equal(s.spokenFor.length, 3);
  assert.ok(s.spokenFor.every((line) => /states the Sankalpam for themselves/.test(line)));
  assert.ok(s.openQuestions.some((q) => /unrelated group/i.test(q)));
});

test("only the country-level slot is filled from a saved location - never city, region, timezone or coordinates", () => {
  const s = assembleSankalpam("FAMILY", [{ name: "Mahesh" }], HYDERABAD);
  assert.equal(s.place, "India");
  const blob = JSON.stringify(s);
  assert.doesNotMatch(blob, /Hyderabad|Telangana|Asia\/Kolkata|17\.38|78\.48/);
});

test("no location => no place slot at all", () => {
  const s = assembleSankalpam("SELF", [{ name: "Mahesh" }], { status: "NOT_SET" });
  assert.equal(s.place, null);
});

test("unknown lineage is never filled or inferred - the short form has no lineage slot", () => {
  const s = assembleSankalpam("SELF", [{ name: "Rao" }], null); // surname must not seed a gotra
  assert.match(s.lineageNote, /Unknown lineage stays unknown/i);
  const blob = JSON.stringify(s);
  assert.doesNotMatch(blob, /gotra:\s*"[^"]+"/i);
  assert.doesNotMatch(blob, /Bharadwaja|Kashyapa|Vishwamitra/); // no deity/generic gotra
});

test("the canonical Sankalpam transliteration is passed through unedited, and it is a REVIEW_REQUIRED locked beta candidate", () => {
  const s = assembleSankalpam("SELF", [{ name: "Mahesh" }], null);
  assert.equal(s.transliteration, SANKALPAM_TRANSLITERATION);
  assert.equal(s.reviewStatus, "REVIEW_REQUIRED");
  assert.equal(s.locked, true);
  assert.equal(s.betaStatus, "SOURCED_BETA_CANDIDATE");
  assert.match(s.teluguScript, /మమ ఉపాత్త సమస్త దురితక్షయ/);
});

test("the short-form / dated Sankalpam and the city slot are always recorded as priest questions", () => {
  const s = assembleSankalpam("FAMILY", [{ name: "Mahesh" }], HYDERABAD);
  assert.ok(s.openQuestions.some((q) => /dated Sankalpam|samvatsara/i.test(q)));
  assert.ok(s.openQuestions.some((q) => /city \/ region|asmin daeSae/i.test(q)));
});

test("empty participant names never crash and never invent a name", () => {
  const s = assembleSankalpam("FAMILY", [{ name: "  " }, { name: "" }], null);
  assert.ok(Array.isArray(s.spokenFor) && s.spokenFor.length >= 1);
  assert.doesNotMatch(s.spokenFor.join(" "), /undefined|null/);
});

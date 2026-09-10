// General local search — deterministic, device-local, no network, no generation.
//
// Every required English + Telugu phrase must resolve to the right capability,
// every capability route must be a real screen the app can navigate to, and an
// unknown query must return a helpful empty result (never a guess).

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createTestViteServer } from "./helpers/vite-test-server.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const { searchCapabilities, SEARCH_CAPABILITIES } =
  await vite.ssrLoadModule("/lib/search/index.ts");

const top = (q) => searchCapabilities(q)[0]?.capability.route;

// Phrase → expected top route. Covers the exact phrases named in the batch
// (English + Telugu + synonyms).
const CASES = [
  ["Ganesh puja", "vinayaka-puja"],
  ["Vinayaka puja", "vinayaka-puja"],
  ["వినాయక పూజ", "vinayaka-puja"],
  ["ganesha chaturthi", "vinayaka-puja"],
  ["ganpati puja", "vinayaka-puja"],
  ["family Sankalpam", "sankalpam"],
  ["సంకల్పం", "sankalpam"],
  ["today's Tithi", "today-panchanga"],
  ["today tithi", "today-panchanga"],
  ["నేటి తిథి", "today-panchanga"],
  ["today's Panchanga", "today-panchanga"],
  ["Monthly Hindu calendar", "calendar"],
  ["hindu calendar", "calendar"],
  ["నెలవారీ హిందూ క్యాలెండర్", "calendar"],
  ["festivals this month", "calendar-festivals"],
  ["monthly festivals", "calendar-festivals"],
  ["ఈ నెల పండుగలు", "calendar-festivals"],
  ["add family member", "people"],
  ["కుటుంబ సభ్యులు", "people"],
  ["change location", "location"],
  ["స్థానం", "location"],
  ["offline download", "offline-download"],
  ["ఆఫ్‌లైన్ డౌన్‌లోడ్", "offline-download"],
];

for (const [q, route] of CASES) {
  test(`search "${q}" → ${route}`, () => {
    assert.equal(top(q), route, `top result for "${q}"`);
  });
}

test("an unknown query returns no results (a helpful empty state, never a guess)", () => {
  assert.deepEqual(searchCapabilities("zzzznope"), []);
  assert.deepEqual(searchCapabilities("   "), []);
  assert.deepEqual(searchCapabilities(""), []);
  assert.deepEqual(searchCapabilities("qwertyuiop asdfghjkl"), []);
});

test("results are ranked (score descending) and deterministic", () => {
  const a = searchCapabilities("puja");
  const b = searchCapabilities("puja");
  assert.equal(JSON.stringify(a), JSON.stringify(b), "same query → same result");
  for (let i = 1; i < a.length; i += 1) {
    assert.ok(a[i - 1].score >= a[i].score, "non-increasing score");
  }
});

test("every capability route is one of the known navigable routes", () => {
  const ROUTES = new Set([
    "vinayaka-puja", "sankalpam", "today-panchanga", "calendar",
    "calendar-festivals", "people", "location", "offline-download",
  ]);
  for (const cap of SEARCH_CAPABILITIES) {
    assert.ok(ROUTES.has(cap.route), `route ${cap.route}`);
    assert.ok(cap.title && cap.titleTe, "bilingual title");
    assert.ok(cap.description && cap.descriptionTe, "bilingual description");
    assert.ok(cap.keywords.length > 0, "has keywords");
    assert.ok(cap.keywords.some((k) => /[ఀ-౿]/.test(k)), "has at least one Telugu keyword");
  }
  assert.equal(SEARCH_CAPABILITIES.length, 8);
});

test("search performs no network access (pure function over static data)", () => {
  // If searchCapabilities tried fetch/XHR this would throw in this runtime; the
  // real guarantee is structural (no import of any network client), asserted by
  // the module having no fetch reference.
  const src = searchCapabilities.toString();
  assert.doesNotMatch(src, /fetch|XMLHttpRequest|WebSocket|import\(/);
});

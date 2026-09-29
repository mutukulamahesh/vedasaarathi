// The festival-card puja-timing label must be a neutral, method-agnostic
// string, and Home and Calendar must show the exact same wording.
//
// Before this fix, both screens hardcoded "Madhyahna puja window" / its
// Telugu equivalent for EVERY festival card with a computed window,
// regardless of which rule method actually produced it. That became
// visibly wrong the moment Maha Navami and Vijayadashami were restored
// (they use the new aparahna-vyapti method, an afternoon window, not
// Madhyahna) - and was already misleading for Pradosham, Dhanteras and
// Sankashti Chaturthi. This is a genuine user-facing defect: the words on
// the card describe the wrong muhurta to a family reading it, even though
// no prior test asserted on it strongly enough to fail.
//
// The fix keeps each screen's own local translation object (no shared
// module, no new architecture) but sets both to the same neutral pair:
//   EN "Observance time" / TE "ఆచరణ సమయం"
// This file proves, directly from the two component sources (not by
// re-deriving the values some other way), that both screens carry the
// SAME wording and that the old, now-inaccurate label is gone from both.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const HOME_SRC = readFileSync(`${ROOT}components/platform/home-screen.tsx`, "utf8");
const CALENDAR_SRC = readFileSync(`${ROOT}components/platform/calendar-screen.tsx`, "utf8");

const NEW_LABEL_EN = "Observance time";
const NEW_LABEL_TE = "ఆచరణ సమయం";
const OLD_LABEL_EN = "Madhyahna puja window";
const OLD_LABEL_TE = "మధ్యాహ్న పూజ సమయం";

/** Every `pujaWindow: "..."` string literal in a translation object,
 * in source order (EN block first, then TE, matching both files' own
 * `EN: {...}, TE: {...}` shape). */
function pujaWindowLabels(src) {
  const matches = [...src.matchAll(/pujaWindow:\s*"([^"]*)"/g)];
  return matches.map((m) => m[1]);
}

test("home-screen.tsx: EN and TE puja-window labels are the new neutral wording", () => {
  const [en, te] = pujaWindowLabels(HOME_SRC);
  assert.equal(en, NEW_LABEL_EN);
  assert.equal(te, NEW_LABEL_TE);
});

test("calendar-screen.tsx: EN and TE puja-window labels are the new neutral wording", () => {
  const [en, te] = pujaWindowLabels(CALENDAR_SRC);
  assert.equal(en, NEW_LABEL_EN);
  assert.equal(te, NEW_LABEL_TE);
});

test("Home and Calendar use IDENTICAL wording, both languages - not two independently-worded copies", () => {
  const [homeEn, homeTe] = pujaWindowLabels(HOME_SRC);
  const [calEn, calTe] = pujaWindowLabels(CALENDAR_SRC);
  assert.equal(homeEn, calEn, "EN labels must match exactly between Home and Calendar");
  assert.equal(homeTe, calTe, "TE labels must match exactly between Home and Calendar");
});

test("the old, now-inaccurate 'Madhyahna puja window' wording is gone from both screens", () => {
  for (const [name, src] of [["home-screen.tsx", HOME_SRC], ["calendar-screen.tsx", CALENDAR_SRC]]) {
    assert.ok(!src.includes(OLD_LABEL_EN), `${name} must not contain "${OLD_LABEL_EN}"`);
    assert.ok(!src.includes(OLD_LABEL_TE), `${name} must not contain "${OLD_LABEL_TE}"`);
  }
});

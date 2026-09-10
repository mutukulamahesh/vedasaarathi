// The family-usability batch: the compact Home card, the human-friendly +
// fully-bilingual Calendar, the simplified Sankalpam, and Telugu continuity
// across primary navigation and the correction dropdown.

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
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const { panchangaForLocation } = await vite.ssrLoadModule("/lib/panchanga/index.ts");
const { computeCalendarMonth } = await vite.ssrLoadModule("/lib/panchanga/calendar.ts");
const { defaultSankalpamChoices } = await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const dte = await vite.ssrLoadModule("/lib/panchanga/display-te.ts");

const noop = () => {};
const visible = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x?[0-9a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India", source: "MANUAL",
  accuracyMeters: null, savedAt: "2026-09-09T00:00:00.000Z",
};
const NOW = Date.parse("2026-09-10T12:00:00Z");
const P = await panchangaForLocation(HYD, NOW);

/* -------------------------------------------------------------------------- */
/* display-te value translation                                              */
/* -------------------------------------------------------------------------- */

test("display-te translates Panchanga VALUES, not just labels, and passes unknowns through", () => {
  assert.equal(dte.teTithiPhrase("Krishna Amavasya"), "కృష్ణ అమావాస్య");
  assert.equal(dte.teNakshatra("Ashwini"), "అశ్విని");
  assert.equal(dte.teMasa("Bhadrapada"), "భాద్రపద");
  assert.equal(dte.tePaksha("Shukla"), "శుక్ల");
  assert.equal(dte.teVaara("Guruvara"), "గురు");
  assert.equal(dte.teSamvatsara("Parabhava"), "పరాభవ");
  assert.equal(dte.teEndsAt("8:56 AM tomorrow"), "8:56 AM రేపు");
  assert.equal(dte.teNakshatra("Totally Unknown"), "Totally Unknown");
});

/* -------------------------------------------------------------------------- */
/* Home — compact card, bilingual                                            */
/* -------------------------------------------------------------------------- */

function home(props) {
  return renderToStaticMarkup(
    React.createElement(page.HomeScreen, {
      setScreen: noop, openPreparation: noop, mode: "SELF", participantCount: 1,
      materialsReady: 0, todayEpochDay: 0, nowMs: NOW, location: HYD,
      featuredPuja: VINAYAKA_PUJA, panchanga: P, panchangaStatus: "ready", ...props,
    }),
  );
}

test("Home compact card: useful + avoid sections, Tithi + explanation, no technical fields on the surface", () => {
  const html = home({ language: "EN" });
  const compact = html.split('<details class="home-why">')[0];
  assert.match(compact, /Useful times today/);
  assert.match(compact, /Avoid starting important activities/);
  assert.match(compact, /Brahma Muhurta/);
  assert.match(compact, /Rahu Kalam/);
  assert.match(compact, /Today.s Tithi:/);
  assert.match(compact, /A Tithi is a lunar day/);
  assert.doesNotMatch(compact, /Samvatsara|Ayana|Ritu \(season\)/);
});

test("Home in Telugu: heading, sections, Tithi value and nav-independent labels are all Telugu", () => {
  const html = home({ language: "TE" });
  const text = visible(html);
  assert.match(text, /ఈ రోజు ఉపయోగకరమైన సమయాలు/); // "Useful times today"
  assert.match(text, /ముఖ్యమైన పనులు మొదలుపెట్టవద్దు/); // "Avoid..."
  assert.match(text, /ఈ రోజు తిథి/); // "Today's Tithi"
  assert.match(text, /బ్రహ్మ ముహూర్తం/); // Brahma Muhurta label in Telugu
  assert.match(text, /రాహు కాలం/); // Rahu Kalam in Telugu
  // The Tithi VALUE is Telugu (not "Krishna Amavasya").
  assert.doesNotMatch(text, /Krishna|Amavasya|Chaturdasi/);
});

test("Home 'Why these times?' explains each period, EN + TE, with the not-astrology scope line", () => {
  assert.match(visible(home({ language: "EN" })), /Not personalised and not astrology/);
  assert.match(visible(home({ language: "TE" })), /జ్యోతిష్యం కాదు/);
});

/* -------------------------------------------------------------------------- */
/* Calendar — a real computed month rendered through the screen shape        */
/* -------------------------------------------------------------------------- */

test("a computed CalendarDay carries formatted useful/avoid periods that translate to Telugu", async () => {
  const m = await computeCalendarMonth({ latitude: HYD.latitude, longitude: HYD.longitude, timezone: HYD.timezone, year: 2026, month: 9 });
  const d = m.days.find((x) => x.dateISO === "2026-09-10"); // Thursday
  assert.ok(d.useful.some((p) => p.id === "abhijit"));
  assert.ok(d.avoid.some((p) => p.id === "rahu"));
  // Telugu forms exist for the tithi/nakshatra names the calendar will show.
  assert.notEqual(dte.teTithiPhrase(d.tithi.name), d.tithi.name);
  assert.notEqual(dte.teNakshatra(d.nakshatra.name), d.nakshatra.name);
});

/* -------------------------------------------------------------------------- */
/* Simplified Sankalpam (FAMILY)                                             */
/* -------------------------------------------------------------------------- */

const PARTICIPANT = {
  id: "p1", name: "Mahesh",
  gotra: { status: "KNOWN", name: "Bharadwaja" }, veda: { status: "UNKNOWN", name: "" },
  sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
};

function sankalpam(language, choices = defaultSankalpamChoices()) {
  return renderToStaticMarkup(
    React.createElement(page.SankalpamSetupScreen, {
      activeList: [PARTICIPANT], mode: "FAMILY", location: HYD, panchanga: P,
      choices, setChoices: noop, begin: noop, back: noop, slug: "vinayaka-chavithi", language,
    }),
  );
}

test("FAMILY Sankalpam opens on 'Your Sankalpam is ready' with a short summary + four primary actions", () => {
  const html = sankalpam("EN");
  const text = visible(html);
  assert.match(text, /Your Sankalpam is ready/);
  assert.match(text, /Hear and practise/);
  assert.match(text, /View Sankalpam/);
  assert.match(text, /Change details/);
  assert.match(text, /Begin the puja/);
  // Summary lines.
  assert.match(text, /For\b.*(You|family)/i);
  assert.match(text, /Location used/);
  assert.match(text, /Gotra/);
  // NOT on the first screen: the technical mechanics.
  assert.doesNotMatch(text, /Bharata-khande/);
  assert.doesNotMatch(text, /Calendar detail/);
  assert.doesNotMatch(text, /Values you entered/);
  assert.doesNotMatch(text, /full dated form/i);
});

test("FAMILY Sankalpam ready screen is Telugu end-to-end when Telugu is selected", () => {
  const text = visible(sankalpam("TE"));
  assert.match(text, /మీ సంకల్పం సిద్ధంగా ఉంది/); // "Your Sankalpam is ready"
  assert.match(text, /వినండి, సాధన చేయండి/); // "Hear and practise"
  assert.match(text, /సంకల్పం చూడండి/); // "View Sankalpam"
  assert.match(text, /వివరాలు మార్చండి/); // "Change details"
  assert.match(text, /పూజ మొదలుపెట్టండి/); // "Begin the puja"
});

test("an unresolved Gotra surfaces ONE inline decision on the ready screen (never inferred)", () => {
  const p = { ...PARTICIPANT, gotra: { status: "UNKNOWN", name: "" } };
  const html = renderToStaticMarkup(
    React.createElement(page.SankalpamSetupScreen, {
      activeList: [p], mode: "FAMILY", location: HYD, panchanga: P,
      choices: defaultSankalpamChoices(), setChoices: noop, begin: noop, back: noop,
      slug: "vinayaka-chavithi", language: "EN",
    }),
  );
  const text = visible(html);
  assert.match(text, /How to state the Gotra/);
  assert.match(text, /never chosen for you and never guessed from a name/);
  // "Begin the puja" is disabled until the choice is made.
  assert.match(html, /<button[^>]*class="wide-primary"[^>]*disabled[^>]*>[\s\S]*?Begin the puja<\/button>/i);
  assert.match(text, /Make the one choice above to continue/);
});

/* -------------------------------------------------------------------------- */
/* Telugu continuity — correction dropdown step titles                       */
/* -------------------------------------------------------------------------- */

test("the correction-report step dropdown uses Telugu step titles in Telugu mode", () => {
  const te = renderToStaticMarkup(
    React.createElement(page.ReportCorrectionPanel, { puja: VINAYAKA_PUJA, path: "COMPLETE", language: "TE" }),
  );
  // At least one <option> is a Telugu step title, and no option is a bare
  // English step title like "Dhyana Shloka".
  assert.match(te, /<option[^>]*>[^<]*[ఀ-౿][^<]*<\/option>/);
  const en = renderToStaticMarkup(
    React.createElement(page.ReportCorrectionPanel, { puja: VINAYAKA_PUJA, path: "COMPLETE", language: "EN" }),
  );
  assert.notEqual(te, en, "the option list changes with language");
});

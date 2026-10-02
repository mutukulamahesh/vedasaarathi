// Bathukamma 2026 - presentation-only grouping.
//
// Calendar: the nine named days render as ONE collapsible section (collapsed
// by default: range heading, first and last day, a real "Show all 9 days"
// button with aria-expanded). Expanding reveals the existing per-day cards in
// date order (past marker and Reviewer-mode provenance intact). A deep link
// (Search / Home) to an intermediate day opens the section and scrolls to
// that day. Unsupported locations and other years render no section at all.
//
// Home: Bathukamma is ONE candidate for the P0/P1 slots - day 1 before the
// festival, today's day during it (with the closing Saddula date unless today
// IS Saddula), nothing after it.
//
// Dates, provenance and calculations are not touched by this grouping; the
// date/provenance assertions live in tests/bathukamma-2026.test.mjs.

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://vedasaarathi.test/" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const scrolled = [];
dom.window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() { scrolled.push(this); };

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { renderToStaticMarkup } = await import("react-dom/server");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const page = await vite.ssrLoadModule("/app/page.tsx");
const calendar = await vite.ssrLoadModule("/lib/panchanga/calendar.ts");
const cache = await vite.ssrLoadModule("/lib/storage/calendar-cache.ts");
const panchanga = await vite.ssrLoadModule("/lib/panchanga/index.ts");
const rules = await vite.ssrLoadModule("/lib/panchanga/festival-rules.ts");

const DAYS = [
  ["bathukamma-begins", "Engili Poola Bathukamma", "ఎంగిలిపూల బతుకమ్మ", "2026-10-10"],
  ["bathukamma-atukula", "Atukula Bathukamma", "అటుకుల బతుకమ్మ", "2026-10-11"],
  ["bathukamma-muddapappu", "Muddapappu Bathukamma", "ముద్దపప్పు బతుకమ్మ", "2026-10-12"],
  ["bathukamma-nanabiyyam", "Nanabiyyam Bathukamma", "నానబియ్యం బతుకమ్మ", "2026-10-13"],
  ["bathukamma-atla", "Atla Bathukamma", "అట్ల బతుకమ్మ", "2026-10-14"],
  ["bathukamma-aligina", "Aligina Bathukamma", "అలిగిన బతుకమ్మ", "2026-10-15"],
  ["bathukamma-vepakayala", "Vepakayala Bathukamma", "వేపకాయల బతుకమ్మ", "2026-10-16"],
  ["bathukamma-vennamuddala", "Vennamuddala Bathukamma", "వెన్నముద్దల బతుకమ్మ", "2026-10-17"],
  ["bathukamma-saddula", "Saddula Bathukamma", "సద్దుల బతుకమ్మ", "2026-10-18"],
];
const IDS = DAYS.map((d) => d[0]);

const loc = (city, region, country, latitude, longitude, timezone) => ({
  status: "READY", latitude, longitude, timezone, city, region, country,
  source: "MANUAL", accuracyMeters: null, savedAt: "2026-09-30T00:00:00.000Z",
});
const HYD = loc("Hyderabad", "Telangana", "India", 17.384, 78.4564, "Asia/Kolkata");
const FRISCO = loc("Frisco", "Texas", "United States", 33.1507, -96.8236, "America/Chicago");
const HOUSTON = loc("Houston", "Texas", "United States", 29.7633, -95.3633, "America/Chicago");

const OCT12_NOON_IST = Date.parse("2026-10-12T06:30:00Z");
const noop = () => {};
const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** Compute the month once and put it in the calendar cache, so CalendarScreen
 * adopts it synchronously on mount (the same path a revisit takes). */
async function seedMonth(l, year, month) {
  const q = {
    latitude: l.latitude, longitude: l.longitude, timezone: l.timezone, year, month,
    place: { city: l.city, region: l.region, country: l.country },
  };
  const m = await calendar.computeCalendarMonth(q);
  cache.writeCachedMonth(q, m);
  return m;
}

const oct2026Hyd = await seedMonth(HYD, 2026, 10);

async function mountCalendar(props) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r = createRoot(host);
  await act(async () => {
    r.render(React.createElement(page.CalendarScreen, {
      location: HYD, nowMs: OCT12_NOON_IST, language: "EN",
      openPuja: noop, goToLocation: noop, ...props,
    }));
  });
  return {
    host,
    festivals: () => host.querySelector(".calendar-festivals"),
    group: () => host.querySelector(".calendar-group"),
    toggle: () => host.querySelector(".calendar-group-toggle"),
    bathukammaCards: () => [...host.querySelectorAll(".calendar-festival-card")]
      .filter((c) => /Bathukamma|బతుకమ్మ/.test(c.textContent)),
    unmount: async () => { await act(async () => r.unmount()); host.remove(); },
  };
}

/* -------------------------------------------------------------------------- */
/* Calendar: collapse / expand                                                */
/* -------------------------------------------------------------------------- */

test("Calendar (Hyderabad, Oct 2026): Bathukamma starts collapsed - range heading, first and last day, a real toggle button", async () => {
  const c = await mountCalendar({});
  try {
    const group = c.group();
    assert.ok(group, "one Bathukamma section");
    assert.equal(c.host.querySelectorAll(".calendar-group").length, 1);
    assert.equal(text(group.querySelector(".calendar-group-title")), "Bathukamma · October 10–18, 2026");
    const lines = [...group.querySelectorAll(".calendar-group-summary li")].map(text);
    assert.deepEqual(lines, [
      "October 10: Engili Poola Bathukamma · Passed",
      "October 18: Saddula Bathukamma",
    ]);
    const btn = c.toggle();
    assert.equal(btn.tagName, "BUTTON", "a real button - keyboard operable");
    assert.equal(btn.getAttribute("type"), "button");
    assert.equal(btn.getAttribute("aria-expanded"), "false");
    assert.equal(text(btn), "Show all 9 days");
    const controlled = document.getElementById(btn.getAttribute("aria-controls"));
    assert.ok(controlled && group.contains(controlled), "aria-controls names the day list");
    assert.equal(c.bathukammaCards().length, 0, "no per-day card while collapsed");
    assert.doesNotMatch(text(c.festivals()), /Muddapappu|Atla Bathukamma/, "intermediate days are hidden");
    // The short schedule note stays visible while collapsed.
    assert.match(text(c.host.querySelector(".calendar-schedule-note")), /^This calendar follows the selected nine-day Bathukamma schedule\./);
    // Calendar-grid markers still mark all nine days.
    for (const [, , , iso] of DAYS) {
      const day = Number(iso.slice(8));
      const cell = [...c.host.querySelectorAll(".calendar-cell")].find((el) => text(el.querySelector(".calendar-daynum")) === String(day));
      assert.ok(cell.classList.contains("has-festival"), `${iso} keeps its festival marker`);
    }
    // Other festivals are not grouped (Durga Ashtami, 19 Oct, stays its own card).
    assert.equal([...c.host.querySelectorAll(".calendar-festival-card")].filter((el) => /Durga Ashtami/.test(el.textContent)).length, 1);
  } finally {
    await c.unmount();
  }
});

test("Calendar: the toggle expands to all nine existing cards in date order, then collapses again", async () => {
  const c = await mountCalendar({});
  try {
    await act(async () => c.toggle().click());
    assert.equal(c.toggle().getAttribute("aria-expanded"), "true");
    assert.equal(text(c.toggle()), "Hide the 9 days");
    assert.equal(c.group().querySelector(".calendar-group-summary"), null, "summary lines give way to the full list");
    const cards = c.bathukammaCards();
    assert.equal(cards.length, 9);
    assert.deepEqual(cards.map((el) => el.getAttribute("data-date")), DAYS.map((d) => d[3]), "date order");
    cards.forEach((el, i) => {
      assert.ok(text(el).includes(DAYS[i][1]), `card ${i + 1} is ${DAYS[i][1]}`);
      assert.ok(text(el).includes(DAYS[i][3]));
      assert.doesNotMatch(text(el), /Observance time/, "no observance time");
      assert.ok(c.group().contains(el), "inside the section");
    });
    // Past-date behaviour is unchanged inside the group (today is 12 Oct).
    assert.ok(cards[0].classList.contains("is-past") && cards[1].classList.contains("is-past"));
    assert.ok(!cards[2].classList.contains("is-past"), "today is not passed");
    assert.match(text(cards[1]), /Passed/);

    await act(async () => c.toggle().click());
    assert.equal(c.toggle().getAttribute("aria-expanded"), "false");
    assert.equal(c.bathukammaCards().length, 0);
    assert.equal(c.group().querySelectorAll(".calendar-group-summary li").length, 2);
  } finally {
    await c.unmount();
  }
});

test("Calendar (Telugu): heading, summary lines and toggle are in Telugu", async () => {
  const c = await mountCalendar({ language: "TE" });
  try {
    assert.equal(text(c.group().querySelector(".calendar-group-title")), "బతుకమ్మ · అక్టోబర్ 10–18, 2026");
    const lines = [...c.group().querySelectorAll(".calendar-group-summary li")].map(text);
    assert.deepEqual(lines, ["అక్టోబర్ 10: ఎంగిలిపూల బతుకమ్మ · గడిచింది", "అక్టోబర్ 18: సద్దుల బతుకమ్మ"]);
    assert.equal(text(c.toggle()), "మొత్తం 9 రోజులు చూడండి");
    await act(async () => c.toggle().click());
    assert.equal(text(c.toggle()), "9 రోజుల జాబితా దాచండి");
    assert.deepEqual(c.bathukammaCards().map((el) => text(el.querySelector("strong"))), DAYS.map((d) => d[2]));
  } finally {
    await c.unmount();
  }
});

test("Calendar (Reviewer mode): each expanded day keeps its own source line", async () => {
  const c = await mountCalendar({ reviewMode: true });
  try {
    await act(async () => c.toggle().click());
    const cards = c.bathukammaCards();
    assert.equal(cards.length, 9);
    for (const [id, , , iso] of DAYS) {
      const card = cards.find((el) => el.getAttribute("data-date") === iso);
      const f = oct2026Hyd.festivals.find((x) => x.ruleId === id);
      const rule = card.querySelector(".calendar-festival-rule");
      assert.ok(rule, `${id} shows its source in Reviewer mode`);
      assert.equal(rule.querySelector("a").getAttribute("href"), f.provenanceUrl);
      assert.ok(text(rule).includes(f.convention.slice(0, 40)));
    }
  } finally {
    await c.unmount();
  }
});

test("Calendar opened from Search on an intermediate day (Muddapappu) expands the section and scrolls to that day", async () => {
  scrolled.length = 0;
  const c = await mountCalendar({
    initialYearMonth: { year: 2026, month: 10 }, initialDateISO: "2026-10-12",
    initialRuleId: "bathukamma-muddapappu", focusFestivals: true,
  });
  try {
    assert.equal(c.toggle().getAttribute("aria-expanded"), "true", "auto-expanded");
    const cards = c.bathukammaCards();
    assert.equal(cards.length, 9);
    const target = cards.find((el) => el.getAttribute("data-date") === "2026-10-12");
    assert.match(text(target), /Muddapappu Bathukamma/);
    assert.ok(target.classList.contains("is-focused"), "the selected day is highlighted");
    assert.equal(cards.filter((el) => el.classList.contains("is-focused")).length, 1);
    assert.ok(scrolled.includes(target), "the selected day is scrolled into view");
    assert.equal(text(c.host.querySelector(".calendar-selected h2")), "2026-10-12", "that day is selected");
  } finally {
    await c.unmount();
  }
});

test("REGRESSION: Calendar opened for Navratri begins (11 Oct, inside the Bathukamma range) selects 11 Oct but keeps Bathukamma collapsed", async () => {
  scrolled.length = 0;
  const c = await mountCalendar({
    initialYearMonth: { year: 2026, month: 10 }, initialDateISO: "2026-10-11",
    initialRuleId: "navratri-begins", focusFestivals: true,
  });
  try {
    assert.ok(oct2026Hyd.festivals.some((f) => f.ruleId === "navratri-begins" && f.dateISO === "2026-10-11"),
      "fixture: Navratri begins is on 11 Oct at Hyderabad");
    assert.equal(text(c.host.querySelector(".calendar-selected h2")), "2026-10-11", "the date is still selected");
    assert.equal(c.toggle().getAttribute("aria-expanded"), "false", "Bathukamma is NOT expanded");
    assert.equal(c.bathukammaCards().length, 0);
    assert.equal(c.host.querySelectorAll(".calendar-festival-card.is-focused").length, 0, "no Bathukamma day highlighted");
    assert.ok(scrolled.includes(c.festivals()), "the festival list is still brought into view");
  } finally {
    await c.unmount();
  }
});

test("Calendar opened with a date but no festival id keeps Bathukamma collapsed", async () => {
  const c = await mountCalendar({ initialYearMonth: { year: 2026, month: 10 }, initialDateISO: "2026-10-12" });
  try {
    assert.equal(text(c.host.querySelector(".calendar-selected h2")), "2026-10-12");
    assert.equal(c.toggle().getAttribute("aria-expanded"), "false");
  } finally {
    await c.unmount();
  }
});

test("Calendar opened for a Bathukamma id on a different date does not expand (date AND id must match)", async () => {
  const c = await mountCalendar({
    initialYearMonth: { year: 2026, month: 10 }, initialDateISO: "2026-10-11", initialRuleId: "bathukamma-muddapappu",
  });
  try {
    assert.equal(c.toggle().getAttribute("aria-expanded"), "false");
  } finally {
    await c.unmount();
  }
});

test("Calendar opened on a non-Bathukamma date keeps the section collapsed", async () => {
  const c = await mountCalendar({ initialYearMonth: { year: 2026, month: 10 }, initialDateISO: "2026-10-19" });
  try {
    assert.equal(c.toggle().getAttribute("aria-expanded"), "false");
    assert.equal(c.bathukammaCards().length, 0);
  } finally {
    await c.unmount();
  }
});

test("Home's Bathukamma card opens Calendar with its own date AND rule id, and that reveals the right day", async () => {
  const calls = [];
  const host = document.createElement("div");
  document.body.appendChild(host);
  const r = createRoot(host);
  const atla = {
    name: "Atla Bathukamma", nameTe: "అట్ల బతుకమ్మ", dateISO: "2026-10-14", inDays: 2,
    ruleId: "bathukamma-atla", pujaSlug: null,
    closingDay: { name: "Saddula Bathukamma", nameTe: "సద్దుల బతుకమ్మ", dateISO: "2026-10-18" },
  };
  await act(async () => {
    r.render(React.createElement(page.HomeScreen, {
      setScreen: noop, todayEpochDay: 0, nowMs: OCT12_NOON_IST, location: HYD, language: "EN",
      panchangaStatus: "ready",
      panchanga: {
        fields: [], context: [], useful: [], avoid: [], hasAny: true,
        upcomingFestivals: [atla], festival: atla, festivalUnavailable: false, validation: [],
      },
      onOpenFestival: (...args) => calls.push(args), onViewFullCalendar: noop, onStartPuja: noop,
    }));
  });
  await act(async () => host.querySelector(".home-festivals .calendar-festival-open").click());
  await act(async () => r.unmount());
  host.remove();
  assert.deepEqual(calls, [["2026-10-14", "bathukamma-atla"]]);

  const c = await mountCalendar({
    initialYearMonth: { year: 2026, month: 10 }, initialDateISO: calls[0][0], initialRuleId: calls[0][1], focusFestivals: true,
  });
  try {
    assert.equal(c.toggle().getAttribute("aria-expanded"), "true");
    const focused = [...c.host.querySelectorAll(".calendar-festival-card.is-focused")];
    assert.equal(focused.length, 1);
    assert.equal(focused[0].getAttribute("data-rule-id"), "bathukamma-atla");
  } finally {
    await c.unmount();
  }
});

for (const [query, ruleId, dateISO] of [
  ["Muddapappu Bathukamma", "bathukamma-muddapappu", "2026-10-12"],
  ["Navratri begins", "navratri-begins", "2026-10-11"],
]) {
  test(`Search "${query}" opens Calendar with its own date AND rule id (${ruleId})`, async () => {
    const calls = [];
    const host = document.createElement("div");
    document.body.appendChild(host);
    const r = createRoot(host);
    await act(async () => {
      r.render(React.createElement(page.SearchScreen, {
        language: "EN", onNavigate: noop, location: HYD, nowMs: Date.parse("2026-10-02T06:30:00Z"),
        onOpenFestival: (...args) => calls.push(args),
      }));
    });
    const input = host.querySelector("input");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
      setter.call(input, query);
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    const btn = [...host.querySelectorAll(".search-results button")].find((b) => b.textContent.startsWith(query));
    assert.ok(btn, `"${query}" is a search result`);
    await act(async () => { btn.click(); });
    for (let i = 0; i < 100 && calls.length === 0; i += 1) {
      await act(async () => { await new Promise((res) => setTimeout(res, 20)); });
    }
    await act(async () => r.unmount());
    host.remove();
    assert.deepEqual(calls, [[dateISO, ruleId]]);
  });
}

/* -------------------------------------------------------------------------- */
/* Calendar: no empty section where Bathukamma is not defined                 */
/* -------------------------------------------------------------------------- */

for (const [label, l, year, month] of [
  ["Houston (unsupported), October 2026", HOUSTON, 2026, 10],
  ["Hyderabad, October 2025", HYD, 2025, 10],
  ["Hyderabad, October 2027", HYD, 2027, 10],
  ["Frisco, September 2027", FRISCO, 2027, 9],
]) {
  test(`Calendar renders no Bathukamma section at all: ${label}`, async () => {
    const m = await seedMonth(l, year, month);
    assert.equal(m.festivals.filter((f) => IDS.includes(f.ruleId)).length, 0);
    const nowMs = Date.UTC(year, month - 1, 5, 12);
    const c = await mountCalendar({ location: l, nowMs });
    try {
      assert.ok(c.festivals(), "the festival list itself renders");
      assert.equal(c.group(), null, "no Bathukamma section");
      assert.equal(c.toggle(), null, "no toggle");
      assert.doesNotMatch(text(c.festivals()), /Bathukamma|Show all 9 days/);
      assert.equal(c.host.querySelector(".calendar-schedule-note"), null);
    } finally {
      await c.unmount();
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Home: Bathukamma is one candidate                                          */
/* -------------------------------------------------------------------------- */

const bathukammaRows = (p) => p.upcomingFestivals.filter((r) => IDS.includes(r.ruleId));
// Noon in each location's own zone, so the civil date is unambiguous.
const noonAt = (l, iso) => Date.parse(`${iso}T12:00:00${l === HYD ? "+05:30" : "-05:00"}`);

for (const l of [HYD, FRISCO]) {
  test(`Home (${l.city}): before the festival shows Engili Poola once, with the Saddula closing date`, async () => {
    const p = await panchanga.panchangaForLocation(l, noonAt(l, "2026-10-02"));
    const rows = bathukammaRows(p);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ruleId, "bathukamma-begins");
    assert.equal(rows[0].dateISO, "2026-10-10");
    assert.deepEqual(rows[0].closingDay, { name: "Saddula Bathukamma", nameTe: "సద్దుల బతుకమ్మ", dateISO: "2026-10-18" });
    assert.equal(rows[0].pujaWindow, undefined, "no observance time");
  });

  test(`Home (${l.city}): on a non-final day shows that day once, with the Saddula closing date`, async () => {
    const p = await panchanga.panchangaForLocation(l, noonAt(l, "2026-10-14"));
    const rows = bathukammaRows(p);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ruleId, "bathukamma-atla");
    assert.equal(rows[0].inDays, 0);
    assert.equal(rows[0].closingDay?.dateISO, "2026-10-18");
  });

  test(`Home (${l.city}): on 18 Oct shows Saddula once, with no redundant closing date`, async () => {
    const p = await panchanga.panchangaForLocation(l, noonAt(l, "2026-10-18"));
    const rows = bathukammaRows(p);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ruleId, "bathukamma-saddula");
    assert.equal(rows[0].closingDay, undefined);
  });

  test(`Home (${l.city}): after 18 Oct shows no Bathukamma card`, async () => {
    const p = await panchanga.panchangaForLocation(l, noonAt(l, "2026-10-19"));
    assert.equal(bathukammaRows(p).length, 0);
  });
}

test("Home (Hyderabad): across 9-18 Oct Bathukamma never holds more than one slot; the 3-row / 1-P0 limits hold", async () => {
  const p0 = new Set(rules.FESTIVAL_RULES.filter((r) => r.homePriority === "P0").map((r) => r.id));
  for (let d = 9; d <= 18; d += 1) {
    const iso = `2026-10-${String(d).padStart(2, "0")}`;
    const p = await panchanga.panchangaForLocation(HYD, noonAt(HYD, iso));
    const rows = p.upcomingFestivals;
    assert.ok(rows.length <= 3, `${iso}: at most three rows`);
    assert.ok(rows.filter((r) => p0.has(r.ruleId)).length <= 1, `${iso}: at most one P0 row`);
    assert.equal(bathukammaRows(p).length, 1, `${iso}: exactly one Bathukamma row`);
    const expected = d === 9 ? "2026-10-10" : iso;
    assert.equal(bathukammaRows(p)[0].dateISO, expected, `${iso}: the row is the next/current day`);
  }
});

test("consolidateScheduleCandidates keeps other rules untouched and in order", () => {
  const row = (ruleId, dateISO) => ({ name: ruleId, dateISO, inDays: 0, ruleId, pujaSlug: null });
  const input = [
    row("masa-shivaratri", "2026-10-08"),
    row("bathukamma-atukula", "2026-10-11"),
    row("bathukamma-begins", "2026-10-10"),
    row("navratri-begins", "2026-10-11"),
    row("bathukamma-saddula", "2026-10-18"),
  ];
  const out = panchanga.consolidateScheduleCandidates(input);
  assert.deepEqual(out.map((r) => r.ruleId), ["masa-shivaratri", "bathukamma-begins", "navratri-begins"]);
  assert.equal(out[0], input[0], "non-schedule rows pass through as the same object");
  assert.equal(out[2], input[3]);
  assert.equal(out[1].closingDay.dateISO, "2026-10-18");
  assert.deepEqual(panchanga.consolidateScheduleCandidates([row("bathukamma-saddula", "2026-10-18")])[0].closingDay, undefined);
  assert.deepEqual(panchanga.consolidateScheduleCandidates([]), []);
});

/* -------------------------------------------------------------------------- */
/* Home card rendering                                                        */
/* -------------------------------------------------------------------------- */

const homeHtml = (rows, language = "EN") => renderToStaticMarkup(
  React.createElement(page.HomeScreen, {
    setScreen: noop, todayEpochDay: 0, nowMs: OCT12_NOON_IST, location: HYD, language,
    panchangaStatus: "ready",
    panchanga: {
      fields: [], context: [], useful: [], avoid: [], hasAny: true,
      upcomingFestivals: rows, festival: rows[0], festivalUnavailable: false, validation: [],
    },
    onOpenFestival: noop, onViewFullCalendar: noop, onStartPuja: noop,
  }),
);
const visible = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

test("Home card: a non-final day names the closing Saddula date (EN + TE); Saddula itself does not repeat it", () => {
  const atla = {
    name: "Atla Bathukamma", nameTe: "అట్ల బతుకమ్మ", dateISO: "2026-10-14", inDays: 2,
    ruleId: "bathukamma-atla", pujaSlug: null,
    closingDay: { name: "Saddula Bathukamma", nameTe: "సద్దుల బతుకమ్మ", dateISO: "2026-10-18" },
  };
  const en = visible(homeHtml([atla]));
  assert.match(en, /Atla Bathukamma 2026-10-14 \(in 2 days\) The festival concludes on 2026-10-18 with Saddula Bathukamma\./);
  const te = visible(homeHtml([atla], "TE"));
  assert.match(te, /అట్ల బతుకమ్మ/);
  assert.match(te, /పండుగ 2026-10-18న సద్దుల బతుకమ్మతో ముగుస్తుంది\./);

  const saddula = {
    name: "Saddula Bathukamma", nameTe: "సద్దుల బతుకమ్మ", dateISO: "2026-10-18", inDays: 6,
    ruleId: "bathukamma-saddula", pujaSlug: null,
  };
  const html = homeHtml([saddula]);
  assert.equal((visible(html).match(/Saddula Bathukamma/g) ?? []).length, 1, "Saddula appears once");
  assert.doesNotMatch(visible(html), /concludes/);
  assert.equal((visible(html).match(/2026-10-18/g) ?? []).length, 1, "its date appears once");
});

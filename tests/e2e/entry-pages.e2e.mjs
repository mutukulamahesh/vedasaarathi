// Real-browser coverage for the bilingual public entry pages
// (lib/entry-pages.ts): /panchangam, /festivals, /bathukamma-2026,
// /vinayaka-chavithi-puja and their /te/... Telugu siblings.
//
//   npm run build && npm run start -- --port 3417 &
//   BASE_URL=http://localhost:3417/ node tests/e2e/entry-pages.e2e.mjs
//
// Run against a PRODUCTION build (the service worker only registers there).
// Checks, for every page loaded DIRECTLY (not via in-app navigation):
//   - the initial HTML (JavaScript disabled) already has the topic text,
//     the right <html lang>, a self canonical and reciprocal hreflang links;
//   - the live app opens on the right existing screen (no location: an
//     honest "set your location", never an assumed city);
//   - Back, reload, Home's plain <a> links, the language rules (an entry
//     link's language is used for the visit but never overwrites a saved
//     preference or location), and the Vinayaka puja flow from the entry;
//   - offline: an entry page reloads from the service worker, and "/" is
//     NOT replaced by the last-visited entry page;
//   - phone layouts (EN + TE) with no horizontal overflow, no console errors.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:3417/").replace(/\/?$/, "/");
const ORIGIN = "https://vedasaarathi.com";
const LOC_KEY = "vedasaarathi:location:v1";
const PREP_KEY = "vedasaarathi:preparation:v3";

const TOPICS = ["panchangam", "festivals", "bathukamma-2026", "vinayaka-chavithi-puja"];
const path = (topic, lang) => (lang === "TE" ? `/te/${topic}` : `/${topic}`);
const url = (p) => new URL(p.replace(/^\//, ""), BASE).toString();

const HYD = {
  status: "READY", latitude: 17.385, longitude: 78.4867, timezone: "Asia/Kolkata",
  city: "Hyderabad", region: "Telangana", country: "India",
  source: "MANUAL", accuracyMeters: null, savedAt: "2026-09-08T00:00:00.000Z",
};
const prepValue = (language) => JSON.stringify({
  mode: "SELF",
  participants: [{
    id: "p1", name: "Test",
    gotra: { status: "UNKNOWN", name: "" }, veda: { status: "UNKNOWN", name: "" },
    sutra: { status: "UNKNOWN", name: "" }, sampradaya: { status: "UNKNOWN", name: "" },
  }],
  language, runs: {},
});

/** Text that must be in each page's initial HTML (before any JavaScript). */
const TOPIC_TEXT = {
  "panchangam:EN": ["Today’s Panchangam for your location", "Rahu Kalam", "we never guess your city"],
  "panchangam:TE": ["మీ ప్రదేశానికి నేటి పంచాంగం", "రాహు కాలం"],
  // A short description only: the live Calendar is the festival list.
  "festivals:EN": ["Hindu festival calendar", "monthly observances for your saved location", "we never assume a city for you"],
  "festivals:TE": ["హిందూ పండుగల క్యాలెండర్", "నెలవారీ వ్రతాలు", "మీ నగరాన్ని మేము ఊహించము"],
  "bathukamma-2026:EN": [
    "Engili Poola Bathukamma", "Saddula Bathukamma", "Saturday, 10 October 2026",
    "Evidence status: sequence-inferred; review status: REVIEW_REQUIRED.",
    "Evidence status: published-date; review status: REVIEW_REQUIRED.",
    "Evidence status: product-selected; review status: REVIEW_REQUIRED.",
    "Telangana-specific — not a universal Telugu or South Indian practice",
  ],
  "bathukamma-2026:TE": [
    "ఎంగిలిపూల బతుకమ్మ", "సద్దుల బతుకమ్మ", "10 అక్టోబర్ 2026, శనివారం",
    "Evidence status: separately-sourced; review status: REVIEW_REQUIRED.",
    "Evidence status: published-date; review status: REVIEW_REQUIRED.",
  ],
  "vinayaka-chavithi-puja:EN": ["Vinayaka Chavithi guided puja", "not yet priest-reviewed", "Simple Puja (16 steps"],
  "vinayaka-chavithi-puja:TE": ["వినాయక చవితి గైడెడ్ పూజ", "పురోహితుల సమీక్ష ఇంకా జరగలేదు"],
};

let fails = 0;
let checks = 0;
const ok = (cond, msg) => {
  checks += 1;
  if (!cond) fails += 1;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${msg}`);
};
const section = (t) => console.log(`\n— ${t}`);
const noHOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

function watchErrors(ctx) {
  const errors = [];
  ctx.on("pageerror", (e) => errors.push(String(e)));
  ctx.on("console", (m) => {
    if (m.type() === "error" && !/net::ERR_(FAILED|INTERNET_DISCONNECTED)/.test(m.text())) errors.push(m.text());
  });
  return errors;
}

async function headLinks(page) {
  return page.evaluate(() => ({
    lang: document.documentElement.getAttribute("lang"),
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
    ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute("content") ?? "",
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "",
    twTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ?? "",
    alternates: Object.fromEntries(
      [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
        .map((l) => [l.getAttribute("hreflang"), l.getAttribute("href")]),
    ),
  }));
}

async function main() {
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
  try {
    /* 1. Initial HTML, JavaScript disabled */
    section("initial HTML (JavaScript disabled): topic text, lang, canonical, hreflang");
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const p0 = await noJs.newPage();
    const homeHead = await (async () => { await p0.goto(url("/")); return headLinks(p0); })();
    const titles = new Set([homeHead.title]);
    const descriptions = new Set([homeHead.description]);
    for (const topic of TOPICS) {
      const heads = {};
      for (const lang of ["EN", "TE"]) {
        const res = await p0.goto(url(path(topic, lang)));
        ok(res && res.status() === 200, `${path(topic, lang)}: HTTP 200`);
        const h = await headLinks(p0);
        heads[lang] = h;
        // textContent, not innerText: Bathukamma's per-day evidence is in the
        // initial HTML inside a native <details> disclosure (closed until
        // tapped), which innerText leaves out.
        const body = await p0.evaluate(() => document.body.textContent);
        for (const needle of TOPIC_TEXT[`${topic}:${lang}`]) {
          ok(body.includes(needle), `${path(topic, lang)}: initial HTML shows "${needle}"`);
        }
        ok(h.lang === (lang === "TE" ? "te" : "en"), `${path(topic, lang)}: <html lang="${h.lang}">`);
        ok(h.canonical === `${ORIGIN}${path(topic, lang)}`, `${path(topic, lang)}: self canonical ${h.canonical}`);
        ok(h.ogUrl === h.canonical, `${path(topic, lang)}: og:url matches canonical`);
        ok(h.ogTitle === h.title && h.twTitle === h.title, `${path(topic, lang)}: OG/Twitter title is the page's own`);
        ok(!titles.has(h.title), `${path(topic, lang)}: distinct <title> "${h.title}"`);
        ok(!descriptions.has(h.description), `${path(topic, lang)}: distinct meta description`);
        titles.add(h.title);
        descriptions.add(h.description);
        const sib = await p0.evaluate(
          (lang) => document.querySelector(`.entry-topic-sibling a[hreflang="${lang}"]`)?.getAttribute("href"),
          lang === "TE" ? "en" : "te",
        );
        ok(sib === path(topic, lang === "TE" ? "EN" : "TE"), `${path(topic, lang)}: crawlable <a> to its sibling (${sib})`);
        // No personal or precise-location data anywhere in the public markup.
        const html = await p0.content();
        ok(!/Gotra:\s*\w|latitude|longitude"?\s*:\s*-?\d/i.test(html.replace(/latitude, longitude/g, "")),
          `${path(topic, lang)}: no coordinates or lineage values in the HTML`);
      }
      // Reciprocal hreflang: each version lists itself AND its sibling.
      const expect = {
        en: `${ORIGIN}${path(topic, "EN")}`, te: `${ORIGIN}${path(topic, "TE")}`, "x-default": `${ORIGIN}${path(topic, "EN")}`,
      };
      for (const lang of ["EN", "TE"]) {
        const a = heads[lang].alternates;
        ok(a.en === expect.en && a.te === expect.te && a["x-default"] === expect["x-default"],
          `${path(topic, lang)}: hreflang en=${a.en} te=${a.te} x-default=${a["x-default"]}`);
      }
    }
    ok(homeHead.canonical === `${ORIGIN}/` && homeHead.lang === "en", "/ keeps its own canonical and lang=en");
    const homeLinks = await (async () => {
      await p0.goto(url("/"));
      return p0.evaluate(() => [...document.querySelectorAll(".entry-topic-links a")].map((a) => a.getAttribute("href")));
    })();
    for (const topic of TOPICS) {
      ok(homeLinks.includes(path(topic, "EN")), `Home (initial HTML) has a plain <a> link to ${path(topic, "EN")}`);
    }
    ok(!(await p0.locator(".home-explore, .welcome-intro").count()), "Home has no Explore section and no long introduction");
    // Each English page links to its Telugu sibling with a real <a>, so the
    // Telugu pages stay reachable by crawling from "/".
    await p0.goto(url("/festivals"));
    const festLinks = await p0.evaluate(() => [...document.querySelectorAll(".entry-topic a")].map((a) => a.getAttribute("href")));
    ok(festLinks.includes("/te/festivals") && festLinks.includes("/panchangam") && festLinks.includes("/"),
      `/festivals topic text links to its sibling, the other topics and / (${festLinks.join(", ")})`);
    ok(!(await p0.locator(".entry-topic-festivals, .entry-topic-group").count()),
      "/festivals has no appended static catalogue of every festival");
    await noJs.close();

    /* 2. Deep links open the real screen; no location -> honest prompt */
    section("deep links open the existing screens (anonymous visitor, no saved location)");
    const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const anonErrors = watchErrors(anon);
    const pa = await anon.newPage();
    await pa.goto(url("/panchangam"));
    await pa.getByRole("heading", { level: 1, name: "Welcome" }).waitFor();
    ok(await pa.locator("#today-card").isVisible(), "/panchangam: opens Home's live Today card");
    ok(await pa.locator("#today-card").getByRole("button", { name: "Set your location" }).isVisible(),
      "/panchangam: no saved location -> 'Set your location', no assumed city");
    ok(!(await pa.locator(".today-card-place").count()) && !(await pa.locator(".home-glance").count()),
      "/panchangam: no 'TODAY IN <city>' and no Tithi values for an anonymous visitor");
    await pa.goto(url("/te/festivals"));
    await pa.getByRole("heading", { level: 1, name: "హిందూ క్యాలెండర్" }).waitFor();
    ok(true, "/te/festivals: opens the live Calendar, in Telugu");
    ok(await pa.getByRole("button", { name: "మీ స్థానం సెట్ చేయండి" }).first().isVisible(),
      "/te/festivals: no location -> Telugu 'set your location' prompt");
    await pa.goto(url("/bathukamma-2026"));
    await pa.getByRole("heading", { level: 1, name: "Hindu calendar" }).waitFor();
    ok((await pa.locator(".calendar-nav strong").innerText()) === "October 2026", "/bathukamma-2026: Calendar opens on October 2026");
    await pa.goto(url("/vinayaka-chavithi-puja"));
    await pa.getByRole("heading", { level: 1, name: "Vinayaka Chavithi" }).waitFor();
    ok(await pa.getByRole("button", { name: "Begin" }).isVisible(), "/vinayaka-chavithi-puja: opens the puja detail screen with Begin");
    const anonStorage = await pa.evaluate(([lk, pk]) => [localStorage.getItem(lk), localStorage.getItem(pk)], [LOC_KEY, PREP_KEY]);
    ok(anonStorage[0] === null, "anonymous visit: no location was written to storage");
    ok(anonStorage[1] === null || !/"language":"TE"/.test(anonStorage[1]),
      "anonymous visit: the Telugu link did not save Telugu as a preference");
    ok(anonErrors.length === 0, `no console errors on anonymous entry visits${anonErrors.length ? `: ${anonErrors.join(" | ")}` : ""}`);
    await anon.close();

    /* 3. Saved preferences are not clobbered; Bathukamma deep link */
    section("saved language + location are kept; entry link language applies to the visit only");
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const errors = watchErrors(ctx);
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(url("/"));
    await page.evaluate(([lk, pk, lv, pv]) => {
      localStorage.clear();
      localStorage.setItem(lk, lv);
      localStorage.setItem(pk, pv);
    }, [LOC_KEY, PREP_KEY, JSON.stringify(HYD), prepValue("EN")]);
    const savedLoc = JSON.stringify(HYD);

    await page.goto(url("/te/bathukamma-2026"));
    await page.getByRole("heading", { level: 1, name: "హిందూ క్యాలెండర్" }).waitFor();
    ok(true, "/te/bathukamma-2026 opens in Telugu although the saved language is English");
    const toggle = page.locator(".calendar-group-toggle");
    await toggle.waitFor({ timeout: 60000 });
    ok((await toggle.getAttribute("aria-expanded")) === "true", "Hyderabad: the Bathukamma section opens for the deep link");
    ok(await page.locator('.calendar-festival-card.is-focused[data-rule-id="bathukamma-begins"][data-date="2026-10-10"]').isVisible(),
      "Hyderabad: day 1 (Engili Poola, 2026-10-10) is the revealed entry");
    let stored = await page.evaluate(([lk, pk]) => [localStorage.getItem(lk), JSON.parse(localStorage.getItem(pk)).language], [LOC_KEY, PREP_KEY]);
    ok(stored[0] === savedLoc, "saved location unchanged by the entry visit");
    ok(stored[1] === "EN", "saved language still English after a Telugu entry link");
    ok(await page.locator(".entry-topic[lang=te]").isVisible(), "Telugu topic text shown with the Calendar");

    // Reload: still the entry screen, still Telugu, still not saved.
    await page.locator(".bottom-nav button").nth(2).click(); // Search
    await page.waitForTimeout(300);
    await page.reload();
    await page.getByRole("heading", { level: 1, name: "హిందూ క్యాలెండర్" }).waitFor();
    ok(true, "reload on /te/bathukamma-2026 after moving to Search reopens the entry Calendar in Telugu");

    // A plain visit to "/" uses the saved language again.
    await page.goto(url("/"));
    await page.getByRole("heading", { level: 1, name: "Welcome" }).waitFor();
    ok(true, "a later plain visit to / opens in the saved language (English)");

    // Saved Telugu + English link.
    await page.evaluate(([pk, pv]) => localStorage.setItem(pk, pv), [PREP_KEY, prepValue("TE")]);
    await page.goto(url("/festivals"));
    await page.getByRole("heading", { level: 1, name: "Hindu calendar" }).waitFor();
    stored = await page.evaluate((pk) => JSON.parse(localStorage.getItem(pk)).language, PREP_KEY);
    ok(stored === "TE", "/festivals opens in English; the saved Telugu preference is kept");

    // Explicit toggle on an entry page IS saved, and the topic text is not
    // left in the wrong language.
    await page.locator(".global-lang-toggle button", { hasText: "తెలుగు" }).click();
    await page.getByRole("heading", { level: 1, name: "హిందూ క్యాలెండర్" }).waitFor();
    stored = await page.evaluate((pk) => JSON.parse(localStorage.getItem(pk)).language, PREP_KEY);
    ok(stored === "TE", "choosing తెలుగు with the global toggle saves Telugu (explicit choice)");
    ok(!(await page.locator(".entry-topic[lang=en]").count())
      && (await page.locator('.entry-topic-switch a[href="/te/festivals"]').isVisible()),
      "after switching language, the English topic text is replaced by a link to /te/festivals");

    /* 4. Back / Forward and Home's links */
    section("Back, Forward and Home's plain links");
    await page.evaluate(([pk, pv]) => localStorage.setItem(pk, pv), [PREP_KEY, prepValue("EN")]);
    await page.goto(url("/"));
    await page.getByRole("heading", { level: 1, name: "Welcome" }).waitFor();
    await page.locator('.entry-topic-links a[href="/festivals"]').click();
    await page.waitForURL(/\/festivals$/);
    await page.getByRole("heading", { level: 1, name: "Hindu calendar" }).waitFor();
    ok(true, "Home's <a href=/festivals> navigates to the Calendar entry");
    await page.locator(".bottom-nav button").nth(0).click(); // Home
    await page.getByRole("heading", { level: 1, name: "Welcome" }).waitFor();
    await page.goBack();
    await page.getByRole("heading", { level: 1, name: "Hindu calendar" }).waitFor();
    ok(new URL(page.url()).pathname === "/festivals", "Back from in-app Home returns to the entry Calendar");
    await page.goBack();
    await page.waitForURL((u) => new URL(u).pathname === "/");
    await page.getByRole("heading", { level: 1, name: "Welcome" }).waitFor();
    ok(true, "Back again leaves the entry page for the previous page (/)");
    await page.goForward();
    await page.getByRole("heading", { level: 1, name: "Hindu calendar" }).waitFor();
    ok(new URL(page.url()).pathname === "/festivals", "Forward returns to the entry Calendar");

    /* 5. Vinayaka flow from the entry page is the existing flow */
    section("Vinayaka Chavithi entry -> existing puja flow");
    await page.goto(url("/vinayaka-chavithi-puja"));
    await page.getByRole("heading", { level: 1, name: "Vinayaka Chavithi" }).waitFor();
    await page.getByRole("button", { name: "Begin" }).click();
    await page.getByRole("heading", { level: 1, name: "Get ready for the puja" }).waitFor();
    ok(true, "Begin -> the existing preparation screen (valid saved person)");
    ok(!(await page.locator(".entry-topic").count()), "the topic text is not shown inside the puja flow");
    await page.locator(".back-button").click();
    await page.getByRole("heading", { level: 1, name: "Get ready for the puja" }).waitFor({ state: "detached" }).catch(() => {});
    ok(errors.length === 0, `no console errors${errors.length ? `: ${errors.join(" | ")}` : ""}`);
    await ctx.close();

    /* 6. Offline */
    section("offline: entry pages and / each reload as themselves");
    const off = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const po = await off.newPage();
    await po.goto(url("/"));
    const sw = await po.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg.active);
    });
    ok(sw, "the service worker is active");
    await po.reload(); // now controlled: "/" goes through the SW
    await po.goto(url("/te/panchangam"));
    await po.getByRole("heading", { level: 1, name: "స్వాగతం" }).waitFor();
    await off.setOffline(true);
    await po.reload();
    await po.getByRole("heading", { level: 1, name: "స్వాగతం" }).waitFor({ timeout: 15000 });
    ok((await po.evaluate(() => document.documentElement.lang)) === "te"
      && (await po.locator(".entry-topic[lang=te]").isVisible()),
      "offline reload of /te/panchangam serves its own cached page (lang=te, topic text)");
    await po.goto(url("/"));
    await po.getByRole("heading", { level: 1, name: "Welcome" }).waitFor({ timeout: 15000 });
    ok((await po.evaluate(() => document.documentElement.lang)) === "en" && !(await po.locator(".entry-topic").count()),
      "offline / is still the home shell (not overwritten by the last entry page)");
    await po.goto(url("/festivals")); // never visited: falls back to the app shell
    await po.getByRole("heading", { level: 1, name: "Welcome" }).waitFor({ timeout: 15000 });
    ok(true, "offline, a never-visited entry page falls back to the cached app (Home), not an error page");
    await off.setOffline(false);
    await off.close();

    /* 7. Phone layouts */
    section("phone layouts, English and Telugu: no horizontal overflow");
    for (const width of [320, 390]) {
      const m = await browser.newContext({ viewport: { width, height: 760 } });
      const mErrors = watchErrors(m);
      const pm = await m.newPage();
      await pm.goto(url("/"));
      await pm.evaluate(([lk, lv]) => localStorage.setItem(lk, lv), [LOC_KEY, JSON.stringify(HYD)]);
      for (const topic of TOPICS) {
        for (const lang of ["EN", "TE"]) {
          await pm.goto(url(path(topic, lang)));
          await pm.locator(".entry-topic").waitFor();
          await pm.waitForTimeout(400);
          ok(await noHOverflow(pm), `${width}px ${path(topic, lang)}: no horizontal overflow`);
          const clipped = await pm.evaluate(() => [...document.querySelectorAll(".entry-topic *")]
            .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1); })
            .filter((el) => !el.closest(".entry-topic-table-wrap")).length);
          ok(clipped === 0, `${width}px ${path(topic, lang)}: topic text fits the screen`);
        }
      }
      for (const lang of ["EN", "TE"]) {
        await pm.evaluate(([pk, pv]) => localStorage.setItem(pk, pv), [PREP_KEY, prepValue(lang)]);
        await pm.goto(url("/"));
        await pm.locator(".entry-topic-links").waitFor();
        ok(await noHOverflow(pm), `${width}px / (${lang}) with the footer topic links: no horizontal overflow`);
        const hrefs = await pm.evaluate(() => [...document.querySelectorAll(".entry-topic-links a")].map((a) => a.getAttribute("href")));
        ok(TOPICS.every((t) => hrefs.includes(path(t, lang))), `${width}px / (${lang}): footer links point at the ${lang} topic pages`);
      }
      ok(mErrors.length === 0, `${width}px: no console errors${mErrors.length ? `: ${mErrors.join(" | ")}` : ""}`);
      await m.close();
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${checks - fails}/${checks} checks passed`);
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

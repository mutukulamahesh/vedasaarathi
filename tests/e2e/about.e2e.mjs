// About page checks (production build):
//   BASE_URL=http://localhost:8910/ node tests/e2e/about.e2e.mjs
//
// Opens from Home, Back returns to Home, English/Telugu switching, no
// horizontal overflow at phone and desktop widths, the mailto: feedback link
// and its honest wording, no placeholders, no unsupported claims, no priest
// section while no confirmed acknowledgement exists, and no network request
// made by the About page itself.

import { chromium } from "playwright";

const BASE = (process.env.BASE_URL || "http://localhost:8910/").replace(/\/?$/, "/");
let fails = 0, checks = 0;
const ok = (c, m) => { checks += 1; if (!c) fails += 1; console.log(`  ${c ? "PASS" : "FAIL"}  ${m}`); };

async function run(viewport, label, browser) {
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  const ctx = await browser.newContext({ viewport });
  const errors = [];
  const requests = [];
  ctx.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  ctx.on("pageerror", (e) => errors.push(String(e)));
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /welcome/i }).waitFor();

  const link = page.locator(".about-link");
  ok((await link.innerText()) === "About VedaSaarathi", "Home shows an 'About VedaSaarathi' link");
  ok((await page.locator(".bottom-nav button").count()) === 5, "no extra primary navigation tab was added");
  ok((await page.locator(".home-footer").innerText()) === "© 2026 ASCOR LABS. All rights reserved.", "Home footer line is the exact copyright text");

  await link.click();
  await page.locator(".about-page h1").waitFor();
  ok((await page.locator(".about-page h1").innerText()) === "About VedaSaarathi", "About opens from Home");
  ok((await page.locator(".bottom-nav").count()) === 0, "About is a sub-page (no primary tab bar)");
  requests.length = 0;
  page.on("request", (r) => requests.push(r.url()));

  const body = async () => page.locator(".about-page").innerText();
  const en = await body();
  for (const s of [
    "Why VedaSaarathi exists", "Living away from home can make simple questions difficult",
    "What you can do", "Why location matters", "Our tradition and guidance",
    "Content awaiting priest review is not presented as priest-approved.",
    "First-version coverage", "It does not yet cover every festival or tradition.",
    "not by an AI chatbot", "computer-generated voice",
    "Not all religious content has been reviewed by a priest.",
    "Found something that does not look right?",
    "Please email us at contact.vedasarathi@gmail.com. For a date or timing issue, include the city and date selected in the app. Please avoid sharing private family details.",
    "VedaSaarathi is a project by ASCOR LABS.", "VedaSaarathi’s guidance is free to use.",
    "© 2026 ASCOR LABS. All rights reserved.",
  ]) ok(en.includes(s), `EN contains: ${s.slice(0, 60)}`);

  const mail = page.locator(".about-page a[href^='mailto:']");
  ok((await mail.count()) === 1 && (await mail.getAttribute("href")) === "mailto:contact.vedasarathi@gmail.com", "exactly one mailto link to the confirmed address");
  ok(/Email us/.test(await mail.innerText()), "the link is labelled 'Email us'");
  ok(await page.locator(".about-address").innerText() === "contact.vedasarathi@gmail.com", "the address is visible as text");
  ok(/opens your email app\. You need to send the message yourself/.test(en), "explains the visitor sends the message themselves");
  ok(!/report sent|message sent|we have received|has been sent to/i.test(en), "never claims a report was sent");
  ok(!/\[.*\]|lorem|TODO|placeholder|preferred name/i.test(en), "no placeholders");
  ok(!/With gratitude/.test(en) && !/కృతజ్ఞతలు/.test(en), "no priest/gratitude section while no confirmed details exist");
  ok(!/priest[- ]approved/i.test(en.replace("is not presented as priest-approved", "")) && !/verified by|endorsed|(?<!been )reviewed by/i.test(en), "no priest approval / endorsement / 'reviewed by' claim");
  ok(!/every festival|all festivals|complete coverage/i.test(en.replace("does not yet cover every festival", "")), "no completeness claim");
  const otherLinks = await page.locator(".about-page a").evaluateAll((as) => as.map((a) => a.getAttribute("href")).filter((h) => !/^mailto:/.test(h || "")));
  ok(otherLinks.length === 0, `no other or broken links on the page (${JSON.stringify(otherLinks)})`);
  ok(en.includes("Third-party notices") && en.includes("VedaSaarathi’s own code and content are by ASCOR LABS.") && en.includes("stays with its authors under its own licence"), "About separates ASCOR LABS' own work from third-party ownership");
  const notices = page.locator(".about-notices details");
  ok((await notices.getAttribute("open")) === null && (await page.locator(".about-notices-text").count()) === 0, "notices are collapsed and not loaded until opened");
  const fileRes = await page.request.get(new URL("/THIRD_PARTY_NOTICES.txt", BASE).href);
  ok(fileRes.status() === 200, "the notices file is served at /THIRD_PARTY_NOTICES.txt (200)");
  await notices.locator("summary").click();
  await page.locator(".about-notices-text").waitFor();
  const nt = await page.locator(".about-notices-text").innerText();
  for (const s of ["mhah-panchang 1.2.0", "Mozilla Public License, version 2.0", "Modified?        : NO", "registry.npmjs.org/mhah-panchang/-/mhah-panchang-1.2.0.tgz", "suncalc 2.0.2", "Volodymyr Agafonkin", "react 19.2.6", "Meta Platforms", "lucide-react 1.31.0", "tailwindcss 4.2.1", "Copyright (c) 2023 shadcn", "@vitejs/plugin-rsc 0.5.26", "ASCOR LABS does not"]) ok(nt.includes(s), `notices text contains: ${s.slice(0, 50)}`);
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no horizontal overflow with the notices open");
  await page.screenshot({ path: `.review-shots/about-${label}-notices.png`, fullPage: false }).catch(() => {});
  await notices.locator("summary").click();
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no horizontal overflow (English)");
  await page.screenshot({ path: `.review-shots/about-${label}-en.png`, fullPage: true }).catch(() => {});

  await page.locator("button", { hasText: "తెలుగు" }).first().click();
  await page.waitForTimeout(300);
  const te = await body();
  ok((await page.locator(".about-page h1").innerText()) === "వేదసారథి గురించి", "Telugu title");
  for (const s of [
    "వేదసారథి ఎందుకు?", "ప్రదేశం ఎందుకు ముఖ్యం", "మా సంప్రదాయం, మార్గదర్శకం",
    "పురోహితుల సమీక్ష ఇంకా జరగని విషయాన్ని పురోహితులు ఆమోదించినదిగా చూపము.",
    "ఇది ఇంకా ప్రతి పండుగను, ప్రతి సంప్రదాయాన్ని కవర్ చేయదు.",
    "AI చాట్‌బాట్ కాదు", "మత సంబంధిత విషయమంతా పురోహితులు సమీక్షించలేదు.",
    "ఏదైనా సరిగా లేదనిపించిందా?", "contact.vedasarathi@gmail.com", "సందేశాన్ని మీరే పంపాలి",
    "వేదసారథి ASCOR LABS ప్రాజెక్ట్.", "© 2026 ASCOR LABS. All rights reserved.",
  ]) ok(te.includes(s), `TE contains: ${s.slice(0, 50)}`);
  ok((await page.locator(".about-page").getAttribute("lang")) === "te", "Telugu content is tagged lang=te");
  ok(te.includes("మూడవ పక్ష నోటీసులు") && te.includes("వేదసారథి సొంత కోడ్, కంటెంట్ ASCOR LABS వి."), "Telugu notices heading and ASCOR/third-party separation");
  ok(!/Why VedaSaarathi exists/.test(te), "Telugu view shows no English body copy");
  ok((await mail.getAttribute("href")) === "mailto:contact.vedasarathi@gmail.com", "mailto link unchanged in Telugu");
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "no horizontal overflow (Telugu)");
  await page.screenshot({ path: `.review-shots/about-${label}-te.png`, fullPage: true }).catch(() => {});
  ok(requests.filter((u) => /^https?:/.test(u) && !u.startsWith(BASE)).length === 0, "About page makes no external network request");

  await page.locator("button", { hasText: "English" }).first().click();
  ok((await page.locator(".about-page h1").innerText()) === "About VedaSaarathi", "switching back to English works");
  await page.locator(".back-button").click();
  await page.locator(".about-link").waitFor();
  ok((await page.locator(".about-link").count()) === 1, "Back returns to Home");
  ok(errors.length === 0, `no console/page errors (${errors.length}${errors.length ? ": " + errors[0] : ""})`);
  await ctx.close();
}

const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu"] });
const { mkdirSync } = await import("node:fs");
mkdirSync(".review-shots", { recursive: true });
await run({ width: 375, height: 812 }, "phone", browser);
await run({ width: 1440, height: 900 }, "desktop", browser);
await browser.close();
console.log(`\n${fails === 0 ? "ALL ABOUT E2E CHECKS PASSED" : `${fails} / ${checks} CHECK(S) FAILED`} (${checks} checks)`);
process.exit(fails === 0 ? 0 : 1);

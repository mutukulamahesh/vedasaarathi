// Regenerates public/social/vedasaarathi-share.png, the 1200x630 Open Graph /
// Twitter sharing card, from the app icon and plain text. Uses the
// already-installed Playwright Chromium (a dev dependency) - no new packages.
//
//   node scripts/generate-share-image.mjs
//
// The card names only capabilities that ship today (see SITE_DESCRIPTION in
// lib/site.ts). Telugu text needs a Telugu font on the machine that runs this
// (e.g. Noto Sans Telugu); the script fails if the rendered Telugu falls back
// to missing-glyph boxes.

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUT = join(ROOT, "public", "social", "vedasaarathi-share.png");
const icon = readFileSync(join(ROOT, "public", "icons", "icon.svg"), "utf8");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1200px; height: 630px; }
  body {
    background: #f5f0e8; color: #2e201a;
    font-family: "Noto Sans", Arial, Helvetica, sans-serif;
    display: flex; flex-direction: column;
  }
  .main { flex: 1; display: flex; align-items: center; gap: 56px; padding: 0 80px; }
  .icon svg { width: 260px; height: 260px; display: block; }
  .name { font-family: Georgia, "Noto Serif", serif; font-size: 92px; font-weight: 700; color: #6d2815; line-height: 1.05; }
  .te { font-family: "Noto Sans Telugu", sans-serif; font-size: 52px; font-weight: 700; color: #a8431f; margin-top: 6px; }
  .tag { font-size: 44px; font-weight: 700; line-height: 1.2; margin-top: 22px; }
  .band {
    height: 120px; background: #6d2815; color: #fff9f2;
    display: flex; align-items: center; justify-content: space-between; padding: 0 80px;
    font-size: 34px; font-weight: 700;
  }
  .band .url { color: #ffd9ad; }
</style></head><body>
  <div class="main">
    <div class="icon">${icon}</div>
    <div>
      <div class="name">VedaSaarathi</div>
      <div class="te">వేదసారథి · ఉచిత పంచాంగం</div>
      <div class="tag">Free Hindu Panchangam,<br>festivals &amp; guided puja</div>
    </div>
  </div>
  <div class="band"><span>Telugu &amp; English · for your location</span><span class="url">vedasaarathi.com</span></div>
</body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const teluguOk = await page.evaluate(() => document.fonts.check('52px "Noto Sans Telugu"', "వేదసారథి"));
  if (!teluguOk) throw new Error("No Telugu font available - install Noto Sans Telugu and re-run.");
  await page.screenshot({ path: OUT, type: "png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log(`Wrote ${OUT}`);
} finally {
  await browser.close();
}

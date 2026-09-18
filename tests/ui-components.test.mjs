import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTestViteServer } from "./helpers/vite-test-server.mjs";

// Note: a former test here ("emits the catalog's animation and scrolling
// utilities") asserted that specific Tailwind v4 utilities appear in the built
// dist CSS. Tailwind v4 only emits a utility when a project class uses it, so
// that assertion depended on the starter template's demo components, which
// VedaSaarathi does not use. It tested Tailwind's output rather than this app,
// could not pass without adding unused CSS, and has been removed. The tests
// below exercise real component contracts.

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

after(async () => {
  await vite.close();
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});

/* -------------------------------------------------------------------------- */
/* lunarMonthSegments (Calendar's Telugu month marker) - sunrise-anchored,   */
/* never presented as the exact astronomical new-moon instant.              */
/* -------------------------------------------------------------------------- */

test("lunarMonthSegments: day 1 is always 'continuing' (no start date claimed), a genuine mid-month transition gets an exact day", async () => {
  const { lunarMonthSegments } = await vite.ssrLoadModule("/components/platform/calendar-screen.tsx");
  const day = (n, masaAmanta) => ({ dateISO: `2026-09-${String(n).padStart(2, "0")}`, day: n, masaAmanta, isAdhikaMasa: false });
  const days = [
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => day(n, "Shravana")),
    ...Array.from({ length: 19 }, (_, i) => day(i + 12, "Bhadrapada")),
  ];
  const segs = lunarMonthSegments(days);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].masaAmanta, "Shravana");
  assert.equal(segs[0].continuingFromBefore, true, "day 1's segment never claims a start date");
  assert.equal(segs[1].masaAmanta, "Bhadrapada");
  assert.equal(segs[1].fromDay, 12);
  assert.equal(segs[1].continuingFromBefore, false, "a transition seen mid-month IS a verified, dated boundary");
});

test("lunarMonthSegments: a new-moon transition whose OWN sunrise already carries the new masa is dated to THAT day, not the (possibly earlier, possibly later) exact astronomical instant", async () => {
  const { lunarMonthSegments } = await vite.ssrLoadModule("/components/platform/calendar-screen.tsx");
  const day = (n, masaAmanta) => ({ dateISO: `2026-11-${String(n).padStart(2, "0")}`, day: n, masaAmanta, isAdhikaMasa: false });
  // Real 2026 Hyderabad case: Amavasya ends 12:31 PM on Nov 9 - AFTER that
  // day's own sunrise (~6:18 AM), so Nov 9's sunrise still carries the
  // OUTGOING month (Ashvina); the new month (Kartika) is not sunrise-
  // anchored until Nov 10, a full day after the exact astronomical instant.
  const days = [
    ...Array.from({ length: 9 }, (_, i) => day(i + 1, "Ashvina")),
    ...Array.from({ length: 21 }, (_, i) => day(i + 10, "Kartika")),
  ];
  const segs = lunarMonthSegments(days);
  assert.equal(segs[1].masaAmanta, "Kartika");
  assert.equal(segs[1].fromDay, 10, "sunrise-anchored to Nov 10, NOT Nov 9 (the day the exact instant fell on)");
});

test("lunarMonthSegments: an Adhika (leap) masa is its own distinct segment even with the same name as the following Nija month", async () => {
  const { lunarMonthSegments } = await vite.ssrLoadModule("/components/platform/calendar-screen.tsx");
  const days = [
    { dateISO: "2026-05-26", day: 26, masaAmanta: "Jyeshtha", isAdhikaMasa: true },
    { dateISO: "2026-05-27", day: 27, masaAmanta: "Jyeshtha", isAdhikaMasa: true },
    { dateISO: "2026-05-28", day: 28, masaAmanta: "Jyeshtha", isAdhikaMasa: false },
  ];
  const segs = lunarMonthSegments(days);
  assert.equal(segs.length, 2, "same masa name, different isAdhikaMasa flag - two genuinely distinct segments");
  assert.equal(segs[0].isAdhikaMasa, true);
  assert.equal(segs[1].isAdhikaMasa, false);
  assert.equal(segs[1].fromDay, 28);
});

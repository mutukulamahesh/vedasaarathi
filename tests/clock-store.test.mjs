// The minute-clock external store: it must give a stable current-minute
// snapshot, notify subscribers exactly at each minute boundary, tear its
// timer down when no one is listening, expose a stable SSR snapshot, and be
// fully driveable from injected time/timer functions. And, wired into a
// component the way app/page.tsx wires it, it must roll a saved location's
// "today" over to the next calendar date at midnight with no navigation or
// other user action.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const dom = new JSDOM(
  "<!doctype html><html><body><div id=\"app\"></div></body></html>",
  { url: "https://vedasaarathi.test/" },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.customElements = dom.window.customElements;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = (await import("react")).default;
const { act, useSyncExternalStore } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);

after(async () => {
  await vite.close();
});

const clockMod = await vite.ssrLoadModule("/lib/puja/clock.ts");
const { createMinuteClock } = clockMod;
const page = await vite.ssrLoadModule("/app/page.tsx");
const { VINAYAKA_PUJA } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");

const MS_PER_MINUTE = 60_000;

// A deterministic clock: `now` is whatever the test last set, and timers only
// fire when the test advances time past their deadline.
function makeFakeClock(startMs) {
  let now = startMs;
  let nextHandle = 1;
  const timers = new Map();
  return {
    deps: {
      now: () => now,
      setTimer: (fn, ms) => {
        const handle = nextHandle++;
        timers.set(handle, { fn, at: now + ms });
        return handle;
      },
      clearTimer: (handle) => { timers.delete(handle); },
    },
    pendingTimerCount: () => timers.size,
    advanceTo(targetMs) {
      now = targetMs;
      let guard = 0;
      for (;;) {
        if (guard++ > 100000) throw new Error("runaway timer loop");
        let earliest = null;
        for (const [handle, entry] of timers) {
          if (entry.at <= now && (earliest === null || entry.at < earliest.entry.at)) {
            earliest = { handle, entry };
          }
        }
        if (!earliest) break;
        timers.delete(earliest.handle);
        earliest.entry.fn();
      }
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Pure store behaviour                                                       */
/* -------------------------------------------------------------------------- */

test("getSnapshot returns a stable, minute-floored value", () => {
  const fake = makeFakeClock(Date.parse("2026-03-15T23:59:20.123Z"));
  const clock = createMinuteClock(fake.deps);
  const a = clock.getSnapshot();
  const b = clock.getSnapshot();
  assert.equal(a, b, "two reads in the same minute are identical");
  assert.equal(a % MS_PER_MINUTE, 0, "the snapshot is floored to the minute");
  assert.equal(a, Date.parse("2026-03-15T23:59:00Z"));
});

test("the server snapshot is a stable 0", () => {
  const clock = createMinuteClock(makeFakeClock(Date.now()).deps);
  assert.equal(clock.getServerSnapshot(), 0);
  assert.equal(clock.getServerSnapshot(), 0);
});

test("subscribers are notified exactly at the next minute boundary", () => {
  const fake = makeFakeClock(Date.parse("2026-03-15T23:59:20Z"));
  const clock = createMinuteClock(fake.deps);
  let notifications = 0;
  clock.subscribe(() => { notifications += 1; });

  fake.advanceTo(Date.parse("2026-03-15T23:59:59Z"));
  assert.equal(notifications, 0, "still inside the same minute - no notification");

  fake.advanceTo(Date.parse("2026-03-16T00:00:03Z"));
  assert.equal(notifications, 1, "crossing the boundary notifies once");
  assert.equal(clock.getSnapshot(), Date.parse("2026-03-16T00:00:00Z"));

  fake.advanceTo(Date.parse("2026-03-16T00:01:05Z"));
  assert.equal(notifications, 2, "the next minute boundary notifies again");

  fake.advanceTo(Date.parse("2026-03-16T00:02:05Z"));
  assert.equal(notifications, 3, "and the one after that");
});

test("the timer is cleaned up once the last subscriber leaves, and no more notifications arrive", () => {
  const fake = makeFakeClock(Date.parse("2026-03-15T12:00:10Z"));
  const clock = createMinuteClock(fake.deps);
  let notifications = 0;
  const unsubscribeA = clock.subscribe(() => { notifications += 1; });
  const unsubscribeB = clock.subscribe(() => { notifications += 1; });
  assert.equal(fake.pendingTimerCount(), 1, "one shared timer for any number of subscribers");

  unsubscribeA();
  assert.equal(fake.pendingTimerCount(), 1, "timer stays while a subscriber remains");

  unsubscribeB();
  assert.equal(fake.pendingTimerCount(), 0, "timer is cleared when the last subscriber leaves");

  fake.advanceTo(Date.parse("2026-03-15T12:05:00Z"));
  assert.equal(notifications, 0, "no notifications after everyone has unsubscribed");
});

test("re-subscribing after the clock has advanced starts a fresh timer and reads the current minute", () => {
  const fake = makeFakeClock(Date.parse("2026-03-15T08:00:00Z"));
  const clock = createMinuteClock(fake.deps);
  const unsubscribe = clock.subscribe(() => {});
  unsubscribe();
  assert.equal(fake.pendingTimerCount(), 0);

  fake.advanceTo(Date.parse("2026-03-15T09:30:40Z"));
  assert.equal(clock.getSnapshot(), Date.parse("2026-03-15T09:30:00Z"), "snapshot follows real time even with no subscribers");

  let notifications = 0;
  clock.subscribe(() => { notifications += 1; });
  assert.equal(fake.pendingTimerCount(), 1);
  fake.advanceTo(Date.parse("2026-03-15T09:31:05Z"));
  assert.equal(notifications, 1);
});

/* -------------------------------------------------------------------------- */
/* Wired into a component: Home rolls to the next date at midnight            */
/* -------------------------------------------------------------------------- */

test("Home's today date advances to the next calendar date at the saved location's midnight, with no user action", async () => {
  const fake = makeFakeClock(Date.parse("2026-03-15T23:59:20Z"));
  const clock = createMinuteClock(fake.deps);

  const utcLocation = {
    status: "READY", latitude: 0, longitude: 0, timezone: "UTC",
    city: "Accra", region: "Greater Accra", country: "Ghana",
    source: "MANUAL", accuracyMeters: null, savedAt: "2026-03-01T00:00:00.000Z",
  };

  function HomeWithClock() {
    const nowMs = useSyncExternalStore(
      clock.subscribe, clock.getSnapshot, clock.getServerSnapshot,
    );
    return React.createElement(page.HomeScreen, {
      setScreen: () => {}, openPreparation: () => {}, mode: "SELF",
      participantCount: 1, materialsReady: 0, todayEpochDay: 0, nowMs,
      location: utcLocation, featuredPuja: VINAYAKA_PUJA,
    });
  }

  const container = dom.window.document.createElement("div");
  dom.window.document.getElementById("app").appendChild(container);
  const reactRoot = createRoot(container);
  await act(async () => {
    reactRoot.render(React.createElement(HomeWithClock));
  });

  assert.match(container.innerHTML, /March 15/, "before midnight, Home shows 15 March in the saved (UTC) zone");
  assert.doesNotMatch(container.innerHTML, /March 16/);

  // The only thing that happens is the wall clock advancing past midnight.
  await act(async () => {
    fake.advanceTo(Date.parse("2026-03-16T00:00:10Z"));
  });

  assert.match(container.innerHTML, /March 16/, "Home rolled over to 16 March on its own");
  assert.doesNotMatch(container.innerHTML, /March 15/);

  await act(async () => { reactRoot.unmount(); });
  container.remove();
});

test("app/page.tsx wires nowMs to the shared minute clock, not a dead subscription", () => {
  assert.equal(typeof clockMod.subscribeToMinute, "function");
  assert.equal(typeof clockMod.getMinuteSnapshot, "function");
  assert.equal(typeof clockMod.getServerMinuteSnapshot, "function");
  assert.equal(clockMod.getServerMinuteSnapshot(), 0);

  const coordinator = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(coordinator, /useSyncExternalStore\(\s*subscribeToMinute,\s*getMinuteSnapshot,\s*getServerMinuteSnapshot,?\s*\)/);
  // The old, never-emitting inline subscription is gone.
  assert.doesNotMatch(coordinator, /const nowMs = useSyncExternalStore\(\s*\(\) => \(\) => \{\}/);
});

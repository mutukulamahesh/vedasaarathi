// The shared audio-playback coordinator (lib/audio/playback-coordinator.ts) and
// its wiring into AppAudioPlayer.
//
// Requirement under test: exactly one audio source may sound at a time.
//   - starting instruction audio stops mantra audio and vice versa
//   - starting hosted audio stops the device voice and vice versa
//   - step change / Back / Home / completion / unmount stop all audio
//   - two recordings never play simultaneously

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const dom = new JSDOM(
  "<!doctype html><html><body><div id=\"app\"></div></body></html>",
  { url: "https://vedasaarathi.test/" },
);
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.customElements = dom.window.customElements;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom does not implement media playback. Stub play/pause and make each stub
// record which element it touched so the test can prove mutual exclusion.
const mediaLog = [];
dom.window.HTMLMediaElement.prototype.play = function play() {
  mediaLog.push(`play:${this.getAttribute("src")}`);
  return Promise.resolve();
};
dom.window.HTMLMediaElement.prototype.pause = function pause() {
  mediaLog.push(`pause:${this.getAttribute("src")}`);
};
Object.defineProperty(dom.window.HTMLMediaElement.prototype, "currentTime", {
  get() {
    return 0;
  },
  set() {
    /* ignore */
  },
  configurable: true,
});

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => {
  await vite.close();
});

const coordinator = await vite.ssrLoadModule("/lib/audio/playback-coordinator.ts");
const { AppAudioPlayer } = await vite.ssrLoadModule(
  "/components/platform/audio-player.tsx",
);

/* -------------------------------------------------------------------------- */
/* module-level behaviour                                                     */
/* -------------------------------------------------------------------------- */

test("play() stops every other registered handle and records the active one", () => {
  const stopped = [];
  const a = { id: "a", stop: () => stopped.push("a") };
  const b = { id: "b", stop: () => stopped.push("b") };
  const c = { id: "c", stop: () => stopped.push("c") };
  const unregA = coordinator.register(a);
  const unregB = coordinator.register(b);
  const unregC = coordinator.register(c);

  coordinator.play("a");
  assert.equal(coordinator.activePlaybackId(), "a");
  assert.deepEqual(stopped.sort(), ["b", "c"]);

  stopped.length = 0;
  coordinator.play("b");
  assert.equal(coordinator.activePlaybackId(), "b");
  assert.deepEqual(stopped.sort(), ["a", "c"]);

  unregA();
  unregB();
  unregC();
  assert.equal(coordinator.registeredPlaybackCount(), 0);
});

test("stopAll() stops every registered handle and clears the active id", () => {
  const stopped = [];
  const unreg1 = coordinator.register({ id: "1", stop: () => stopped.push("1") });
  const unreg2 = coordinator.register({ id: "2", stop: () => stopped.push("2") });
  coordinator.play("1");
  stopped.length = 0;
  coordinator.stopAll();
  assert.equal(coordinator.activePlaybackId(), null);
  assert.deepEqual([...stopped].sort(), ["1", "2"]);
  unreg1();
  unreg2();
});

test("unregister() also stops its handle and clears active if it held it", () => {
  let stops = 0;
  const unreg = coordinator.register({ id: "x", stop: () => { stops += 1; } });
  coordinator.play("x");
  unreg();
  assert.equal(stops, 1);
  assert.equal(coordinator.activePlaybackId(), null);
  assert.equal(coordinator.registeredPlaybackCount(), 0);
});

test("a stop() that throws never breaks play() or stopAll()", () => {
  const unregBad = coordinator.register({
    id: "bad",
    stop: () => {
      throw new Error("boom");
    },
  });
  const unregOk = coordinator.register({ id: "ok", stop: () => {} });
  assert.doesNotThrow(() => coordinator.play("ok"));
  assert.doesNotThrow(() => coordinator.stopAll());
  unregBad();
  unregOk();
});

/* -------------------------------------------------------------------------- */
/* AppAudioPlayer wiring                                                      */
/* -------------------------------------------------------------------------- */

function readyAsset(over = {}) {
  return {
    stepId: "demo",
    language: "TE",
    kind: "PLAIN_INSTRUCTION",
    src: "/audio/v1/demo.te.plain.mp3",
    status: "GENERATED",
    voice: "te-IN-MohanNeural",
    text: "కొంత తెలుగు వచనం",
    textRef: "test",
    contentVersion: "1",
    ...over,
  };
}

function findButton(container, label) {
  return [...container.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").toLowerCase().includes(label.toLowerCase()),
  );
}

test("starting one AppAudioPlayer stops the other — two files never play at once", async () => {
  coordinator.stopAll();
  const host = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(host);
  const root2 = createRoot(host);

  const instruction = readyAsset({ src: "/audio/v1/demo.te.plain.mp3" });
  const mantra = readyAsset({
    kind: "MANTRA_CANDIDATE",
    status: "REVIEW_CANDIDATE",
    src: "/audio/v1/demo.mantra.te.mp3",
  });

  await act(async () => {
    root2.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(AppAudioPlayer, {
          asset: instruction,
          title: "Play instruction",
          pendingNote: "pending",
        }),
        React.createElement(AppAudioPlayer, {
          asset: mantra,
          title: "Play mantra",
          pendingNote: "pending",
        }),
      ),
    );
  });

  assert.equal(coordinator.registeredPlaybackCount(), 2);

  mediaLog.length = 0;
  await act(async () => {
    findButton(host, "Play instruction").dispatchEvent(
      new dom.window.Event("click", { bubbles: true }),
    );
  });
  assert.equal(coordinator.activePlaybackId(), "audio:/audio/v1/demo.te.plain.mp3");
  assert.ok(mediaLog.includes("play:/audio/v1/demo.te.plain.mp3"));

  mediaLog.length = 0;
  await act(async () => {
    findButton(host, "Play mantra").dispatchEvent(
      new dom.window.Event("click", { bubbles: true }),
    );
  });
  // starting the mantra must have paused the instruction file first
  assert.equal(coordinator.activePlaybackId(), "audio:/audio/v1/demo.mantra.te.mp3");
  assert.ok(
    mediaLog.includes("pause:/audio/v1/demo.te.plain.mp3"),
    `expected instruction to be paused, got ${JSON.stringify(mediaLog)}`,
  );
  assert.ok(mediaLog.includes("play:/audio/v1/demo.mantra.te.mp3"));

  // unmount stops everything and unregisters
  await act(async () => {
    root2.unmount();
  });
  assert.equal(coordinator.registeredPlaybackCount(), 0);
  assert.equal(coordinator.activePlaybackId(), null);
});

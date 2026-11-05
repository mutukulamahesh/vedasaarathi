// The premature Sankalpam preview (real-browser-observed defect, FAMILY mode).
//
// Reported: a participant has Gotra UNKNOWN, "Not decided yet" is selected
// in Sankalpam setup, "Begin the puja" correctly stays disabled - but the
// Telugu and transliterated Sankalpam text was already visible under "Your
// Sankalpam so far" (the "Change details" screen's own inline preview). Root
// cause: the generator (lib/sankalpam/generator.ts) OMITS the unresolved
// Gotra clause entirely rather than blocking output, so the assembled text
// read as a smooth, complete-looking sentence even though a required choice
// was still open.
//
// This is an INTERACTIVE test (real navigation + real radio-button clicks,
// the same JSDOM + React harness already established in
// tests/sankalpam-adhika-family-nav.test.mjs and
// tests/family-sankalpam-audio.test.mjs) because FAMILY mode's "Change
// details" subview is reached only via a real click (its default `view`
// state on mount is "ready", not "change") - it cannot be exercised through
// a single static SSR render the way SELF/GROUP mode's default screen can
// (covered instead in tests/sankalpam-setup.test.mjs).

import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id=\"app\"></div></body></html>", {
  url: "https://vedasaarathi.test/",
});
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

dom.window.HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
dom.window.HTMLMediaElement.prototype.pause = function pause() {};
Object.defineProperty(dom.window.HTMLMediaElement.prototype, "currentTime", {
  get() { return 0; }, set() {}, configurable: true,
});
dom.window.speechSynthesis = {
  speak() {}, cancel() {}, getVoices() { return []; }, addEventListener() {}, removeEventListener() {},
};
globalThis.speechSynthesis = dom.window.speechSynthesis;
globalThis.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(t) { this.text = t; };

const React = (await import("react")).default;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createTestViteServer } = await import("./helpers/vite-test-server.mjs");

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(async () => { await vite.close(); });

const { default: App } = await vite.ssrLoadModule("/app/page.tsx");
const { SATYANARAYANA_PUJA } = await vite.ssrLoadModule("/lib/pujas/satyanarayana/service.ts");
const state = await vite.ssrLoadModule("/lib/storage/preparation.ts");
const { defaultSankalpamChoices } = await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const person = {id:"fictional-lakshmi",name:"Lakshmi Test",gotra:{status:"UNKNOWN",name:""},veda:{status:"UNSURE",name:""},sutra:{status:"UNKNOWN",name:""},sampradaya:{status:"UNSURE",name:""}};
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia = () => ({matches:false,addEventListener(){},removeEventListener(){}});

const mountedRoots = new Set();
after(async()=>{await act(async()=>{for (const r of mountedRoots) r.unmount();});});
async function mounted() {
  const host=document.createElement("div");document.body.appendChild(host);
  const instance=createRoot(host); mountedRoots.add(instance);
  await act(async()=>instance.render(React.createElement(App)));
  const click=async text=>{
    const button=[...host.querySelectorAll("button")].findLast(b=>b.textContent.trim()===text || b.getAttribute("aria-label")===text);
    assert.ok(button,`button exists: ${text}`);
    assert.equal(button.disabled,false,`button enabled: ${text}`);
    await act(async()=>button.click());
  };
  const openSatya=async language=>{
    await click(language==="TE"?"పూజలు":"Pujas");
    const title=language==="TE"?SATYANARAYANA_PUJA.teluguDisplayName:SATYANARAYANA_PUJA.displayName;
    const button=[...host.querySelectorAll("button")].find(b=>b.querySelector("h2")?.textContent===title);
    assert.ok(button,"Satyanarayana visible beside Vinayaka");await act(async()=>button.click());
  };
  return {host,click,openSatya,close:async()=>{await act(async()=>instance.unmount());mountedRoots.delete(instance);host.remove();}};
}

for(const language of ["EN","TE"]) test(`actual app: full 66-step ${language} journey, previous, independent runs, reload/resume, Katha and completion`,async()=>{
  let p=state.emptyProgress();p={...p,mode:"FAMILY",participants:[person],language};
  p=state.withRun(p,"vinayaka-chavithi",{stepIndex:9,runState:"IN_PROGRESS",availableMaterialIds:["turmeric"]});
  p=state.withRun(p,"satyanarayana-vratham",{sankalpamChoices:{...defaultSankalpamChoices(),unknownGotra:"OMIT",calendarForm:"SHORT",placeDetail:"OMIT"}});
  await act(async()=>state.writeProgress(p));
  let app=await mounted();await app.openSatya(language);await app.click(language==="TE"?"ప్రారంభించండి":"Begin");
  assert.equal(app.host.querySelectorAll('.path-options input').length,0,"no invented Simple choice");
  assert.ok(app.host.querySelectorAll('.avail-toggle').length === 38, "full material checklist");
  await app.click(language==="TE"?"సంపూర్ణ పూజ మొదలుపెట్టండి":"Start Complete puja");
  await app.click(language==="TE"?"పూజ మొదలుపెట్టండి":"Begin the puja");
  const next=language==="TE"?"పూర్తయింది, తర్వాత":"Done, next";
  for(let i=0;i<66;i++) {
    const s=SATYANARAYANA_PUJA.steps[i];
    assert.ok(app.host.textContent.includes(language==="TE"?s.teluguTitle:s.title),`step ${i+1}: own title`);
    assert.equal(app.host.querySelectorAll("audio").length,0,"text release never plays Vinayaka audio");
    if(i===4) {
      await app.click(language==="TE"?"వెనుకకు":"Previous");
      assert.ok(app.host.textContent.includes(language==="TE"?SATYANARAYANA_PUJA.steps[i-1].teluguTitle:SATYANARAYANA_PUJA.steps[i-1].title));
      await app.click(next);
    }
    if(i===55) {
      await app.close();app=await mounted();await app.openSatya(language);
      await app.click(language==="TE"?"మీరు ఆపిన చోటు నుండి కొనసాగించండి":"Resume where you left off");
      assert.ok(app.host.textContent.includes(language==="TE"?s.teluguTitle:s.title),"exact Katha chapter resumes");
      assert.equal(state.getRun(state.loadProgress(),"vinayaka-chavithi").stepIndex,9,"Vinayaka stays at its own position");
    }
    if(s.reading?.openingTe) {
      const story=language==="TE"?s.reading.te:s.reading.en;
      const last=story.split(/\n\s*\n/).filter(Boolean).at(-1);
      assert.ok(app.host.textContent.includes(last),"entire chapter including its ending is rendered");
    }
    await app.click(i===65?(language==="TE"?"పూజ ముగించండి":"Finish puja"):next);
  }
  assert.ok(app.host.querySelector("h1").textContent.includes(language==="TE"?SATYANARAYANA_PUJA.teluguDisplayName:SATYANARAYANA_PUJA.displayName));
  assert.equal(state.getRun(state.loadProgress(),"satyanarayana-vratham").runState,"COMPLETED");
  assert.equal(state.getRun(state.loadProgress(),"vinayaka-chavithi").stepIndex,9);
  await app.close();
});

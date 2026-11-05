import assert from "node:assert/strict";
import test, { after } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTestViteServer } from "./helpers/vite-test-server.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createTestViteServer(root);
after(() => vite.close());
const { SATYANARAYANA_PUJA: puja } = await vite.ssrLoadModule("/lib/pujas/satyanarayana/service.ts");
const { VINAYAKA_PUJA: vinayaka } = await vite.ssrLoadModule("/lib/pujas/vinayaka/service.ts");
const { PujaScreen } = await vite.ssrLoadModule("/components/platform/puja-screen.tsx");
const { CompleteScreen } = await vite.ssrLoadModule("/components/platform/complete-screen.tsx");
const { generateSankalpam, buildSankalpamRequest, defaultSankalpamChoices } = await vite.ssrLoadModule("/lib/sankalpam/index.ts");
const { canDisplayAsGuidance } = await vite.ssrLoadModule("/lib/content/provenance.ts");
const { canDisplayAsBetaCandidate } = await vite.ssrLoadModule("/lib/content/beta-visibility.ts");
const { stepGuidanceTe } = await vite.ssrLoadModule("/lib/content/step-guidance-te.ts");
const { pujaPathIncludesPatri, stepsForPujaPath } = await vite.ssrLoadModule("/lib/puja/types.ts");
const storage = await vite.ssrLoadModule("/lib/storage/preparation.ts");
const raw = JSON.parse(readFileSync(new URL("../lib/pujas/satyanarayana/content.json", import.meta.url), "utf8"));
const master = readFileSync(new URL("../docs/pujas/sri-satyanarayana-vratham-master.md", import.meta.url), "utf8");
const recitationMaster = master.replace(/\s*⟨[^⟩]*⟩/g, "");
const person = (id, status = "KNOWN", name = "Bharadwaja") => ({ id, name: `Fictional ${id}`, gotra: { status, name: status === "KNOWN" ? name : "" }, veda: {status:"UNKNOWN", name:""}, sutra:{status:"UNSURE",name:""}, sampradaya:{status:"UNKNOWN",name:""} });
const choices = () => ({...defaultSankalpamChoices(), calendarForm:"SHORT", placeDetail:"OMIT"});
const render = (stepIndex, language = "EN", opts = {}) => renderToStaticMarkup(React.createElement(PujaScreen, {
  puja, stepIndex, path:"COMPLETE", language, setLanguage(){}, setStepIndex(){}, finish(){}, activeList:[person("a")], mode:"SELF", location:{status:"NOT_SET"}, sankalpamChoices:choices(), ...opts,
}));

test("66 ordered steps, 38 materials, five full chapters; one complete path, no date restriction or patri", () => {
  assert.equal(puja.steps.length,66); assert.equal(puja.materials.items.length,38);
  assert.deepEqual(raw.steps.map(s=>s.sourceStep), ["SNV-P1","SNV-P2","SNV-P3",...Array.from({length:63},(_,i)=>`SNV-${String(i+1).padStart(2,"0")}`)]);
  assert.equal(new Set(puja.steps.map(s=>s.id)).size,66);
  assert.equal(puja.completeOnly,true); assert.equal(puja.textOnly,true); assert.equal(puja.festival,null);
  assert.equal(pujaPathIncludesPatri(puja,"COMPLETE"),false);
  assert.equal(stepsForPujaPath(puja,"SIMPLE").length,66,"legacy/default SIMPLE run cannot omit the Katha or ritual steps");
  assert.equal(puja.steps.filter(s=>s.reading?.openingTe).length,5);
});

test("every extracted recitation and complete original Katha paragraph is in the merged source", () => {
  for (const s of raw.steps) {
    if (s.mantraTe) for (const line of s.mantraTe.split("\n")) assert.ok(recitationMaster.includes(line), `${s.sourceStep}: exact sourced Telugu`);
    if (s.roman) for (const line of s.roman.split("\n")) assert.ok(recitationMaster.includes(line),`${s.sourceStep}: sourced transliteration`);
    if (s.openingTe) {
      const n = Number(s.sourceStep.slice(4)) - 52;
      for (const [suffix, language] of [["1 తెలుగు", "readingTe"], ["2 English", "readingEn"]]) {
        const start = master.indexOf(`#### 6.${n}.${suffix}`);
        const rest = master.slice(start + `#### 6.${n}.${suffix}`.length);
        const expected = rest.split(/\n####? |\n## /)[0].split(/\n\*Note|\n\*గమనిక/)[0].trim().replace(/\n---$/, "").trim();
        assert.equal(s[language], expected, `${s.sourceStep}: no paragraph omitted from ${language}`);
      }
      for (const lang of ["readingEn","readingTe"]) {
        assert.ok(s[lang].length>1800,`${s.sourceStep} full-length ${lang}`);
        for (const paragraph of s[lang].split(/\n\s*\n/)) assert.ok(master.includes(paragraph),`${s.sourceStep} unabridged original ${lang}`);
      }
    }
  }
});

test("all steps pass only the sourced-beta gate; no approval or reviewer invented", () => {
  for (const s of puja.steps) {
    assert.equal(s.reviewStatus,"REVIEW_REQUIRED"); assert.equal(s.provenance.reviewer,null);
    assert.equal(canDisplayAsGuidance(s.reviewStatus,s.provenance),false);
    assert.ok(canDisplayAsBetaCandidate({...s,onlineSection:s.sourceSection,contentVersion:s.provenance.contentVersion},s.provenance));
  }
});

test("selected alternative readings preserved; historical notes, unsafe line and personal placeholders are not recitations", () => {
  const get = id => puja.steps.find(s=>s.id===`satyanarayana-${id}`);
  assert.match(get("16").mantraTeluguScript,/మాగధదేశజాత/);
  assert.doesNotMatch(get("24").mantraTeluguScript,/ప్రాణ ఇహా ప్రాణ/);
  assert.match(get("32").mantraTeluguScript,/స్వాదుః పవస్వేతి శర్కరా/);
  assert.equal(get("61").mantraTeluguScript,null);
  assert.equal(get("05").mantraTeluguScript,null);
  assert.match(get("05").followingRecitation.te,/గణాధిపతి పూజాం/);
  for(const s of puja.steps) assert.doesNotMatch(s.mantraTeluguScript??"",/«|⟨|do not recite|reference only|ఉభాభ్యాం/);
  assert.equal((get("40").mantraTeluguScript.match(/^ఓం /gm)||[]).length,108);
});

for (const language of ["EN","TE"]) test(`every step really renders its recitation and full reading, no missing-content or audio UI (${language})`, () => {
  for(let i=0;i<66;i++) {
    const html=render(i,language), s=puja.steps[i];
    assert.doesNotMatch(html,/INVALID_METADATA|rights are|not available|<audio|speechSynthesis|Listen to plain instructions|Hear and practise/);
    assert.ok(html.includes(language==="TE"?s.teluguTitle:s.title.replaceAll("&","&amp;").replaceAll("'","&#x27;")),`${s.id} title`);
    if(s.mantraTeluguScript) assert.ok(html.includes(s.mantraTeluguScript),`${s.id} full recitation`);
    if(s.reading) {
      const body=language==="TE"?s.reading.te:s.reading.en;
      assert.ok(body.length>0);
      // Count rendered paragraphs and verify final paragraph, preventing a truncated Katha.
      const last=body.split(/\n\s*\n/).filter(Boolean).at(-1);
      const esc=last.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("'","&#x27;").replaceAll("<","&lt;").replaceAll(">","&gt;");
      assert.ok(html.includes(esc),`${s.id} final paragraph`);
    }
    if(language==="TE") assert.ok(stepGuidanceTe(s.id)?.whatToDo);
  }
});

test("Sankalpam uses Satyanarayana for every participant mode, preserving unknown-choice gating", () => {
  for(const mode of ["SELF","FAMILY","GROUP"]) for(const status of ["KNOWN","UNKNOWN","UNSURE"]) {
    const c=choices(), participants=[person("a",status),person("b","UNSURE")];
    const gen=generateSankalpam(buildSankalpamRequest({purpose:puja.displayName,slug:puja.slug,mode,participants,location:{status:"NOT_SET"},panchanga:null,choices:c}));
    assert.match(gen.teluguScript,/శ్రీ సత్యనారాయణ/); assert.doesNotMatch(gen.teluguScript,/మహాగణపతి|ధర్మపత్నీ/);
    assert.ok(gen.pendingChoices.length>0 === (mode==="GROUP"||status!=="KNOWN"));
    if(status!=="KNOWN") assert.doesNotMatch(gen.teluguScript,/కశ్యప|కశ్యప|Bharadwaja/);
  }
});

test("GROUP individual Gotra choices stay separate; resolving one does not resolve another", () => {
  const people=[person("a","UNKNOWN"),person("b","UNSURE")];
  const c={...choices(),groupRecitation:"EACH_INDIVIDUALLY",participantGotra:{a:{choice:"OMIT",familyGotra:""}}};
  const gen=generateSankalpam(buildSankalpamRequest({purpose:puja.displayName,slug:puja.slug,mode:"GROUP",participants:people,location:{status:"NOT_SET"},panchanga:null,choices:c}));
  assert.ok(gen.pendingChoices.length>0);
  const done=generateSankalpam(buildSankalpamRequest({purpose:puja.displayName,slug:puja.slug,mode:"GROUP",participants:people,location:{status:"NOT_SET"},panchanga:null,choices:{...c,participantGotra:{...c.participantGotra,b:{choice:"OMIT",familyGotra:""}}}}));
  assert.equal(done.pendingChoices.length,0);
});

test("resumed unresolved Sankalpam hides both its generated text and following recitation", () => {
  const html=render(7,"EN",{activeList:[person("a","UNKNOWN")],sankalpamChoices:choices()});
  assert.match(html,/finish the remaining choices/);
  assert.doesNotMatch(html,/సత్యనారాయణ ప్రీత్యర్థం|గణాధిపతి పూజాం|sankalpam-assembled/);
});

test("per-puja material checklists, Sankalpam choices, exact chapter position survive serialize/reload independently", () => {
  let p=storage.emptyProgress();
  p=storage.withRun(p,vinayaka.slug,{stepIndex:8,runState:"IN_PROGRESS",availableMaterialIds:["turmeric"]});
  p=storage.withRun(p,puja.slug,{stepIndex:56,pujaPath:"COMPLETE",runState:"IN_PROGRESS",availableMaterialIds:["satya-material-1"],sankalpamChoices:{...choices(),unknownGotra:"OMIT"}});
  p=storage.parseProgress(storage.serializeProgress(p));
  assert.equal(storage.getRun(p,vinayaka.slug).stepIndex,8);
  assert.equal(storage.getRun(p,puja.slug).stepIndex,56);
  assert.deepEqual(storage.getRun(p,puja.slug).availableMaterialIds,["satya-material-1"]);
  assert.equal(storage.getRun(p,puja.slug).sankalpamChoices.unknownGotra,"OMIT");
  p=storage.resetRun(p,puja.slug);
  assert.equal(storage.getRun(p,vinayaka.slug).stepIndex,8);
});

test("completion names the actual puja in EN and TE; Vinayaka wording is preserved", () => {
  for(const language of ["EN","TE"]) {
    const props={home(){},restart(){},immersion:null,path:"COMPLETE",language};
    const html=renderToStaticMarkup(React.createElement(CompleteScreen,{...props,puja}));
    assert.ok(html.includes(language==="TE"?puja.teluguDisplayName:puja.displayName));
    assert.doesNotMatch(html,/Vinayaka Puja completed|వినాయక పూజ పూర్తయింది/);
    const original=renderToStaticMarkup(React.createElement(CompleteScreen,{...props,puja:vinayaka}));
    assert.match(original,language==="TE"?/వినాయక పూజ పూర్తయింది/:/Vinayaka Puja completed/);
  }
});

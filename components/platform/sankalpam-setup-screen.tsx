"use client";

// The pre-puja Sankalpam screen.
//
// FAMILY_BETA sees a SIMPLE screen: "Your Sankalpam is ready", a short summary
// (who it is for, the location used, today's Panchanga, how the Gotra is
// handled) and four primary actions — Hear and practise / View Sankalpam /
// Change details / Begin the puja. The full dated-vs-short choice, the
// Bharata-khanda / country-region mechanics, the calendar-slot terminology, the
// "Values you entered" list, the large transliteration and any provenance stay
// OUT of the first screen; they all live under "Change details".
//
// A genuinely unresolved Gotra (not KNOWN, no choice made) still requires ONE
// simple decision before "Begin the puja" — it is shown inline on the ready
// screen. Lineage is never inferred and an unknown-Gotra convention is never
// pre-selected.
//
// There is one Back control (the top bar); this screen shows no second one.

import { ChevronLeft, ListChecks, Play, Volume2 } from "lucide-react";
import { useState } from "react";

import type { Participant, ParticipantMode } from "@/lib/content/participants";
import type { LocationState } from "@/lib/location/model";
import type { LocationPanchanga } from "@/lib/panchanga";
import {
  teTithiPhrase, teMasa, tePaksha, teVaara,
} from "@/lib/panchanga/display-te";
import {
  buildSankalpamRequest, generateSankalpam, STANDARD_SHORT_FAMILY_CHOICES,
  type SankalpamChoices,
} from "@/lib/sankalpam";

import { SankalpamAssembledView } from "./sankalpam-view";
import { FamilySankalpamPlayer } from "./family-sankalpam-player";

type Lang = "EN" | "TE";

const CHOICE = <T extends string>(
  legend: string,
  hint: string,
  value: T,
  options: Array<{ v: T; label: string; note?: string }>,
  onChange: (v: T) => void,
  groupName: string = legend,
) => (
  <fieldset className="sankalpam-choice">
    <legend>{legend}</legend>
    {hint ? <p className="sankalpam-choice-hint">{hint}</p> : null}
    {options.map((o) => (
      <label key={o.v} className={value === o.v ? "selected" : ""}>
        <input
          type="radio"
          name={groupName}
          value={o.v}
          checked={value === o.v}
          onChange={() => onChange(o.v)}
        />
        <span>
          {o.label}
          {o.note ? <small> — {o.note}</small> : null}
        </span>
      </label>
    ))}
  </fieldset>
);

const L = {
  EN: {
    ready: "Your Sankalpam is ready",
    readyIntro:
      "The Sankalpam is the short spoken statement of who is performing this puja, where, when and why. It has been put together for you.",
    forWhom: "For",
    locationUsed: "Location used",
    todaysPanchanga: "Today’s Panchanga",
    gotra: "Gotra",
    gotraKnown: "known for everyone in the puja",
    gotraOneChoice: "one simple choice is needed below",
    gotraOmit: "left out of the Sankalpam (chosen)",
    gotraFamily: "your family’s Gotra (as you entered it)",
    gotraKashyapa: "the Kashyapa convention (chosen; not a universal ruling)",
    hearPractise: "Hear and practise",
    viewSankalpam: "View Sankalpam",
    changeDetails: "Change details",
    begin: "Begin the puja",
    back: "Back",
    decideFirst: "Make the one choice above to continue.",
    forFamily: "You and your family",
    forSelf: "You",
    forGroup: "Your group",
    people: (n: number) => `${n} ${n === 1 ? "person" : "people"}`,
    showRoman: "Show Roman reading",
    whatMeans: "What this means",
    whatMeansBody:
      "You are stating your resolve to perform this puja now — naming the time and place, the deity, and the intention (here, for the family’s wellbeing). Nothing personal beyond what you chose is spoken.",
    advanced: "Advanced details",
    gotraDecisionLegend: "How to state the Gotra",
    gotraDecisionHint:
      "A Gotra is not known for at least one person. Choose how to say it — it is never chosen for you and never guessed from a name.",
    notDecided: "Not decided yet",
    leaveOut: "Leave the Gotra line out",
    enterFamily: "Enter my family’s Gotra",
    useKashyapa: "Use the Kashyapa convention",
    kashyapaNote: "“avidita-gotranam kashyapa gotram” — recorded in two sources; not a universal ruling",
    familyGotraLabel: "Your family’s Gotra (as you know it)",
    setupHeading: "Change details",
    setupIntro: "These are optional. The defaults are already set.",
    done: "Done",
  },
  TE: {
    ready: "మీ సంకల్పం సిద్ధంగా ఉంది",
    readyIntro:
      "సంకల్పం అంటే ఈ పూజ ఎవరు, ఎక్కడ, ఎప్పుడు, ఎందుకు చేస్తున్నారో చెప్పే చిన్న వాక్యం. అది మీ కోసం సిద్ధం చేయబడింది.",
    forWhom: "ఎవరి కోసం",
    locationUsed: "వాడిన స్థానం",
    todaysPanchanga: "ఈ రోజు పంచాంగం",
    gotra: "గోత్రం",
    gotraKnown: "పూజలో అందరికీ తెలుసు",
    gotraOneChoice: "కింద ఒక సులభ ఎంపిక అవసరం",
    gotraOmit: "సంకల్పం నుండి తీసివేయబడింది (ఎంచుకున్నారు)",
    gotraFamily: "మీ కుటుంబ గోత్రం (మీరు నమోదు చేసినది)",
    gotraKashyapa: "కశ్యప సంప్రదాయం (ఎంచుకున్నారు; ఇది విశ్వవ్యాప్త నియమం కాదు)",
    hearPractise: "వినండి, సాధన చేయండి",
    viewSankalpam: "సంకల్పం చూడండి",
    changeDetails: "వివరాలు మార్చండి",
    begin: "పూజ మొదలుపెట్టండి",
    back: "వెనుకకు",
    decideFirst: "కొనసాగడానికి పైన ఒక ఎంపిక చేయండి.",
    forFamily: "మీరు, మీ కుటుంబం",
    forSelf: "మీరు",
    forGroup: "మీ గుంపు",
    people: (n: number) => `${n} ${n === 1 ? "వ్యక్తి" : "వ్యక్తులు"}`,
    showRoman: "రోమన్ ఉచ్చారణ చూపించు",
    whatMeans: "దీని అర్థం",
    whatMeansBody:
      "మీరు ఇప్పుడు ఈ పూజ చేయాలనే సంకల్పాన్ని చెబుతున్నారు — సమయం, స్థలం, దేవుడు, ఉద్దేశ్యం (ఇక్కడ కుటుంబ శ్రేయస్సు కోసం) చెబుతారు. మీరు ఎంచుకున్నదానికి మించి వ్యక్తిగతంగా ఏమీ చెప్పబడదు.",
    advanced: "అదనపు వివరాలు",
    gotraDecisionLegend: "గోత్రం ఎలా చెప్పాలి",
    gotraDecisionHint:
      "కనీసం ఒక వ్యక్తికి గోత్రం తెలియదు. దాన్ని ఎలా చెప్పాలో ఎంచుకోండి — ఇది మీ కోసం ఎంచుకోబడదు, పేరు నుండి ఊహించబడదు.",
    notDecided: "ఇంకా నిర్ణయించలేదు",
    leaveOut: "గోత్రం లైన్ వదిలేయండి",
    enterFamily: "మా కుటుంబ గోత్రం నమోదు చేయండి",
    useKashyapa: "కశ్యప సంప్రదాయం వాడండి",
    kashyapaNote: "“అవిదిత-గోత్రాణాం కశ్యప గోత్రం” — రెండు మూలాల్లో ఉంది; విశ్వవ్యాప్త నియమం కాదు",
    familyGotraLabel: "మీ కుటుంబ గోత్రం (మీకు తెలిసినట్లు)",
    setupHeading: "వివరాలు మార్చండి",
    setupIntro: "ఇవి ఐచ్ఛికం. డిఫాల్ట్‌లు ఇప్పటికే సెట్ చేయబడ్డాయి.",
    done: "పూర్తయింది",
  },
} as const;

export function SankalpamSetupScreen({
  activeList, mode, location, panchanga = null, choices, setChoices, slug,
  begin, back, purpose = "Vinayaka Chavithi puja", deity = "Sri Maha Ganapati",
  language = "EN",
}: {
  activeList: Participant[];
  mode: ParticipantMode;
  location: LocationState;
  panchanga?: LocationPanchanga | null;
  choices: SankalpamChoices;
  setChoices: (next: SankalpamChoices) => void;
  begin: () => void;
  back: () => void;
  purpose?: string;
  deity?: string | null;
  slug?: string;
  language?: Lang;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  const set = (patch: Partial<SankalpamChoices>) => setChoices({ ...choices, ...patch });
  const setParticipantGotra = (id: string, next: SankalpamChoices["participantGotra"][string]) =>
    setChoices({ ...choices, participantGotra: { ...choices.participantGotra, [id]: next } });

  const gen = generateSankalpam(
    buildSankalpamRequest({ purpose, deity, slug, mode, participants: activeList, location, panchanga, choices }),
  );

  const hasUnknownGotra = (p: Participant) => p.gotra.status !== "KNOWN" || !p.gotra.name.trim();
  const anyUnknownGotra = activeList.some(hasUnknownGotra);
  const isGroup = mode === "GROUP";
  const eachIndividually = isGroup && choices.groupRecitation === "EACH_INDIVIDUALLY";
  const perParticipantGotra = eachIndividually
    ? activeList.filter((p) => p.name.trim().length > 0 && hasUnknownGotra(p))
    : [];
  const pending = gen.pendingChoices.length > 0;

  const [view, setView] = useState<"ready" | "practise" | "full" | "change">(
    mode === "FAMILY" ? "ready" : "change",
  );

  /* ---------------- shared detailed form (the "Change details" body) -------- */
  const detailedForm = (
    <>
      {CHOICE<SankalpamChoices["calendarForm"]>(
        "Calendar detail",
        "The full dated form names the year, month, fortnight, tithi, weekday and star. The short form uses only “at this auspicious time”.",
        choices.calendarForm,
        [
          { v: "FULL_DATED", label: "Full dated form", note: "uses today’s Panchanga for your location" },
          { v: "SHORT", label: "Short form", note: "no dated calendar terms" },
        ],
        (v) => set({ calendarForm: v }),
      )}

      {mode === "FAMILY" && (
        <p className="sankalpam-choice-hint info">
          Family form: the spoken statement ends “asmakam saha kutumbanam”
          (for us, with our families). No individual names are written into it.
        </p>
      )}

      {isGroup &&
        CHOICE<NonNullable<SankalpamChoices["groupRecitation"]>>(
          "Group recitation",
          "You are an unrelated group, so the family phrase is not used.",
          choices.groupRecitation ?? "COLLECTIVE",
          [
            { v: "COLLECTIVE", label: "One collective Sankalpam", note: "“asmakam” (for us)" },
            { v: "EACH_INDIVIDUALLY", label: "Each person states their own", note: "with their own name and Gotra" },
          ],
          (v) => set({ groupRecitation: v }),
        )}

      {CHOICE<SankalpamChoices["placeDetail"]>(
        "Place detail",
        "No city, coordinates or time zone is ever written into the Sankalpam.",
        choices.placeDetail,
        [
          { v: "COUNTRY_ONLY", label: "Name my country", note: location.status === "READY" ? location.country : "country not saved" },
          { v: "REGION", label: "Name my country and region", note: location.status === "READY" ? `${location.region}, ${location.country}` : "not saved" },
          { v: "OMIT", label: "Stop at “Bharata-khande”", note: "no country or region" },
        ],
        (v) => set({ placeDetail: v }),
      )}

      {eachIndividually && perParticipantGotra.length > 0 && (
        <div className="sankalpam-per-participant-gotra">
          <h2>Unknown Gotra — one choice per person</h2>
          <p className="sankalpam-choice-hint">
            Each person named below has a Gotra that is not KNOWN. Choose how to
            state it for each of them separately. One person’s choice is never
            used for anyone else, and it is never guessed from a name.
          </p>
          {perParticipantGotra.map((p) => {
            const cur = choices.participantGotra[p.id] ?? { choice: null, familyGotra: "" };
            const name = p.name.trim();
            return (
              <div key={p.id} className="sankalpam-participant-gotra" data-participant-id={p.id}>
                {CHOICE<NonNullable<SankalpamChoices["unknownGotra"]> | "UNSET">(
                  `Gotra for ${name}`,
                  "",
                  cur.choice ?? "UNSET",
                  [
                    { v: "UNSET", label: "Not decided yet" },
                    { v: "OMIT", label: "Leave the Gotra line out" },
                    { v: "FAMILY_TRADITION", label: `Enter ${name}’s family Gotra` },
                    { v: "KASHYAPA", label: "Use the Kashyapa convention", note: t.kashyapaNote },
                  ],
                  (v) =>
                    setParticipantGotra(p.id, {
                      choice: v === "UNSET" ? null : v,
                      familyGotra: v === "FAMILY_TRADITION" ? cur.familyGotra : "",
                    }),
                  `participant-gotra-${p.id}`,
                )}
                {cur.choice === "FAMILY_TRADITION" && (
                  <label className="sankalpam-family-gotra">
                    {name}’s family Gotra (as known)
                    <input
                      type="text"
                      value={cur.familyGotra}
                      onChange={(e) =>
                        setParticipantGotra(p.id, { choice: "FAMILY_TRADITION", familyGotra: e.target.value })}
                      placeholder="e.g. Atreya"
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!eachIndividually && anyUnknownGotra && (
        <>
          {CHOICE<NonNullable<SankalpamChoices["unknownGotra"]> | "UNSET">(
            "Unknown Gotra",
            "A Gotra is not KNOWN for at least one person. Choose how to state it — it is never chosen for you, and it is never guessed from a name.",
            choices.unknownGotra ?? "UNSET",
            [
              { v: "UNSET", label: "Not decided yet" },
              { v: "OMIT", label: "Leave the Gotra line out" },
              { v: "FAMILY_TRADITION", label: "Enter my family’s Gotra" },
              { v: "KASHYAPA", label: "Use the Kashyapa convention", note: t.kashyapaNote },
            ],
            (v) => set({ unknownGotra: v === "UNSET" ? null : v }),
          )}
          {choices.unknownGotra === "FAMILY_TRADITION" && (
            <label className="sankalpam-family-gotra">
              Your family’s Gotra (as you know it)
              <input
                type="text"
                value={choices.familyGotra}
                onChange={(e) => set({ familyGotra: e.target.value })}
                placeholder="e.g. Atreya"
              />
            </label>
          )}
        </>
      )}

      <div className="sankalpam-setup-preview">
        <h2>Your Sankalpam so far</h2>
        {mode === "FAMILY" && (
          <FamilySankalpamPlayer
            gen={gen}
            language={language}
            onUseStandardForm={() => setChoices({ ...choices, ...STANDARD_SHORT_FAMILY_CHOICES })}
          />
        )}
        <SankalpamAssembledView gen={gen} language={language} />
      </div>
    </>
  );

  /* ---------------- non-FAMILY: the detailed screen, unchanged ------------- */
  if (mode !== "FAMILY") {
    return (
      <div className="flow-content sankalpam-setup">
        <button className="back-button" onClick={back}>
          <ChevronLeft size={18} /> Back to preparation
        </button>
        <h1>Set up your Sankalpam</h1>
        <p className="flow-intro">
          The Sankalpam is the short spoken statement of who is performing this
          puja, where, when and why. Choose how you want it stated.
        </p>
        {detailedForm}
        <button className="wide-primary" onClick={begin} disabled={pending}>
          <Play size={18} /> Begin the puja
        </button>
        {pending && <p className="sankalpam-choice-hint">Make the choices above to continue.</p>}
      </div>
    );
  }

  /* ---------------- FAMILY_BETA: the simple flow -------------------------- */

  // How the Gotra is being handled, in one plain line.
  const gotraSummary = (): string => {
    if (!anyUnknownGotra) return t.gotraKnown;
    if (pending) return t.gotraOneChoice;
    if (choices.unknownGotra === "OMIT") return t.gotraOmit;
    if (choices.unknownGotra === "FAMILY_TRADITION") return t.gotraFamily;
    if (choices.unknownGotra === "KASHYAPA") return t.gotraKashyapa;
    return t.gotraOneChoice;
  };

  const locLabel = location.status === "READY"
    ? (location.region.trim() ? `${location.city}, ${location.region}` : location.city)
    : (te ? "సేవ్ చేయలేదు" : "not saved");

  const panchangaSummary = (): string | null => {
    if (!panchanga) return null;
    const tithi = panchanga.fields.find((f) => f.key === "tithi")?.value ?? "";
    const masa = panchanga.context.find((c) => c.key === "masa")?.value ?? "";
    const paksha = panchanga.context.find((c) => c.key === "paksha")?.value ?? "";
    const vaara = panchanga.context.find((c) => c.key === "vaara")?.value ?? "";
    const parts = te
      ? [teMasa(masa), tePaksha(paksha), teTithiPhrase(tithi), teVaara(vaara)]
      : [masa, paksha && `${paksha} paksha`, tithi, vaara];
    const line = parts.filter(Boolean).join(" · ");
    return line || null;
  };

  const forLine = mode === "FAMILY" ? t.forFamily : t.forSelf;

  if (view === "change") {
    return (
      <div className="flow-content sankalpam-setup" lang={te ? "te" : undefined}>
        <button className="link-button" onClick={() => setView("ready")}>
          <ChevronLeft size={16} /> {t.back}
        </button>
        <h1>{t.setupHeading}</h1>
        <p className="flow-intro">{t.setupIntro}</p>
        {detailedForm}
        <button className="wide-primary" onClick={() => setView("ready")}>{t.done}</button>
      </div>
    );
  }

  if (view === "practise") {
    return (
      <div className="flow-content sankalpam-setup" lang={te ? "te" : undefined}>
        <button className="link-button" onClick={() => setView("ready")}>
          <ChevronLeft size={16} /> {t.back}
        </button>
        <h1>{t.hearPractise}</h1>
        <FamilySankalpamPlayer
          gen={gen}
          language={language}
          onUseStandardForm={() => setChoices({ ...choices, ...STANDARD_SHORT_FAMILY_CHOICES })}
        />
        <button className="wide-primary" onClick={begin} disabled={pending}>
          <Play size={18} /> {t.begin}
        </button>
        {pending && <p className="sankalpam-choice-hint">{t.decideFirst}</p>}
      </div>
    );
  }

  if (view === "full") {
    return (
      <div className="flow-content sankalpam-setup" lang={te ? "te" : undefined}>
        <button className="link-button" onClick={() => setView("ready")}>
          <ChevronLeft size={16} /> {t.back}
        </button>
        <h1>{t.viewSankalpam}</h1>
        <div className="sankalpam-full-te">
          <h2 lang="te">{te ? "తెలుగు పాఠం" : "Telugu"}</h2>
          <p className="sankalpam-assembled-line" lang="te">
            {gen.segments.map((s, i) => <span key={i}>{s.te} </span>)}
          </p>
        </div>
        <FamilySankalpamPlayer
          gen={gen}
          language={language}
          onUseStandardForm={() => setChoices({ ...choices, ...STANDARD_SHORT_FAMILY_CHOICES })}
        />
        <details className="sankalpam-roman-collapsed">
          <summary>{t.showRoman}</summary>
          <pre className="sankalpam-assembled-roman" data-allow-latin="transliteration">
            {gen.transliteration}
          </pre>
        </details>
        <details className="sankalpam-meaning-collapsed">
          <summary>{t.whatMeans}</summary>
          <p className="plain-note">{t.whatMeansBody}</p>
        </details>
        <details className="sankalpam-advanced-collapsed">
          <summary>{t.advanced}</summary>
          <SankalpamAssembledView gen={gen} language={language} />
        </details>
        <button className="wide-primary" onClick={begin} disabled={pending}>
          <Play size={18} /> {t.begin}
        </button>
      </div>
    );
  }

  // view === "ready" — the one Back control for this screen (topbar Back is
  // suppressed for sankalpam-setup in app/page.tsx).
  return (
    <div className="flow-content sankalpam-setup sankalpam-ready" lang={te ? "te" : undefined}>
      <button className="back-button" onClick={back}>
        <ChevronLeft size={18} /> {te ? "సిద్ధత దశకు" : "Back to preparation"}
      </button>
      <h1>{t.ready}</h1>
      <p className="flow-intro">{t.readyIntro}</p>

      <dl className="sankalpam-ready-summary">
        <div>
          <dt>{t.forWhom}</dt>
          <dd>{forLine} · {t.people(Math.max(activeList.length, 1))}</dd>
        </div>
        <div>
          <dt>{t.locationUsed}</dt>
          <dd>{locLabel}</dd>
        </div>
        {panchangaSummary() && (
          <div>
            <dt>{t.todaysPanchanga}</dt>
            <dd>{panchangaSummary()}</dd>
          </div>
        )}
        <div>
          <dt>{t.gotra}</dt>
          <dd>{gotraSummary()}</dd>
        </div>
      </dl>

      {/* The ONE decision, inline, when a Gotra is genuinely unresolved. */}
      {pending && !eachIndividually && (
        <div className="sankalpam-gotra-decision">
          {CHOICE<NonNullable<SankalpamChoices["unknownGotra"]> | "UNSET">(
            t.gotraDecisionLegend,
            t.gotraDecisionHint,
            choices.unknownGotra ?? "UNSET",
            [
              { v: "UNSET", label: t.notDecided },
              { v: "OMIT", label: t.leaveOut },
              { v: "FAMILY_TRADITION", label: t.enterFamily },
              { v: "KASHYAPA", label: t.useKashyapa, note: t.kashyapaNote },
            ],
            (v) => set({ unknownGotra: v === "UNSET" ? null : v }),
          )}
          {choices.unknownGotra === "FAMILY_TRADITION" && (
            <label className="sankalpam-family-gotra">
              {t.familyGotraLabel}
              <input
                type="text"
                value={choices.familyGotra}
                onChange={(e) => set({ familyGotra: e.target.value })}
                placeholder="e.g. Atreya"
              />
            </label>
          )}
        </div>
      )}
      {pending && eachIndividually && (
        <p className="sankalpam-choice-hint">
          {te
            ? "కొందరికి గోత్రం తెలియదు. “వివరాలు మార్చండి” లో ప్రతి ఒక్కరికీ ఎంచుకోండి."
            : "A Gotra is not known for some people. Choose for each of them under “Change details”."}
        </p>
      )}

      <div className="sankalpam-ready-actions">
        <button type="button" className="wide-secondary" onClick={() => setView("practise")}>
          <Volume2 size={18} /> {t.hearPractise}
        </button>
        <button type="button" className="wide-secondary" onClick={() => setView("full")}>
          {t.viewSankalpam}
        </button>
        <button type="button" className="wide-secondary" onClick={() => setView("change")}>
          <ListChecks size={18} /> {t.changeDetails}
        </button>
        <button type="button" className="wide-primary" onClick={begin} disabled={pending}>
          <Play size={18} /> {t.begin}
        </button>
        {pending && <p className="sankalpam-choice-hint">{t.decideFirst}</p>}
      </div>
    </div>
  );
}

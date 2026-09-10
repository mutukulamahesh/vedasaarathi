"use client";

// The pre-puja Sankalpam screen.
//
// FAMILY_BETA sees a SIMPLE screen. When every required choice is made it reads
// "Your Sankalpam is ready" with four actions — Hear and practise / View
// Sankalpam / Change details / Begin the puja. While a required choice is
// pending (an unknown Gotra with no decision, a FAMILY_TRADITION Gotra left
// blank, or — for an unrelated group reciting individually — any member's
// choice missing) the screen reads "One choice is needed" and Hear and
// practise / View Sankalpam / Begin are all disabled: an incomplete Sankalpam
// is never presented or played as if it were ready.
//
// Lineage is never inferred and an unknown-Gotra convention is never
// pre-selected. Every visible string is translated when Telugu is selected —
// SELF, FAMILY and GROUP, every subview.
//
// There is one Back control per subview (the top bar's Back is suppressed for
// this screen).

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
    oneChoiceNeeded: "One choice is needed",
    oneChoiceIntro:
      "Your Sankalpam is almost ready. Make the one choice below and it will be complete.",
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
    backToPrep: "Back to preparation",
    decideFirst: "Make the one choice above to continue.",
    forFamily: "You and your family",
    forSelf: "You",
    forGroup: "Your group",
    person: "person",
    people: "people",
    notSaved: "not saved",
    showRoman: "Show Roman reading",
    whatMeans: "What this means",
    whatMeansBody:
      "You are stating your resolve to perform this puja now — naming the time and place, the deity, and the intention (here, for the family’s wellbeing). Nothing personal beyond what you chose is spoken.",
    advanced: "Advanced details",
    teluguText: "Telugu",
    gotraDecisionLegend: "How to state the Gotra",
    gotraDecisionHint:
      "A Gotra is not known for at least one person. Choose how to say it — it is never chosen for you and never guessed from a name.",
    notDecided: "Not decided yet",
    leaveOut: "Leave the Gotra line out",
    enterFamily: "Enter my family’s Gotra",
    useKashyapa: "Use the Kashyapa convention",
    kashyapaNote: "“avidita-gotranam kashyapa gotram” — recorded in two sources; not a universal ruling",
    familyGotraLabel: "Your family’s Gotra (as you know it)",
    gotraExample: "e.g. Atreya",
    setupHeading: "Change details",
    setupIntro: "These are optional. The defaults are already set.",
    done: "Done",
    // detailed form
    setupTitle: "Set up your Sankalpam",
    setupIntroFull:
      "The Sankalpam is the short spoken statement of who is performing this puja, where, when and why. Choose how you want it stated.",
    makeChoices: "Make the choices above to continue.",
    calDetail: "Calendar detail",
    calDetailHint:
      "The full dated form names the year, month, fortnight, tithi, weekday and star. The short form uses only “at this auspicious time”.",
    calFull: "Full dated form",
    calFullNote: "uses today’s Panchanga for your location",
    calShort: "Short form",
    calShortNote: "no dated calendar terms",
    familyFormHint:
      "Family form: the spoken statement ends “asmakam saha kutumbanam” (for us, with our families). No individual names are written into it.",
    groupRecitation: "Group recitation",
    groupRecitationHint: "You are an unrelated group, so the family phrase is not used.",
    groupCollective: "One collective Sankalpam",
    groupCollectiveNote: "“asmakam” (for us)",
    groupEach: "Each person states their own",
    groupEachNote: "with their own name and Gotra",
    placeDetail: "Place detail",
    placeDetailHint: "No city, coordinates or time zone is ever written into the Sankalpam.",
    placeCountry: "Name my country",
    placeRegion: "Name my country and region",
    placeOmit: "Stop at “Bharata-khande”",
    placeOmitNote: "no country or region",
    countryNotSaved: "country not saved",
    perPersonGotraH2: "Unknown Gotra — one choice per person",
    perPersonGotraHint:
      "Each person named below has a Gotra that is not KNOWN. Choose how to state it for each of them separately. One person’s choice is never used for anyone else, and it is never guessed from a name.",
    gotraForName: (n: string) => `Gotra for ${n}`,
    enterNameGotra: (n: string) => `Enter ${n}’s family Gotra`,
    nameGotraKnownLabel: (n: string) => `${n}’s family Gotra (as known)`,
    unknownGotra: "Unknown Gotra",
    unknownGotraHint:
      "A Gotra is not KNOWN for at least one person. Choose how to state it — it is never chosen for you, and it is never guessed from a name.",
    yourSankalpamSoFar: "Your Sankalpam so far",
  },
  TE: {
    ready: "మీ సంకల్పం సిద్ధంగా ఉంది",
    readyIntro:
      "సంకల్పం అంటే ఈ పూజ ఎవరు, ఎక్కడ, ఎప్పుడు, ఎందుకు చేస్తున్నారో చెప్పే చిన్న వాక్యం. అది మీ కోసం సిద్ధం చేయబడింది.",
    oneChoiceNeeded: "ఒక ఎంపిక అవసరం",
    oneChoiceIntro:
      "మీ సంకల్పం దాదాపు సిద్ధంగా ఉంది. కింద ఒక ఎంపిక చేస్తే పూర్తవుతుంది.",
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
    backToPrep: "సిద్ధత దశకు",
    decideFirst: "కొనసాగడానికి పైన ఒక ఎంపిక చేయండి.",
    forFamily: "మీరు, మీ కుటుంబం",
    forSelf: "మీరు",
    forGroup: "మీ గుంపు",
    person: "వ్యక్తి",
    people: "వ్యక్తులు",
    notSaved: "సేవ్ చేయలేదు",
    showRoman: "రోమన్ ఉచ్చారణ చూపించు",
    whatMeans: "దీని అర్థం",
    whatMeansBody:
      "మీరు ఇప్పుడు ఈ పూజ చేయాలనే సంకల్పాన్ని చెబుతున్నారు — సమయం, స్థలం, దేవుడు, ఉద్దేశ్యం (ఇక్కడ కుటుంబ శ్రేయస్సు కోసం) చెబుతారు. మీరు ఎంచుకున్నదానికి మించి వ్యక్తిగతంగా ఏమీ చెప్పబడదు.",
    advanced: "అదనపు వివరాలు",
    teluguText: "తెలుగు పాఠం",
    gotraDecisionLegend: "గోత్రం ఎలా చెప్పాలి",
    gotraDecisionHint:
      "కనీసం ఒక వ్యక్తికి గోత్రం తెలియదు. దాన్ని ఎలా చెప్పాలో ఎంచుకోండి — ఇది మీ కోసం ఎంచుకోబడదు, పేరు నుండి ఊహించబడదు.",
    notDecided: "ఇంకా నిర్ణయించలేదు",
    leaveOut: "గోత్రం లైన్ వదిలేయండి",
    enterFamily: "మా కుటుంబ గోత్రం నమోదు చేయండి",
    useKashyapa: "కశ్యప సంప్రదాయం వాడండి",
    kashyapaNote: "“అవిదిత-గోత్రాణాం కశ్యప గోత్రం” — రెండు మూలాల్లో ఉంది; విశ్వవ్యాప్త నియమం కాదు",
    familyGotraLabel: "మీ కుటుంబ గోత్రం (మీకు తెలిసినట్లు)",
    gotraExample: "ఉదా. అత్రేయ",
    setupHeading: "వివరాలు మార్చండి",
    setupIntro: "ఇవి ఐచ్ఛికం. డిఫాల్ట్‌లు ఇప్పటికే సెట్ చేయబడ్డాయి.",
    done: "పూర్తయింది",
    setupTitle: "మీ సంకల్పం సెట్ చేయండి",
    setupIntroFull:
      "సంకల్పం అంటే ఈ పూజ ఎవరు, ఎక్కడ, ఎప్పుడు, ఎందుకు చేస్తున్నారో చెప్పే చిన్న వాక్యం. దాన్ని ఎలా చెప్పాలో ఎంచుకోండి.",
    makeChoices: "కొనసాగడానికి పైన ఎంపికలు చేయండి.",
    calDetail: "క్యాలెండర్ వివరం",
    calDetailHint:
      "పూర్తి తేదీ రూపం సంవత్సరం, మాసం, పక్షం, తిథి, వారం, నక్షత్రం చెబుతుంది. సంక్షిప్త రూపం “ఈ శుభ సమయంలో” అని మాత్రమే చెబుతుంది.",
    calFull: "పూర్తి తేదీ రూపం",
    calFullNote: "మీ స్థానానికి ఈ రోజు పంచాంగం వాడుతుంది",
    calShort: "సంక్షిప్త రూపం",
    calShortNote: "తేదీ క్యాలెండర్ పదాలు ఉండవు",
    familyFormHint:
      "కుటుంబ రూపం: వాక్యం “అస్మాకం సహ కుటుంబానాం” (మా కుటుంబాలతో మా కోసం) అని ముగుస్తుంది. వ్యక్తిగత పేర్లు అందులో రాయబడవు.",
    groupRecitation: "గుంపు పఠనం",
    groupRecitationHint: "మీరు సంబంధం లేని గుంపు, కాబట్టి కుటుంబ వాక్యం వాడబడదు.",
    groupCollective: "ఒకే సమష్టి సంకల్పం",
    groupCollectiveNote: "“అస్మాకం” (మా కోసం)",
    groupEach: "ప్రతి ఒక్కరూ తమ సొంతం చెబుతారు",
    groupEachNote: "తమ సొంత పేరు, గోత్రంతో",
    placeDetail: "స్థల వివరం",
    placeDetailHint: "నగరం, అక్షాంశ-రేఖాంశాలు లేదా టైమ్‌జోన్ సంకల్పంలో ఎప్పుడూ రాయబడవు.",
    placeCountry: "నా దేశం పేరు చెప్పండి",
    placeRegion: "నా దేశం, ప్రాంతం పేర్లు చెప్పండి",
    placeOmit: "“భారత-ఖండే” వద్ద ఆపండి",
    placeOmitNote: "దేశం లేదా ప్రాంతం లేదు",
    countryNotSaved: "దేశం సేవ్ చేయలేదు",
    perPersonGotraH2: "తెలియని గోత్రం — ప్రతి వ్యక్తికీ ఒక ఎంపిక",
    perPersonGotraHint:
      "కింద పేరున్న ప్రతి ఒక్కరికీ గోత్రం KNOWN కాదు. ప్రతి ఒక్కరికీ విడిగా ఎలా చెప్పాలో ఎంచుకోండి. ఒకరి ఎంపిక మరొకరికి వాడబడదు, పేరు నుండి ఊహించబడదు.",
    gotraForName: (n: string) => `${n} గోత్రం`,
    enterNameGotra: (n: string) => `${n} కుటుంబ గోత్రం నమోదు చేయండి`,
    nameGotraKnownLabel: (n: string) => `${n} కుటుంబ గోత్రం (తెలిసినట్లు)`,
    unknownGotra: "తెలియని గోత్రం",
    unknownGotraHint:
      "కనీసం ఒక వ్యక్తికి గోత్రం KNOWN కాదు. దాన్ని ఎలా చెప్పాలో ఎంచుకోండి — ఇది మీ కోసం ఎంచుకోబడదు, పేరు నుండి ఊహించబడదు.",
    yourSankalpamSoFar: "ఇప్పటివరకు మీ సంకల్పం",
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
  // The single source of truth for "the Sankalpam is not yet complete":
  // covers an undecided unknown Gotra, a FAMILY_TRADITION Gotra left blank
  // (the generator drops through to NEEDS_CHOICE), and — for a group reciting
  // individually — every member whose own choice is missing.
  const pending = gen.pendingChoices.length > 0;

  const [view, setView] = useState<"ready" | "practise" | "full" | "change">(
    mode === "FAMILY" ? "ready" : "change",
  );
  // While pending, no subview that presents/plays the Sankalpam is reachable.
  const effectiveView = pending && (view === "practise" || view === "full") ? "ready" : view;

  const peopleWord = (n: number) => (n === 1 ? t.person : t.people);

  /* ---------------- shared detailed form (the "Change details" body) -------- */
  const detailedForm = (
    <>
      {CHOICE<SankalpamChoices["calendarForm"]>(
        t.calDetail,
        t.calDetailHint,
        choices.calendarForm,
        [
          { v: "FULL_DATED", label: t.calFull, note: t.calFullNote },
          { v: "SHORT", label: t.calShort, note: t.calShortNote },
        ],
        (v) => set({ calendarForm: v }),
      )}

      {mode === "FAMILY" && (
        <p className="sankalpam-choice-hint info">{t.familyFormHint}</p>
      )}

      {isGroup &&
        CHOICE<NonNullable<SankalpamChoices["groupRecitation"]>>(
          t.groupRecitation,
          t.groupRecitationHint,
          choices.groupRecitation ?? "COLLECTIVE",
          [
            { v: "COLLECTIVE", label: t.groupCollective, note: t.groupCollectiveNote },
            { v: "EACH_INDIVIDUALLY", label: t.groupEach, note: t.groupEachNote },
          ],
          (v) => set({ groupRecitation: v }),
        )}

      {CHOICE<SankalpamChoices["placeDetail"]>(
        t.placeDetail,
        t.placeDetailHint,
        choices.placeDetail,
        [
          { v: "COUNTRY_ONLY", label: t.placeCountry, note: location.status === "READY" ? location.country : t.countryNotSaved },
          { v: "REGION", label: t.placeRegion, note: location.status === "READY" ? `${location.region}, ${location.country}` : t.notSaved },
          { v: "OMIT", label: t.placeOmit, note: t.placeOmitNote },
        ],
        (v) => set({ placeDetail: v }),
      )}

      {eachIndividually && perParticipantGotra.length > 0 && (
        <div className="sankalpam-per-participant-gotra">
          <h2>{t.perPersonGotraH2}</h2>
          <p className="sankalpam-choice-hint">{t.perPersonGotraHint}</p>
          {perParticipantGotra.map((p) => {
            const cur = choices.participantGotra[p.id] ?? { choice: null, familyGotra: "" };
            const name = p.name.trim();
            return (
              <div key={p.id} className="sankalpam-participant-gotra" data-participant-id={p.id}>
                {CHOICE<NonNullable<SankalpamChoices["unknownGotra"]> | "UNSET">(
                  t.gotraForName(name),
                  "",
                  cur.choice ?? "UNSET",
                  [
                    { v: "UNSET", label: t.notDecided },
                    { v: "OMIT", label: t.leaveOut },
                    { v: "FAMILY_TRADITION", label: t.enterNameGotra(name) },
                    { v: "KASHYAPA", label: t.useKashyapa, note: t.kashyapaNote },
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
                    {t.nameGotraKnownLabel(name)}
                    <input
                      type="text"
                      value={cur.familyGotra}
                      onChange={(e) =>
                        setParticipantGotra(p.id, { choice: "FAMILY_TRADITION", familyGotra: e.target.value })}
                      placeholder={t.gotraExample}
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
            t.unknownGotra,
            t.unknownGotraHint,
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
                placeholder={t.gotraExample}
              />
            </label>
          )}
        </>
      )}

      <div className="sankalpam-setup-preview">
        <h2>{t.yourSankalpamSoFar}</h2>
        {mode === "FAMILY" && (
          <FamilySankalpamPlayer
            gen={gen}
            language={language}
            onUseStandardForm={() => setChoices({ ...choices, ...STANDARD_SHORT_FAMILY_CHOICES })}
          />
        )}
        <SankalpamAssembledView gen={gen} language={language} compact />
      </div>
    </>
  );

  /* ---------------- non-FAMILY: the detailed screen ------------------------ */
  if (mode !== "FAMILY") {
    return (
      <div className="flow-content sankalpam-setup" lang={te ? "te" : undefined}>
        <button className="back-button" onClick={back}>
          <ChevronLeft size={18} /> {t.backToPrep}
        </button>
        <h1>{t.setupTitle}</h1>
        <p className="flow-intro">{t.setupIntroFull}</p>
        {detailedForm}
        <button className="wide-primary" onClick={begin} disabled={pending}>
          <Play size={18} /> {t.begin}
        </button>
        {pending && <p className="sankalpam-choice-hint">{t.makeChoices}</p>}
      </div>
    );
  }

  /* ---------------- FAMILY_BETA: the simple flow -------------------------- */

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
    : t.notSaved;

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

  const subBack = (
    <button className="link-button" onClick={() => setView("ready")}>
      <ChevronLeft size={16} /> {t.back}
    </button>
  );

  if (effectiveView === "change") {
    return (
      <div className="flow-content sankalpam-setup" lang={te ? "te" : undefined}>
        {subBack}
        <h1>{t.setupHeading}</h1>
        <p className="flow-intro">{t.setupIntro}</p>
        {detailedForm}
        <button className="wide-primary" onClick={() => setView("ready")}>{t.done}</button>
      </div>
    );
  }

  if (effectiveView === "practise") {
    return (
      <div className="flow-content sankalpam-setup" lang={te ? "te" : undefined}>
        {subBack}
        <h1>{t.hearPractise}</h1>
        <FamilySankalpamPlayer
          gen={gen}
          language={language}
          onUseStandardForm={() => setChoices({ ...choices, ...STANDARD_SHORT_FAMILY_CHOICES })}
        />
        <button className="wide-primary" onClick={begin} disabled={pending}>
          <Play size={18} /> {t.begin}
        </button>
      </div>
    );
  }

  if (effectiveView === "full") {
    return (
      <div className="flow-content sankalpam-setup" lang={te ? "te" : undefined}>
        {subBack}
        <h1>{t.viewSankalpam}</h1>
        <div className="sankalpam-full-te">
          <h2 lang="te">{t.teluguText}</h2>
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
          <SankalpamAssembledView gen={gen} language={language} compact />
        </details>
        <button className="wide-primary" onClick={begin} disabled={pending}>
          <Play size={18} /> {t.begin}
        </button>
      </div>
    );
  }

  // effectiveView === "ready"
  return (
    <div className="flow-content sankalpam-setup sankalpam-ready" lang={te ? "te" : undefined}>
      <button className="back-button" onClick={back}>
        <ChevronLeft size={18} /> {t.backToPrep}
      </button>
      <h1>{pending ? t.oneChoiceNeeded : t.ready}</h1>
      <p className="flow-intro">{pending ? t.oneChoiceIntro : t.readyIntro}</p>

      <dl className="sankalpam-ready-summary">
        <div>
          <dt>{t.forWhom}</dt>
          <dd>{t.forFamily} · {Math.max(activeList.length, 1)} {peopleWord(Math.max(activeList.length, 1))}</dd>
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
                placeholder={t.gotraExample}
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
        <button type="button" className="wide-secondary" onClick={() => setView("practise")} disabled={pending}>
          <Volume2 size={18} /> {t.hearPractise}
        </button>
        <button type="button" className="wide-secondary" onClick={() => setView("full")} disabled={pending}>
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

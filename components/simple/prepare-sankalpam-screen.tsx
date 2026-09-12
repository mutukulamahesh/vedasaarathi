"use client";

// Simple V1, stage 3: Preparation and Sankalpam, one compact screen.
//
// Materials: a short checklist of only the materials the one recommended
// sequence actually uses (reuses the existing compact-row pattern).
//
// Sankalpam: asks only a name (person or family) and whether the Gotra is
// known. Everything else (date, location, Panchanga, festival-vs-preview
// context) is applied automatically from already-saved state. Veda, Sutra,
// Sampradaya, participant mode, group/individual recitation, calendar-form
// and place-wording choices are never asked - the platform defaults
// (lib/sankalpam/choices.ts's defaultSankalpamChoices) are used as-is; only
// the Gotra question genuinely needs a user decision, and only when it is
// unknown (never inferred - a source-supported omission or the documented
// Kashyapa convention, exactly as the full platform already offers).
//
// ONE canonical Sankalpam is generated (buildSankalpamRequest ->
// generateSankalpam, the same pipeline the full platform's real setup screen
// uses - no separate/duplicate calculation). Until every required choice is
// valid, the Sankalpam is not shown, not played, and the puja cannot start.

import { Check, ChevronDown, Info, Play, ShieldCheck } from "lucide-react";

import type { Participant } from "@/lib/content/participants";
import type { LocationState } from "@/lib/location/model";
import type { LocationPanchanga } from "@/lib/panchanga";
import {
  buildSankalpamRequest, generateSankalpam, type SankalpamChoices,
} from "@/lib/sankalpam";
import {
  groupPujaMaterialsForPath, type PujaDefinition, type PujaMaterialDefinition,
} from "@/lib/puja/types";

import { SankalpamAssembledView } from "@/components/platform/sankalpam-view";
import { FamilySankalpamPlayer } from "@/components/platform/family-sankalpam-player";

type Lang = "EN" | "TE";

const MATERIAL_GROUP_KEYS: readonly ("needed" | "optional" | "traditionSpecific")[] =
  ["needed", "optional", "traditionSpecific"];
const MATERIAL_GROUP_CATEGORY: Record<"needed" | "optional" | "traditionSpecific", string> = {
  needed: "REQUIRED", optional: "OPTIONAL", traditionSpecific: "TRADITION_SPECIFIC",
};

const L = {
  EN: {
    prepareKicker: "PREPARE",
    heading: "Get ready",
    whatYouHave: "What you have",
    markWhatYouHave: "Use what is reasonably available. A missing optional item should not stop your puja.",
    haveIt: "Have it",
    yourDetails: "Your details",
    nameLabel: "Your name or family name",
    namePlaceholder: "e.g. Sharma family",
    nameRequired: "Enter a name to continue.",
    gotraQuestion: "Do you know your Gotra?",
    gotraKnown: "I know it",
    gotraUnknown: "I don't know it",
    gotraNameLabel: "Your Gotra",
    gotraPlaceholder: "e.g. Bharadwaja",
    gotraDecisionLegend: "How should the Gotra line be said?",
    gotraDecisionHint: "It is never guessed from a name - choose one:",
    leaveOut: "Leave the Gotra line out",
    useKashyapa: "Use the Kashyapa convention",
    kashyapaNote: "“avidita-gotranam kashyapa gotram” — a recorded convention, not a universal ruling",
    yourSankalpam: "Your Sankalpam",
    decideFirst: "Make the choice above to see your Sankalpam.",
    calcUnavailable: "Your Sankalpam could not be calculated right now. Please try again in a moment.",
    startPuja: "Start Vinayaka Puja",
    previewPuja: "Preview the puja",
  },
  TE: {
    prepareKicker: "సిద్ధత",
    heading: "సిద్ధం అవ్వండి",
    whatYouHave: "మీ దగ్గర ఉన్నవి",
    markWhatYouHave: "సహేతుకంగా అందుబాటులో ఉన్నవి వాడండి. ఐచ్ఛిక వస్తువు లేకపోయినా మీ పూజ ఆగదు.",
    haveIt: "ఉంది",
    yourDetails: "మీ వివరాలు",
    nameLabel: "మీ పేరు లేదా కుటుంబం పేరు",
    namePlaceholder: "ఉదా. శర్మ కుటుంబం",
    nameRequired: "కొనసాగించడానికి పేరు నమోదు చేయండి.",
    gotraQuestion: "మీ గోత్రం మీకు తెలుసా?",
    gotraKnown: "నాకు తెలుసు",
    gotraUnknown: "నాకు తెలియదు",
    gotraNameLabel: "మీ గోత్రం",
    gotraPlaceholder: "ఉదా. భరద్వాజ",
    gotraDecisionLegend: "గోత్రం వాక్యం ఎలా చెప్పాలి?",
    gotraDecisionHint: "ఇది ఎప్పుడూ పేరు నుండి ఊహించబడదు - ఒకటి ఎంచుకోండి:",
    leaveOut: "గోత్రం లైన్ వదిలేయండి",
    useKashyapa: "కశ్యప సంప్రదాయం వాడండి",
    kashyapaNote: "“అవిదిత-గోత్రాణాం కశ్యప గోత్రం” — నమోదైన సంప్రదాయం; విశ్వవ్యాప్త నియమం కాదు",
    yourSankalpam: "మీ సంకల్పం",
    decideFirst: "మీ సంకల్పం చూడటానికి పైన ఎంపిక చేయండి.",
    calcUnavailable: "మీ సంకల్పం ఇప్పుడు లెక్కించలేకపోయాము. దయచేసి కొద్ది సేపటి తర్వాత మళ్ళీ ప్రయత్నించండి.",
    startPuja: "వినాయక పూజ మొదలుపెట్టండి",
    previewPuja: "పూజను ప్రాక్టీస్ చేయండి",
  },
} as const;

function MaterialRow({
  item, available, toggle, te, label,
}: {
  item: PujaMaterialDefinition;
  available: boolean;
  toggle: () => void;
  te: boolean;
  label: string;
}) {
  const name = te && item.nameTe ? item.nameTe : item.name;
  const description = te && item.descriptionTe ? item.descriptionTe : item.description;
  return (
    <li className={`material-row ${available ? "available" : ""}`}>
      <div className="material-row-main">
        <button type="button" className={`avail-toggle ${available ? "on" : ""}`} aria-pressed={available} onClick={toggle}>
          <span className="check-box">{available && <Check size={14} />}</span>
          <span className="material-row-name">{name}</span>
        </button>
        <span className="material-row-state">{available ? label : ""}</span>
      </div>
      <details className="material-row-detail">
        <summary aria-label={te ? "దీని గురించి మరింత" : "More about this"}><ChevronDown size={16} /></summary>
        <p>{description}</p>
      </details>
    </li>
  );
}

export function PrepareSankalpamScreen({
  puja, participant, setParticipant, availableMaterialIds, toggleMaterial,
  location, panchanga, choices, setChoices, festivalToday, language = "EN",
  onStartPuja,
}: {
  puja: PujaDefinition;
  participant: Participant;
  setParticipant: (next: Participant) => void;
  availableMaterialIds: string[];
  toggleMaterial: (id: string) => void;
  location: LocationState;
  panchanga: LocationPanchanga | null;
  choices: SankalpamChoices;
  setChoices: (next: SankalpamChoices) => void;
  /** True only when the saved location's Panchanga puts Vinayaka Chavithi
   * TODAY - otherwise this is a preview/practice run, never an actual
   * festival-day Sankalpam. */
  festivalToday: boolean;
  language?: Lang;
  onStartPuja: () => void;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  const materialGroups = groupPujaMaterialsForPath(puja, "COMPLETE");
  const categoryLabel = (key: "needed" | "optional" | "traditionSpecific") =>
    (te && puja.materials.categoryLabelTe
      ? puja.materials.categoryLabelTe[MATERIAL_GROUP_CATEGORY[key]]
      : undefined) ?? puja.materials.categoryLabel[MATERIAL_GROUP_CATEGORY[key]];

  const gotraKnown = participant.gotra.status === "KNOWN";
  const nameValid = participant.name.trim().length > 0;

  let gen: ReturnType<typeof generateSankalpam> | null = null;
  try {
    gen = generateSankalpam(
      buildSankalpamRequest({
        purpose: puja.displayName,
        deity: "Sri Maha Ganapati",
        slug: puja.slug,
        mode: "FAMILY",
        participants: nameValid ? [participant] : [],
        location,
        panchanga,
        choices,
      }),
    );
  } catch {
    gen = null;
  }
  const pending = !nameValid || (gen ? gen.pendingChoices.length > 0 : true);
  const anyUnknownGotra = !gotraKnown;

  return (
    <div className="flow-content simple-prepare" lang={te ? "te" : undefined}>
      <p className="kicker">{t.prepareKicker}</p>
      <h1>{t.heading}</h1>

      <h2 className="prepare-subhead">{t.whatYouHave}</h2>
      <p className="info-note"><Info size={16} /> {t.markWhatYouHave}</p>
      {MATERIAL_GROUP_KEYS.map((key) =>
        materialGroups[key].length > 0 ? (
          <section className="material-group" key={key}>
            <h3 className="material-group-head">{categoryLabel(key)}</h3>
            <ul className="material-checklist">
              {materialGroups[key].map((item) => (
                <MaterialRow
                  key={item.id}
                  item={item}
                  available={availableMaterialIds.includes(item.id)}
                  toggle={() => toggleMaterial(item.id)}
                  te={te}
                  label={t.haveIt}
                />
              ))}
            </ul>
          </section>
        ) : null,
      )}

      <h2 className="prepare-subhead">{t.yourDetails}</h2>
      <label className="simple-name-field">
        {t.nameLabel}
        <input
          value={participant.name}
          placeholder={t.namePlaceholder}
          onChange={(e) => setParticipant({ ...participant, name: e.target.value })}
        />
      </label>

      <fieldset className="simple-gotra-question">
        <legend className="field-legend">{t.gotraQuestion}</legend>
        <label className={gotraKnown ? "selected" : ""}>
          <input
            type="radio"
            name="gotra-known"
            checked={gotraKnown}
            onChange={() => setParticipant({ ...participant, gotra: { status: "KNOWN", name: participant.gotra.name } })}
          />
          <span>{t.gotraKnown}</span>
        </label>
        <label className={!gotraKnown ? "selected" : ""}>
          <input
            type="radio"
            name="gotra-known"
            checked={!gotraKnown}
            onChange={() => setParticipant({ ...participant, gotra: { status: "UNKNOWN", name: "" } })}
          />
          <span>{t.gotraUnknown}</span>
        </label>
      </fieldset>
      {gotraKnown && (
        <label className="simple-name-field">
          {t.gotraNameLabel}
          <input
            value={participant.gotra.name}
            placeholder={t.gotraPlaceholder}
            onChange={(e) => setParticipant({ ...participant, gotra: { status: "KNOWN", name: e.target.value } })}
          />
        </label>
      )}
      {!nameValid && <p className="field-error">{t.nameRequired}</p>}

      {anyUnknownGotra && nameValid && gen && gen.pendingChoices.length > 0 && (
        <fieldset className="sankalpam-gotra-decision">
          <legend className="field-legend">{t.gotraDecisionLegend}</legend>
          <p className="sankalpam-choice-hint">{t.gotraDecisionHint}</p>
          <label className={choices.unknownGotra === "OMIT" ? "selected" : ""}>
            <input
              type="radio" name="unknown-gotra-choice"
              checked={choices.unknownGotra === "OMIT"}
              onChange={() => setChoices({ ...choices, unknownGotra: "OMIT" })}
            />
            <span>{t.leaveOut}</span>
          </label>
          <label className={choices.unknownGotra === "KASHYAPA" ? "selected" : ""}>
            <input
              type="radio" name="unknown-gotra-choice"
              checked={choices.unknownGotra === "KASHYAPA"}
              onChange={() => setChoices({ ...choices, unknownGotra: "KASHYAPA" })}
            />
            <span>{t.useKashyapa} <small> — {t.kashyapaNote}</small></span>
          </label>
        </fieldset>
      )}

      <h2 className="prepare-subhead">{t.yourSankalpam}</h2>
      {!gen ? (
        <p className="plain-note">{t.calcUnavailable}</p>
      ) : pending ? (
        <p className="sankalpam-choice-hint">{t.decideFirst}</p>
      ) : (
        <div className="sankalpam-block">
          <FamilySankalpamPlayer gen={gen} language={language} />
          <SankalpamAssembledView gen={gen} language={language} compact />
        </div>
      )}

      <button className="wide-primary" onClick={onStartPuja} disabled={pending}>
        <Play size={18} /> {festivalToday ? t.startPuja : t.previewPuja}
      </button>
      {!festivalToday && !pending && (
        <p className="simple-preview-note">
          <ShieldCheck size={14} />{" "}
          {te
            ? "ఇది ప్రివ్యూ — ఈ రోజు పండుగ సంకల్పం కాదు."
            : "This is a preview — not today's festival Sankalpam."}
        </p>
      )}
    </div>
  );
}

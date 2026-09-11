"use client";

// The preparation screen: the Simple/Complete choice, a compact materials
// checklist grouped by "Needed for this path" / "Optional" / "Tradition-
// specific", and the patri section (the 21 recovered Telugu names collapsed
// behind a disclosure). The beta status, source-validation detail, and
// per-item review wording are Reviewer-only - a family preparing for puja
// sees plain guidance, not development status.

import { Check, ChevronDown, Info, Play, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import type { Participant, ParticipantMode } from "@/lib/content/participants";
import type { PatriSelfReport } from "@/lib/content/leaves";
import { validateParticipants } from "@/lib/content/participants";
import { BETA_NOTICE } from "@/lib/content/beta-visibility";
import type { LocationState } from "@/lib/location/model";
import type { LocationPanchanga } from "@/lib/panchanga";
import {
  buildSankalpamRequest, defaultSankalpamChoices, generateSankalpam,
  type SankalpamChoices,
} from "@/lib/sankalpam";
import {
  estimatedMinutesForPujaPath, getPujaMaterialReadiness, groupPujaMaterialsForPath,
  pujaPathIncludesPatri, stepsForPujaPath,
  type PujaDefinition, type PujaMaterialDefinition, type PujaPathId,
} from "@/lib/puja/types";

import { ProvenancePanel } from "./review-display";

type Lang = "EN" | "TE";

const MATERIAL_GROUP_KEYS: readonly ("needed" | "optional" | "traditionSpecific")[] =
  ["needed", "optional", "traditionSpecific"];
const MATERIAL_GROUP_CATEGORY: Record<"needed" | "optional" | "traditionSpecific", string> = {
  needed: "REQUIRED", optional: "OPTIONAL", traditionSpecific: "TRADITION_SPECIFIC",
};

const L = {
  EN: {
    who: "WHO IS PERFORMING?",
    heading: "Get ready for the puja",
    firstFinishPeople: "First finish the people step. Each person needs a name, and any detail marked “I know it” needs its value.",
    addPeople: "Add people",
    choosePath: "Choose your puja path",
    simple: "Simple Puja",
    simpleNote: (n: number, m: number) => `${n} steps · about ${m} minutes · essential beginner sequence`,
    complete: "Complete Puja",
    completeNote: (n: number, m: number) => `${n} steps · about ${m} minutes · full sourced sequence`,
    whatYouHave: "What you have",
    markWhatYouHave: "Mark what you have. If something is missing, you can continue with what’s available.",
    haveIt: "Have it",
    notMarked: "Mark if you have it",
    moreAbout: "More about this",
    markedOf: (r: number, t: number) => `${r} of ${t} marked`,
    patriHave: "Do you have traditional patri?",
    viewLeaves: (n: number) => `View ${n} patri`,
    sankalpamFor: "The Sankalpam step shows the traditional short-form wording for",
    person: "person",
    people: "people",
    sankalpamPreview: (form: string, cal: string) => `Sankalpam preview — ${form}, ${cal}`,
    stillToChoose: (n: number) => ` · ${n} still to choose`,
    individualForm: "individual form", familyForm: "family form", groupForm: "unrelated-group form",
    fullDated: "full dated", shortForm: "short form",
    start: (p: PujaPathId) => `Start ${p === "SIMPLE" ? "Simple" : "Complete"} puja`,
  },
  TE: {
    who: "పూజ ఎవరు చేస్తున్నారు?",
    heading: "పూజకు సిద్ధం అవ్వండి",
    firstFinishPeople: "ముందు వ్యక్తుల వివరాలు పూర్తి చేయండి. ప్రతి వ్యక్తికి పేరు అవసరం, “నాకు తెలుసు” అని ఎంచుకున్న ప్రతి వివరానికి విలువ అవసరం.",
    addPeople: "వ్యక్తులను చేర్చండి",
    choosePath: "మీ పూజ విధానాన్ని ఎంచుకోండి",
    simple: "సరళ పూజ",
    simpleNote: (n: number, m: number) => `${n} దశలు · సుమారు ${m} నిమిషాలు · ప్రాథమిక సాధకుల క్రమం`,
    complete: "సంపూర్ణ పూజ",
    completeNote: (n: number, m: number) => `${n} దశలు · సుమారు ${m} నిమిషాలు · పూర్తి మూలాధార క్రమం`,
    whatYouHave: "మీ దగ్గర ఉన్నవి",
    markWhatYouHave: "మీ దగ్గర ఉన్న సామగ్రిని గుర్తు పెట్టుకోండి. ఏదైనా లేకపోయినా అందుబాటులో ఉన్నదానితో పూజను కొనసాగించవచ్చు.",
    haveIt: "ఉంది",
    notMarked: "ఉంటే గుర్తు పెట్టండి",
    moreAbout: "దీని గురించి మరింత",
    markedOf: (r: number, t: number) => `${t} లో ${r} గుర్తించారు`,
    patriHave: "మీ దగ్గర సాంప్రదాయ పత్రి ఉందా?",
    viewLeaves: (n: number) => `${n} పత్రి ఆకులు చూడండి`,
    sankalpamFor: "సంకల్పం దశ ఈ కింది వారికి సాంప్రదాయ సంక్షిప్త రూప వాక్యాన్ని చూపిస్తుంది:",
    person: "వ్యక్తి",
    people: "వ్యక్తులు",
    sankalpamPreview: (form: string, cal: string) => `సంకల్పం మునుజూపు — ${form}, ${cal}`,
    stillToChoose: (n: number) => ` · ${n} ఇంకా ఎంచుకోవాలి`,
    individualForm: "వ్యక్తిగత రూపం", familyForm: "కుటుంబ రూపం", groupForm: "సంబంధం లేని గుంపు రూపం",
    fullDated: "పూర్తి తేదీ రూపం", shortForm: "సంక్షిప్త రూపం",
    start: (p: PujaPathId) => `${p === "SIMPLE" ? "సరళ" : "సంపూర్ణ"} పూజ మొదలుపెట్టండి`,
  },
} as const;

/** One compact checklist row: name, a plain "have it" toggle, and an optional
 * expandable detail (what it is, how it is used, whether it is optional). */
function MaterialRow({
  item, available, toggle, te, reviewMode, label,
}: {
  item: PujaMaterialDefinition;
  available: boolean;
  toggle: () => void;
  te: boolean;
  reviewMode: boolean;
  label: string;
}) {
  const name = te && item.nameTe ? item.nameTe : item.name;
  const description = te && item.descriptionTe ? item.descriptionTe : item.description;
  return (
    <li className={`material-row ${available ? "available" : ""}`}>
      <div className="material-row-main">
        <button
          type="button"
          className={`avail-toggle ${available ? "on" : ""}`}
          aria-pressed={available}
          onClick={toggle}
        >
          <span className="check-box">{available && <Check size={14} />}</span>
          <span className="material-row-name">{name}</span>
        </button>
        <span className="material-row-state">{available ? label : ""}</span>
      </div>
      {/* A native <details> - collapsed by default, always in the DOM (find-
          in-page and assistive tech reach it without first toggling it open),
          and needs no custom open/close state. */}
      <details className="material-row-detail">
        <summary aria-label={te ? "దీని గురించి మరింత" : "More about this"}>
          <ChevronDown size={16} />
        </summary>
        <p>{description}</p>
        {reviewMode && (
          <ProvenancePanel reviewStatus={item.reviewStatus} provenance={item.provenance} />
        )}
      </details>
    </li>
  );
}

export function PrepareScreen({
  puja, activeList, availableMaterialIds, toggleMaterial, patriSelfReport,
  setPatriSelfReport, pujaPath, setPujaPath, goToPeople, start, reviewMode = false,
  mode = "SELF", location = { status: "NOT_SET" }, panchanga = null,
  sankalpamChoices, language = "EN",
}: {
  puja: PujaDefinition;
  activeList: Participant[];
  availableMaterialIds: string[];
  toggleMaterial: (id: string) => void;
  patriSelfReport: PatriSelfReport | null;
  setPatriSelfReport: (value: PatriSelfReport) => void;
  pujaPath: PujaPathId;
  setPujaPath: (value: PujaPathId) => void;
  goToPeople: () => void;
  start: () => void;
  reviewMode?: boolean;
  mode?: ParticipantMode;
  location?: LocationState;
  panchanga?: LocationPanchanga | null;
  sankalpamChoices?: SankalpamChoices;
  language?: Lang;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
  const ready = validateParticipants(activeList).valid;
  const readiness = getPujaMaterialReadiness(puja, availableMaterialIds, pujaPath);
  const simpleCount = stepsForPujaPath(puja, "SIMPLE").length;
  const completeCount = stepsForPujaPath(puja, "COMPLETE").length;
  const materialGroups = groupPujaMaterialsForPath(puja, pujaPath);
  // Show the patri section only when the chosen path actually uses the patri.
  // A saved patriSelfReport from a previous Complete run stays in storage but is
  // neither read nor shown here while the Simple path is selected.
  const showPatri = pujaPathIncludesPatri(puja, pujaPath);
  const categoryLabel = (key: "needed" | "optional" | "traditionSpecific") =>
    (te && puja.materials.categoryLabelTe
      ? puja.materials.categoryLabelTe[MATERIAL_GROUP_CATEGORY[key]]
      : undefined) ?? puja.materials.categoryLabel[MATERIAL_GROUP_CATEGORY[key]];

  if (!ready) {
    return (
      <div className="flow-content" lang={te ? "te" : undefined}>
        <p className="kicker">{puja.displayName.toUpperCase()}</p>
        <h1>{t.heading}</h1>
        <p className="info-note">
          <Info size={16} /> {t.firstFinishPeople}
        </p>
        <button className="wide-primary" onClick={goToPeople}>
          <UsersRound size={18} /> {t.addPeople}
        </button>
      </div>
    );
  }

  return (
    <div className="flow-content" lang={te ? "te" : undefined}>
      <p className="kicker">{puja.displayName.toUpperCase()}</p>
      <h1>{t.heading}</h1>

      {/* The beta/development notice is Reviewer-only - a family sees plain
          guidance, not internal review status. */}
      {reviewMode && <p className="beta-notice"><ShieldCheck size={15} /> {BETA_NOTICE}</p>}

      <fieldset className="path-options">
        <legend className="field-legend">{t.choosePath}</legend>
        <label className={pujaPath === "SIMPLE" ? "selected" : ""}>
          <input type="radio" checked={pujaPath === "SIMPLE"} onChange={() => setPujaPath("SIMPLE")} />
          <span>
            <strong>{t.simple}</strong>
            <small>{t.simpleNote(simpleCount, estimatedMinutesForPujaPath(puja, "SIMPLE"))}</small>
          </span>
        </label>
        <label className={pujaPath === "COMPLETE" ? "selected" : ""}>
          <input type="radio" checked={pujaPath === "COMPLETE"} onChange={() => setPujaPath("COMPLETE")} />
          <span>
            <strong>{t.complete}</strong>
            <small>{t.completeNote(completeCount, estimatedMinutesForPujaPath(puja, "COMPLETE"))}</small>
          </span>
        </label>
      </fieldset>

      <h2 className="prepare-subhead">{t.whatYouHave}</h2>
      <p className="info-note">
        <Info size={16} /> {t.markWhatYouHave}
      </p>

      <div className="progress-label">
        <span>{t.markedOf(readiness.available, readiness.total)}</span>
      </div>
      <div className="progress-track">
        <span style={{ width: `${readiness.total > 0 ? Math.round((readiness.available / readiness.total) * 100) : 0}%` }} />
      </div>

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
                  reviewMode={reviewMode}
                  label={t.haveIt}
                />
              ))}
            </ul>
          </section>
        ) : null,
      )}

      {showPatri && (
        <article className="leaves-section">
          <div className="leaves-head">
            <Sparkles size={20} />
            <h2>{te && puja.patri.sectionTitleTe ? puja.patri.sectionTitleTe : puja.patri.sectionTitle}</h2>
          </div>
          <p className="leaves-safety">
            <ShieldCheck size={16} /> {te && puja.patri.safetyNoteTe ? puja.patri.safetyNoteTe : puja.patri.safetyNote}
          </p>
          {puja.patri.substitutionNote && (
            <p className="info-note">
              <Info size={15} /> {te && puja.patri.substitutionNoteTe ? puja.patri.substitutionNoteTe : puja.patri.substitutionNote}
            </p>
          )}
          {puja.patri.teluguLeaves && puja.patri.teluguLeaves.length > 0 && (
            <details className="step-disclosure">
              <summary>{t.viewLeaves(puja.patri.teluguLeaves.length)}</summary>
              <ol className="patri-telugu-list" lang="te">
                {puja.patri.teluguLeaves.map((leaf) => (
                  <li key={leaf.index}>{leaf.leafNameTelugu}</li>
                ))}
              </ol>
            </details>
          )}
          {reviewMode && (
            <ProvenancePanel reviewStatus={puja.patri.reviewStatus} provenance={puja.patri.provenance} />
          )}

          <fieldset className="patri-options">
            <legend className="field-legend">{t.patriHave}</legend>
            {puja.patri.selfReportOptions.map((option) => (
              <label
                key={option.value}
                className={`patri-option ${patriSelfReport === option.value ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="patri-self-report"
                  value={option.value}
                  checked={patriSelfReport === option.value}
                  onChange={() => setPatriSelfReport(option.value as PatriSelfReport)}
                />
                <span>{te && option.labelTe ? option.labelTe : option.label}</span>
              </label>
            ))}
          </fieldset>
        </article>
      )}

      <p className="participant-summary">
        <UsersRound size={17} /> {t.sankalpamFor}{" "}
        {activeList.length} {activeList.length === 1 ? t.person : t.people}.
      </p>

      {(() => {
        const gen = generateSankalpam(
          buildSankalpamRequest({
            purpose: puja.displayName,
            deity: "Sri Maha Ganapati",
            slug: puja.slug,
            mode,
            participants: activeList,
            location,
            panchanga,
            choices: sankalpamChoices ?? defaultSankalpamChoices(),
          }),
        );
        const formLabel =
          gen.groupMode === "FAMILY" ? t.familyForm : gen.groupMode === "GROUP" ? t.groupForm : t.individualForm;
        const calLabel = gen.calendarForm === "FULL_DATED" ? t.fullDated : t.shortForm;
        const stillToChoose = gen.pendingChoices.length;
        return (
          <details className="step-disclosure sankalpam-prep-preview">
            <summary>
              {t.sankalpamPreview(formLabel, calLabel)}
              {stillToChoose > 0 ? t.stillToChoose(stillToChoose) : ""}
            </summary>
            <p className="sankalpam-explanation" data-allow-latin="explanation">
              {gen.englishExplanation}
            </p>
            {reviewMode && (
              <div className="reviewer-only">
                <h6>Slots</h6>
                <table className="sankalpam-slots">
                  <tbody>
                    {gen.slots.map((sl) => (
                      <tr key={sl.key} data-status={sl.status}>
                        <th scope="row">{sl.label}</th>
                        <td>{sl.value}</td>
                        <td>{sl.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <h6>Identified sources</h6>
                <ul>
                  {gen.sources.map((s) => (
                    <li key={s.id}>
                      <a href={s.url}>{s.title}</a> — {s.publisher}, accessed {s.accessedISO}.
                      {s.disagreement ? ` Disagreement: ${s.disagreement}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </details>
        );
      })()}

      <button className="wide-primary" onClick={start}>
        <Play size={18} /> {t.start(pujaPath)}
      </button>
    </div>
  );
}

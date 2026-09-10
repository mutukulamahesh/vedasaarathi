"use client";

// The pre-puja Sankalpam setup screen (item 1).
//
// The family chooses: full dated vs short form; for an unrelated group,
// collective vs individual recitation; how much place detail; and — only when
// a participant's Gotra is not KNOWN — how to state it (omit / family
// tradition / the explicitly-labelled Kashyapa convention). Choices persist
// per puja run. The assembled Sankalpam (Telugu + transliteration) is shown
// live and again before "Begin the puja".
//
// Lineage is never inferred; an unknown-Gotra convention is never pre-selected.

import { ChevronLeft, Play } from "lucide-react";

import type { Participant, ParticipantMode } from "@/lib/content/participants";
import type { LocationState } from "@/lib/location/model";
import type { LocationPanchanga } from "@/lib/panchanga";
import {
  buildSankalpamRequest, generateSankalpam, STANDARD_SHORT_FAMILY_CHOICES,
  type SankalpamChoices,
} from "@/lib/sankalpam";

import { SankalpamAssembledView } from "./sankalpam-view";
import { FamilySankalpamPlayer } from "./family-sankalpam-player";

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
  /** Puja slug — picks the canonical Telugu karma so the family text matches
   * the fixed audio. */
  slug?: string;
  language?: "EN" | "TE";
}) {
  const set = (patch: Partial<SankalpamChoices>) => setChoices({ ...choices, ...patch });
  const setParticipantGotra = (id: string, next: SankalpamChoices["participantGotra"][string]) =>
    setChoices({ ...choices, participantGotra: { ...choices.participantGotra, [id]: next } });

  const gen = generateSankalpam(
    buildSankalpamRequest({ purpose, deity, slug, mode, participants: activeList, location, panchanga, choices }),
  );

  const hasUnknownGotra = (p: Participant) => p.gotra.status !== "KNOWN" || !p.gotra.name.trim();
  const anyUnknownGotra = activeList.some(hasUnknownGotra);
  const isGroup = mode === "GROUP";
  // GROUP where each person recites their own Sankalpam: each participant whose
  // Gotra is not KNOWN gets their OWN unknown-Gotra choice, keyed by id.
  const eachIndividually = isGroup && choices.groupRecitation === "EACH_INDIVIDUALLY";
  const perParticipantGotra = eachIndividually
    ? activeList.filter((p) => p.name.trim().length > 0 && hasUnknownGotra(p))
    : [];

  return (
    <div className="flow-content sankalpam-setup">
      <button className="back-button" onClick={back}>
        <ChevronLeft size={18} /> Back to preparation
      </button>
      <h1>Set up your Sankalpam</h1>
      <p className="flow-intro">
        The Sankalpam is the short spoken statement of who is performing this
        puja, where, when and why. Choose how you want it stated — it is a guide
        to help you say it in your own puja.
      </p>

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
              <div
                key={p.id}
                className="sankalpam-participant-gotra"
                data-participant-id={p.id}
              >
                {CHOICE<NonNullable<SankalpamChoices["unknownGotra"]> | "UNSET">(
                  `Gotra for ${name}`,
                  "",
                  cur.choice ?? "UNSET",
                  [
                    { v: "UNSET", label: "Not decided yet" },
                    { v: "OMIT", label: "Leave the Gotra line out" },
                    { v: "FAMILY_TRADITION", label: `Enter ${name}’s family Gotra` },
                    {
                      v: "KASHYAPA",
                      label: "Use the Kashyapa convention",
                      note: "“avidita-gotranam kashyapa gotram” — recorded in two sources; not a universal ruling",
                    },
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
                        setParticipantGotra(p.id, {
                          choice: "FAMILY_TRADITION",
                          familyGotra: e.target.value,
                        })
                      }
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
              {
                v: "KASHYAPA",
                label: "Use the Kashyapa convention",
                note: "“avidita-gotranam kashyapa gotram” — recorded in two sources; not a universal ruling",
              },
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
            onUseStandardForm={() =>
              setChoices({ ...choices, ...STANDARD_SHORT_FAMILY_CHOICES })
            }
          />
        )}
        <SankalpamAssembledView gen={gen} />
      </div>

      <button className="wide-primary" onClick={begin} disabled={gen.pendingChoices.length > 0}>
        <Play size={18} /> Begin the puja
      </button>
      {gen.pendingChoices.length > 0 && (
        <p className="sankalpam-choice-hint">Make the choices above to continue.</p>
      )}
    </div>
  );
}

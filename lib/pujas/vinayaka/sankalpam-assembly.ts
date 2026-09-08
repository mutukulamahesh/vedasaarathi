// Functional Sankalpam for the Family Beta.
//
// This assembles a usable Sankalpam from ONLY what the recovered short-form
// text (Nanduri PDFs page 3) actually supports:
//   - "asmaakaM" (for us) - the performers, collectively
//   - "asmaakaM saha kuTuMbaanaaM" (with our families) - a family framing
//   - "asmin daeSae" (in this country) - a country-level place, no city slot
//
// It does NOT invent a full dated Sankalpam (samvatsara / masa / paksha /
// tithi / vaara / nakshatra), and it does NOT invent a Gotra / Veda / Sutra /
// Sampradaya slot - the short form has none. Unknown lineage stays unknown;
// lineage is never inferred from a surname or a location. Where the source
// does not support a case, the least-assumptive usable behaviour is chosen
// and the exact question is recorded for the priest (openQuestions).

import type { ParticipantMode } from "@/lib/content/participants";
import type { LocationState } from "@/lib/location/model";

import { CANDIDATE_CONTENT_VERSION } from "./candidate";
import {
  SANKALPAM_SOURCE_REFS, SANKALPAM_TRANSLITERATION,
} from "./sankalpam";
import { SANKALPAM_TELUGU_RECOVERY } from "./telugu-recovery";
import type { SourceReference } from "./sources";

export type SankalpamMode = "INDIVIDUAL" | "FAMILY" | "GROUP";

export interface SankalpamAssembly {
  mode: SankalpamMode;
  contentVersion: string;
  reviewStatus: "REVIEW_REQUIRED";
  locked: true;
  betaStatus: "SOURCED_BETA_CANDIDATE";
  /** The fixed source text - never edited by this function. */
  teluguScript: string;
  transliteration: string;
  sourceRefs: readonly SourceReference[];
  /** Who the Sankalpam is spoken for - one line per person or framing. */
  spokenFor: readonly string[];
  /** The source phrase the framing maps to. */
  framingPhrase: string;
  framingPhraseTelugu: string;
  /** Country-level place (source slot "asmin daeSae"), or null. City / time
   * zone are NOT inserted - the short form has no slot for them. */
  place: string | null;
  /** Lineage handling note - always "unknown stays unknown". */
  lineageNote: string;
  /** Slots the source does not support - recorded, never filled. */
  openQuestions: readonly string[];
}

function modeFor(mode: ParticipantMode): SankalpamMode {
  if (mode === "FAMILY") return "FAMILY";
  if (mode === "GROUP") return "GROUP";
  return "INDIVIDUAL";
}

function nameList(participants: readonly { name: string }[]): string[] {
  return participants
    .map((p) => p.name.trim())
    .filter((n) => n.length > 0);
}

const LINEAGE_NOTE =
  "The short-form Sankalpam has no Gotra, Veda, Sutra or Sampradaya slot. " +
  "Unknown lineage stays unknown - nothing is assigned, and nothing is " +
  "inferred from a name or a place.";

const NO_DATED_SLOT_QUESTION =
  "The supplied Sankalpam is a short form: it says only \"Subhae SObhanae " +
  "muhoortae\" (at this auspicious time). Confirm whether the app should use " +
  "a full dated Sankalpam (samvatsara / masa / paksha / tithi / vaara / " +
  "nakshatra) and supply that approved wording - it is not in the PDFs.";

const NO_CITY_SLOT_QUESTION =
  "The Sankalpam's only place slot is \"asmin daeSae\" (in this country). " +
  "Confirm whether a city / region should be named and supply the approved " +
  "wording.";

const GROUP_QUESTION =
  "For an unrelated group the app keeps the collective \"asmaakaM\" (for us) " +
  "wording and does NOT say \"saha kuTuMbaanaaM\" (with our families). " +
  "Confirm whether each member should instead state the Sankalpam " +
  "individually, and supply the approved group wording.";

export function assembleSankalpam(
  mode: ParticipantMode,
  participants: readonly { name: string }[],
  location: LocationState | null | undefined,
): SankalpamAssembly {
  const sMode = modeFor(mode);
  const names = nameList(participants);
  const place =
    location && location.status === "READY" && location.country.trim()
      ? location.country.trim()
      : null;

  const openQuestions: string[] = [NO_DATED_SLOT_QUESTION, NO_CITY_SLOT_QUESTION];

  let spokenFor: string[];
  let framingPhrase: string;
  let framingPhraseTelugu: string;

  if (sMode === "FAMILY") {
    framingPhrase = "asmaakaM saha kuTuMbaanaaM (for us, with our families)";
    framingPhraseTelugu = "అస్మాకం సహ కుటుంబానాం";
    spokenFor = names.length
      ? [`For ${names.join(", ")} and their families`]
      : ["For this family"];
  } else if (sMode === "GROUP") {
    framingPhrase = "asmaakaM (for us) - the family phrase is not used for an unrelated group";
    framingPhraseTelugu = "అస్మాకం";
    spokenFor = names.length
      ? names.map((n) => `${n} - states the Sankalpam for themselves`)
      : ["Each person states the Sankalpam for themselves"];
    openQuestions.push(GROUP_QUESTION);
  } else {
    framingPhrase = "asmaakaM (for us)";
    framingPhraseTelugu = "అస్మాకం";
    spokenFor = [names.length ? `For ${names[0]}` : "For the person performing this puja"];
  }

  return {
    mode: sMode,
    contentVersion: CANDIDATE_CONTENT_VERSION,
    reviewStatus: "REVIEW_REQUIRED",
    locked: true,
    betaStatus: "SOURCED_BETA_CANDIDATE",
    teluguScript: SANKALPAM_TELUGU_RECOVERY.teluguScript,
    transliteration: SANKALPAM_TRANSLITERATION,
    sourceRefs: SANKALPAM_SOURCE_REFS,
    spokenFor,
    framingPhrase,
    framingPhraseTelugu,
    place,
    lineageNote: LINEAGE_NOTE,
    openQuestions,
  };
}

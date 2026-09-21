// The user's Sankalpam setup choices — a small, dependency-free module so both
// the generator and the on-device storage layer can share the type without
// pulling in the Telugu term tables.

export type PlaceDetail = "COUNTRY_ONLY" | "REGION" | "OMIT";
export type UnknownGotraChoice = "KASHYAPA" | "OMIT" | "FAMILY_TRADITION";
export type GroupRecitation = "COLLECTIVE" | "EACH_INDIVIDUALLY";
export type CalendarForm = "FULL_DATED" | "SHORT";

/** One participant's own decision for an unknown Gotra, in a GROUP where each
 * person recites their Sankalpam individually. `choice === null` means "not
 * decided yet" (that participant is still pending). `familyGotra` is only read
 * when `choice === "FAMILY_TRADITION"`. */
export interface ParticipantGotraChoice {
  choice: UnknownGotraChoice | null;
  familyGotra: string;
}

export interface SankalpamChoices {
  placeDetail: PlaceDetail;
  unknownGotra: UnknownGotraChoice | null;
  familyGotra: string;
  groupRecitation: GroupRecitation | null;
  calendarForm: CalendarForm;
  /** GROUP + EACH_INDIVIDUALLY only: the unknown-Gotra decision for each
   * participant whose Gotra is UNKNOWN / UNSURE, keyed by that participant's
   * stable id (never array position). A participant with no entry is undecided.
   * KNOWN lineage is never listed here and is never affected. One participant's
   * choice or family Gotra is never applied to another. */
  participantGotra: Record<string, ParticipantGotraChoice>;
}

const PLACE_DETAILS: readonly PlaceDetail[] = ["COUNTRY_ONLY", "REGION", "OMIT"];
const UNKNOWN_GOTRA: readonly UnknownGotraChoice[] = ["KASHYAPA", "OMIT", "FAMILY_TRADITION"];
const GROUP_RECITATIONS: readonly GroupRecitation[] = ["COLLECTIVE", "EACH_INDIVIDUALLY"];
const CALENDAR_FORMS: readonly CalendarForm[] = ["FULL_DATED", "SHORT"];

export function defaultSankalpamChoices(): SankalpamChoices {
  return {
    placeDetail: "COUNTRY_ONLY",
    unknownGotra: null,
    familyGotra: "",
    groupRecitation: null,
    calendarForm: "FULL_DATED",
    participantGotra: {},
  };
}

/** Defensive parse of the per-participant unknown-Gotra map. Unknown keys are
 * participant ids and are kept verbatim; a malformed entry is dropped, never
 * guessed. A missing map (older stored runs) yields `{}`. */
function parseParticipantGotra(value: unknown): Record<string, ParticipantGotraChoice> {
  const out: Record<string, ParticipantGotraChoice> = {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) return out;
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!id || typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const choice =
      typeof r.choice === "string" && (UNKNOWN_GOTRA as readonly string[]).includes(r.choice)
        ? (r.choice as UnknownGotraChoice)
        : null;
    out[id] = {
      choice,
      familyGotra: typeof r.familyGotra === "string" ? r.familyGotra : "",
    };
  }
  return out;
}

/** Defensive parse of a stored choices object — anything unexpected falls back
 * to the default. Never guesses a Gotra convention. */
export function parseSankalpamChoices(value: unknown): SankalpamChoices {
  const d = defaultSankalpamChoices();
  if (typeof value !== "object" || value === null) return d;
  const r = value as Record<string, unknown>;
  const oneOf = <T,>(v: unknown, list: readonly T[], fallback: T): T =>
    typeof v === "string" && (list as readonly unknown[]).includes(v) ? (v as T) : fallback;
  return {
    placeDetail: oneOf(r.placeDetail, PLACE_DETAILS, d.placeDetail),
    unknownGotra:
      r.unknownGotra === null
        ? null
        : typeof r.unknownGotra === "string" && (UNKNOWN_GOTRA as readonly string[]).includes(r.unknownGotra)
          ? (r.unknownGotra as UnknownGotraChoice)
          : null,
    familyGotra: typeof r.familyGotra === "string" ? r.familyGotra : "",
    groupRecitation:
      r.groupRecitation === null
        ? null
        : typeof r.groupRecitation === "string" && (GROUP_RECITATIONS as readonly string[]).includes(r.groupRecitation)
          ? (r.groupRecitation as GroupRecitation)
          : null,
    calendarForm: oneOf(r.calendarForm, CALENDAR_FORMS, d.calendarForm),
    participantGotra: parseParticipantGotra(r.participantGotra),
  };
}

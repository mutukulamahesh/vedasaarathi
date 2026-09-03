// Participant and lineage data for the preparation journey.
//
// Hard rules from .claude/rules/sacred-content.md, enforced here:
//   - KNOWN, UNKNOWN and UNSURE are three distinct states and are preserved exactly.
//   - A lineage value is NEVER inferred from surname, caste, language, family
//     region or present location. There is no code path that fills one in.
//   - A lineage "name" is only meaningful when its status is KNOWN. For UNKNOWN
//     and UNSURE the name is always cleared.
//   - Missing lineage information never blocks the puja.

export type LineageStatus = "KNOWN" | "UNKNOWN" | "UNSURE";

export type LineageFieldKey = "gotra" | "veda" | "sutra" | "sampradaya";

export interface LineageField {
  status: LineageStatus;
  /** The value the participant supplied. Only meaningful when status === "KNOWN". */
  name: string;
  /**
   * True only when the user chose "My value is not listed" for a field that has
   * a candidate list, and typed the value themselves. The exact text is kept in
   * `name`. Absent for a value picked from a list, and for UNKNOWN / UNSURE.
   */
  custom?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  gotra: LineageField;
  veda: LineageField;
  sutra: LineageField;
  sampradaya: LineageField;
}

export type ParticipantMode = "SELF" | "FAMILY" | "GROUP";

export interface ParticipantModeOption {
  mode: ParticipantMode;
  title: string;
  description: string;
}

export const PARTICIPANT_MODES: readonly ParticipantModeOption[] = [
  {
    mode: "SELF",
    title: "Only me",
    description: "You are performing the puja on your own.",
  },
  {
    mode: "FAMILY",
    title: "My family",
    description: "You and your family members perform the puja together.",
  },
  {
    mode: "GROUP",
    title: "Students or friends performing together",
    description: "A group of students or friends performs the puja together.",
  },
];

export interface LineageFieldMeta {
  key: LineageFieldKey;
  label: string;
  /** Plain-language meaning, shown before the traditional word is used. */
  plain: string;
}

export const LINEAGE_FIELDS: readonly LineageFieldMeta[] = [
  {
    key: "gotra",
    label: "Gotra",
    plain: "Gotra means the name of the ancient family line a person belongs to.",
  },
  {
    key: "veda",
    label: "Veda",
    plain: "Veda means the branch of scripture a family follows.",
  },
  {
    key: "sutra",
    label: "Sutra",
    plain: "Sutra means the set of ritual rules a family follows.",
  },
  {
    key: "sampradaya",
    label: "Sampradaya",
    plain: "Sampradaya means the living tradition or school a family belongs to.",
  },
];

export interface LineageStatusOption {
  value: LineageStatus;
  label: string;
}

export const LINEAGE_STATUS_OPTIONS: readonly LineageStatusOption[] = [
  { value: "KNOWN", label: "I know it" },
  { value: "UNKNOWN", label: "I don't know" },
  { value: "UNSURE", label: "I am not sure" },
];

export function emptyLineageField(): LineageField {
  return { status: "UNKNOWN", name: "" };
}

export function createParticipant(id: string, name = ""): Participant {
  return {
    id,
    name,
    gotra: emptyLineageField(),
    veda: emptyLineageField(),
    sutra: emptyLineageField(),
    sampradaya: emptyLineageField(),
  };
}

/**
 * Return a lineage field in canonical form.
 *
 * KNOWN keeps its value (trimmed), and the `custom` flag when the user typed an
 * unlisted value. UNKNOWN and UNSURE are passed through with the name and the
 * custom flag always cleared - nothing is guessed or carried over for a field
 * the user has not positively identified.
 */
export function normalizeLineageField(field: LineageField): LineageField {
  if (field.status === "KNOWN") {
    const name = field.name.trim();
    return field.custom === true
      ? { status: "KNOWN", name, custom: true }
      : { status: "KNOWN", name };
  }
  return { status: field.status, name: "" };
}

/**
 * Return a copy of `participant` with one lineage field merged. This is the only
 * way the app changes a lineage field: it touches exactly one key and never
 * reads or writes any other field.
 */
export function withLineageField(
  participant: Participant,
  key: LineageFieldKey,
  update: Partial<LineageField>,
): Participant {
  return { ...participant, [key]: { ...participant[key], ...update } };
}

export function normalizeParticipant(participant: Participant): Participant {
  return {
    id: participant.id,
    name: participant.name.trim(),
    gotra: normalizeLineageField(participant.gotra),
    veda: normalizeLineageField(participant.veda),
    sutra: normalizeLineageField(participant.sutra),
    sampradaya: normalizeLineageField(participant.sampradaya),
  };
}

export interface LineageFieldError {
  field: LineageFieldKey;
  message: string;
}

export interface ParticipantValidation {
  id: string;
  nameError: string | null;
  lineageErrors: LineageFieldError[];
  valid: boolean;
}

/**
 * Validate one participant.
 *
 *   - A name is always required.
 *   - A lineage name is required ONLY when its status is KNOWN. A KNOWN field
 *     with a blank name is incomplete input, not "unknown"; the message tells
 *     the user they can switch to "I don't know" or "I am not sure" instead.
 *   - UNKNOWN and UNSURE never produce an error and never block progress.
 */
export function validateParticipant(participant: Participant): ParticipantValidation {
  const nameError =
    participant.name.trim() === "" ? "Enter a name for this person." : null;

  const lineageErrors: LineageFieldError[] = [];
  for (const { key, label } of LINEAGE_FIELDS) {
    const field = participant[key];
    if (field.status === "KNOWN" && field.name.trim() === "") {
      lineageErrors.push({
        field: key,
        message: `Enter the ${label} name, or choose "I don't know" or "I am not sure".`,
      });
    }
  }

  return {
    id: participant.id,
    nameError,
    lineageErrors,
    valid: nameError === null && lineageErrors.length === 0,
  };
}

export interface ParticipantsValidation {
  results: ParticipantValidation[];
  valid: boolean;
}

export function validateParticipants(
  participants: readonly Participant[],
): ParticipantsValidation {
  const results = participants.map(validateParticipant);
  return {
    results,
    valid: participants.length > 0 && results.every((result) => result.valid),
  };
}

/**
 * The participants who actually take part, given the selected mode.
 *
 * "Only me" uses just the first profile. Family and group use everyone. The
 * stored list is never truncated, so switching mode back and forth keeps every
 * profile the user has entered.
 */
export function activeParticipants(
  mode: ParticipantMode,
  participants: readonly Participant[],
): Participant[] {
  return mode === "SELF" ? participants.slice(0, 1) : [...participants];
}

/**
 * Whether the group can move on to the guided puja.
 *
 * The ONLY thing that blocks progress is a missing participant name. Unknown or
 * unsure lineage details, and missing materials, never block the puja.
 */
export function participantsReadyForPuja(
  participants: readonly Participant[],
): boolean {
  return (
    participants.length > 0 &&
    participants.every((participant) => participant.name.trim() !== "")
  );
}

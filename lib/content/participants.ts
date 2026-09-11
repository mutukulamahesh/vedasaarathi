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
  titleTe: string;
  description: string;
  descriptionTe: string;
}

export const PARTICIPANT_MODES: readonly ParticipantModeOption[] = [
  {
    mode: "SELF",
    title: "Only me",
    titleTe: "నేను మాత్రమే",
    description: "You are performing the puja on your own.",
    descriptionTe: "మీరు ఒంటరిగా పూజ చేస్తున్నారు.",
  },
  {
    mode: "FAMILY",
    title: "My family",
    titleTe: "నా కుటుంబం",
    description: "You and your family members perform the puja together.",
    descriptionTe: "మీరు, మీ కుటుంబ సభ్యులు కలిసి పూజ చేస్తారు.",
  },
  {
    mode: "GROUP",
    title: "Students or friends performing together",
    titleTe: "విద్యార్థులు లేదా స్నేహితులు కలిసి",
    description: "A group of students or friends performs the puja together.",
    descriptionTe: "విద్యార్థుల లేదా స్నేహితుల బృందం కలిసి పూజ చేస్తుంది.",
  },
];

export interface LineageFieldMeta {
  key: LineageFieldKey;
  label: string;
  labelTe: string;
  /** Plain-language meaning, shown before the traditional word is used. */
  plain: string;
  plainTe: string;
  /** Whether the generated Sankalpam text actually uses this field's value.
   * Only Gotra does today - Veda/Sutra/Sampradaya are collected but not yet
   * inserted into any generated Sankalpam wording, so the UI presents them as
   * optional family-record detail rather than something the puja needs. */
  usedInSankalpam: boolean;
}

export const LINEAGE_FIELDS: readonly LineageFieldMeta[] = [
  {
    key: "gotra",
    label: "Gotra",
    labelTe: "గోత్రం",
    plain: "Gotra means the name of the ancient family line a person belongs to.",
    plainTe: "గోత్రం అంటే ఒక వ్యక్తి చెందిన ప్రాచీన కుటుంబ వంశం పేరు.",
    usedInSankalpam: true,
  },
  {
    key: "veda",
    label: "Veda",
    labelTe: "వేదం",
    plain: "Veda means the branch of scripture a family follows.",
    plainTe: "వేదం అంటే ఒక కుటుంబం అనుసరించే శాస్త్ర శాఖ.",
    usedInSankalpam: false,
  },
  {
    key: "sutra",
    label: "Sutra",
    labelTe: "సూత్రం",
    plain: "Sutra means the set of ritual rules a family follows.",
    plainTe: "సూత్రం అంటే ఒక కుటుంబం అనుసరించే కర్మకాండ నియమాల సమితి.",
    usedInSankalpam: false,
  },
  {
    key: "sampradaya",
    label: "Sampradaya",
    labelTe: "సంప్రదాయం",
    plain: "Sampradaya means the living tradition or school a family belongs to.",
    plainTe: "సంప్రదాయం అంటే ఒక కుటుంబం చెందిన సజీవ సంప్రదాయం లేదా శాఖ.",
    usedInSankalpam: false,
  },
];

export interface LineageStatusOption {
  value: LineageStatus;
  label: string;
  labelTe: string;
}

export const LINEAGE_STATUS_OPTIONS: readonly LineageStatusOption[] = [
  { value: "KNOWN", label: "I know it", labelTe: "నాకు తెలుసు" },
  { value: "UNKNOWN", label: "I don't know", labelTe: "నాకు తెలియదు" },
  { value: "UNSURE", label: "I am not sure", labelTe: "నాకు ఖచ్చితంగా తెలియదు" },
];

export function emptyLineageField(): LineageField {
  return { status: "UNKNOWN", name: "" };
}

/**
 * A fresh, sufficiently-unique participant id. Not a database key - just needs
 * to avoid colliding with another id created in the same browser session, even
 * two created in the same millisecond (for example two fast clicks on "Add
 * another person"). Has no module-level counter, so it is unaffected by a dev
 * hot-reload.
 */
export function createParticipantId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createParticipant(id: string = createParticipantId(), name = ""): Participant {
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

// General-purpose Sankalpam generator.
//
// Not tied to one puja. It takes the current location + local date, the
// Panchanga-derived calendar values, the participants and their KNOWN /
// UNKNOWN / UNSURE lineage, and a purpose, and assembles a WORKED Sankalpam
// DRAFT from the long-published traditional slot structure (see ./sources.ts).
//
// HARD RULES (also in .claude/rules/sacred-content.md):
//   - Lineage is NEVER inferred from a name, surname, place, or the deity. The
//     only inputs to a lineage slot are the participant's own KNOWN value, or
//     an EXPLICIT user choice for an unknown value.
//   - A deity's Gotra is never used as a person's Gotra.
//   - UNKNOWN / UNSURE stay unknown: the slot is omitted and recorded, never
//     filled with a guess.
//   - A tradition-specific fallback (the Kashyapa convention for an unknown
//     Gotra) is offered as a choice only, and only because it is recorded in
//     two sources. It is never applied automatically.
//   - The output is a SOURCED_BETA_CANDIDATE, REVIEW_REQUIRED, and the Telugu
//     script is a beta transcription (transcriptionCheckRequired). It is never
//     presented as priest-approved.

import type { LineageField } from "@/lib/content/participants";

import { SANKALPAM_SOURCES, UNKNOWN_GOTRA_CONVENTION } from "./sources";

export type SankalpamGroupMode = "INDIVIDUAL" | "FAMILY" | "GROUP";
export type PlaceDetail = "COUNTRY_ONLY" | "REGION" | "OMIT";
export type UnknownGotraChoice = "KASHYAPA" | "OMIT" | "FAMILY_TRADITION";
export type GroupRecitation = "COLLECTIVE" | "EACH_INDIVIDUALLY";
export type CalendarForm = "FULL_DATED" | "SHORT";

export interface SankalpamLineage {
  gotra: LineageField;
  veda: LineageField;
  sutra: LineageField;
  sampradaya: LineageField;
}

export interface SankalpamPerson {
  name: string;
  lineage: SankalpamLineage;
}

export interface SankalpamPanchanga {
  samvatsara?: string;
  ayana?: string;
  ritu?: string;
  masa?: string;
  paksha?: string;
  tithi?: string;
  vaara?: string;
  nakshatra?: string;
}

export interface SankalpamChoices {
  placeDetail: PlaceDetail;
  unknownGotra: UnknownGotraChoice | null;
  familyGotra: string;
  groupRecitation: GroupRecitation | null;
  calendarForm: CalendarForm;
}

export interface SankalpamRequest {
  /** Free text: the puja / vrata / karma, e.g. "Vinayaka Chavithi puja". */
  purpose: string;
  /** Optional deity for the "…prityartham" clause, e.g. "Sri Maha Ganapati". */
  deity?: string | null;
  groupMode: SankalpamGroupMode;
  people: SankalpamPerson[];
  place: { country?: string; region?: string; timezone?: string };
  /** Civil date in the location's own time zone (YYYY-MM-DD). */
  localDateISO: string;
  panchanga: SankalpamPanchanga;
  choices?: Partial<SankalpamChoices>;
}

export type SlotStatus =
  | "FILLED"
  | "OMITTED_UNKNOWN"
  | "OMITTED_BY_CHOICE"
  | "NEEDS_CHOICE";

export interface SankalpamSlot {
  key: string;
  label: string;
  value: string;
  /** The phrase inserted into the romanized draft ("" when omitted). */
  phrase: string;
  explanation: string;
  sourceIds: string[];
  status: SlotStatus;
}

export interface GeneratedSankalpam {
  reviewStatus: "REVIEW_REQUIRED";
  betaStatus: "SOURCED_BETA_CANDIDATE";
  transcriptionCheckRequired: true;
  calendarForm: CalendarForm;
  groupMode: SankalpamGroupMode;
  transliteration: string;
  teluguScript: string;
  englishExplanation: string;
  slots: SankalpamSlot[];
  preview: {
    spokenFor: string;
    when: string;
    where: string;
    purpose: string;
    lineageSummary: string;
  };
  openQuestions: string[];
  pendingChoices: string[];
  sources: typeof SANKALPAM_SOURCES;
}

const DEFAULT_CHOICES: SankalpamChoices = {
  placeDetail: "COUNTRY_ONLY",
  unknownGotra: null,
  familyGotra: "",
  groupRecitation: null,
  calendarForm: "FULL_DATED",
};

const S = (...ids: string[]) => ids;

/* -------------------------------------------------------------------------- */
/* small Telugu fragment set for the fixed frame + resolvable terms          */
/* -------------------------------------------------------------------------- */

const TE = {
  open: "శుభే శోభనే ముహూర్తే, శ్రీ మహావిష్ణోరాజ్ఞయా ప్రవర్తమానస్య, అద్య బ్రహ్మణః ద్వితీయ పరార్ధే, శ్వేతవరాహకల్పే, వైవస్వతమన్వంతరే, కలియుగే, ప్రథమపాదే,",
  jambu: "జంబూద్వీపే, భరతవర్షే, భరతఖండే,",
  meru: "మేరోః దక్షిణదిగ్భాగే,",
  present: "అస్మిన్ వర్తమానే వ్యావహారికే, చాంద్రమానేన",
  samvatsara: (v: string) => `${v} నామ సంవత్సరే,`,
  ayana: (v: string) => `${v}నే,`,
  ritu: (v: string) => `${v} ఋతౌ,`,
  masa: (v: string) => `${v} మాసే,`,
  paksha: (v: string) => `${v} పక్షే,`,
  tithi: (v: string) => `${v} తిథౌ,`,
  vaara: (v: string) => `${v} వాసరే,`,
  nakshatra: (v: string) => `${v} నక్షత్రే,`,
  shubha: "శుభతిథౌ,",
  gotra: (g: string) => `${g} గోత్రస్య,`,
  shakha: (v: string) => `${v} శాఖాధ్యాయినః,`,
  sutra: (v: string) => `${v} సూత్రస్య,`,
  sampradaya: (v: string) => `${v} సంప్రదాయస్య,`,
  self: (n: string) => (n ? `${n} నామధేయస్య,` : "మమ,"),
  family: "అస్మాకం సకుటుంబానాం,",
  group: "అస్మాకం,",
  desha: (c: string) => (c ? `${c} దేశే,` : ""),
  region: (r: string) => (r ? `${r} ప్రదేశే,` : ""),
  purpose: (p: string, d?: string | null) =>
    `మమ ఉపాత్త సమస్త దురితక్షయద్వారా ${d ? `${d} ప్రీత్యర్థం ` : ""}${p} కరిష్యే.`,
};

const AYANA_TE: Record<string, string> = {
  Uttarayana: "ఉత్తరాయణ",
  Dakshinayana: "దక్షిణాయ",
};
const PAKSHA_TE: Record<string, string> = {
  Shukla: "శుక్ల",
  Krishna: "కృష్ణ",
};
const VAARA_TE: Record<string, string> = {
  Bhanuvara: "భాను", Somavara: "సోమ", Mangalavara: "మంగళ", Budhavara: "బుధ",
  Guruvara: "గురు", Shukravara: "శుక్ర", Shanivara: "శని",
};

const teOr = (map: Record<string, string>, v: string) => map[v] ?? v;

/* -------------------------------------------------------------------------- */

function lineageInclude(field: LineageField): { include: boolean; value: string } {
  if (field.status === "KNOWN" && field.name.trim()) {
    return { include: true, value: field.name.trim() };
  }
  return { include: false, value: "" };
}

const UNKNOWN_FIELD: LineageField = { status: "UNKNOWN", name: "" };
function safeField(f: LineageField | undefined | null): LineageField {
  if (!f || typeof f.status !== "string") return { ...UNKNOWN_FIELD };
  return { status: f.status, name: typeof f.name === "string" ? f.name : "" };
}
function safeLineage(l: Partial<SankalpamLineage> | undefined | null): SankalpamLineage {
  return {
    gotra: safeField(l?.gotra),
    veda: safeField(l?.veda),
    sutra: safeField(l?.sutra),
    sampradaya: safeField(l?.sampradaya),
  };
}

export function generateSankalpam(req: SankalpamRequest): GeneratedSankalpam {
  req = {
    ...req,
    people: (req.people ?? []).map((p) => ({
      name: typeof p.name === "string" ? p.name : "",
      lineage: safeLineage(p.lineage),
    })),
  };
  const choices: SankalpamChoices = { ...DEFAULT_CHOICES, ...(req.choices ?? {}) };
  const slots: SankalpamSlot[] = [];
  const openQuestions: string[] = [];
  const pendingChoices: string[] = [];
  const romanParts: string[] = [];
  const teParts: string[] = [TE.open, TE.meru, TE.jambu];

  // Fixed cosmological frame (not user data).
  romanParts.push(
    "shubhe shobhane muhurte, Sri Mahavishnor-ajnaya pravartamanasya,",
    "adya Brahmanah dvitiya-parardhe, Sveta-varaha-kalpe, Vaivasvata-manvantare,",
    "Kaliyuge prathama-pade, Jambudvipe, Bharata-varshe, Bharata-khande,",
    "Meroh dakshina-dig-bhage,",
  );

  /* ---- place ---------------------------------------------------------- */
  const country = (req.place.country ?? "").trim();
  const region = (req.place.region ?? "").trim();
  if (choices.placeDetail === "OMIT" || !country) {
    slots.push({
      key: "desha", label: "Place (desha)", value: country || "(country not set)",
      phrase: "", explanation:
        "The place clause stops at 'Bharata-khande'. No city, region, coordinates or " +
        "time zone is written into the Sankalpam.",
      sourceIds: S("drikpanchang-sankalpa"),
      status: country ? "OMITTED_BY_CHOICE" : "OMITTED_UNKNOWN",
    });
    if (!country) openQuestions.push("No country is saved for your location, so no place clause beyond 'Bharata-khande' is written.");
  } else {
    romanParts.push(`${country} deshe,`);
    teParts.push(TE.desha(country));
    slots.push({
      key: "desha", label: "Place (desha)", value: country, phrase: `${country} deshe,`,
      explanation: `Your saved country. Written as the '…deshe' slot after 'Bharata-khande'.`,
      sourceIds: S("pujayagna-sankalpa", "drikpanchang-sankalpa"), status: "FILLED",
    });
    if (choices.placeDetail === "REGION" && region) {
      romanParts.push(`${region} pradeshe,`);
      teParts.push(TE.region(region));
      slots.push({
        key: "pradesha", label: "Region (pradesha)", value: region, phrase: `${region} pradeshe,`,
        explanation:
          "Your saved region, added as a '…pradeshe' slot. Regional wording for a locale " +
          "(river bank, temple town) varies between traditions — confirm with your priest.",
        sourceIds: S("pujayagna-sankalpa"), status: "FILLED",
      });
      openQuestions.push("Regional locale phrasing (e.g. 'Godavari-dakshina-tire') differs by tradition; only the region name is inserted here.");
    }
  }

  /* ---- calendar ------------------------------------------------------- */
  romanParts.push("asmin vartamane vyavaharike, chandramanena,");
  teParts.push(TE.present);

  const calSlots: Array<{
    key: keyof SankalpamPanchanga; label: string;
    roman: (v: string) => string; te: (v: string) => string;
    teMap?: Record<string, string>;
  }> = [
    { key: "samvatsara", label: "Samvatsara (year)", roman: (v) => `${v}-nama-samvatsare,`, te: TE.samvatsara },
    { key: "ayana", label: "Ayana (half-year)", roman: (v) => `${v}e,`, te: (v) => TE.ayana(teOr(AYANA_TE, v)), teMap: AYANA_TE },
    { key: "ritu", label: "Ritu (season)", roman: (v) => `${v}-rutau,`, te: TE.ritu },
    { key: "masa", label: "Masa (month)", roman: (v) => `${v}-mase,`, te: TE.masa },
    { key: "paksha", label: "Paksha (fortnight)", roman: (v) => `${v}-pakshe,`, te: (v) => TE.paksha(teOr(PAKSHA_TE, v)), teMap: PAKSHA_TE },
    { key: "tithi", label: "Tithi (lunar day)", roman: (v) => `${v}-tithau,`, te: TE.tithi },
    { key: "vaara", label: "Vaara (weekday)", roman: (v) => `${v}-vasare,`, te: (v) => TE.vaara(teOr(VAARA_TE, v)), teMap: VAARA_TE },
    { key: "nakshatra", label: "Nakshatra (lunar mansion)", roman: (v) => `${v}-nakshatre,`, te: TE.nakshatra },
  ];

  let anyCalMissing = false;
  const useShort = choices.calendarForm === "SHORT";
  for (const cs of calSlots) {
    const raw = (req.panchanga[cs.key] ?? "").trim();
    if (useShort) {
      slots.push({
        key: cs.key, label: cs.label, value: raw || "(not used)", phrase: "",
        explanation: "Short form chosen — the dated calendar slots are replaced by 'shubhe shobhane muhurte'.",
        sourceIds: S("swayamvaraparvathi-sankalpa"), status: "OMITTED_BY_CHOICE",
      });
      continue;
    }
    if (!raw) {
      anyCalMissing = true;
      slots.push({
        key: cs.key, label: cs.label, value: "(not available)", phrase: "",
        explanation: `The ${cs.label} was not available from the Panchanga for this location and date. It is left out, not guessed.`,
        sourceIds: S("drikpanchang-sankalpa"), status: "OMITTED_UNKNOWN",
      });
      openQuestions.push(`${cs.label} was not available from the Panchanga — confirm the value or use the short form.`);
      continue;
    }
    romanParts.push(cs.roman(raw));
    teParts.push(cs.te(raw));
    slots.push({
      key: cs.key, label: cs.label, value: raw, phrase: cs.roman(raw),
      explanation:
        `From the Panchanga calculated for your location and local date. ` +
        (cs.key === "samvatsara"
          ? "South Indian (Shaka-based) reckoning; the North Indian / Vikrama cycle names a different year."
          : cs.key === "masa"
            ? "The mhah-panchang month name (Purnimanta reckoning). Amanta traditions name the previous month in Krishna paksha."
            : cs.key === "ritu"
              ? "Vedic (lunar-month) ritu; a solar-reckoning panchang may name the adjacent season."
              : "Updated each day it changes."),
      sourceIds: S("drikpanchang-sankalpa", "pujayagna-sankalpa"), status: "FILLED",
    });
  }
  romanParts.push("shubha-tithau,");
  teParts.push(TE.shubha);
  const calendarForm: CalendarForm = useShort || anyCalMissing ? "SHORT" : "FULL_DATED";
  if (anyCalMissing && !useShort) {
    openQuestions.push("One or more calendar slots were unavailable, so the draft is effectively a short form. Confirm whether to recite the full dated Sankalpam with priest-supplied values.");
  }

  /* ---- performer + lineage ------------------------------------------ */
  const people = req.people.filter((p) => p.name.trim().length > 0 || req.groupMode === "INDIVIDUAL");
  const names = people.map((p) => p.name.trim()).filter(Boolean);
  const primary = people[0] ?? { name: "", lineage: emptyLineage() };

  // Gotra — the one lineage slot that always appears in the classic frame.
  const gotraField = primary.lineage.gotra;
  let gotraValue = "";
  let gotraTe = "";
  let gotraStatus: SlotStatus = "FILLED";
  let gotraExplain = "";
  if (gotraField.status === "KNOWN" && gotraField.name.trim()) {
    gotraValue = gotraField.name.trim();
    gotraTe = gotraValue;
    gotraExplain = "The Gotra you entered (KNOWN). Never taken from a name or the deity.";
  } else if (choices.unknownGotra === "KASHYAPA") {
    gotraValue = UNKNOWN_GOTRA_CONVENTION.value;
    gotraTe = UNKNOWN_GOTRA_CONVENTION.valueTelugu;
    gotraExplain =
      `Your Gotra is ${gotraField.status}. You chose the recorded convention ` +
      `${UNKNOWN_GOTRA_CONVENTION.rule}. ${UNKNOWN_GOTRA_CONVENTION.note}`;
  } else if (choices.unknownGotra === "FAMILY_TRADITION" && choices.familyGotra.trim()) {
    gotraValue = choices.familyGotra.trim();
    gotraTe = gotraValue;
    gotraExplain = "The Gotra your family follows, as you entered it. Not from a list and not inferred.";
  } else if (choices.unknownGotra === "OMIT") {
    gotraStatus = "OMITTED_BY_CHOICE";
    gotraExplain = `Your Gotra is ${gotraField.status} and you chose to omit the Gotra line.`;
  } else {
    gotraStatus = "NEEDS_CHOICE";
    gotraExplain =
      `Your Gotra is ${gotraField.status}. Choose how to handle it: the recorded ` +
      `Kashyapa convention, omit the Gotra line, or enter your family's Gotra. ` +
      `It is never chosen for you.`;
    pendingChoices.push("Choose how to state an unknown Gotra: Kashyapa convention / omit the line / enter your family's Gotra.");
  }
  if (gotraStatus === "FILLED") {
    romanParts.push(`${gotraValue}-gotrasya,`);
    teParts.push(TE.gotra(gotraTe));
  }
  slots.push({
    key: "gotra", label: "Gotra", value: gotraValue || `(${gotraField.status.toLowerCase()})`,
    phrase: gotraStatus === "FILLED" ? `${gotraValue}-gotrasya,` : "",
    explanation: gotraExplain,
    sourceIds: gotraValue === UNKNOWN_GOTRA_CONVENTION.value
      ? [...UNKNOWN_GOTRA_CONVENTION.sources]
      : S("drikpanchang-sankalpa"),
    status: gotraStatus,
  });

  // Shakha (from Veda), Sutra, Sampradaya — optional, only when KNOWN.
  const optionalLineage: Array<[keyof SankalpamLineage, string, (v: string) => string, (v: string) => string]> = [
    ["veda", "Shakha (from Veda)", (v) => `${v}-shakhadhyayinah,`, TE.shakha],
    ["sutra", "Sutra", (v) => `${v}-sutrasya,`, TE.sutra],
    ["sampradaya", "Sampradaya", (v) => `${v}-sampradayasya,`, TE.sampradaya],
  ];
  for (const [key, label, roman, te] of optionalLineage) {
    const f = primary.lineage[key];
    const { include, value } = lineageInclude(f);
    if (include) {
      romanParts.push(roman(value));
      teParts.push(te(value));
      slots.push({
        key, label, value, phrase: roman(value),
        explanation: `Your ${label} (KNOWN). Included only because you entered it.`,
        sourceIds: S("pujayagna-sankalpa"), status: "FILLED",
      });
    } else {
      slots.push({
        key, label, value: `(${f.status.toLowerCase()})`, phrase: "",
        explanation: `Your ${label} is ${f.status}. The slot is omitted — never guessed, never taken from a name.`,
        sourceIds: S("pujayagna-sankalpa"),
        status: f.status === "KNOWN" ? "OMITTED_UNKNOWN" : "OMITTED_UNKNOWN",
      });
    }
  }

  /* ---- who it is spoken for --------------------------------------- */
  let spokenForRoman = "";
  let spokenForTe = "";
  let spokenFor = "";
  if (req.groupMode === "FAMILY") {
    spokenForRoman = "asmakam saha kutumbanam,";
    spokenForTe = TE.family;
    spokenFor = names.length ? `${names.join(", ")} and family` : "this family";
  } else if (req.groupMode === "GROUP") {
    if (choices.groupRecitation === "EACH_INDIVIDUALLY") {
      spokenForRoman = "[each member states: <name>-nama-dheyasya, <gotra>-gotrasya,]";
      spokenForTe = "[ప్రతి ఒక్కరూ విడిగా: <పేరు> నామధేయస్య, <గోత్ర> గోత్రస్య,]";
      spokenFor = "each member states the Sankalpam for themselves";
    } else {
      spokenForRoman = "asmakam,";
      spokenForTe = TE.group;
      spokenFor = names.length ? `${names.join(", ")} (together, not as one family)` : "this group";
      if (choices.groupRecitation === null) {
        pendingChoices.push("For an unrelated group, choose: one collective Sankalpam ('asmakam'), or each person states it individually.");
      }
      openQuestions.push("For an unrelated group the family phrase 'saha kutumbanam' is NOT used; the collective 'asmakam' is used instead.");
    }
  } else {
    spokenForRoman = primary.name.trim() ? `${primary.name.trim()}-nama-dheyasya,` : "mama,";
    spokenForTe = TE.self(primary.name.trim());
    spokenFor = primary.name.trim() || "the person performing this puja";
  }
  romanParts.push(spokenForRoman);
  teParts.push(spokenForTe);

  /* ---- purpose --------------------------------------------------- */
  const purpose = req.purpose.trim() || "(purpose not entered)";
  const deity = (req.deity ?? "").trim();
  romanParts.push(
    `mama upatta-samasta-durita-kshaya-dvara ${deity ? `${deity} prityartham ` : ""}${purpose} karishye.`,
  );
  teParts.push(TE.purpose(purpose, deity || null));
  slots.push({
    key: "purpose", label: "Purpose (karma)", value: purpose,
    phrase: `… ${deity ? `${deity} prityartham ` : ""}${purpose} karishye.`,
    explanation:
      `What you are about to do, as you entered it` +
      (deity ? `, offered for the pleasure of ${deity}` : "") +
      `. The deity name is used only in the '…prityartham' clause — never as anyone's Gotra.`,
    sourceIds: S("swayamvaraparvathi-sankalpa", "pujayagna-sankalpa"),
    status: req.purpose.trim() ? "FILLED" : "NEEDS_CHOICE",
  });
  if (!req.purpose.trim()) pendingChoices.push("Enter the purpose (the puja / vrata / karma you are about to perform).");
  if (deity) {
    openQuestions.push("The deity is named only in the '…prityartham' clause. A deity's own Gotra is never used as a performer's Gotra.");
  }

  /* ---- assemble ------------------------------------------------- */
  const transliteration = romanParts.join(" ").replace(/\s+/g, " ").trim();
  const teluguScript = teParts.join(" ").replace(/\s+/g, " ").trim();

  const lineageSummary = summariseLineage(primary.lineage, gotraStatus, gotraValue);
  const when = calendarForm === "FULL_DATED"
    ? `${req.panchanga.samvatsara ?? "?"} ${req.panchanga.masa ?? ""} ${req.panchanga.paksha ?? ""} ${req.panchanga.tithi ?? ""}, ${req.panchanga.vaara ?? ""} (${req.localDateISO})`.replace(/\s+/g, " ").trim()
    : `at this auspicious time (${req.localDateISO}) — short form`;
  const where = choices.placeDetail === "OMIT" || !country
    ? "Bharata-khande (no country/region clause)"
    : choices.placeDetail === "REGION" && region
      ? `${region}, ${country}`
      : country;

  const englishExplanation = buildEnglishExplanation({
    groupMode: req.groupMode, spokenFor, when, where, purpose, deity,
    calendarForm, lineageSummary, openQuestions, pendingChoices,
  });

  return {
    reviewStatus: "REVIEW_REQUIRED",
    betaStatus: "SOURCED_BETA_CANDIDATE",
    transcriptionCheckRequired: true,
    calendarForm,
    groupMode: req.groupMode,
    transliteration,
    teluguScript,
    englishExplanation,
    slots,
    preview: { spokenFor, when, where, purpose, lineageSummary },
    openQuestions: dedupe(openQuestions),
    pendingChoices: dedupe(pendingChoices),
    sources: SANKALPAM_SOURCES,
  };
}

function emptyLineage(): SankalpamLineage {
  const f: LineageField = { status: "UNKNOWN", name: "" };
  return { gotra: { ...f }, veda: { ...f }, sutra: { ...f }, sampradaya: { ...f } };
}

function summariseLineage(
  l: SankalpamLineage, gotraStatus: SlotStatus, gotraValue: string,
): string {
  const bits: string[] = [];
  bits.push(
    gotraStatus === "FILLED"
      ? `Gotra: ${gotraValue}`
      : gotraStatus === "NEEDS_CHOICE"
        ? `Gotra: not chosen yet (${l.gotra.status})`
        : `Gotra: omitted (${l.gotra.status})`,
  );
  for (const [key, label] of [["veda", "Shakha"], ["sutra", "Sutra"], ["sampradaya", "Sampradaya"]] as const) {
    const f = l[key];
    bits.push(f.status === "KNOWN" && f.name.trim() ? `${label}: ${f.name.trim()}` : `${label}: ${f.status.toLowerCase()}`);
  }
  return bits.join(" · ");
}

function buildEnglishExplanation(x: {
  groupMode: SankalpamGroupMode; spokenFor: string; when: string; where: string;
  purpose: string; deity: string; calendarForm: CalendarForm; lineageSummary: string;
  openQuestions: string[]; pendingChoices: string[];
}): string {
  const lines = [
    `This is a DRAFT Sankalpam, assembled from the traditional slot structure ` +
      `(see the sources). It is not priest-approved.`,
    `Spoken for: ${x.spokenFor}` +
      (x.groupMode === "GROUP" ? " — an unrelated group, so the family phrase is not used." : "") +
      (x.groupMode === "FAMILY" ? " — 'with our families'." : "."),
    `When: ${x.when}.` +
      (x.calendarForm === "SHORT" ? " The full dated calendar slots are not all filled, so a short form is used." : ""),
    `Where: ${x.where}. No city, coordinates or time zone is written into the text.`,
    `Purpose: ${x.purpose}${x.deity ? `, for the pleasure of ${x.deity}` : ""}.`,
    `Lineage used: ${x.lineageSummary}. Nothing here was inferred from a name, a place, or the deity.`,
  ];
  if (x.pendingChoices.length) {
    lines.push(`Before you finalise, you still need to: ${x.pendingChoices.map((c) => `\n  • ${c}`).join("")}`);
  }
  if (x.openQuestions.length) {
    lines.push(`Open questions for your priest: ${x.openQuestions.map((q) => `\n  • ${q}`).join("")}`);
  }
  return lines.join("\n");
}

const dedupe = (a: string[]) => [...new Set(a)];

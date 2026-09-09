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
//
// ASSEMBLY RULES (this file):
//   - The Telugu string and the transliteration string are built from ONE list
//     of segments, in the SAME order — segment i's `roman` and `te` are always
//     the same clause.
//   - The Telugu string never contains an untranslated English calendar value.
//     If any calendar term has no Telugu mapping (or a value is missing), a
//     coherent SHORT form is produced for BOTH languages — never a partial
//     mixture.
//   - User-entered values (name, place, family-tradition Gotra, purpose, deity)
//     are marked `userEntered` on their segment and listed in `userValues`.

import type { LineageField } from "@/lib/content/participants";

import { SANKALPAM_SOURCES, UNKNOWN_GOTRA_CONVENTION } from "./sources";
import { renderTerm, allTermsRenderable, type SankalpamTermKind } from "./telugu-terms";
import { defaultSankalpamChoices, type SankalpamChoices, type CalendarForm } from "./choices";

export type {
  SankalpamChoices, PlaceDetail, UnknownGotraChoice, GroupRecitation, CalendarForm,
} from "./choices";

export type SankalpamGroupMode = "INDIVIDUAL" | "FAMILY" | "GROUP";

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
  /** True when `value` is text the user typed / their saved location. */
  userEntered?: boolean;
}

export type SegmentKind =
  | "FRAME"
  | "PLACE"
  | "CALENDAR"
  | "LINEAGE"
  | "PERFORMER"
  | "PURPOSE";

export interface SankalpamSegment {
  /** Transliteration of this clause. */
  roman: string;
  /** Telugu script of the SAME clause (never English). */
  te: string;
  kind: SegmentKind;
  /** True when this clause carries a value the user typed / their location. */
  userEntered: boolean;
  label?: string;
}

export interface GeneratedSankalpam {
  reviewStatus: "REVIEW_REQUIRED";
  betaStatus: "SOURCED_BETA_CANDIDATE";
  transcriptionCheckRequired: true;
  /** The single coherent form produced — never a partial mixture. */
  calendarForm: CalendarForm;
  /** Set when a FULL_DATED form was requested but a coherent one was not
   * possible (missing value or no Telugu mapping), so SHORT was produced. */
  calendarFallbackReason: string | null;
  groupMode: SankalpamGroupMode;
  /** roman[i] and te[i] are the same clause. */
  segments: SankalpamSegment[];
  transliteration: string;
  teluguScript: string;
  /** For the family dynamic-audio experience: index of the last segment BEFORE
   * the "…say the family members' names" pause (the "asmakam saha kutumbanam"
   * segment). -1 when not a family form. Segments 0..familySplitIndex are
   * "part A"; the rest are "part B". */
  familySplitIndex: number;
  englishExplanation: string;
  slots: SankalpamSlot[];
  /** Every value the user supplied that appears in the text. */
  userValues: Array<{ label: string; value: string }>;
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

const S = (...ids: string[]) => ids;

/* -------------------------------------------------------------------------- */
/* Fixed Telugu + transliteration frame fragments                            */
/* -------------------------------------------------------------------------- */

const FRAME = {
  openTe:
    "శుభే శోభనే ముహూర్తే, శ్రీ మహావిష్ణోరాజ్ఞయా ప్రవర్తమానస్య, అద్య బ్రహ్మణః " +
    "ద్వితీయ పరార్ధే, శ్వేతవరాహకల్పే, వైవస్వతమన్వంతరే, కలియుగే, ప్రథమపాదే,",
  openRoman:
    "shubhe shobhane muhurte, Sri Mahavishnor-ajnaya pravartamanasya, adya " +
    "Brahmanah dvitiya-parardhe, Sveta-varaha-kalpe, Vaivasvata-manvantare, " +
    "Kaliyuge prathama-pade,",
  jambuTe: "జంబూద్వీపే, భరతవర్షే, భరతఖండే,",
  jambuRoman: "Jambudvipe, Bharata-varshe, Bharata-khande,",
  meruTe: "మేరోః దక్షిణదిగ్భాగే,",
  meruRoman: "Meroh dakshina-dig-bhage,",
  presentFullTe: "అస్మిన్ వర్తమానే వ్యావహారికే, చాంద్రమానేన,",
  presentFullRoman: "asmin vartamane vyavaharike, chandramanena,",
  presentShortTe: "అస్మిన్ వర్తమానే వ్యావహారికే, శుభతిథౌ శుభముహూర్తే,",
  presentShortRoman: "asmin vartamane vyavaharike, shubha-tithau shubha-muhurte,",
  shubhaTithiTe: "శుభతిథౌ,",
  shubhaTithiRoman: "shubha-tithau,",
  purposeHeadTe: "మమ ఉపాత్త సమస్త దురితక్షయద్వారా",
  purposeHeadRoman: "mama upatta-samasta-durita-kshaya-dvara",
  karishyeTe: "కరిష్యే.",
  karishyeRoman: "karishye.",
  familyTe: "అస్మాకం సహ కుటుంబానాం,",
  familyRoman: "asmakam saha kutumbanam,",
  groupTe: "అస్మాకం,",
  groupRoman: "asmakam,",
  mamaTe: "మమ,",
  mamaRoman: "mama,",
  namePromptTe: "ఇప్పుడు కుటుంబ సభ్యుల పేర్లు చెప్పండి",
  namePromptRoman: "ippudu kutumba sabhyula perlu cheppandi",
} as const;

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
  const choices: SankalpamChoices = { ...defaultSankalpamChoices(), ...(req.choices ?? {}) };
  const slots: SankalpamSlot[] = [];
  const openQuestions: string[] = [];
  const pendingChoices: string[] = [];
  const segments: SankalpamSegment[] = [];
  const userValues: Array<{ label: string; value: string }> = [];

  const push = (roman: string, te: string, kind: SegmentKind, userEntered = false, label?: string) => {
    segments.push({ roman: roman.trim(), te: te.trim(), kind, userEntered, label });
  };

  /* ---- decide the ONE coherent form -------------------------------- */
  const p = req.panchanga;
  const calValues: Array<[SankalpamTermKind, string]> = [
    ["samvatsara", (p.samvatsara ?? "").trim()],
    ["ayana", (p.ayana ?? "").trim()],
    ["ritu", (p.ritu ?? "").trim()],
    ["masa", (p.masa ?? "").trim()],
    ["paksha", (p.paksha ?? "").trim()],
    ["tithi", (p.tithi ?? "").trim()],
    ["vaara", (p.vaara ?? "").trim()],
    ["nakshatra", (p.nakshatra ?? "").trim()],
  ];
  const missing = calValues.filter(([, v]) => !v).map(([k]) => k);
  const unrenderable = calValues
    .filter(([k, v]) => v && !renderTerm(k, v).matched)
    .map(([k]) => k);
  const canFullDated = missing.length === 0 && unrenderable.length === 0 && allTermsRenderable(p);

  let calendarFallbackReason: string | null = null;
  let calendarForm: CalendarForm;
  if (choices.calendarForm === "SHORT") {
    calendarForm = "SHORT";
  } else if (canFullDated) {
    calendarForm = "FULL_DATED";
  } else {
    calendarForm = "SHORT";
    if (missing.length) {
      calendarFallbackReason =
        `A full dated Sankalpam was requested, but the Panchanga did not supply: ` +
        `${missing.join(", ")}. A coherent short form is used instead (no partial dating).`;
    } else {
      calendarFallbackReason =
        `A full dated Sankalpam was requested, but no Telugu form is mapped for: ` +
        `${unrenderable.join(", ")}. A coherent short form is used for both languages.`;
    }
    openQuestions.push(calendarFallbackReason);
  }

  /* ---- 1. cosmological frame ------------------------------------- */
  push(FRAME.openRoman, FRAME.openTe, "FRAME");
  push(FRAME.jambuRoman, FRAME.jambuTe, "FRAME");
  push(FRAME.meruRoman, FRAME.meruTe, "FRAME");

  /* ---- 2. place ------------------------------------------------- */
  const country = (req.place.country ?? "").trim();
  const region = (req.place.region ?? "").trim();
  if (choices.placeDetail === "OMIT" || !country) {
    slots.push({
      key: "desha", label: "Place (desha)", value: country || "(country not set)",
      phrase: "", userEntered: Boolean(country),
      explanation:
        "The place clause stops at 'Bharata-khande'. No city, region, coordinates or " +
        "time zone is written into the Sankalpam.",
      sourceIds: S("drikpanchang-sankalpa"),
      status: country ? "OMITTED_BY_CHOICE" : "OMITTED_UNKNOWN",
    });
    if (!country) {
      openQuestions.push("No country is saved for your location, so no place clause beyond 'Bharata-khande' is written.");
    }
  } else {
    push(`«${country}» deshe,`, `«${country}» దేశే,`, "PLACE", true, "Place (country)");
    userValues.push({ label: "Country (from your saved location)", value: country });
    slots.push({
      key: "desha", label: "Place (desha)", value: country, phrase: `«${country}» deshe,`,
      userEntered: true,
      explanation: `Your saved country, marked as a value you supplied. Written as the '…deshe' slot after 'Bharata-khande'.`,
      sourceIds: S("pujayagna-sankalpa", "drikpanchang-sankalpa"), status: "FILLED",
    });
    if (choices.placeDetail === "REGION" && region) {
      push(`«${region}» pradeshe,`, `«${region}» ప్రదేశే,`, "PLACE", true, "Place (region)");
      userValues.push({ label: "Region (from your saved location)", value: region });
      slots.push({
        key: "pradesha", label: "Region (pradesha)", value: region, phrase: `«${region}» pradeshe,`,
        userEntered: true,
        explanation:
          "Your saved region, marked as a value you supplied. Regional wording for a locale " +
          "(river bank, temple town) varies between traditions — confirm with your priest.",
        sourceIds: S("pujayagna-sankalpa"), status: "FILLED",
      });
      openQuestions.push("Regional locale phrasing (e.g. 'Godavari-dakshina-tire') differs by tradition; only the region name is inserted here.");
    }
  }

  /* ---- 3. calendar (one coherent form) ------------------------- */
  if (calendarForm === "FULL_DATED") {
    push(FRAME.presentFullRoman, FRAME.presentFullTe, "FRAME");
    const calSlots: Array<{ key: SankalpamTermKind; label: string; roman: (v: string) => string; teSuffix: string }> = [
      { key: "samvatsara", label: "Samvatsara (year)", roman: (v) => `${v}-nama-samvatsare,`, teSuffix: " నామ సంవత్సరే," },
      { key: "ayana", label: "Ayana (half-year)", roman: (v) => `${v.replace(/a$/i, "")}e,`, teSuffix: "ే," },
      { key: "ritu", label: "Ritu (season)", roman: (v) => `${v}-rutau,`, teSuffix: " ఋతౌ," },
      { key: "masa", label: "Masa (month)", roman: (v) => `${v}-mase,`, teSuffix: " మాసే," },
      { key: "paksha", label: "Paksha (fortnight)", roman: (v) => `${v}-pakshe,`, teSuffix: " పక్షే," },
      { key: "tithi", label: "Tithi (lunar day)", roman: (v) => `${v}-tithau,`, teSuffix: " తిథౌ," },
      { key: "vaara", label: "Vaara (weekday)", roman: (v) => `${v}-vasare,`, teSuffix: " వాసరే," },
      { key: "nakshatra", label: "Nakshatra (lunar mansion)", roman: (v) => `${v}-nakshatre,`, teSuffix: " నక్షత్రే," },
    ];
    for (const cs of calSlots) {
      const raw = (req.panchanga[cs.key] ?? "").trim();
      const { te } = renderTerm(cs.key, raw);
      push(cs.roman(raw), `${te}${cs.teSuffix}`, "CALENDAR", false, cs.label);
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
    push(FRAME.shubhaTithiRoman, FRAME.shubhaTithiTe, "FRAME");
  } else {
    push(FRAME.presentShortRoman, FRAME.presentShortTe, "FRAME");
    for (const [key, label] of [
      ["samvatsara", "Samvatsara (year)"], ["ayana", "Ayana (half-year)"], ["ritu", "Ritu (season)"],
      ["masa", "Masa (month)"], ["paksha", "Paksha (fortnight)"], ["tithi", "Tithi (lunar day)"],
      ["vaara", "Vaara (weekday)"], ["nakshatra", "Nakshatra (lunar mansion)"],
    ] as const) {
      const raw = (req.panchanga[key] ?? "").trim();
      slots.push({
        key, label, value: raw || "(not used)", phrase: "",
        explanation:
          choices.calendarForm === "SHORT"
            ? "Short form chosen — the dated calendar slots are replaced by 'shubhe shobhane muhurte'."
            : `Short form used: ${calendarFallbackReason ?? "the dated calendar could not be assembled coherently."}`,
        sourceIds: S("swayamvaraparvathi-sankalpa"),
        status: "OMITTED_BY_CHOICE",
      });
    }
  }

  /* ---- 4. gotra ---------------------------------------------- */
  const people = req.people.filter((x) => x.name.trim().length > 0 || req.groupMode === "INDIVIDUAL");
  const names = people.map((x) => x.name.trim()).filter(Boolean);
  const primary = people[0] ?? { name: "", lineage: emptyLineage() };
  const gotraField = primary.lineage.gotra;
  let gotraValue = "";
  let gotraTe = "";
  let gotraStatus: SlotStatus = "FILLED";
  let gotraUserEntered = false;
  let gotraExplain = "";
  if (gotraField.status === "KNOWN" && gotraField.name.trim()) {
    gotraValue = gotraField.name.trim();
    gotraTe = gotraValue;
    gotraUserEntered = true;
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
    gotraUserEntered = true;
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
    const mark = gotraUserEntered ? "«" : "";
    const markEnd = gotraUserEntered ? "»" : "";
    push(`${mark}${gotraValue}${markEnd}-gotrasya,`, `${mark}${gotraTe}${markEnd} గోత్రస్య,`, "LINEAGE", gotraUserEntered, "Gotra");
    if (gotraUserEntered) userValues.push({ label: "Gotra (as you entered it)", value: gotraValue });
  }
  slots.push({
    key: "gotra", label: "Gotra", value: gotraValue || `(${gotraField.status.toLowerCase()})`,
    phrase: gotraStatus === "FILLED" ? `${gotraValue}-gotrasya,` : "",
    userEntered: gotraUserEntered,
    explanation: gotraExplain,
    sourceIds: gotraValue === UNKNOWN_GOTRA_CONVENTION.value
      ? [...UNKNOWN_GOTRA_CONVENTION.sources]
      : S("drikpanchang-sankalpa"),
    status: gotraStatus,
  });

  /* ---- 5. shakha / sutra / sampradaya (only when KNOWN) ----- */
  const optionalLineage: Array<[keyof SankalpamLineage, string, (v: string) => string, string]> = [
    ["veda", "Shakha (from Veda)", (v) => `«${v}»-shakhadhyayinah,`, " శాఖాధ్యాయినః,"],
    ["sutra", "Sutra", (v) => `«${v}»-sutrasya,`, " సూత్రస్య,"],
    ["sampradaya", "Sampradaya", (v) => `«${v}»-sampradayasya,`, " సంప్రదాయస్య,"],
  ];
  for (const [key, label, roman, teSuffix] of optionalLineage) {
    const f = primary.lineage[key];
    const { include, value } = lineageInclude(f);
    if (include) {
      push(roman(value), `«${value}»${teSuffix}`, "LINEAGE", true, label);
      userValues.push({ label: `${label} (as you entered it)`, value });
      slots.push({
        key, label, value, phrase: roman(value), userEntered: true,
        explanation: `Your ${label} (KNOWN). Included only because you entered it.`,
        sourceIds: S("pujayagna-sankalpa"), status: "FILLED",
      });
    } else {
      slots.push({
        key, label, value: `(${f.status.toLowerCase()})`, phrase: "", userEntered: false,
        explanation: `Your ${label} is ${f.status}. The slot is omitted — never guessed, never taken from a name.`,
        sourceIds: S("pujayagna-sankalpa"), status: "OMITTED_UNKNOWN",
      });
    }
  }

  /* ---- 6. performer / who it is spoken for ------------------ */
  let spokenFor = "";
  let familySplitIndex = -1;
  if (req.groupMode === "FAMILY") {
    push(FRAME.familyRoman, FRAME.familyTe, "PERFORMER", false, "Spoken for (family)");
    familySplitIndex = segments.length - 1;
    spokenFor = names.length ? `${names.join(", ")} and family` : "this family";
  } else if (req.groupMode === "GROUP") {
    if (choices.groupRecitation === "EACH_INDIVIDUALLY") {
      push(
        "[each member states: <name>-nama-dheyasya, <gotra>-gotrasya,]",
        "[ప్రతి ఒక్కరూ విడిగా: <పేరు> నామధేయస్య, <గోత్ర> గోత్రస్య,]",
        "PERFORMER", false, "Spoken for (each individually)",
      );
      spokenFor = "each member states the Sankalpam for themselves";
    } else {
      push(FRAME.groupRoman, FRAME.groupTe, "PERFORMER", false, "Spoken for (group)");
      spokenFor = names.length ? `${names.join(", ")} (together, not as one family)` : "this group";
      if (choices.groupRecitation === null) {
        pendingChoices.push("For an unrelated group, choose: one collective Sankalpam ('asmakam'), or each person states it individually.");
      }
      openQuestions.push("For an unrelated group the family phrase 'saha kutumbanam' is NOT used; the collective 'asmakam' is used instead.");
    }
  } else {
    if (primary.name.trim()) {
      push(`«${primary.name.trim()}»-nama-dheyasya,`, `«${primary.name.trim()}» నామధేయస్య,`, "PERFORMER", true, "Name");
      userValues.push({ label: "Name (as you entered it)", value: primary.name.trim() });
      spokenFor = primary.name.trim();
    } else {
      push(FRAME.mamaRoman, FRAME.mamaTe, "PERFORMER", false, "Spoken for (self)");
      spokenFor = "the person performing this puja";
    }
  }

  /* ---- 7. purpose ----------------------------------------- */
  const purpose = req.purpose.trim() || "(purpose not entered)";
  const deity = (req.deity ?? "").trim();
  const purposeRoman =
    `${FRAME.purposeHeadRoman} ${deity ? `«${deity}» prityartham ` : ""}«${purpose}» ${FRAME.karishyeRoman}`;
  const purposeTe =
    `${FRAME.purposeHeadTe} ${deity ? `«${deity}» ప్రీత్యర్థం ` : ""}«${purpose}» ${FRAME.karishyeTe}`;
  push(purposeRoman, purposeTe, "PURPOSE", true, "Purpose");
  userValues.push({ label: "Purpose (as you entered it)", value: purpose });
  if (deity) userValues.push({ label: "Deity (as you entered it)", value: deity });
  slots.push({
    key: "purpose", label: "Purpose (karma)", value: purpose,
    phrase: `… ${deity ? `«${deity}» prityartham ` : ""}«${purpose}» karishye.`,
    userEntered: true,
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

  /* ---- assemble ---------------------------------------- */
  const transliteration = segments.map((s) => s.roman).join(" ").replace(/\s+/g, " ").trim();
  const teluguScript = segments.map((s) => s.te).join(" ").replace(/\s+/g, " ").trim();

  const lineageSummary = summariseLineage(primary.lineage, gotraStatus, gotraValue);
  const when = calendarForm === "FULL_DATED"
    ? `${p.samvatsara} · ${p.masa} ${p.paksha} ${p.tithi} · ${p.vaara}, ${p.nakshatra} nakshatra (${req.localDateISO})`
    : `at this auspicious time — short form (${req.localDateISO})`;
  const where = choices.placeDetail === "OMIT" || !country
    ? "Bharata-khande (no country/region clause)"
    : choices.placeDetail === "REGION" && region
      ? `${region}, ${country}`
      : country;

  const englishExplanation = buildEnglishExplanation({
    groupMode: req.groupMode, spokenFor, when, where, purpose, deity,
    calendarForm, calendarFallbackReason, lineageSummary, openQuestions, pendingChoices,
    userValues,
  });

  return {
    reviewStatus: "REVIEW_REQUIRED",
    betaStatus: "SOURCED_BETA_CANDIDATE",
    transcriptionCheckRequired: true,
    calendarForm,
    calendarFallbackReason,
    groupMode: req.groupMode,
    segments,
    transliteration,
    teluguScript,
    familySplitIndex,
    englishExplanation,
    slots,
    userValues: dedupeValues(userValues),
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
  purpose: string; deity: string; calendarForm: CalendarForm;
  calendarFallbackReason: string | null; lineageSummary: string;
  openQuestions: string[]; pendingChoices: string[];
  userValues: Array<{ label: string; value: string }>;
}): string {
  const lines = [
    `This is a DRAFT Sankalpam, assembled from the traditional slot structure ` +
      `(see the sources). It is not priest-approved.`,
    `Form: ${x.calendarForm === "FULL_DATED" ? "full dated" : "short"}` +
      (x.calendarFallbackReason ? ` — ${x.calendarFallbackReason}` : "."),
    `Spoken for: ${x.spokenFor}` +
      (x.groupMode === "GROUP" ? " — an unrelated group, so the family phrase is not used." : "") +
      (x.groupMode === "FAMILY" ? " — 'with our families'." : "."),
    `When: ${x.when}.`,
    `Where: ${x.where}. No city, coordinates or time zone is written into the text.`,
    `Purpose: ${x.purpose}${x.deity ? `, for the pleasure of ${x.deity}` : ""}.`,
    `Lineage used: ${x.lineageSummary}. Nothing here was inferred from a name, a place, or the deity.`,
  ];
  if (x.userValues.length) {
    lines.push(
      `Values you entered (shown between « » in the text): ` +
        x.userValues.map((v) => `\n  • ${v.label}: «${v.value}»`).join(""),
    );
  }
  if (x.pendingChoices.length) {
    lines.push(`Before you finalise, you still need to: ${x.pendingChoices.map((c) => `\n  • ${c}`).join("")}`);
  }
  if (x.openQuestions.length) {
    lines.push(`Open questions for your priest: ${x.openQuestions.map((q) => `\n  • ${q}`).join("")}`);
  }
  return lines.join("\n");
}

const dedupe = (a: string[]) => [...new Set(a)];
function dedupeValues(a: Array<{ label: string; value: string }>) {
  const seen = new Set<string>();
  return a.filter((v) => {
    const k = `${v.label}=${v.value}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

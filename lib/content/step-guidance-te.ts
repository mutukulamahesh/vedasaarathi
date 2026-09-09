// Telugu plain-language guidance for the guided-puja screen.
//
// SCOPE AND RULES
// - This module holds ONLY plain instruction, interface labels, and honest
//   status notes. It contains no mantra, no canonical Sankalpam wording, and
//   no ritual ruling. The sourced Telugu mantras in lib/pujas/vinayaka are the
//   authority for canonical text and are never touched here.
// - The per-step guidance below is provided for the two practical, non-
//   religious lead-in steps only (get-ready, light-lamp). For every sourced
//   candidate step the Telugu guidance is intentionally absent: the screen
//   falls back to the English draft and shows TE_GUIDANCE_PENDING_NOTE so the
//   family is told plainly that a Telugu translation is still being prepared
//   by a reviewer. Nothing here is presented as verified or priest-approved.
// - UI_TE is interface chrome (buttons, section headings, disclosure labels).

export type GuidanceLanguage = "EN" | "TE";

/** Interface strings. `key` is the English label already used in the screen. */
export const UI_TE: Readonly<Record<string, string>> = {
  "What to keep ready": "ఏమి సిద్ధంగా ఉంచుకోవాలి",
  "What to do": "ఏమి చేయాలి",
  "More about this step": "ఈ దశ గురించి మరింత",
  "What this step is": "ఈ దశ అంటే ఏమిటి",
  "Why we do it": "ఎందుకు చేస్తాము",
  Mantra: "మంత్రం",
  "Show the romanised reading": "రోమన్ లిపి చదవడం చూపించు",
  "Nothing extra for this step — use what is already in your puja space.":
    "ఈ దశకు అదనంగా ఏమీ అవసరం లేదు — మీ పూజా స్థలంలో ఉన్నవే వాడండి.",
  "Listen to plain instructions": "సాధారణ సూచనలు వినండి",
  Replay: "మళ్ళీ వినండి",
  Pause: "ఆపండి",
  Resume: "కొనసాగించండి",
  Stop: "నిలిపివేయి",
  Previous: "వెనుకకు",
  "Done, next": "పూర్తయింది, తర్వాత",
  "Finish puja": "పూజ ముగించండి",
  "Simple + Complete": "సరళం + పూర్తి",
  "Complete path": "పూర్తి మార్గం",
  English: "English",
};

/** Look up an interface string; falls back to the English label itself. */
export function uiText(englishLabel: string, language: GuidanceLanguage): string {
  if (language !== "TE") return englishLabel;
  return UI_TE[englishLabel] ?? englishLabel;
}

export interface StepGuidanceTe {
  /** Telugu "what to do" for this step, when a reviewed translation exists. */
  whatToDo?: string;
  /** Telugu "what this step is" / meaning, when it exists. */
  meaning?: string;
}

/**
 * Telugu guidance keyed by RitualStep.id. Present only for the two practical,
 * non-religious preparation steps. Absent (→ English fallback + pending note)
 * for every sourced candidate step, by design.
 */
const STEP_GUIDANCE_TE: Readonly<Record<string, StepGuidanceTe>> = {
  "get-ready": {
    whatToDo:
      "గణేశుడి విగ్రహాన్ని లేదా చిత్రాన్ని శుభ్రమైన, స్థిరమైన స్థలంలో ఉంచండి. " +
      "నీళ్ళు, చెంచా, ఒక పళ్ళెం, పువ్వులు, నైవేద్యం చేతికి అందేలా పెట్టుకోండి. " +
      "పిల్లలను దీపం నుండి దూరంగా కూర్చోబెట్టండి.",
    meaning:
      "ముందుగా అన్నీ సిద్ధం చేసుకుంటే, పూజ మధ్యలో తొందరపడాల్సిన అవసరం ఉండదు.",
  },
  "light-lamp": {
    whatToDo:
      "పెద్దవారు విగ్రహానికి దగ్గరగా — తాకకుండా — దీపం వెలిగించండి. " +
      "మంటను పిల్లలు, జుట్టు, బట్టల నుండి దూరంగా ఉంచండి.",
    meaning:
      "దీపం పూజ ప్రారంభాన్ని సూచిస్తుంది; అందరూ కుదురుకోవడానికి సహాయపడుతుంది.",
  },
};

export function stepGuidanceTe(stepId: string): StepGuidanceTe | null {
  return STEP_GUIDANCE_TE[stepId] ?? null;
}

/** Shown when the family asked for Telugu but this step's Telugu plain guidance
 * is still being translated. English is shown in the meantime. */
export const TE_GUIDANCE_PENDING_NOTE =
  "తెలుగు వివరణ ఇంకా సిద్ధమవుతోంది. ప్రస్తుతానికి ఆంగ్ల వివరణ చూపబడుతోంది. " +
  "(Telugu plain-language guidance for this step is still being prepared; " +
  "showing English for now. The mantra itself is unchanged.)";

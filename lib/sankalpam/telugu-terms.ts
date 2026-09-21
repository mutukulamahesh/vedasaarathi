// Telugu-script forms for the calendar terms the Sankalpam generator inserts.
//
// The Panchanga engine yields romanised / English-India names (e.g. "Parabhava",
// "Bhadraba", "Chavithi", "Somavara"). This module maps each to its Telugu
// script so the assembled Telugu Sankalpam never carries an untranslated
// English calendar value. If a term is NOT in a map, renderTerm() returns
// { matched: false } and the generator drops to the coherent SHORT form for
// BOTH languages rather than mixing scripts.
//
// The maps use the standard Telugu Ugadi samvatsara names and the everyday
// Telugu Panchangam vocabulary. The assembled Sankalpam remains a
// SOURCED_BETA_CANDIDATE beta transcription (see generator.ts).

const strip = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** 60 samvatsara names, index-aligned with lib/panchanga engine's
 * SAMVATSARA_NAMES (Prabhava = 1). */
const SAMVATSARA_TE: Record<string, string> = {
  prabhava: "ప్రభవ", vibhava: "విభవ", shukla: "శుక్ల", pramoda: "ప్రమోదూత",
  prajapati: "ప్రజోత్పత్తి", angirasa: "ఆంగీరస", shrimukha: "శ్రీముఖ", bhava: "భావ",
  yuva: "యువ", dhata: "ధాత", ishvara: "ఈశ్వర", bahudhanya: "బహుధాన్య",
  pramathi: "ప్రమాది", vikrama: "విక్రమ", vrisha: "వృష", chitrabhanu: "చిత్రభాను",
  svabhanu: "స్వభాను", tarana: "తారణ", parthiva: "పార్థివ", vyaya: "వ్యయ",
  sarvajit: "సర్వజిత్తు", sarvadhari: "సర్వధారి", virodhi: "విరోధి", vikrita: "వికృతి",
  khara: "ఖర", nandana: "నందన", vijaya: "విజయ", jaya: "జయ", manmatha: "మన్మథ",
  durmukha: "దుర్ముఖి", hevilambi: "హేవిళంబి", vilambi: "విళంబి", vikari: "వికారి",
  sharvari: "శార్వరి", plava: "ప్లవ", shubhakrit: "శుభకృత్తు", shobhakrit: "శోభకృత్తు",
  krodhi: "క్రోధి", vishvavasu: "విశ్వావసు", parabhava: "పరాభవ", plavanga: "ప్లవంగ",
  kilaka: "కీలక", saumya: "సౌమ్య", sadharana: "సాధారణ", virodhikrit: "విరోధికృత్తు",
  paridhavi: "పరిధావి", pramadi: "ప్రమాదీచ", ananda: "ఆనంద", rakshasa: "రాక్షస",
  nala: "నల", pingala: "పింగళ", kalayukta: "కాళయుక్తి", siddharthi: "సిద్ధార్థి",
  raudra: "రౌద్రి", durmati: "దుర్మతి", dundubhi: "దుందుభి", rudhirodgari: "రుధిరోద్గారి",
  raktakshi: "రక్తాక్షి", krodhana: "క్రోధన", akshaya: "అక్షయ",
};

const AYANA_TE: Record<string, string> = {
  uttarayana: "ఉత్తరాయణ", dakshinayana: "దక్షిణాయన",
};

const RITU_TE: Record<string, string> = {
  vasanta: "వసంత", grishma: "గ్రీష్మ", varsha: "వర్ష",
  sharad: "శరద్", hemanta: "హేమంత", shishira: "శిశిర",
};

/** Lunar months. Keys cover both Sanskrit and the mhah-panchang (Odia-style)
 * spellings the engine actually emits. */
const MASA_TE: Record<string, string> = {
  chaitra: "చైత్ర", chaitraba: "చైత్ర",
  vaishakha: "వైశాఖ", baisakha: "వైశాఖ",
  jyeshtha: "జ్యేష్ఠ", jyestha: "జ్యేష్ఠ",
  ashadha: "ఆషాఢ", asadha: "ఆషాఢ",
  shravana: "శ్రావణ", sraabana: "శ్రావణ", sravana: "శ్రావణ",
  bhadrapada: "భాద్రపద", bhadraba: "భాద్రపద",
  ashwina: "ఆశ్వయుజ", aswina: "ఆశ్వయుజ", ashvina: "ఆశ్వయుజ",
  kartika: "కార్తీక", karttika: "కార్తీక",
  margashirsha: "మార్గశిర", margasira: "మార్గశిర",
  pushya: "పుష్య", pausa: "పుష్య", pausha: "పుష్య",
  magha: "మాఘ",
  phalguna: "ఫాల్గుణ", falguna: "ఫాల్గుణ",
};

const PAKSHA_TE: Record<string, string> = {
  shukla: "శుక్ల", krishna: "కృష్ణ", bahula: "కృష్ణ",
};

const VAARA_TE: Record<string, string> = {
  // engine Sanskrit weekday names
  bhanuvara: "భాను", ravivara: "భాను",
  somavara: "సోమ",
  mangalavara: "మంగళ",
  budhavara: "బుధ",
  guruvara: "గురు", brihaspativara: "గురు",
  shukravara: "శుక్ర",
  shanivara: "శని",
  // English weekday fallbacks
  sunday: "భాను", monday: "సోమ", tuesday: "మంగళ", wednesday: "బుధ",
  thursday: "గురు", friday: "శుక్ర", saturday: "శని",
};

/** Tithi. Keyed by the engine's normalised tithi key (see tithiKey) and by
 * common raw spellings. */
const TITHI_TE: Record<string, string> = {
  prathama: "పాడ్యమి", padyami: "పాడ్యమి", pratipada: "పాడ్యమి",
  dwitiya: "విదియ", dvitiya: "విదియ", vidhiya: "విదియ",
  tritiya: "తదియ", thadiya: "తదియ",
  chaturthi: "చవితి", chavithi: "చవితి", chaviti: "చవితి",
  panchami: "పంచమి",
  shashthi: "షష్ఠి", shasti: "షష్ఠి",
  saptami: "సప్తమి", sapthami: "సప్తమి",
  ashtami: "అష్టమి",
  navami: "నవమి",
  dashami: "దశమి", dasami: "దశమి",
  ekadashi: "ఏకాదశి", ekadasi: "ఏకాదశి",
  dwadashi: "ద్వాదశి", dvadashi: "ద్వాదశి", dvadasi: "ద్వాదశి",
  trayodashi: "త్రయోదశి", trayodasi: "త్రయోదశి",
  chaturdashi: "చతుర్దశి", chaturdasi: "చతుర్దశి",
  purnima: "పౌర్ణమి", punnami: "పౌర్ణమి",
  amavasya: "అమావాస్య",
};

/** 27 nakshatras. Keyed by the engine's likely name_en_IN and common variants. */
const NAKSHATRA_TE: Record<string, string> = {
  ashwini: "అశ్విని", ashvini: "అశ్విని",
  bharani: "భరణి",
  krittika: "కృత్తిక", kritika: "కృత్తిక",
  rohini: "రోహిణి",
  mrigashira: "మృగశిర", mrigasira: "మృగశిర", mrighasira: "మృగశిర", mrigashirsha: "మృగశిర",
  ardra: "ఆరుద్ర", aardra: "ఆరుద్ర",
  punarvasu: "పునర్వసు",
  pushya: "పుష్యమి", pushyami: "పుష్యమి",
  ashlesha: "ఆశ్లేష", aslesha: "ఆశ్లేష",
  magha: "మఖ", makha: "మఖ",
  "purva phalguni": "పుబ్బ", "poorva phalguni": "పుబ్బ", pubba: "పుబ్బ",
  "uttara phalguni": "ఉత్తర", uttara: "ఉత్తర",
  hasta: "హస్త",
  chitra: "చిత్త", chitta: "చిత్త",
  swati: "స్వాతి", svati: "స్వాతి",
  vishakha: "విశాఖ", visakha: "విశాఖ",
  anuradha: "అనూరాధ",
  jyeshtha: "జ్యేష్ఠ", jyeshta: "జ్యేష్ఠ",
  mula: "మూల", moola: "మూల",
  "purva ashadha": "పూర్వాషాఢ", "poorvashada": "పూర్వాషాఢ",
  "uttara ashadha": "ఉత్తరాషాఢ", "uttarashada": "ఉత్తరాషాఢ",
  shravana: "శ్రవణం", sravana: "శ్రవణం",
  dhanishta: "ధనిష్ఠ", dhanistha: "ధనిష్ఠ",
  shatabhisha: "శతభిషం", satabhisha: "శతభిషం",
  "purva bhadrapada": "పూర్వాభాద్ర", "uttara bhadrapada": "ఉత్తరాభాద్ర",
  revati: "రేవతి", rebati: "రేవతి",
};

const MAPS = {
  samvatsara: SAMVATSARA_TE,
  ayana: AYANA_TE,
  ritu: RITU_TE,
  masa: MASA_TE,
  paksha: PAKSHA_TE,
  vaara: VAARA_TE,
  tithi: TITHI_TE,
  nakshatra: NAKSHATRA_TE,
} as const;

export type SankalpamTermKind = keyof typeof MAPS;

/** Telugu-script form of a calendar term, or { matched:false } when unknown.
 * The generator uses `matched` to decide whether a coherent full-dated form is
 * possible; it never inserts the romanised string into Telugu. */
export function renderTerm(kind: SankalpamTermKind, romanized: string): { te: string; matched: boolean } {
  const key = strip(romanized);
  const direct = MAPS[kind][key];
  if (direct) return { te: direct, matched: true };
  // tolerate a trailing/leading token difference for two-word nakshatras
  if (kind === "nakshatra") {
    const first = key.split(" ")[0];
    if (MAPS.nakshatra[first]) return { te: MAPS.nakshatra[first], matched: true };
  }
  return { te: "", matched: false };
}

/** All eight calendar values render to Telugu (⇒ a coherent full-dated Telugu
 * Sankalpam is possible). */
export function allTermsRenderable(p: {
  samvatsara?: string; ayana?: string; ritu?: string; masa?: string;
  paksha?: string; tithi?: string; vaara?: string; nakshatra?: string;
}): boolean {
  const kinds: SankalpamTermKind[] = [
    "samvatsara", "ayana", "ritu", "masa", "paksha", "tithi", "vaara", "nakshatra",
  ];
  return kinds.every((k) => {
    const v = (p[k] ?? "").trim();
    return v.length > 0 && renderTerm(k, v).matched;
  });
}

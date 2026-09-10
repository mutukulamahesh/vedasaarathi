// General-purpose Sankalpam generator — public surface.

export {
  generateSankalpam,
  type SankalpamRequest,
  type GeneratedSankalpam,
  type SankalpamPerson,
  type SankalpamLineage,
  type SankalpamPanchanga,
  type SankalpamGroupMode,
  type SankalpamChoices,
  type SankalpamSlot,
  type SankalpamSegment,
  type SegmentKind,
  type PlaceDetail,
  type UnknownGotraChoice,
  type GroupRecitation,
  type CalendarForm,
  type ParticipantGotraChoice,
} from "./generator";
export { renderTerm, allTermsRenderable, type SankalpamTermKind } from "./telugu-terms";
export { SANKALPAM_SOURCES, UNKNOWN_GOTRA_CONVENTION, type SankalpamSource } from "./sources";
export { defaultSankalpamChoices, parseSankalpamChoices } from "./choices";
export {
  FAMILY_SANKALPAM_AUDIO, familyAudioMatchesGen, STANDARD_SHORT_FAMILY_CHOICES,
} from "./family-audio";
export {
  buildSankalpamRequest, panchangaToSlots, localCivilDate, canonicalKarmaForSlug,
} from "./from-app";

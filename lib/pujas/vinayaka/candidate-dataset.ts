// The whole Vinayaka Chavithi review candidate, assembled in one place for
// the reviewer UI and the tests. Everything here is REVIEW_REQUIRED and
// locked; FAMILY_BETA never sees any of it (see the review gate).

import {
  CANDIDATE_CONTENT_VERSION, CANDIDATE_PUJA_STEPS, CANDIDATE_STEP_COUNT,
  candidateStep, candidateStepsInOrder, type CandidatePujaStep,
  type CandidateReviewerQuestion,
} from "./candidate";
import {
  CANDIDATE_PATRI, CANDIDATE_PATRI_CLOSING_LINE, CANDIDATE_PATRI_COUNT,
  CANDIDATE_PATRI_DISAGREEMENTS, CANDIDATE_PATRI_REVIEWER_QUESTIONS,
  CANDIDATE_PATRI_SOURCE_REFS,
} from "./patri";
import {
  SANKALPAM_REVIEWER_QUESTIONS, SANKALPAM_SOURCE_REFS,
  SANKALPAM_SUPPORTED_SLOTS, SANKALPAM_TELUGU_TRANSCRIPTION_TASK,
  SANKALPAM_TRANSLITERATION, SANKALPAM_UNSUPPORTED_SLOTS,
} from "./sankalpam";
import {
  COPYRIGHT_FLAGS, PROPOSED_REVIEWER, PUJA_SOURCE_FILES,
} from "./sources";
import {
  ASHTOTTARA_TELUGU_RECOVERY, PATRI_TELUGU_RECOVERY, SANKALPAM_TELUGU_RECOVERY,
  TELUGU_RECOVERY_METHOD, teluguChecksRequired,
} from "./telugu-recovery";

export interface VinayakaCandidate {
  contentVersion: string;
  reviewStatus: "REVIEW_REQUIRED";
  locked: true;
  proposedReviewer: typeof PROPOSED_REVIEWER;
  sources: typeof PUJA_SOURCE_FILES;
  copyrightFlags: readonly string[];
  steps: readonly CandidatePujaStep[];
  stepCount: number;
  sankalpam: {
    transliteration: string;
    teluguScript: string;
    teluguRecovery: typeof SANKALPAM_TELUGU_RECOVERY;
    teluguScriptTranscriptionTask: string;
    sourceRefs: typeof SANKALPAM_SOURCE_REFS;
    supportedSlots: typeof SANKALPAM_SUPPORTED_SLOTS;
    unsupportedSlots: typeof SANKALPAM_UNSUPPORTED_SLOTS;
    reviewerQuestions: readonly CandidateReviewerQuestion[];
    reviewStatus: "REVIEW_REQUIRED";
    locked: true;
  };
  patri: {
    leaves: typeof CANDIDATE_PATRI;
    teluguLeaves: typeof PATRI_TELUGU_RECOVERY.leaves;
    closingLine: string;
    closingLineTelugu: string;
    count: number;
    sourceRefs: typeof CANDIDATE_PATRI_SOURCE_REFS;
    disagreements: typeof CANDIDATE_PATRI_DISAGREEMENTS;
    reviewerQuestions: readonly CandidateReviewerQuestion[];
    reviewStatus: "REVIEW_REQUIRED";
    locked: true;
  };
  /** The 108-name Ashtottara Shatanamavali, recovered in Telugu script. */
  ashtottara: {
    names: typeof ASHTOTTARA_TELUGU_RECOVERY.names;
    closingDoxology: string;
    teluguRecovery: typeof ASHTOTTARA_TELUGU_RECOVERY;
    reviewStatus: "REVIEW_REQUIRED";
    locked: true;
  };
  /** How every Telugu-script string here was recovered. */
  teluguRecoveryMethod: string;
}

export const VINAYAKA_CANDIDATE: VinayakaCandidate = {
  contentVersion: CANDIDATE_CONTENT_VERSION,
  reviewStatus: "REVIEW_REQUIRED",
  locked: true,
  proposedReviewer: PROPOSED_REVIEWER,
  sources: PUJA_SOURCE_FILES,
  copyrightFlags: COPYRIGHT_FLAGS,
  steps: CANDIDATE_PUJA_STEPS,
  stepCount: CANDIDATE_STEP_COUNT,
  sankalpam: {
    transliteration: SANKALPAM_TRANSLITERATION,
    teluguScript: SANKALPAM_TELUGU_RECOVERY.teluguScript,
    teluguRecovery: SANKALPAM_TELUGU_RECOVERY,
    teluguScriptTranscriptionTask: SANKALPAM_TELUGU_TRANSCRIPTION_TASK,
    sourceRefs: SANKALPAM_SOURCE_REFS,
    supportedSlots: SANKALPAM_SUPPORTED_SLOTS,
    unsupportedSlots: SANKALPAM_UNSUPPORTED_SLOTS,
    reviewerQuestions: SANKALPAM_REVIEWER_QUESTIONS,
    reviewStatus: "REVIEW_REQUIRED",
    locked: true,
  },
  patri: {
    leaves: CANDIDATE_PATRI,
    teluguLeaves: PATRI_TELUGU_RECOVERY.leaves,
    closingLine: CANDIDATE_PATRI_CLOSING_LINE,
    closingLineTelugu: PATRI_TELUGU_RECOVERY.closingLineTelugu,
    count: CANDIDATE_PATRI_COUNT,
    sourceRefs: CANDIDATE_PATRI_SOURCE_REFS,
    disagreements: CANDIDATE_PATRI_DISAGREEMENTS,
    reviewerQuestions: CANDIDATE_PATRI_REVIEWER_QUESTIONS,
    reviewStatus: "REVIEW_REQUIRED",
    locked: true,
  },
  ashtottara: {
    names: ASHTOTTARA_TELUGU_RECOVERY.names,
    closingDoxology: ASHTOTTARA_TELUGU_RECOVERY.closingDoxology,
    teluguRecovery: ASHTOTTARA_TELUGU_RECOVERY,
    reviewStatus: "REVIEW_REQUIRED",
    locked: true,
  },
  teluguRecoveryMethod: TELUGU_RECOVERY_METHOD,
};

/** Every open question the priest needs to answer, gathered from all parts. */
export function allReviewerQuestions(): { source: string; question: string }[] {
  const out: { source: string; question: string }[] = [];
  for (const step of candidateStepsInOrder()) {
    for (const q of step.reviewerQuestions) {
      out.push({ source: `Step ${step.sequence} (${step.id})`, question: q.question });
    }
  }
  for (const q of VINAYAKA_CANDIDATE.sankalpam.reviewerQuestions) {
    out.push({ source: "Sankalpam", question: q.question });
  }
  for (const q of VINAYAKA_CANDIDATE.patri.reviewerQuestions) {
    out.push({ source: "Patri", question: q.question });
  }
  return out;
}

/** Every part whose recovered Telugu transcription a reviewer must still
 * re-check against the source render (BETA_TRANSCRIPTION_CHECK_REQUIRED). */
export function allTeluguChecksRequired(): string[] {
  const out = [...teluguChecksRequired()];
  if (VINAYAKA_CANDIDATE.ashtottara.teluguRecovery.transcriptionCheckRequired) {
    out.push("ashtottara");
  }
  if (PATRI_TELUGU_RECOVERY.transcriptionCheckRequired) out.push("patri");
  return out;
}

export { candidateStep, candidateStepsInOrder };

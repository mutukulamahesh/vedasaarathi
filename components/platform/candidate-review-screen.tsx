"use client";

// The Vinayaka Chavithi candidate review screen. REVIEWER mode only - the
// coordinator never routes here in FAMILY_BETA, and every item shown is
// REVIEW_REQUIRED and locked. It presents the whole candidate one item at a
// time (mantra transliteration, Telugu-transcription task, physical action,
// explanation, materials, source/page, disagreements, open questions, audio
// status) with Previous/Next, progress, resume, per-item Approve / Correction
// needed / Not applicable / Comment, and JSON export/import.
//
// Reviewer notes are stored separately (lib/storage/reviewer-decisions.ts)
// and never modify the candidate data.

import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { VINAYAKA_CANDIDATE, candidateStepsInOrder } from "@/lib/pujas/vinayaka/candidate-dataset";
import { MANTRA_AUDIO_STATUS_LABEL } from "@/lib/pujas/vinayaka/mantra-audio";
import { sourceFilename } from "@/lib/pujas/vinayaka/sources";
import {
  REVIEWER_VERDICTS, REVIEWER_VERDICT_LABEL, exportReviewerDecisions,
  getReviewerDecisionsSnapshot, getServerReviewerDecisionsSnapshot,
  importReviewerDecisionsAndNotify, loadReviewerResumeIndex, recordReviewerDecision,
  saveReviewerResumeIndex, subscribeToReviewerDecisions, type ReviewerVerdict,
} from "@/lib/storage/reviewer-decisions";

const STEPS = candidateStepsInOrder();
const CONTENT_VERSION = VINAYAKA_CANDIDATE.contentVersion;

function SourceRefs({ refs }: { refs: readonly { sourceId: string; page: number }[] }) {
  return (
    <ul className="candidate-sources">
      {refs.map((r) => (
        <li key={`${r.sourceId}-${r.page}`}>
          {sourceFilename(r.sourceId)} — page {r.page}
        </li>
      ))}
    </ul>
  );
}

export function CandidateReviewScreen({
  reviewerLabel,
}: {
  /** Short label recorded in exports (e.g. the proposed reviewer's name). */
  reviewerLabel: string;
}) {
  const decisions = useSyncExternalStore(
    subscribeToReviewerDecisions,
    getReviewerDecisionsSnapshot,
    getServerReviewerDecisionsSnapshot,
  );
  const [index, setIndexState] = useState<number>(() => {
    const saved = loadReviewerResumeIndex();
    return saved < STEPS.length ? saved : 0;
  });
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);

  const setIndex = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), STEPS.length - 1);
    setIndexState(clamped);
    saveReviewerResumeIndex(clamped);
  };

  const step = STEPS[index];
  const decision = decisions[step.id];
  const decidedCount = STEPS.filter((s) => decisions[s.id]).length;
  const percent = Math.round(((index + 1) / STEPS.length) * 100);
  const [noteDraft, setNoteDraft] = useState<string>(decision?.note ?? "");

  const chooseVerdict = (verdict: ReviewerVerdict) => {
    recordReviewerDecision(step.id, verdict, noteDraft);
  };

  const handleExport = () => {
    const doc = exportReviewerDecisions(CONTENT_VERSION, reviewerLabel);
    setExportText(JSON.stringify(doc, null, 2));
  };

  const handleImport = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = event.target.value;
    if (raw.trim() === "") return;
    const result = importReviewerDecisionsAndNotify(raw, CONTENT_VERSION);
    if (!result.ok) {
      setImportMessage(result.error ?? "Import failed.");
      return;
    }
    setImportMessage(
      `Imported ${result.imported} decision(s).` +
        (result.warnings.length ? ` ${result.warnings.join(" ")}` : ""),
    );
  };

  return (
    <div className="flow-content candidate-review">
      <p className="kicker">CANDIDATE REVIEW — REVIEWER ONLY</p>
      <h1>Vinayaka Chavithi puja candidate</h1>
      <div className="reviewer-banner">
        <ShieldCheck size={16} />
        <span>
          <strong>Not approved.</strong> Every item is REVIEW_REQUIRED and
          locked. Content version {CONTENT_VERSION}. Proposed reviewer:{" "}
          {VINAYAKA_CANDIDATE.proposedReviewer.name} — has approved nothing yet.
        </span>
      </div>

      <div className="progress-label">
        <span>
          Item {index + 1} of {STEPS.length} · {decidedCount} decided
        </span>
        <strong>{percent}%</strong>
      </div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>

      <article className="candidate-card">
        <p className="candidate-seq">
          Step {step.sequence} · {step.classification} ({step.classificationConfidence})
        </p>
        <h2 lang="und">{step.title}</h2>
        <p className="candidate-english-title">{step.englishTitle}</p>

        <h3>Mantra — transliteration (from the English PDF)</h3>
        {step.transliterationSupported ? (
          <pre className="candidate-mantra">{step.mantraTransliteration}</pre>
        ) : (
          <p className="candidate-note">
            Not stored — see the transcription task below (the source layout
            prevents a faithful copy).
          </p>
        )}

        <h3>Mantra — Telugu script</h3>
        <p className="candidate-note">Not stored. {step.teluguScriptTranscriptionTask}</p>

        <h3>What to do</h3>
        <p>{step.whatToDo}</p>
        <h3>How to do it</h3>
        <p>{step.howToDo}</p>
        <h3>Why we do it</h3>
        <p>{step.whyWeDoIt}</p>

        <h3>Materials named in the mantra</h3>
        {step.materialsNamedInMantra.length > 0 ? (
          <ul className="candidate-materials">
            {step.materialsNamedInMantra.map((m) => <li key={m}>{m}</li>)}
          </ul>
        ) : (
          <p className="candidate-note">
            The mantra text names no materials. The supplied PDFs contain no
            materials checklist.
          </p>
        )}

        <h3>Source</h3>
        <SourceRefs refs={step.sourceRefs} />

        {step.disagreements.length > 0 && (
          <>
            <h3>Telugu vs English differences</h3>
            <ul className="candidate-disagreements">
              {step.disagreements.map((d) => (
                <li key={d.field}>
                  <strong>{d.field}:</strong> Telugu — {d.telugu}; English — {d.english}. {d.note}
                </li>
              ))}
            </ul>
          </>
        )}

        {step.reviewerQuestions.length > 0 && (
          <>
            <h3>Open questions for the priest</h3>
            <ul className="candidate-questions">
              {step.reviewerQuestions.map((q) => <li key={q.id}>{q.question}</li>)}
            </ul>
          </>
        )}

        <h3>Mantra audio</h3>
        <p className="candidate-note">{MANTRA_AUDIO_STATUS_LABEL[step.audio.status]}</p>
      </article>

      <article className="candidate-decision">
        <h3>Your decision for this item</h3>
        <div className="candidate-verdicts">
          {REVIEWER_VERDICTS.map((v) => (
            <button
              key={v}
              type="button"
              className={`verdict-button ${decision?.verdict === v ? "selected" : ""}`}
              aria-pressed={decision?.verdict === v}
              onClick={() => chooseVerdict(v)}
            >
              {REVIEWER_VERDICT_LABEL[v]}
            </button>
          ))}
        </div>
        <label>
          Note (kept locally; never changes the candidate text)
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            onBlur={() => {
              if (decision) recordReviewerDecision(step.id, decision.verdict, noteDraft);
            }}
          />
        </label>
        {decision && (
          <p className="candidate-note">
            Recorded {REVIEWER_VERDICT_LABEL[decision.verdict]} · {decision.updatedAt}
          </p>
        )}
      </article>

      <div className="step-actions">
        <button disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ChevronLeft size={17} /> Previous
        </button>
        <button
          className="primary-action"
          disabled={index === STEPS.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          Next <ChevronRight size={17} />
        </button>
      </div>

      <article className="candidate-io">
        <h3>Export / import decisions (JSON)</h3>
        <button type="button" className="link-button" onClick={handleExport}>
          Build export JSON
        </button>
        {exportText !== null && (
          <textarea className="candidate-export" readOnly value={exportText} />
        )}
        <label>
          Paste a decisions export to import
          <textarea className="candidate-import" onChange={handleImport} placeholder='{"contentVersion": …}' />
        </label>
        {importMessage && <p className="info-note">{importMessage}</p>}
      </article>
    </div>
  );
}

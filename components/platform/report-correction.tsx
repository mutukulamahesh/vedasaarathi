"use client";

// "Report a correction" - shown on the completion screen. A beginner tells us
// something looked wrong (a mantra, a step, an instruction). The record is
// saved ONLY on this device. Nothing is sent anywhere: sharing is a manual
// "Download as JSON" the person does themselves. No name, lineage or location
// is ever included.

import { Check, Download, MessageSquareText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import type { PujaDefinition, PujaPathId } from "@/lib/puja/types";
import { stepsForPujaPath } from "@/lib/puja/types";
import {
  addCorrection, clearCorrections, exportCorrectionsJson, loadCorrections,
  CORRECTION_AREAS, type CorrectionArea, type CorrectionRecord,
} from "@/lib/corrections/store";

function downloadJson(filename: string, text: string): void {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  try {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    /* download is best-effort; the panel still shows the records */
  }
}

export function ReportCorrectionPanel({
  puja,
  path = "SIMPLE",
}: {
  puja?: PujaDefinition | null;
  path?: PujaPathId;
}) {
  const steps = useMemo(
    () => (puja ? stepsForPujaPath(puja, path) : []),
    [puja, path],
  );

  const [records, setRecords] = useState<CorrectionRecord[]>(() => loadCorrections());
  const [area, setArea] = useState<CorrectionArea>("MANTRA");
  const [stepId, setStepId] = useState<string>("");
  const [note, setNote] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const save = () => {
    if (!note.trim()) return;
    const next = addCorrection({
      pujaSlug: puja?.slug ?? "",
      path: path === "COMPLETE" ? "COMPLETE" : "SIMPLE",
      stepId: stepId || null,
      area,
      note,
    });
    setRecords(next);
    setSavedId(next[0]?.id ?? null);
    setNote("");
  };

  const download = () => {
    downloadJson(
      `vedasaarathi-corrections-${new Date().toISOString().slice(0, 10)}.json`,
      exportCorrectionsJson(records),
    );
  };

  const clearAll = () => {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (!window.confirm("Delete all corrections saved on this device?")) return;
    }
    clearCorrections();
    setRecords([]);
    setSavedId(null);
  };

  const stepLabel = (id: string) => {
    const s = steps.find((step) => step.candidateStepId === id || step.id === id);
    return s ? s.title : id;
  };

  return (
    <section className="correction-panel" aria-label="Report a correction">
      <div className="correction-head">
        <MessageSquareText size={18} />
        <h2>Report a correction</h2>
      </div>
      <p className="correction-privacy">
        Saved on this device only. Nothing is sent anywhere. Use
        &ldquo;Download&rdquo; to share it with the team yourself. Your name,
        lineage and location are never included.
      </p>

      <label className="correction-field">
        What is this about?
        <select value={area} onChange={(e) => setArea(e.target.value as CorrectionArea)}>
          {CORRECTION_AREAS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </label>

      {steps.length > 0 && (
        <label className="correction-field">
          Which step? (optional)
          <select value={stepId} onChange={(e) => setStepId(e.target.value)}>
            <option value="">Not about one step</option>
            {steps.map((s) => (
              <option key={s.id} value={s.candidateStepId ?? s.id}>{s.title}</option>
            ))}
          </select>
        </label>
      )}

      <label className="correction-field">
        What looked wrong?
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="Describe what you saw and what you expected."
        />
      </label>

      <button className="wide-primary" onClick={save} disabled={!note.trim()}>
        Save on this device
      </button>
      {savedId && (
        <p className="correction-saved"><Check size={15} /> Saved. It stays on this device until you download or delete it.</p>
      )}

      {records.length > 0 && (
        <>
          <div className="correction-list-head">
            <h3>Saved corrections ({records.length})</h3>
            <div className="correction-list-actions">
              <button type="button" className="link-button" onClick={download}>
                <Download size={15} /> Download JSON
              </button>
              <button type="button" className="link-button danger" onClick={clearAll}>
                <Trash2 size={15} /> Delete all
              </button>
            </div>
          </div>
          <ul className="correction-list">
            {records.map((r) => (
              <li key={r.id}>
                <p className="correction-meta">
                  {CORRECTION_AREAS.find((a) => a.value === r.area)?.label ?? r.area}
                  {r.stepId ? ` · ${stepLabel(r.stepId)}` : ""}
                  {" · "}
                  {new Date(r.createdAt).toLocaleDateString()}
                </p>
                <p className="correction-note">{r.note}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

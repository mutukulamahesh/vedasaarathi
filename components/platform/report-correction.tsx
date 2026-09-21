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
  correctionAreaLabel,
  CORRECTION_AREAS, type CorrectionArea, type CorrectionRecord,
} from "@/lib/corrections/store";

const T = {
  EN: {
    heading: "Report a correction",
    privacy:
      "Saved on this device only. Nothing is sent anywhere. Use “Download” to " +
      "share it with the team yourself. Your name, lineage and location are " +
      "never included.",
    aboutQ: "What is this about?",
    whichStepQ: "Which step? (optional)",
    notAboutStep: "Not about one step",
    wrongQ: "What looked wrong?",
    wrongPlaceholder: "Describe what you saw and what you expected.",
    save: "Save on this device",
    saved: "Saved. It stays on this device until you download or delete it.",
    savedList: (n: number) => `Saved corrections (${n})`,
    downloadJson: "Download JSON",
    deleteAll: "Delete all",
    confirmDelete: "Delete all corrections saved on this device?",
  },
  TE: {
    heading: "తప్పు తెలియజేయండి",
    privacy:
      "ఇది ఈ పరికరంలో మాత్రమే సేవ్ అవుతుంది. ఎక్కడికీ పంపబడదు. బృందంతో " +
      "పంచుకోవాలంటే మీరే “డౌన్‌లోడ్” వాడండి. మీ పేరు, వంశం, ప్రాంతం ఎప్పుడూ " +
      "చేర్చబడవు.",
    aboutQ: "ఇది దేని గురించి?",
    whichStepQ: "ఏ దశ గురించి? (ఐచ్ఛికం)",
    notAboutStep: "ఒక దశ గురించి కాదు",
    wrongQ: "ఏమి తప్పుగా అనిపించింది?",
    wrongPlaceholder: "మీరు చూసినది, మీరు ఆశించినది రాయండి.",
    save: "ఈ పరికరంలో సేవ్ చేయండి",
    saved: "సేవ్ అయింది. మీరు డౌన్‌లోడ్ చేసే లేదా తొలగించే వరకు ఈ పరికరంలో ఉంటుంది.",
    savedList: (n: number) => `సేవ్ చేసిన నివేదికలు (${n})`,
    downloadJson: "JSON డౌన్‌లోడ్",
    deleteAll: "అన్నీ తొలగించండి",
    confirmDelete: "ఈ పరికరంలో సేవ్ చేసిన అన్ని నివేదికలను తొలగించాలా?",
  },
} as const;

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
  language = "EN",
}: {
  puja?: PujaDefinition | null;
  path?: PujaPathId;
  language?: "EN" | "TE";
}) {
  const te = language === "TE";
  const t = te ? T.TE : T.EN;
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
      if (!window.confirm(t.confirmDelete)) return;
    }
    clearCorrections();
    setRecords([]);
    setSavedId(null);
  };

  const stepTitle = (s: { title: string; teluguTitle?: string }) =>
    te && s.teluguTitle ? s.teluguTitle : s.title;
  const stepLabel = (id: string) => {
    const s = steps.find((step) => step.candidateStepId === id || step.id === id);
    return s ? stepTitle(s) : id;
  };

  return (
    <section className="correction-panel" aria-label={t.heading} lang={te ? "te" : undefined}>
      <div className="correction-head">
        <MessageSquareText size={18} />
        <h2>{t.heading}</h2>
      </div>
      <p className="correction-privacy">{t.privacy}</p>

      <label className="correction-field">
        {t.aboutQ}
        <select value={area} onChange={(e) => setArea(e.target.value as CorrectionArea)}>
          {CORRECTION_AREAS.map((a) => (
            <option key={a.value} value={a.value}>{correctionAreaLabel(a.value, language)}</option>
          ))}
        </select>
      </label>

      {steps.length > 0 && (
        <label className="correction-field">
          {t.whichStepQ}
          <select value={stepId} onChange={(e) => setStepId(e.target.value)}>
            <option value="">{t.notAboutStep}</option>
            {steps.map((s) => (
              <option key={s.id} value={s.candidateStepId ?? s.id}>{stepTitle(s)}</option>
            ))}
          </select>
        </label>
      )}

      <label className="correction-field">
        {t.wrongQ}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder={t.wrongPlaceholder}
        />
      </label>

      <button className="wide-primary" onClick={save} disabled={!note.trim()}>
        {t.save}
      </button>
      {savedId && (
        <p className="correction-saved"><Check size={15} /> {t.saved}</p>
      )}

      {records.length > 0 && (
        <>
          <div className="correction-list-head">
            <h3>{t.savedList(records.length)}</h3>
            <div className="correction-list-actions">
              <button type="button" className="link-button" onClick={download}>
                <Download size={15} /> {t.downloadJson}
              </button>
              <button type="button" className="link-button danger" onClick={clearAll}>
                <Trash2 size={15} /> {t.deleteAll}
              </button>
            </div>
          </div>
          <ul className="correction-list">
            {records.map((r) => (
              <li key={r.id}>
                <p className="correction-meta">
                  {correctionAreaLabel(r.area, language)}
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

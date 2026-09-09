// Local "Report a correction" records.
//
// PRIVACY (.claude/rules/security.md)
// - Records are saved ONLY in this browser's localStorage. Nothing here sends
//   anything anywhere - there is deliberately no fetch/XHR/beacon in this file
//   or in the panel that uses it. Sharing a correction with the team is a
//   manual "Download as JSON" the person does themselves.
// - The record carries no name, no lineage, no location. It is puja slug +
//   path + optional step id + a free-text note the person typed.
//
// This is separate from the reviewer decision system (lib/... reviewer JSON
// import/export): that is for invited priests; this is a beginner telling us
// something looked wrong.

export const CORRECTIONS_STORAGE_KEY = "vedasaarathi:corrections:v1";

export type CorrectionArea =
  | "MANTRA"
  | "STEP_INSTRUCTION"
  | "WHAT_TO_KEEP_READY"
  | "OTHER";

export const CORRECTION_AREAS: readonly { value: CorrectionArea; label: string }[] = [
  { value: "MANTRA", label: "A mantra or its reading" },
  { value: "STEP_INSTRUCTION", label: "A step instruction" },
  { value: "WHAT_TO_KEEP_READY", label: "What to keep ready" },
  { value: "OTHER", label: "Something else" },
];

export interface CorrectionRecord {
  id: string;
  /** ISO 8601 timestamp, device local clock. */
  createdAt: string;
  pujaSlug: string;
  path: "SIMPLE" | "COMPLETE" | null;
  /** RitualStep id the note is about, or null for a general note. */
  stepId: string | null;
  area: CorrectionArea;
  note: string;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function isArea(value: unknown): value is CorrectionArea {
  return CORRECTION_AREAS.some((a) => a.value === value);
}

function parseRecord(value: unknown): CorrectionRecord | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.note !== "string") return null;
  if (typeof r.createdAt !== "string") return null;
  return {
    id: r.id,
    createdAt: r.createdAt,
    pujaSlug: typeof r.pujaSlug === "string" ? r.pujaSlug : "",
    path: r.path === "SIMPLE" || r.path === "COMPLETE" ? r.path : null,
    stepId: typeof r.stepId === "string" ? r.stepId : null,
    area: isArea(r.area) ? r.area : "OTHER",
    note: r.note,
  };
}

/** All saved correction records, newest first. Damaged data → []. */
export function loadCorrections(storage?: StorageLike): CorrectionRecord[] {
  const store = resolveStorage(storage);
  if (!store) return [];
  let raw: string | null = null;
  try {
    raw = store.getItem(CORRECTIONS_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  // Stored newest-first by addCorrection; order is preserved as-is (no re-sort,
  // so records written in the same millisecond keep their insertion order).
  return parsed
    .map(parseRecord)
    .filter((r): r is CorrectionRecord => r !== null);
}

function persist(records: CorrectionRecord[], store: StorageLike): void {
  try {
    store.setItem(CORRECTIONS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // A full or unavailable store must not break the completion screen.
  }
}

export interface NewCorrection {
  pujaSlug: string;
  path: "SIMPLE" | "COMPLETE" | null;
  stepId: string | null;
  area: CorrectionArea;
  note: string;
}

/** Append one correction. Returns the full list (newest first). No-op on an
 * empty note. Nothing is transmitted. */
export function addCorrection(
  input: NewCorrection,
  storage?: StorageLike,
): CorrectionRecord[] {
  const store = resolveStorage(storage);
  const note = input.note.trim();
  const existing = loadCorrections(store ?? undefined);
  if (!note) return existing;
  const record: CorrectionRecord = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    pujaSlug: input.pujaSlug,
    path: input.path,
    stepId: input.stepId,
    area: input.area,
    note,
  };
  const next = [record, ...existing];
  if (store) persist(next, store);
  return next;
}

/** Remove every saved correction on this device. */
export function clearCorrections(storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.removeItem(CORRECTIONS_STORAGE_KEY);
  } catch {
    /* nothing to clean up */
  }
}

export interface CorrectionsExport {
  kind: "vedasaarathi-corrections";
  version: 1;
  exportedAt: string;
  records: CorrectionRecord[];
}

/** A pretty JSON string the person can save and send to the team themselves. */
export function exportCorrectionsJson(records: CorrectionRecord[]): string {
  const payload: CorrectionsExport = {
    kind: "vedasaarathi-corrections",
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
  };
  return JSON.stringify(payload, null, 2);
}

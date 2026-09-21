// Local, on-device reviewer decisions for the Vinayaka Chavithi puja
// candidate.
//
// A reviewer records one decision per item (a step, or the Sankalpam, or the
// patri list): Approve / Correction needed / Not applicable / Comment, plus
// free-text notes. These are stored ONLY in this browser's localStorage and
// can be exported to / imported from JSON so a priest can send them back.
//
// Reviewer notes NEVER modify canonical content. The candidate in
// lib/pujas/vinayaka/* is immutable data; a decision is a separate record
// that points at an item by id.

export type ReviewerVerdict =
  | "APPROVE"
  | "CORRECTION_NEEDED"
  | "NOT_APPLICABLE"
  | "COMMENT";

export const REVIEWER_VERDICTS: readonly ReviewerVerdict[] = [
  "APPROVE",
  "CORRECTION_NEEDED",
  "NOT_APPLICABLE",
  "COMMENT",
];

export const REVIEWER_VERDICT_LABEL: Record<ReviewerVerdict, string> = {
  APPROVE: "Approve",
  CORRECTION_NEEDED: "Correction needed",
  NOT_APPLICABLE: "Not applicable",
  COMMENT: "Comment",
};

export interface ReviewerDecision {
  /** Item id: a candidate step id, or "sankalpam", or "patri". */
  itemId: string;
  verdict: ReviewerVerdict;
  /** Reviewer's free text. Never applied to canonical content. */
  note: string;
  /** ISO timestamp of the last edit. */
  updatedAt: string;
}

export interface ReviewerDecisionsDoc {
  /** Version of the candidate content these decisions were made against. */
  contentVersion: string;
  /** Recorded so an import can warn if it is for a different reviewer/build. */
  reviewerLabel: string;
  decisions: Record<string, ReviewerDecision>;
  exportedAt: string;
}

const STORAGE_KEY = "vedasaarathi:reviewer-decisions:v1";

export function emptyReviewerDecisions(): Record<string, ReviewerDecision> {
  return {};
}

function isVerdict(value: unknown): value is ReviewerVerdict {
  return typeof value === "string" && (REVIEWER_VERDICTS as readonly string[]).includes(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseOneDecision(itemId: string, value: unknown): ReviewerDecision | null {
  const record = asRecord(value);
  if (!record) return null;
  if (!isVerdict(record.verdict)) return null;
  return {
    itemId,
    verdict: record.verdict,
    note: typeof record.note === "string" ? record.note : "",
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt !== ""
        ? record.updatedAt
        : new Date(0).toISOString(),
  };
}

/** Turn a stored JSON string into a valid decisions map. Anything damaged is
 * dropped for that item, never guessed. */
export function parseReviewerDecisions(raw: string | null): Record<string, ReviewerDecision> {
  if (!raw) return emptyReviewerDecisions();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyReviewerDecisions();
  }
  const record = asRecord(parsed);
  if (!record) return emptyReviewerDecisions();
  // Accept either a bare map or a full ReviewerDecisionsDoc.
  const source = asRecord(record.decisions) ?? record;
  const out: Record<string, ReviewerDecision> = {};
  for (const [itemId, value] of Object.entries(source)) {
    const decision = parseOneDecision(itemId, value);
    if (decision) out[itemId] = decision;
  }
  return out;
}

export function serializeReviewerDecisions(
  decisions: Record<string, ReviewerDecision>,
): string {
  return JSON.stringify(decisions);
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

export function loadReviewerDecisions(storage?: StorageLike): Record<string, ReviewerDecision> {
  const store = resolveStorage(storage);
  if (!store) return emptyReviewerDecisions();
  try {
    return parseReviewerDecisions(store.getItem(STORAGE_KEY));
  } catch {
    return emptyReviewerDecisions();
  }
}

export function saveReviewerDecisions(
  decisions: Record<string, ReviewerDecision>,
  storage?: StorageLike,
): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, serializeReviewerDecisions(decisions));
  } catch {
    // A full or unavailable store must not break the review UI.
  }
}

/** Set (or replace) one item's decision, keeping the rest untouched. */
export function setReviewerDecision(
  itemId: string,
  verdict: ReviewerVerdict,
  note: string,
  storage?: StorageLike,
): Record<string, ReviewerDecision> {
  const current = loadReviewerDecisions(storage);
  const next: Record<string, ReviewerDecision> = {
    ...current,
    [itemId]: { itemId, verdict, note, updatedAt: new Date().toISOString() },
  };
  saveReviewerDecisions(next, storage);
  return next;
}

export function clearReviewerDecision(
  itemId: string,
  storage?: StorageLike,
): Record<string, ReviewerDecision> {
  const current = loadReviewerDecisions(storage);
  if (!(itemId in current)) return current;
  const next = { ...current };
  delete next[itemId];
  saveReviewerDecisions(next, storage);
  return next;
}

/* -------------------------------------------------------------------------- */
/* JSON export / import                                                       */
/* -------------------------------------------------------------------------- */

export function exportReviewerDecisions(
  contentVersion: string,
  reviewerLabel: string,
  storage?: StorageLike,
): ReviewerDecisionsDoc {
  return {
    contentVersion,
    reviewerLabel,
    decisions: loadReviewerDecisions(storage),
    exportedAt: new Date().toISOString(),
  };
}

export interface ImportResult {
  ok: boolean;
  imported: number;
  /** Non-fatal notes (e.g. content-version mismatch). */
  warnings: string[];
  error: string | null;
}

/**
 * Merge an imported doc's decisions in. Import never touches canonical
 * content - only the local decisions map. A content-version mismatch is a
 * warning, not a failure, so a priest's older export still loads.
 */
export function importReviewerDecisions(
  rawJson: string,
  expectedContentVersion: string,
  storage?: StorageLike,
): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, imported: 0, warnings: [], error: "The file is not valid JSON." };
  }
  const record = asRecord(parsed);
  if (!record) {
    return { ok: false, imported: 0, warnings: [], error: "The file is not a decisions export." };
  }

  const warnings: string[] = [];
  const importedVersion = typeof record.contentVersion === "string" ? record.contentVersion : null;
  if (importedVersion && importedVersion !== expectedContentVersion) {
    warnings.push(
      `This export was made against candidate version "${importedVersion}", ` +
        `but the current candidate is "${expectedContentVersion}". Review each ` +
        `decision before relying on it.`,
    );
  }

  const incoming = parseReviewerDecisions(
    typeof record.decisions === "object" ? JSON.stringify(record.decisions) : rawJson,
  );
  const current = loadReviewerDecisions(storage);
  const merged = { ...current, ...incoming };
  saveReviewerDecisions(merged, storage);

  return {
    ok: true,
    imported: Object.keys(incoming).length,
    warnings,
    error: null,
  };
}

/* -------------------------------------------------------------------------- */
/* External store for useSyncExternalStore                                    */
/* -------------------------------------------------------------------------- */

type Listener = () => void;

const listeners = new Set<Listener>();
const serverSnapshot: Record<string, ReviewerDecision> = emptyReviewerDecisions();

let cachedRaw: string | null = null;
let cachedSnapshot: Record<string, ReviewerDecision> = serverSnapshot;
let hasCache = false;

function readRaw(): string | null {
  const store = resolveStorage();
  if (!store) return null;
  try {
    return store.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function invalidate(): void {
  cachedRaw = null;
  hasCache = false;
}

function emitChange(): void {
  for (const listener of listeners) listener();
}

export function getReviewerDecisionsSnapshot(): Record<string, ReviewerDecision> {
  const raw = readRaw();
  if (!hasCache || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parseReviewerDecisions(raw);
    hasCache = true;
  }
  return cachedSnapshot;
}

export function getServerReviewerDecisionsSnapshot(): Record<string, ReviewerDecision> {
  return serverSnapshot;
}

export function subscribeToReviewerDecisions(listener: Listener): () => void {
  listeners.add(listener);
  let onStorage: ((event: StorageEvent) => void) | undefined;
  if (typeof window !== "undefined") {
    onStorage = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        invalidate();
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (onStorage) window.removeEventListener("storage", onStorage);
  };
}

/** Record a decision and notify subscribers. */
export function recordReviewerDecision(
  itemId: string,
  verdict: ReviewerVerdict,
  note: string,
): void {
  setReviewerDecision(itemId, verdict, note);
  invalidate();
  emitChange();
}

/** Import and notify subscribers. */
export function importReviewerDecisionsAndNotify(
  rawJson: string,
  expectedContentVersion: string,
): ImportResult {
  const result = importReviewerDecisions(rawJson, expectedContentVersion);
  if (result.ok) {
    invalidate();
    emitChange();
  }
  return result;
}

export { STORAGE_KEY as REVIEWER_DECISIONS_STORAGE_KEY };

/* -------------------------------------------------------------------------- */
/* Resume: which candidate item the reviewer was last on                      */
/* -------------------------------------------------------------------------- */

const RESUME_KEY = "vedasaarathi:reviewer-resume-index:v1";

export function loadReviewerResumeIndex(storage?: StorageLike): number {
  const store = resolveStorage(storage);
  if (!store) return 0;
  try {
    const raw = store.getItem(RESUME_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveReviewerResumeIndex(index: number, storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(RESUME_KEY, String(Math.max(0, Math.trunc(index))));
  } catch {
    // ignore
  }
}

export { RESUME_KEY as REVIEWER_RESUME_STORAGE_KEY };

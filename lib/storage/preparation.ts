// Local, on-device storage for participant and preparation progress.
//
// .claude/rules/security.md: participant and family details are private. They are
// kept only in this browser's localStorage - never sent anywhere, never put in a
// URL or a log. parseProgress is defensive: damaged or outdated data falls back
// to a clean empty state rather than throwing or inventing values.

import {
  createParticipant,
  normalizeParticipant,
  type LineageField,
  type LineageStatus,
  type Participant,
  type ParticipantMode,
} from "../content/participants";
import { isValidPatriSelfReport, type PatriSelfReport } from "../content/leaves";

export interface PreparationProgress {
  mode: ParticipantMode;
  participants: Participant[];
  /** Material ids the user marked as available. */
  availableMaterialIds: string[];
  /** What the user reported about having traditional patri (leaves). */
  patriSelfReport: PatriSelfReport | null;
  /** Current step in the guided puja. */
  stepIndex: number;
}

const STORAGE_KEY = "vedasaarathi:preparation:v2";
const VALID_MODES: readonly ParticipantMode[] = ["SELF", "FAMILY", "GROUP"];
const VALID_STATUSES: readonly LineageStatus[] = ["KNOWN", "UNKNOWN", "UNSURE"];

export function emptyProgress(): PreparationProgress {
  return {
    mode: "SELF",
    participants: [createParticipant("p1")],
    availableMaterialIds: [],
    patriSelfReport: null,
    stepIndex: 0,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseLineageField(value: unknown): LineageField {
  const record = asRecord(value);
  const status = record?.status;
  if (typeof status === "string" && VALID_STATUSES.includes(status as LineageStatus)) {
    if (status === "KNOWN") {
      const name = typeof record?.name === "string" ? record.name : "";
      return record?.custom === true
        ? { status: "KNOWN", name, custom: true }
        : { status: "KNOWN", name };
    }
    return { status: status as LineageStatus, name: "" };
  }
  return { status: "UNKNOWN", name: "" };
}

function parseParticipant(value: unknown, index: number): Participant {
  const record = asRecord(value);
  const id =
    typeof record?.id === "string" && record.id !== ""
      ? record.id
      : `p${index + 1}`;
  const name = typeof record?.name === "string" ? record.name : "";
  return normalizeParticipant({
    id,
    name,
    gotra: parseLineageField(record?.gotra),
    veda: parseLineageField(record?.veda),
    sutra: parseLineageField(record?.sutra),
    sampradaya: parseLineageField(record?.sampradaya),
  });
}

function parseStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

/**
 * Turn a stored JSON string into a valid PreparationProgress. Any missing,
 * damaged, or unexpected field is replaced from emptyProgress(); no religious
 * value is ever guessed or carried across from an unrecognised shape.
 */
export function parseProgress(raw: string | null): PreparationProgress {
  const fallback = emptyProgress();
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  const record = asRecord(parsed);
  if (!record) return fallback;

  const mode =
    typeof record.mode === "string" &&
    VALID_MODES.includes(record.mode as ParticipantMode)
      ? (record.mode as ParticipantMode)
      : fallback.mode;

  const participants = Array.isArray(record.participants)
    ? record.participants.map(parseParticipant)
    : fallback.participants;

  const stepIndex =
    typeof record.stepIndex === "number" &&
    Number.isInteger(record.stepIndex) &&
    record.stepIndex >= 0
      ? record.stepIndex
      : 0;

  return {
    mode,
    participants: participants.length > 0 ? participants : fallback.participants,
    availableMaterialIds: parseStringIds(record.availableMaterialIds),
    // Legacy `availableLeafIds` (named leaf picks) is intentionally dropped.
    patriSelfReport: isValidPatriSelfReport(record.patriSelfReport)
      ? record.patriSelfReport
      : null,
    stepIndex,
  };
}

export function serializeProgress(progress: PreparationProgress): string {
  return JSON.stringify({
    mode: progress.mode,
    participants: progress.participants.map(normalizeParticipant),
    availableMaterialIds: progress.availableMaterialIds,
    patriSelfReport: progress.patriSelfReport,
    stepIndex: progress.stepIndex,
  });
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

export function loadProgress(storage?: StorageLike): PreparationProgress {
  const store = resolveStorage(storage);
  if (!store) return emptyProgress();
  try {
    return parseProgress(store.getItem(STORAGE_KEY));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(
  progress: PreparationProgress,
  storage?: StorageLike,
): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, serializeProgress(progress));
  } catch {
    // A full or unavailable store must not break the puja journey.
  }
}

export function clearProgress(storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Ignore - nothing to clean up if the store is unavailable.
  }
}

/* -------------------------------------------------------------------------- */
/* External store for useSyncExternalStore                                    */
/* -------------------------------------------------------------------------- */

type Listener = () => void;

const listeners = new Set<Listener>();
const serverSnapshot: PreparationProgress = emptyProgress();

let cachedRaw: string | null = null;
let cachedSnapshot: PreparationProgress = serverSnapshot;
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

/** Stable snapshot for the client. Re-parses only when the stored string changes. */
export function getProgressSnapshot(): PreparationProgress {
  const raw = readRaw();
  if (!hasCache || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSnapshot = parseProgress(raw);
    hasCache = true;
  }
  return cachedSnapshot;
}

/** Stable empty snapshot for server rendering and hydration. */
export function getServerProgressSnapshot(): PreparationProgress {
  return serverSnapshot;
}

export function subscribeToProgress(listener: Listener): () => void {
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

/** Replace the whole progress record and notify subscribers. */
export function writeProgress(next: PreparationProgress): void {
  saveProgress(next);
  invalidate();
  emitChange();
}

/** Apply a pure update to the current progress and persist it. */
export function updateProgress(
  updater: (current: PreparationProgress) => PreparationProgress,
): void {
  writeProgress(updater(getProgressSnapshot()));
}

/** Clear stored progress and notify subscribers. */
export function resetProgress(): void {
  clearProgress();
  invalidate();
  emitChange();
}

/** Message shown to the user before saved progress is cleared. */
export const RESET_CONFIRM_MESSAGE =
  "This clears the saved people and preparation progress on this device. Start again?";

function defaultConfirm(message: string): boolean {
  // Only the browser's confirm dialog counts. Anywhere else (SSR, tests, a
  // Node global) we cannot ask the user, so we do not clear anything.
  if (typeof window !== "undefined" && typeof window.confirm === "function") {
    return window.confirm(message);
  }
  return false;
}

/**
 * Clear saved progress only after the user confirms. Returns true when the reset
 * happened. `confirm` and `onReset` are injectable for testing.
 */
export function requestReset(options: {
  confirm?: (message: string) => boolean;
  onReset?: () => void;
} = {}): boolean {
  const confirm = options.confirm ?? defaultConfirm;
  if (!confirm(RESET_CONFIRM_MESSAGE)) return false;
  (options.onReset ?? resetProgress)();
  return true;
}

export { STORAGE_KEY as PREPARATION_STORAGE_KEY };

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
import type { PujaPath } from "../content/steps";

/** Explicit lifecycle for one puja's guided run. Replaces the old
 * `pujaCompleted` boolean + step-index guessing. */
export type PujaRunState = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

const VALID_RUN_STATES: readonly PujaRunState[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
];

/** Per-puja run state. VedaSaarathi is multi-puja: each puja has its own path,
 * step, materials, patri answer and lifecycle - starting one puja never carries
 * a path or a "completed" state into another. */
export interface PujaRun {
  runState: PujaRunState;
  /** Current step in this puja's guided flow. */
  stepIndex: number;
  pujaPath: PujaPath;
  /** Material ids the user marked as available, for this puja. */
  availableMaterialIds: string[];
  /** What the user reported about having traditional patri, for this puja. */
  patriSelfReport: PatriSelfReport | null;
}

export interface PreparationProgress {
  /** Shared across pujas - these describe the person, not a puja run. */
  mode: ParticipantMode;
  participants: Participant[];
  language: "EN" | "TE";
  /** Guided-run state per puja, keyed by `puja.slug`. */
  runs: Record<string, PujaRun>;
}

// Storage versions. v3 introduced the { runs } shape as its own key. Writes go
// to v3; reads prefer v3 and fall back to v2 (which may hold a flat legacy
// record OR the interim { runs } record). v2 is NOT deleted on migration, so a
// rollback to the previous app can still read the old data - only the explicit
// destructive full reset clears both.
const STORAGE_KEY_V2 = "vedasaarathi:preparation:v2";
const STORAGE_KEY_V3 = "vedasaarathi:preparation:v3";
/** The key new writes go to. */
const STORAGE_KEY = STORAGE_KEY_V3;

const VALID_MODES: readonly ParticipantMode[] = ["SELF", "FAMILY", "GROUP"];
const VALID_STATUSES: readonly LineageStatus[] = ["KNOWN", "UNKNOWN", "UNSURE"];

/** The slug a pre-run-state stored record is migrated under. Vinayaka Chavithi
 * is the only puja that existed before per-puja run state, so a legacy flat
 * record can only have been its run. */
export const LEGACY_MIGRATION_SLUG = "vinayaka-chavithi";

export function emptyRun(): PujaRun {
  return {
    runState: "NOT_STARTED",
    stepIndex: 0,
    pujaPath: "SIMPLE",
    availableMaterialIds: [],
    patriSelfReport: null,
  };
}

export function emptyProgress(): PreparationProgress {
  return {
    mode: "SELF",
    participants: [createParticipant("p1")],
    language: "EN",
    runs: {},
  };
}

/** One puja's run, defaulting to a fresh NOT_STARTED run. */
export function getRun(progress: PreparationProgress, slug: string): PujaRun {
  return progress.runs[slug] ?? emptyRun();
}

/** Merge a partial into exactly one puja's run; other pujas are untouched. */
export function withRun(
  progress: PreparationProgress,
  slug: string,
  update: Partial<PujaRun>,
): PreparationProgress {
  return {
    ...progress,
    runs: { ...progress.runs, [slug]: { ...getRun(progress, slug), ...update } },
  };
}

/**
 * Reset ONE puja's run to a fresh NOT_STARTED run (step, path, run state,
 * material readiness, patri answer). Participants, mode, lineage, language and
 * every OTHER puja's run are preserved. This is what "Start again" uses.
 */
export function resetRun(
  progress: PreparationProgress,
  slug: string,
): PreparationProgress {
  const runs = { ...progress.runs };
  delete runs[slug];
  return { ...progress, runs };
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

function parseStepIndex(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}

function parsePath(value: unknown): PujaPath {
  return value === "COMPLETE" ? "COMPLETE" : "SIMPLE";
}

/** Parse one run record. `runState` is taken from the record when valid;
 * otherwise it is derived from a legacy `pujaCompleted` boolean, then from a
 * non-zero step index, so an interrupted legacy run still resumes. */
function parseRun(record: Record<string, unknown>): PujaRun {
  const stepIndex = parseStepIndex(record.stepIndex);
  let runState: PujaRunState;
  if (
    typeof record.runState === "string" &&
    VALID_RUN_STATES.includes(record.runState as PujaRunState)
  ) {
    runState = record.runState as PujaRunState;
  } else if (record.pujaCompleted === true) {
    runState = "COMPLETED";
  } else if (stepIndex > 0) {
    runState = "IN_PROGRESS";
  } else {
    runState = "NOT_STARTED";
  }
  return {
    runState,
    stepIndex,
    pujaPath: parsePath(record.pujaPath),
    availableMaterialIds: parseStringIds(record.availableMaterialIds),
    patriSelfReport: isValidPatriSelfReport(record.patriSelfReport)
      ? record.patriSelfReport
      : null,
  };
}

/** True when a legacy flat record carries any run field worth migrating. */
function hasLegacyRunData(record: Record<string, unknown>): boolean {
  return (
    "stepIndex" in record ||
    "pujaPath" in record ||
    "availableMaterialIds" in record ||
    "patriSelfReport" in record ||
    "pujaCompleted" in record
  );
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

  // Per-puja runs: use `record.runs` when present; otherwise migrate a legacy
  // flat record into a single run under the Vinayaka slug.
  const runs: Record<string, PujaRun> = {};
  const runsRecord = asRecord(record.runs);
  if (runsRecord) {
    for (const [slug, value] of Object.entries(runsRecord)) {
      const runRecord = asRecord(value);
      if (runRecord) runs[slug] = parseRun(runRecord);
    }
  } else if (hasLegacyRunData(record)) {
    runs[LEGACY_MIGRATION_SLUG] = parseRun(record);
  }

  return {
    mode,
    participants: participants.length > 0 ? participants : fallback.participants,
    language: record.language === "TE" ? "TE" : "EN",
    runs,
  };
}

function serializeRun(run: PujaRun) {
  return {
    runState: run.runState,
    stepIndex: run.stepIndex,
    pujaPath: run.pujaPath,
    availableMaterialIds: run.availableMaterialIds,
    patriSelfReport: run.patriSelfReport,
  };
}

export function serializeProgress(progress: PreparationProgress): string {
  const runs: Record<string, ReturnType<typeof serializeRun>> = {};
  for (const [slug, run] of Object.entries(progress.runs ?? {})) {
    runs[slug] = serializeRun(run);
  }
  return JSON.stringify({
    mode: progress.mode,
    participants: progress.participants.map(normalizeParticipant),
    language: progress.language,
    runs,
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

/** The current stored record: prefer v3; if it is absent, read the v2 record
 * to migrate from (flat legacy or interim { runs }). */
function readVersionedRaw(store: StorageLike): string | null {
  try {
    const v3 = store.getItem(STORAGE_KEY_V3);
    if (v3 !== null) return v3;
    return store.getItem(STORAGE_KEY_V2);
  } catch {
    return null;
  }
}

export function loadProgress(storage?: StorageLike): PreparationProgress {
  const store = resolveStorage(storage);
  if (!store) return emptyProgress();
  try {
    return parseProgress(readVersionedRaw(store));
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
    // New writes always go to v3. v2 is intentionally left in place for
    // rollback safety; it is only removed by the destructive full reset.
    store.setItem(STORAGE_KEY_V3, serializeProgress(progress));
  } catch {
    // A full or unavailable store must not break the puja journey.
  }
}

/** Destructive full reset only: removes BOTH storage versions. */
export function clearProgress(storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY_V3);
    store.removeItem(STORAGE_KEY_V2);
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
  return readVersionedRaw(store);
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
      if (event.key === STORAGE_KEY_V3 || event.key === STORAGE_KEY_V2 || event.key === null) {
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

/** Message before the DESTRUCTIVE full reset (deletes people, lineage, etc.).
 * Not used by "Start again" - see requestRunReset. */
export const RESET_CONFIRM_MESSAGE =
  "This deletes the saved people and all lineage details on this device. Continue?";

/** Message before "Start again": only the current puja run is cleared. */
export const RUN_RESET_CONFIRM_MESSAGE =
  "Start this puja again from the beginning? Your saved people, lineage and " +
  "location are kept.";

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

/**
 * "Start again": after the user confirms, reset ONLY the given puja's run
 * (step, path, run state, material readiness, patri answer). Participants,
 * mode, lineage, language and every other puja are preserved. Returns true
 * when the run was reset. `confirm` and `onReset` are injectable for tests.
 */
export function requestRunReset(
  slug: string,
  options: {
    confirm?: (message: string) => boolean;
    onReset?: () => void;
  } = {},
): boolean {
  const confirm = options.confirm ?? defaultConfirm;
  if (!confirm(RUN_RESET_CONFIRM_MESSAGE)) return false;
  (options.onReset ?? (() => updateProgress((current) => resetRun(current, slug))))();
  return true;
}

export {
  STORAGE_KEY as PREPARATION_STORAGE_KEY,
  STORAGE_KEY_V2 as PREPARATION_STORAGE_KEY_V2,
  STORAGE_KEY_V3 as PREPARATION_STORAGE_KEY_V3,
};

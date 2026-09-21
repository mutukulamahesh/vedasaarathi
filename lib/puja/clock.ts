// A tiny external store for "the current minute".
//
// Screens that show today's date - computed in a saved location's own time
// zone - need that date to roll over on its own when the app is left open
// across midnight, without any navigation or user action. A plain
// useSyncExternalStore whose subscribe never emits cannot do that: React only
// re-reads the snapshot on renders triggered by something else, so the date
// goes stale.
//
// This store notifies its subscribers exactly at each minute boundary (a
// minute is fine enough that a date boundary is never missed, coarse enough
// to cost nothing), and tears its timer down when nobody is listening. The
// clock and timer functions are injectable so tests can advance time
// deterministically.

const MS_PER_MINUTE = 60_000;

export interface ClockDeps {
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
}

const realDeps: ClockDeps = {
  now: () => Date.now(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

function floorToMinute(ms: number): number {
  return Math.floor(ms / MS_PER_MINUTE) * MS_PER_MINUTE;
}

export interface MinuteClock {
  /** For useSyncExternalStore's first argument. */
  subscribe: (listener: () => void) => () => void;
  /** The current minute, floored - stable across a single render pass. */
  getSnapshot: () => number;
  /** Stable value for server rendering and hydration. */
  getServerSnapshot: () => number;
}

export function createMinuteClock(deps: ClockDeps = realDeps): MinuteClock {
  const listeners = new Set<() => void>();
  let timer: unknown = null;

  function scheduleNextTick(): void {
    if (listeners.size === 0) return;
    const msUntilBoundary = MS_PER_MINUTE - (deps.now() % MS_PER_MINUTE);
    timer = deps.setTimer(() => {
      timer = null;
      // Copy first: a listener may unsubscribe while being notified.
      for (const listener of [...listeners]) listener();
      scheduleNextTick();
    }, msUntilBoundary);
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    if (listeners.size === 1) scheduleNextTick();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && timer !== null) {
        deps.clearTimer(timer);
        timer = null;
      }
    };
  }

  function getSnapshot(): number {
    return floorToMinute(deps.now());
  }

  function getServerSnapshot(): number {
    return 0;
  }

  return { subscribe, getSnapshot, getServerSnapshot };
}

// The single app-wide instance. HomeScreen's "today" date follows this.
const minuteClock = createMinuteClock();
export const subscribeToMinute = minuteClock.subscribe;
export const getMinuteSnapshot = minuteClock.getSnapshot;
export const getServerMinuteSnapshot = minuteClock.getServerSnapshot;

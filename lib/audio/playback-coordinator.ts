// One process-wide audio-playback coordinator for the guided puja.
//
// WHY THIS EXISTS
// A step can offer several audio sources: the app-hosted instruction MP3, the
// app-hosted mantra-pronunciation MP3, and — only as a fallback — the device's
// own speech synthesis. Exactly one of them may sound at a time. Every player
// registers a handle here on mount and unregisters on unmount. Asking the
// coordinator to play one source (by id) stops every other registered source
// first, so two recordings can never play together. Navigation (step change,
// Previous, Home, finish) and any unmount call stopAll().
//
// This module holds no React or DOM types; each caller passes a `stop` closure
// that does whatever that player needs (pause an <audio>, cancel speech, reset
// component state). `stop` MUST be idempotent. Handles are keyed by `id`, so
// callers may pass a fresh object each render as long as the id is stable.

export interface PlaybackHandle {
  /** Stable id for this source, e.g. "audio:/audio/v1/x.te.plain.mp3" or
   *  "audio:device-speech". Two sources must never share an id. */
  id: string;
  /** Stop this source immediately. Called by play() on every other handle, by
   *  stopAll(), and on unregister. Must be safe to call when already stopped. */
  stop: () => void;
}

const handles = new Map<string, PlaybackHandle>();
let activeId: string | null = null;

/** Register a handle. Returns an unregister function that also stops it. Call
 *  register() once on mount and the returned function once on unmount. */
export function register(handle: PlaybackHandle): () => void {
  handles.set(handle.id, handle);
  return () => {
    // Only remove if a newer registration under the same id has not replaced it.
    if (handles.get(handle.id) === handle) handles.delete(handle.id);
    if (activeId === handle.id) activeId = null;
    try {
      handle.stop();
    } catch {
      /* a stop() that throws must not break unmount */
    }
  };
}

/** Make the source with this id the sole sounding one: stop every other
 *  registered handle first, then record this id as active. Call immediately
 *  before actually starting playback (audio.play(), speechSynthesis.speak()). */
export function play(id: string): void {
  for (const [otherId, handle] of handles) {
    if (otherId !== id) {
      try {
        handle.stop();
      } catch {
        /* ignore */
      }
    }
  }
  activeId = id;
}

/** A source reports it has stopped or ended on its own. Clears `active` if it
 *  was holding it; never touches other handles. */
export function release(id: string): void {
  if (activeId === id) activeId = null;
}

/** Stop every registered audio source. Call on step change, Previous, Home,
 *  puja completion, and component unmount. */
export function stopAll(): void {
  activeId = null;
  for (const handle of handles.values()) {
    try {
      handle.stop();
    } catch {
      /* ignore */
    }
  }
}

/** The id of the source currently holding playback, or null. For tests and
 *  debugging only. */
export function activePlaybackId(): string | null {
  return activeId;
}

/** How many handles are registered right now. For tests only. */
export function registeredPlaybackCount(): number {
  return handles.size;
}

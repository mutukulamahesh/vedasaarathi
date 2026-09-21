// Playback control for device narration: speak, replay, pause, resume, stop.
//
// The browser's SpeechSynthesis object is injected rather than referenced
// globally, so this logic is testable with a plain fake and carries no DOM
// dependency of its own. Speech rate/pitch/volume are fixed, conservative
// defaults - this is plain-instruction narration for a beginner, not a
// performance.

import type { NarrationVoice } from "./voices";

/** Slower than natural speech, easier to follow for a first-time listener. */
export const SPEECH_RATE = 0.85;
export const SPEECH_PITCH = 1;
export const SPEECH_VOLUME = 1;

/**
 * The utterance fields this module sets. A real SpeechSynthesisUtterance
 * satisfies this structurally.
 */
export interface UtteranceLike {
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
  voice: unknown;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

/** The subset of window.speechSynthesis this module calls. */
export interface SpeechSynthesisLike {
  speak(utterance: UtteranceLike): void;
  cancel(): void;
  pause(): void;
  resume(): void;
}

export type UtteranceFactory = (text: string) => UtteranceLike;

export interface SpeechHandlers {
  onEnd?: () => void;
  onError?: () => void;
}

export interface SpeechController {
  /** Cancel anything in progress and speak from the start. */
  speak(
    text: string,
    voice: NarrationVoice | null,
    lang: string,
    handlers?: SpeechHandlers,
  ): void;
  pause(): void;
  resume(): void;
  /** Cancel narration entirely. */
  stop(): void;
}

/**
 * Build a controller around an injected synthesis object. Real usage passes
 * window.speechSynthesis and createBrowserUtterance; tests pass a fake.
 */
export function createSpeechController(
  synth: SpeechSynthesisLike,
  createUtterance: UtteranceFactory,
): SpeechController {
  return {
    speak(text, voice, lang, handlers = {}) {
      synth.cancel();
      const utterance = createUtterance(text);
      utterance.lang = lang;
      utterance.rate = SPEECH_RATE;
      utterance.pitch = SPEECH_PITCH;
      utterance.volume = SPEECH_VOLUME;
      utterance.voice = voice;
      utterance.onend = handlers.onEnd ?? null;
      utterance.onerror = handlers.onError ?? null;
      synth.speak(utterance);
    },
    pause() {
      synth.pause();
    },
    resume() {
      synth.resume();
    },
    stop() {
      synth.cancel();
    },
  };
}

/** Real SpeechSynthesisUtterance, wrapped to the minimal shape this module needs. */
export function createBrowserUtterance(text: string): UtteranceLike {
  return new SpeechSynthesisUtterance(text) as unknown as UtteranceLike;
}

/** The real browser speech synthesis controller. Call only after checking availability. */
export function browserSpeechController(): SpeechController {
  return createSpeechController(
    window.speechSynthesis as unknown as SpeechSynthesisLike,
    createBrowserUtterance,
  );
}

export function hasSpeechSynthesisSupport(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

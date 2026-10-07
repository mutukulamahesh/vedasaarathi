"use client";

// The application coordinator. This file owns navigation state and wires the
// platform screens together; it holds no ritual content of its own. Puja
// content reaches these screens only through the generic PujaDefinition
// objects served by lib/puja/catalogue.ts - this file never imports
// RITUAL_STEPS, MATERIALS, patri content, or PILOT_FESTIVAL directly.

import {
  ArrowLeft, CalendarDays, CircleUserRound, House, MapPin, PlayCircle, Search,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { HomeScreen } from "@/components/platform/home-screen";
import { LocationScreen } from "@/components/platform/location-screen";
import { PujaCatalogueScreen, PujaDetailScreen } from "@/components/platform/puja-catalogue-screen";
import { OfflineDownload } from "@/components/platform/offline-download";
import { PeopleScreen } from "@/components/platform/people-screen";
import { PrepareScreen } from "@/components/platform/prepare-screen";
import { SankalpamSetupScreen } from "@/components/platform/sankalpam-setup-screen";
import { PujaScreen } from "@/components/platform/puja-screen";
import { CompleteScreen } from "@/components/platform/complete-screen";
import { ReviewerModeScreen } from "@/components/platform/reviewer-mode-screen";
import { CandidateReviewScreen } from "@/components/platform/candidate-review-screen";
import { PostPujaScreen } from "@/components/platform/post-puja-screen";
import { CalendarScreen } from "@/components/platform/calendar-screen";
import { SearchScreen } from "@/components/platform/search-screen";
import { AboutScreen, COPYRIGHT_LINE } from "@/components/platform/about-screen";
import { EntryTopicLinks } from "@/components/entry/entry-topic-links";
import type { SearchRoute } from "@/lib/search";
import {
  ENTRY_TARGETS, entryPath, htmlLang, SIBLING_LINK_LABEL,
  type EntryLanguage, type EntryTarget, type EntryTopic,
} from "@/lib/entry-pages";

import {
  activeParticipants, createParticipant, validateParticipants,
  withLineageField,
  type LineageField, type LineageFieldKey, type Participant, type ParticipantMode,
} from "@/lib/content/participants";
import { locationSummaryLabel } from "@/lib/location/model";
import {
  getLocationSnapshot, getServerLocationSnapshot, requestLocationClear,
  subscribeToLocation, updateLocationState,
} from "@/lib/storage/location";
import { epochDay } from "@/lib/puja/calendar";
import {
  getMinuteSnapshot, getServerMinuteSnapshot, subscribeToMinute,
} from "@/lib/puja/clock";
import {
  availablePujas, findPujaBySlug, MORE_PUJAS_COMING_MESSAGE, MORE_PUJAS_COMING_MESSAGE_TE,
} from "@/lib/puja/catalogue";
import { panchangaForLocation, type LocationPanchanga } from "@/lib/panchanga";
import { defaultSankalpamChoices } from "@/lib/sankalpam";
import {
  getProgressSnapshot, getRun, getServerProgressSnapshot, requestRunReset,
  subscribeToProgress, updateProgress, withRun,
  type PreparationProgress, type PujaRun,
} from "@/lib/storage/preparation";
import {
  getServerVoicesSnapshot, getVoicesSnapshot, subscribeToVoices,
} from "@/lib/speech/voices";
import {
  getPresentationModeSnapshot, getServerPresentationModeSnapshot,
  setPresentationMode, subscribeToPresentationMode,
} from "@/lib/storage/presentation-mode";

// Re-exported so existing tests that load this module can keep rendering
// these platform components directly, unchanged by the split.
export { HomeScreen } from "@/components/platform/home-screen";
export { LocationScreen } from "@/components/platform/location-screen";
export { CandidateSelect, LineageFieldRow } from "@/components/platform/people-screen";
export { PrepareScreen } from "@/components/platform/prepare-screen";
export { SankalpamSetupScreen } from "@/components/platform/sankalpam-setup-screen";
export { PujaScreen } from "@/components/platform/puja-screen";
export { CompleteScreen } from "@/components/platform/complete-screen";
export { ReportCorrectionPanel } from "@/components/platform/report-correction";
export { PujaCatalogueScreen, PujaDetailScreen } from "@/components/platform/puja-catalogue-screen";
export { PostPujaScreen } from "@/components/platform/post-puja-screen";
export { CandidateReviewScreen } from "@/components/platform/candidate-review-screen";
export { CalendarScreen } from "@/components/platform/calendar-screen";
export { SearchScreen } from "@/components/platform/search-screen";
export { AboutScreen } from "@/components/platform/about-screen";

export type Screen =
  | "home" | "location" | "pujas" | "puja-detail" | "people" | "prepare"
  | "sankalpam-setup" | "puja" | "complete" | "immersion" | "reviewer-mode"
  | "candidate-review" | "calendar" | "search" | "about";

const PREVIOUS_SCREEN: Record<Screen, Screen> = {
  home: "home",
  location: "home",
  pujas: "home",
  "puja-detail": "pujas",
  people: "home",
  prepare: "home",
  "sankalpam-setup": "prepare",
  puja: "sankalpam-setup",
  complete: "home",
  immersion: "complete",
  "reviewer-mode": "home",
  "candidate-review": "home",
  calendar: "home",
  search: "home",
  about: "home",
};

/** Screens that show the primary bottom navigation. */
const MAIN_NAV_SCREENS: readonly Screen[] = ["home", "calendar", "search", "pujas", "people"];

/** Bilingual labels for the primary navigation and the Back control. Internal
 * screen ids are unchanged — only the display text is translated. */
const NAV_LABEL: Record<"EN" | "TE", Record<"home" | "calendar" | "search" | "pujas" | "people", string>> = {
  EN: { home: "Home", calendar: "Calendar", search: "Search", pujas: "Pujas", people: "People" },
  TE: { home: "హోమ్", calendar: "క్యాలెండర్", search: "వెతకండి", pujas: "పూజలు", people: "వ్యక్తులు" },
};
const BACK_LABEL: Record<"EN" | "TE", string> = { EN: "Back", TE: "వెనుకకు" };

/** A public entry page (lib/entry-pages.ts) this app was opened from: the
 * topic decides which existing screen opens first; the language is the
 * language of THAT link. Topic-level only - never a person, place or any
 * saved detail. */
export interface AppEntry {
  topic: EntryTopic;
  language: EntryLanguage;
}

/** The history state for the first entry this page load owns: the entry
 * page's screen (with Calendar's month/day/rule focus, exactly what an in-app
 * link to it pushes), or plain "home" for "/". Only screen ids and a
 * year/month/date/rule id - never anything personal. */
function initialHistoryState(target: EntryTarget | null): Record<string, unknown> {
  if (!target) return { vsScreen: "home" };
  if (target.screen === "calendar") {
    return {
      vsScreen: "calendar",
      calendarYM: target.calendarYM,
      calendarISO: target.calendarISO,
      calendarRuleId: target.calendarRuleId,
      calendarFocus: target.calendarFocus,
    };
  }
  return { vsScreen: target.screen };
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

export default function Home() {
  return <VedaSaarathiApp />;
}

/**
 * The whole app. "/" renders it with no entry; each public entry page
 * (app/<topic>/page.tsx, app/te/<topic>/page.tsx) renders it with `entry`
 * set, so the page opens straight into the real, existing screen for that
 * topic, plus `entryContent`: that page's server-rendered topic text, shown
 * with that screen.
 */
export function VedaSaarathiApp({
  entry = null,
  entryContent = null,
}: {
  entry?: AppEntry | null;
  entryContent?: ReactNode;
} = {}) {
  const entryTarget: EntryTarget | null = entry ? ENTRY_TARGETS[entry.topic] : null;
  const progress = useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    getServerProgressSnapshot,
  );
  const { mode, participants, language: savedLanguage } = progress;
  // An entry link's own language (e.g. /te/panchangam) sets the language of
  // THIS visit, without touching the saved preference: it is kept only in
  // memory and is never written to storage, so the next plain visit to "/"
  // still opens in the visitor's own saved language. Choosing a language
  // with the global selector (or the puja screen's own toggle) is an
  // explicit choice: it saves that preference, exactly as on "/", and ends
  // the entry override.
  const [entryLanguage, setEntryLanguage] = useState<EntryLanguage | null>(entry?.language ?? null);
  const language = entryLanguage ?? savedLanguage;
  const activeList = activeParticipants(mode, participants);

  // The device-voice list, refreshed via the browser's voiceschanged event
  // (voices commonly load asynchronously). See lib/speech/voices.ts.
  const voices = useSyncExternalStore(
    subscribeToVoices,
    getVoicesSnapshot,
    getServerVoicesSnapshot,
  );

  const location = useSyncExternalStore(
    subscribeToLocation,
    getLocationSnapshot,
    getServerLocationSnapshot,
  );

  const presentationMode = useSyncExternalStore(
    subscribeToPresentationMode,
    getPresentationModeSnapshot,
    getServerPresentationModeSnapshot,
  );
  // REVIEWER shows review status, source/provenance information, and draft
  // warnings throughout the flow; FAMILY_BETA (the default) shows one
  // app-level beta notice instead. Neither mode changes canDisplayAsGuidance
  // or any content's reviewStatus/provenance - see components/platform/
  // review-display.tsx and puja-screen.tsx/prepare-screen.tsx for exactly
  // what this does and does not affect.
  const reviewMode = presentationMode === "REVIEWER";

  const todayEpochDay = useSyncExternalStore(
    () => () => {},
    () => epochDay(Date.now()),
    () => 0,
  );
  // Current minute, for showing today's date in the saved location's own
  // time zone (see HomeScreen). The clock store (lib/puja/clock.ts) actually
  // emits at each minute boundary, so the date rolls over on its own if the
  // app is left open across midnight - a bare `() => () => {}` subscription
  // never would. Its snapshot is minute-floored (stable within a render) and
  // its server snapshot is a fixed 0.
  const nowMs = useSyncExternalStore(
    subscribeToMinute,
    getMinuteSnapshot,
    getServerMinuteSnapshot,
  );

  // Panchanga for the saved location, recomputed each minute for the CURRENT
  // date only (the historical fixtures / festival scan are build-verified, not
  // run here). The library is loaded lazily on the client.
  //
  // A NEW location resets immediately, synchronously, in render: showing a
  // previous location's Panchanga even for a frame would be a real
  // correctness bug (Sankalpam, festival dates and everything else key off
  // it). A routine per-minute recompute for the SAME location - including
  // one that crosses midnight into a new civil day - does NOT reset first;
  // the effect below always recomputes on every `nowMs` change regardless,
  // and swaps the result in once it resolves, without tearing the reading
  // area down - and back up - on every tick, which used to reset any open
  // <details>, scroll position and keyboard focus inside it once a minute.
  // A failed calculation still clears to an explicit error state
  // unconditionally, whatever triggered the recompute, so a stale result is
  // never silently left on screen looking current.
  const [panchanga, setPanchanga] = useState<LocationPanchanga | null>(null);
  const [panchangaStatus, setPanchangaStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  const locationKey =
    location.status === "READY"
      ? `${location.latitude},${location.longitude},${location.timezone}`
      : "idle";
  // "" is never a real key, so the first render with a READY location also
  // triggers the reset → the loading state shows immediately, not only on
  // later location changes.
  const [seenLocationKey, setSeenLocationKey] = useState("");
  if (locationKey !== seenLocationKey) {
    setSeenLocationKey(locationKey);
    setPanchanga(null);
    setPanchangaStatus(locationKey === "idle" ? "idle" : "loading");
  }

  // What `panchanga` was ACTUALLY computed for - not tearing the reading area
  // down on a routine refresh (above) means the OLD result can otherwise sit
  // on screen, unlabelled, while a new civil day has already begun (a
  // midnight rollover) or while the recompute for the current minute is still
  // in flight (right at a Tithi/Nakshatra transition instant, the just-held
  // element can itself have already expired). This is deliberately separate
  // state, not folded into `panchanga` itself, so every consumer can still
  // read the last-known values (never blanked) while the UI decides whether
  // to label them as still current.
  const [panchangaMeta, setPanchangaMeta] = useState<
    { locationKey: string; civilDate: string; computedAtMs: number } | null
  >(null);
  const civilDateKey = (ms: number, tz: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(ms));
  useEffect(() => {
    if (location.status !== "READY" || nowMs <= 0) return undefined;
    let alive = true;
    const requestLocationKey = locationKey;
    const requestCivilDate = civilDateKey(nowMs, location.timezone);
    panchangaForLocation(location, nowMs).then(
      (p) => {
        if (!alive) return;
        setPanchanga(p);
        setPanchangaStatus("ready");
        setPanchangaMeta({ locationKey: requestLocationKey, civilDate: requestCivilDate, computedAtMs: nowMs });
      },
      () => {
        if (!alive) return;
        setPanchanga(null);
        setPanchangaStatus("error");
        setPanchangaMeta(null);
      },
    );
    return () => { alive = false; };
  }, [location, nowMs, locationKey]);

  // "Try again" after a failed Panchanga calculation reloads the page rather
  // than retrying in place. This is a deliberate, verified choice, not an
  // oversight: the most likely real cause of a failed FIRST load is the
  // Panchanga engine's lazily-loaded chunk failing to fetch (a network
  // hiccup), and browsers do not re-issue a network request for the exact
  // same dynamic import() specifier after it has failed once, however many
  // more times it is called with the same specifier - confirmed directly
  // (see .review-shots/_import-cache-check.mjs in the corresponding PR) - so
  // an in-place retry alone cannot recover from that case; only a reload
  // (which clears the module map) reliably can. Everything the app needs to
  // resume exactly where the person left off - saved location, language,
  // participants, puja progress - lives in localStorage, not in memory, so a
  // reload loses nothing.
  const retryPanchanga = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  // True exactly when the currently-HELD `panchanga` (last one actually
  // resolved) no longer reliably describes "now": either it was computed for
  // a different civil day (a midnight rollover is pending a fresh result), or
  // one of its own Tithi/Nakshatra values has individually passed its own end
  // time already (the narrow gap right at a transition instant, before that
  // minute's recompute has resolved). `ready` (below) stays true either way -
  // the reading area and any open disclosure stay exactly as they are; only
  // the affected VALUES switch to a short "updating" state instead of
  // presenting the stale ones as current.
  const currentCivilDate =
    location.status === "READY" && nowMs > 0 ? civilDateKey(nowMs, location.timezone) : "";
  const panchangaDayStale =
    panchangaMeta !== null &&
    (panchangaMeta.locationKey !== locationKey || panchangaMeta.civilDate !== currentCivilDate);
  // Kept separate per field (rather than one combined flag) so a Tithi
  // transition doesn't also blank an unrelated, still-current Nakshatra, and
  // vice versa - each field's own "updating" state only appears where that
  // field is actually stale.
  const tithiFieldExpired = (panchanga?.fields ?? []).some(
    (f) => f.key === "tithi" && f.endsAtMs !== undefined && f.endsAtMs <= nowMs,
  );
  const nakshatraFieldExpired = (panchanga?.fields ?? []).some(
    (f) => f.key === "nakshatra" && f.endsAtMs !== undefined && f.endsAtMs <= nowMs,
  );
  const tithiPending = panchangaDayStale || tithiFieldExpired;
  const nakshatraPending = panchangaDayStale || nakshatraFieldExpired;

  // Browser/system Back and Forward follow the app's own screen history
  // instead of immediately leaving the app: every `setScreen` call pushes one
  // history entry carrying only the screen id (never a name, coordinate, or
  // any other saved detail - those already live in localStorage, not the URL
  // or history state) at the unchanged "/" path, so nothing personal is ever
  // visible in the address bar or a shared/synced browser history. Going Back
  // past the first entry this session pushed (or Forward past the last one)
  // is untouched browser behavior - a `popstate` with no recognizable state
  // is simply ignored here, so leaving the app normally still works and
  // nobody can get trapped inside it. No routing library is used: this is a
  // few lines of the standard History API around the existing screen state.
  const [screen, setScreenState] = useState<Screen>(entryTarget?.screen ?? "home");
  const poppingHistoryRef = useRef(false);
  // Declared here (ahead of the popstate effect below, which restores these
  // on Back/Forward) rather than down with the other screen-focus hints -
  // see that effect for why.
  // An entry page that opens Calendar starts with that page's own focus (the
  // same values an in-app link to it would set).
  const entryCalendar = entryTarget?.screen === "calendar" ? entryTarget : null;
  const [calendarFocus, setCalendarFocus] = useState<"festivals" | null>(entryCalendar?.calendarFocus ?? null);
  const [calendarInitialYM, setCalendarInitialYM] = useState<{ year: number; month: number } | null>(
    entryCalendar?.calendarYM ?? null,
  );
  const [calendarInitialISO, setCalendarInitialISO] = useState<string | null>(entryCalendar?.calendarISO ?? null);
  // The festival rule that date was opened for (Search / Home), so Calendar
  // can reveal THAT entry - never another festival sharing the date.
  const [calendarInitialRuleId, setCalendarInitialRuleId] = useState<string | null>(
    entryCalendar?.calendarRuleId ?? null,
  );
  // Where "Save people and continue" on the People screen goes next. Explicit
  // and set by whichever screen actually sent the user to People - never a
  // hardcoded destination (e.g. Vinayaka's own "prepare" screen), so a future
  // puja's own preparation screen works the same way, not just Vinayaka's.
  // "home" covers People opened directly (bottom nav, search) - saving there
  // returns to Home, not into any puja. Not persisted to localStorage: a
  // refresh already resets `screen` itself to "home" with nothing else
  // surviving in memory, so there is no stale value that could silently
  // disagree with it - see goToPeopleFor and the popstate handler below for
  // how it stays correct across Back/Forward instead.
  const [peopleReturnTo, setPeopleReturnTo] = useState<Screen>("home");
  // pushState is a side effect and must NOT run inside a setState updater
  // function - React may call an updater more than once for one logical
  // update (Strict Mode's double-invoke in dev is the obvious case, but
  // concurrent re-renders can too), which would push duplicate history
  // entries. setScreen is a plain event-handler-style function (called from
  // onClick etc., not itself a state updater), so it reads the current
  // `screen` directly from the closure - always fresh, since this function is
  // redefined every render - does its ONE pushState call, then updates state.
  //
  // `extra` carries screen-specific detail needed to restore that exact view
  // on Back/Forward (currently only Calendar's requested month/day/focus -
  // see openCalendarAtDate below). It is NOT personal data (just a
  // year/month/ISO date and a UI-section id), consistent with the existing
  // "nothing personal in pushed history state" invariant. Component state
  // like calendarInitialISO is still set directly by the caller for the
  // forward-navigation case; `extra` only matters when a LATER popstate
  // needs to reconstruct it, since the render-time reset below (screen !==
  // focusOwnerScreen) clears that component state as soon as Calendar is
  // left.
  const setScreen = (next: Screen, extra?: Record<string, unknown>) => {
    if (next === screen) return;
    if (!poppingHistoryRef.current && typeof window !== "undefined") {
      window.history.pushState({ vsScreen: next, ...extra }, "", window.location.pathname);
    }
    setScreenState(next);
  };
  // The first history entry this page load owns: "home" on "/", or the entry
  // page's own screen, so Back/Forward through it restores that screen.
  const initialHistoryRef = useRef(initialHistoryState(entryTarget));
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.history.replaceState(initialHistoryRef.current, "", window.location.pathname);
    const isScreen = (v: unknown): v is Screen =>
      typeof v === "string" && Object.prototype.hasOwnProperty.call(PREVIOUS_SCREEN, v);
    const onPopState = (event: PopStateEvent) => {
      const state = event.state as {
        vsScreen?: unknown; calendarYM?: { year: number; month: number } | null;
        calendarISO?: string | null; calendarFocus?: "festivals" | null;
        calendarRuleId?: unknown;
        peopleReturnTo?: unknown;
      } | null;
      const candidate = state?.vsScreen;
      const next = isScreen(candidate) ? candidate : "home";
      poppingHistoryRef.current = true;
      setScreenState(next);
      // Restore Calendar's requested month/day/focus from this history
      // entry's own state, rather than leaving it to whatever
      // calendarInitialYM/ISO happen to hold right now - those were already
      // cleared by the render-time reset the moment the user left Calendar,
      // so without this a Forward back to a festival's Calendar view would
      // reopen on today's date instead. A plain Calendar visit (bottom-nav
      // click, no festival) pushed no calendar* fields, so this correctly
      // falls back to null - the current-month view - for that case.
      if (next === "calendar") {
        setCalendarInitialYM(state?.calendarYM ?? null);
        setCalendarInitialISO(state?.calendarISO ?? null);
        setCalendarFocus(state?.calendarFocus ?? null);
        setCalendarInitialRuleId(typeof state?.calendarRuleId === "string" ? state.calendarRuleId : null);
      }
      // Same reasoning as Calendar's restore above: this history entry's own
      // peopleReturnTo, not whatever the in-memory value currently is, so
      // "Save" after a Back/Forward round trip to People still goes to the
      // right place. Falls back to "home" if this entry never set it.
      if (next === "people") {
        const returnTo = state?.peopleReturnTo;
        setPeopleReturnTo(isScreen(returnTo) ? returnTo : "home");
      }
      poppingHistoryRef.current = false;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // Deliberately empty deps: this wires up the History API exactly once per
    // mount, using the stable setScreenState/setCalendarInitialYM/
    // setCalendarInitialISO/setCalendarFocus setters and the module-level
    // PREVIOUS_SCREEN map - nothing here should re-run on every screen change.
  }, []);
  const [prepHint, setPrepHint] = useState(false);
  // A search result can ask Home / Calendar / Pujas to bring a section into
  // view. The hint is cleared once the user leaves that screen by any other
  // route.
  const [homeFocus, setHomeFocus] = useState<"today" | null>(
    entryTarget?.screen === "home" ? entryTarget.homeFocus : null,
  );
  const [pujasFocus, setPujasFocus] = useState<"offline" | null>(null);
  // calendarFocus/calendarInitialYM/calendarInitialISO are declared above,
  // ahead of the popstate effect.
  // Drop a stale focus hint the moment the user is somewhere else (render-time
  // reset, matching the Panchanga-key pattern above — no effect setState).
  const [focusOwnerScreen, setFocusOwnerScreen] = useState<Screen>(entryTarget?.screen ?? "home");
  if (screen !== focusOwnerScreen) {
    setFocusOwnerScreen(screen);
    if (screen !== "home") setHomeFocus(null);
    if (screen !== "calendar") {
      setCalendarFocus(null);
      setCalendarInitialYM(null);
      setCalendarInitialISO(null);
      setCalendarInitialRuleId(null);
    }
    if (screen !== "pujas") setPujasFocus(null);
  }
  // A search result can ask Pujas to bring the offline-download section into
  // view once that screen has actually rendered.
  useEffect(() => {
    if (screen !== "pujas" || pujasFocus !== "offline") return;
    const el = typeof document !== "undefined" ? document.getElementById("offline-download") : null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [screen, pujasFocus]);
  // The puja selected from the catalogue. Defaults to the only available
  // puja so the existing Home-screen fast paths ("Get puja ready", "My
  // puja") keep working without a trip through the catalogue first.
  const [selectedPujaSlug, setSelectedPujaSlug] = useState<string | null>(
    () => {
      const entrySlug = entryTarget && "pujaSlug" in entryTarget ? entryTarget.pujaSlug : null;
      return entrySlug && findPujaBySlug(entrySlug) ? entrySlug : availablePujas()[0]?.slug ?? null;
    },
  );
  const featuredPuja = availablePujas()[0] ?? null;
  const selectedPuja =
    (selectedPujaSlug ? findPujaBySlug(selectedPujaSlug) : undefined) ?? featuredPuja ?? undefined;

  // Run state (step, path, materials, patri, lifecycle) is scoped to the
  // selected puja's slug - starting one puja never carries state into another.
  const runSlug = selectedPuja?.slug ?? "";
  const run: PujaRun = getRun(progress, runSlug);
  const { stepIndex, pujaPath, availableMaterialIds, patriSelfReport } = run;
  const sankalpamChoices = run.sankalpamChoices ?? defaultSankalpamChoices();

  // Home's "Get puja ready" / "My puja" quick-access and "Sankalpam" search
  // result act on the featured puja specifically, so they pin the selection
  // to it before routing on - kept isolated from whatever puja is currently
  // selected for the detail / preparation / guided screens.
  const featuredSlug = featuredPuja?.slug ?? "";

  /** Update shared (person-level) fields: mode / participants / language. */
  const patch = (update: Partial<PreparationProgress>) =>
    updateProgress((current) => ({ ...current, ...update }));

  /** Update the selected puja's own run. */
  const patchRun = (update: Partial<PujaRun>) =>
    updateProgress((current) => withRun(current, runSlug, update));

  /** An explicit language choice: saved, as on "/", and it ends any entry
   * link's in-memory language for this visit. */
  const chooseLanguage = (next: "EN" | "TE") => {
    setEntryLanguage(null);
    patch({ language: next });
  };

  const goHome = () => {
    setScreen("home");
  };

  /** Send the user to People, remembering where "Save people and continue"
   * should go afterward - the screen that actually wanted this (its own
   * "prepare"/"sankalpam-setup"/"puja", or "home" for a direct visit), never
   * a hardcoded screen, so a future puja's own preparation works the same
   * way. See peopleReturnTo's declaration above for why this isn't persisted
   * beyond component state + history. */
  const goToPeopleFor = (returnTo: Screen) => {
    // Already on People (e.g. its own bottom-nav tab clicked again): leave
    // the existing return destination alone rather than silently swapping
    // it, matching setScreen's own no-op-if-unchanged behavior.
    if (screen === "people") return;
    setPeopleReturnTo(returnTo);
    setScreen("people", { peopleReturnTo: returnTo });
  };
  /** "Save people and continue" on the People screen itself. */
  const finishPeople = () => {
    setPrepHint(false);
    setScreen(peopleReturnTo);
  };

  // Preparation and the guided puja are only reachable once every active
  // participant passes full validation (a name, and a value for any detail
  // marked "I know it"). Otherwise the user is sent to the People screen.
  const openPreparation = () => {
    if (validateParticipants(activeList).valid) {
      setPrepHint(false);
      setScreen("prepare");
    } else {
      setPrepHint(true);
      goToPeopleFor("prepare");
    }
  };

  // Resume the guided puja at the saved step, without resetting stepIndex.
  const resumePuja = () => {
    if (validateParticipants(activeList).valid) {
      setPrepHint(false);
      setScreen("puja");
    } else {
      setPrepHint(true);
      goToPeopleFor("puja");
    }
  };

  const selectPuja = (slug: string) => {
    setSelectedPujaSlug(slug);
    setScreen("puja-detail");
  };

  const changeMode = (next: ParticipantMode) =>
    updateProgress((current) => {
      // The stored list is never truncated; "Only me" just uses the first
      // profile, so switching back to family keeps everyone.
      if (next !== "SELF" && current.participants.length === 0) {
        return {
          ...current,
          mode: next,
          participants: [createParticipant()],
        };
      }
      return { ...current, mode: next };
    });

  const addParticipant = () =>
    updateProgress((current) => ({
      ...current,
      participants: [...current.participants, createParticipant()],
    }));

  const removeParticipant = (id: string) =>
    updateProgress((current) => ({
      ...current,
      participants:
        current.participants.length > 1
          ? current.participants.filter((person) => person.id !== id)
          : current.participants,
    }));

  const updateParticipant = (id: string, update: Partial<Participant>) =>
    updateProgress((current) => ({
      ...current,
      participants: current.participants.map((person) =>
        person.id === id ? { ...person, ...update } : person,
      ),
    }));

  const updateLineage = (
    id: string,
    key: LineageFieldKey,
    update: Partial<LineageField>,
  ) =>
    updateProgress((current) => ({
      ...current,
      participants: current.participants.map((person) =>
        person.id === id ? withLineageField(person, key, update) : person,
      ),
    }));

  const restart = () => {
    // "Start again": resets ONLY the current puja's run after a confirm.
    // Participants, mode, lineage and location are kept.
    if (requestRunReset(runSlug)) {
      setPrepHint(false);
      goHome();
    }
  };

  /** "Sankalpam" from search / calendar: preparation, then its setup screen. */
  const goToSankalpam = () => {
    if (featuredSlug) setSelectedPujaSlug(featuredSlug);
    if (validateParticipants(activeList).valid) {
      setPrepHint(false);
      setScreen("sankalpam-setup");
    } else {
      setPrepHint(true);
      goToPeopleFor("sankalpam-setup");
    }
  };

  /** Open the Vinayaka Chavithi puja from the calendar / search. */
  const openPujaBySlug = (slug: string) => {
    if (findPujaBySlug(slug)) {
      setSelectedPujaSlug(slug);
      setScreen("puja-detail");
    }
  };

  /** Open Calendar on the month containing `dateISO`, with that day selected
   * and the festival list scrolled into view - used by Home's "next
   * observance" line so a festival click opens its real calendar detail
   * instead of only naming a date. `ruleId` names the festival the link was
   * for (Search / Home), so Calendar reveals that entry and not another
   * festival sharing the date. */
  const openCalendarAtDate = (dateISO: string, ruleId: string | null = null) => {
    const [y, m] = dateISO.split("-").map(Number);
    const calendarYM = { year: y, month: m };
    setCalendarInitialYM(calendarYM);
    setCalendarInitialISO(dateISO);
    setCalendarInitialRuleId(ruleId);
    setCalendarFocus("festivals");
    // Also carried in the pushed history entry (not just component state), so
    // a later Back/Forward through this entry can restore the exact festival
    // date and rule - see the popstate handler above.
    setScreen("calendar", {
      calendarYM, calendarISO: dateISO, calendarRuleId: ruleId, calendarFocus: "festivals",
    });
  };

  /** "View full festival calendar" from Home's (bounded, 3-row) festival
   * card — opens Calendar on the CURRENT month (no specific date forced),
   * with the festival list scrolled into view. */
  const viewFullFestivalCalendar = () => {
    setCalendarInitialYM(null);
    setCalendarInitialISO(null);
    setCalendarInitialRuleId(null);
    setCalendarFocus("festivals");
    setScreen("calendar", { calendarYM: null, calendarISO: null, calendarRuleId: null, calendarFocus: "festivals" });
  };

  /** Every search result routes to a real working screen. A route may also
   * ask the destination to scroll a section into view. */
  const handleSearchNavigate = (route: SearchRoute) => {
    setHomeFocus(null);
    setCalendarFocus(null);
    setPujasFocus(null);
    switch (route) {
      case "vinayaka-puja": return openPujaBySlug("vinayaka-chavithi");
      case "sankalpam": return goToSankalpam();
      case "today-panchanga": setHomeFocus("today"); return setScreen("home");
      case "calendar": return setScreen("calendar");
      case "calendar-festivals":
        setCalendarFocus("festivals");
        return setScreen("calendar", { calendarFocus: "festivals" });
      case "people": return goToPeopleFor("home");
      case "location": return setScreen("location");
      case "offline-download": setPujasFocus("offline"); return setScreen("pujas");
      default: return setScreen("home");
    }
  };

  /** True while an entry page's own server-rendered topic text (or, after a
   * language switch, the link to its other-language version) is shown. */
  const showsEntryTopic = Boolean(entry && entryTarget && screen === entryTarget.screen && entryContent);

  return (
    <main className="app-shell">
      <section className="phone-shell">
        <header className="topbar">
          {screen === "home" ? (
            <div className="brand-lockup">
              <div className="brand-mark" aria-hidden="true">ॐ</div>
              <div>
                <div className="brand-name">VedaSaarathi</div>
                <button className="location-button" onClick={() => setScreen("location")}>
                  <MapPin size={14} /> {locationSummaryLabel(location)}
                </button>
              </div>
            </div>
          ) : screen === "sankalpam-setup" ? (
            // The Sankalpam screen provides its own single, contextual Back
            // control (its sub-views need a Back that returns to the summary,
            // not to preparation) — no duplicate top-bar Back here.
            <span className="topbar-title">{BACK_LABEL[language] === "Back" ? "Sankalpam" : "సంకల్పం"}</span>
          ) : (
            <button className="back-button" onClick={() => setScreen(PREVIOUS_SCREEN[screen])}>
              <ArrowLeft size={20} /> {BACK_LABEL[language]}
            </button>
          )}
          {/* One clear global language selector, available on every screen -
              before setup, before entering a puja, and persisted (it is
              progress.language, the same field used everywhere else). */}
          <div className="global-lang-toggle" role="group" aria-label={language === "TE" ? "భాష" : "Language"}>
            <button
              type="button"
              className={language === "EN" ? "active" : ""}
              aria-pressed={language === "EN"}
              onClick={() => chooseLanguage("EN")}
            >
              English
            </button>
            <button
              type="button"
              className={language === "TE" ? "active" : ""}
              aria-pressed={language === "TE"}
              lang="te"
              onClick={() => chooseLanguage("TE")}
            >
              తెలుగు
            </button>
          </div>
        </header>

        {screen === "home" && (
          <HomeScreen
            setScreen={setScreen}
            reviewMode={reviewMode}
            todayEpochDay={todayEpochDay}
            nowMs={nowMs}
            location={location}
            panchanga={panchanga}
            panchangaStatus={panchangaStatus}
            panchangaDayStale={panchangaDayStale}
            tithiPending={tithiPending}
            nakshatraPending={nakshatraPending}
            language={language}
            focusHint={homeFocus}
            onOpenFestival={openCalendarAtDate}
            onViewFullCalendar={viewFullFestivalCalendar}
            onStartPuja={openPujaBySlug}
            onOpenPeople={() => goToPeopleFor("home")}
            onRetryPanchanga={retryPanchanga}
          />
        )}
        {screen === "location" && (
          <LocationScreen
            location={location}
            saveLocation={(next) => updateLocationState(() => next)}
            setLocationStatus={(status) =>
              updateLocationState((current) =>
                current.status === "READY" ? current : { status },
              )}
            clearLocation={() => requestLocationClear()}
            onSaved={goHome}
            language={language}
          />
        )}
        {screen === "pujas" && (
          <>
            <PujaCatalogueScreen
              pujas={availablePujas()}
              comingSoonMessage={language === "TE" ? MORE_PUJAS_COMING_MESSAGE_TE : MORE_PUJAS_COMING_MESSAGE}
              onSelect={selectPuja}
              language={language}
            />
            <div id="offline-download" data-focus={pujasFocus === "offline" ? "true" : undefined}>
              <OfflineDownload language={language} />
            </div>
          </>
        )}
        {screen === "puja-detail" && selectedPuja && (
          <PujaDetailScreen
            puja={selectedPuja}
            onBegin={openPreparation}
            canResume={run.runState === "IN_PROGRESS" && activeList.length > 0}
            onResume={resumePuja}
            reviewMode={reviewMode}
            language={language}
          />
        )}
        {screen === "people" && (
          <PeopleScreen
            mode={mode}
            changeMode={changeMode}
            participants={participants}
            addParticipant={addParticipant}
            removeParticipant={removeParticipant}
            updateParticipant={updateParticipant}
            updateLineage={updateLineage}
            prepHint={prepHint}
            done={finishPeople}
            language={language}
            reviewMode={reviewMode}
          />
        )}
        {screen === "prepare" && selectedPuja && (
          <PrepareScreen
            puja={selectedPuja}
            activeList={activeList}
            availableMaterialIds={availableMaterialIds}
            toggleMaterial={(id) =>
              patchRun({ availableMaterialIds: toggleValue(availableMaterialIds, id) })}
            patriSelfReport={patriSelfReport}
            setPatriSelfReport={(value) => patchRun({ patriSelfReport: value })}
            pujaPath={pujaPath}
            setPujaPath={(value) => patchRun({ pujaPath: value, stepIndex: 0, runState: "NOT_STARTED" })}
            goToPeople={() => goToPeopleFor("prepare")}
            start={() => {
              if (validateParticipants(activeList).valid) {
                setScreen("sankalpam-setup");
              } else {
                setPrepHint(true);
                goToPeopleFor("sankalpam-setup");
              }
            }}
            reviewMode={reviewMode}
            mode={mode}
            location={location}
            panchanga={panchanga}
            sankalpamChoices={sankalpamChoices}
            language={language}
          />
        )}
        {screen === "sankalpam-setup" && selectedPuja && (
          <SankalpamSetupScreen
            activeList={activeList}
            mode={mode}
            location={location}
            panchanga={panchanga}
            choices={sankalpamChoices}
            setChoices={(next) => patchRun({ sankalpamChoices: next })}
            purpose={selectedPuja.displayName ?? "this puja"}
            slug={selectedPuja.slug}
            language={language}
            back={() => setScreen("prepare")}
            begin={() => {
              if (validateParticipants(activeList).valid) {
                patchRun({ stepIndex: 0, runState: "IN_PROGRESS" });
                setScreen("puja");
              } else {
                setPrepHint(true);
                goToPeopleFor("puja");
              }
            }}
          />
        )}
        {screen === "puja" && selectedPuja && (
          <PujaScreen
            puja={selectedPuja}
            stepIndex={stepIndex}
            setStepIndex={(index) => patchRun({ stepIndex: index })}
            finish={() => {
              patchRun({ runState: "COMPLETED" });
              setScreen("complete");
            }}
            path={pujaPath}
            language={language}
            setLanguage={chooseLanguage}
            activeList={activeList}
            mode={mode}
            location={location}
            reviewMode={reviewMode}
            voices={voices}
            panchanga={panchanga}
            sankalpamChoices={sankalpamChoices}
            setSankalpamChoices={(next) => patchRun({ sankalpamChoices: next })}
          />
        )}
        {screen === "complete" && (
          <CompleteScreen
            home={goHome}
            restart={restart}
            immersion={selectedPuja?.postPujaGuidance ? () => setScreen("immersion") : null}
            puja={selectedPuja ?? null}
            path={pujaPath}
            language={language}
          />
        )}
        {screen === "immersion" && selectedPuja?.postPujaGuidance && (
          <PostPujaScreen
            guidance={selectedPuja.postPujaGuidance}
            home={goHome}
            reviewMode={reviewMode}
            language={language}
          />
        )}
        {screen === "calendar" && (
          <CalendarScreen
            location={location}
            nowMs={nowMs}
            language={language}
            reviewMode={reviewMode}
            openPuja={openPujaBySlug}
            goToLocation={() => setScreen("location")}
            focusFestivals={calendarFocus === "festivals"}
            initialYearMonth={calendarInitialYM}
            initialDateISO={calendarInitialISO}
            initialRuleId={calendarInitialRuleId}
          />
        )}
        {screen === "search" && (
          <SearchScreen
            language={language}
            onNavigate={handleSearchNavigate}
            location={location}
            nowMs={nowMs}
            onOpenFestival={openCalendarAtDate}
          />
        )}
        {screen === "about" && <AboutScreen language={language} />}
        {screen === "reviewer-mode" && (
          <ReviewerModeScreen mode={presentationMode} setMode={setPresentationMode} />
        )}
        {screen === "candidate-review" && reviewMode && (
          <CandidateReviewScreen reviewerLabel="Proposed reviewer (not yet reviewed)" />
        )}

        {/* The entry page's own server-rendered topic text, with the screen it
            opened. If the visitor has since chosen the other language, that
            text is not shown in the wrong language: a real link to this
            page's other-language version is shown instead. */}
        {showsEntryTopic && entry ? (
          language === entry.language ? (
            <div className="entry-topic-slot">{entryContent}</div>
          ) : (
            <p className="entry-topic-switch" lang={htmlLang(language)}>
              <a href={entryPath(entry.topic, language)} hrefLang={htmlLang(language)}>
                {SIBLING_LINK_LABEL[language]} →
              </a>
            </p>
          )
        ) : null}

        {MAIN_NAV_SCREENS.includes(screen) && (
          <>
            {screen === "home" && (
              <button className="about-link" onClick={() => setScreen("about")}>
                {language === "TE" ? "వేదసారథి గురించి" : "About VedaSaarathi"}
              </button>
            )}
            {/* One compact line of ordinary <a href> links to the public
                topic pages, so "/" still links to them for readers and
                crawlers. Left out where an entry page's own topic text
                (which ends with the same links) is already shown. */}
            {screen === "home" && !showsEntryTopic && (
              <EntryTopicLinks language={language} />
            )}
            {screen === "home" && <p className="home-footer" lang="en">{COPYRIGHT_LINE}</p>}
            <nav className="bottom-nav" aria-label="Primary navigation">
              <button className={screen === "home" ? "active" : ""} onClick={() => setScreen("home")} aria-current={screen === "home" ? "page" : undefined}>
                <House size={21} /><span>{NAV_LABEL[language].home}</span>
              </button>
              <button className={screen === "calendar" ? "active" : ""} onClick={() => setScreen("calendar")} aria-current={screen === "calendar" ? "page" : undefined}>
                <CalendarDays size={21} /><span>{NAV_LABEL[language].calendar}</span>
              </button>
              <button className={screen === "search" ? "active" : ""} onClick={() => setScreen("search")} aria-current={screen === "search" ? "page" : undefined}>
                <Search size={21} /><span>{NAV_LABEL[language].search}</span>
              </button>
              <button className={screen === "pujas" ? "active" : ""} onClick={() => setScreen("pujas")} aria-current={screen === "pujas" ? "page" : undefined}>
                <PlayCircle size={21} /><span>{NAV_LABEL[language].pujas}</span>
              </button>
              <button className={screen === "people" ? "active" : ""} onClick={() => goToPeopleFor("home")} aria-current={screen === "people" ? "page" : undefined}>
                <CircleUserRound size={21} /><span>{NAV_LABEL[language].people}</span>
              </button>
            </nav>
          </>
        )}
      </section>
    </main>
  );
}

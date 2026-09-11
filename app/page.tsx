"use client";

// The application coordinator. This file owns navigation state and wires the
// platform screens together; it holds no ritual content of its own. Puja
// content reaches these screens only through the generic PujaDefinition
// objects served by lib/puja/catalogue.ts - this file never imports
// RITUAL_STEPS, MATERIALS, patri content, or PILOT_FESTIVAL directly.

import {
  ArrowLeft, CalendarDays, CircleUserRound, House, MapPin, PlayCircle, Search,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { HomeScreen } from "@/components/platform/home-screen";
import { LocationScreen } from "@/components/platform/location-screen";
import { PujaCatalogueScreen, PujaDetailScreen } from "@/components/platform/puja-catalogue-screen";
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
import type { SearchRoute } from "@/lib/search";

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
import { getPujaMaterialReadiness } from "@/lib/puja/types";
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

export type Screen =
  | "home" | "location" | "pujas" | "puja-detail" | "people" | "prepare"
  | "sankalpam-setup" | "puja" | "complete" | "immersion" | "reviewer-mode"
  | "candidate-review" | "calendar" | "search";

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

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

export default function Home() {
  const progress = useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    getServerProgressSnapshot,
  );
  const { mode, participants, language } = progress;
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
  // run here). The library is loaded lazily on the client. When the location
  // or minute changes we clear the previous result immediately and show a
  // loading state, so a prior location's Panchanga is never left on screen; a
  // failed calculation shows a clear "unavailable" state.
  const [panchanga, setPanchanga] = useState<LocationPanchanga | null>(null);
  const [panchangaStatus, setPanchangaStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");
  // Reset synchronously in render when the request changes, so a previous
  // location's Panchanga is never left on screen for a frame.
  const panchangaKey =
    location.status === "READY" && nowMs > 0
      ? `${location.latitude},${location.longitude},${location.timezone},${Math.floor(nowMs / 60_000)}`
      : "idle";
  // "" is never a real key, so the first render with a READY location also
  // triggers the reset → the loading state shows immediately, not only on later
  // location / minute changes.
  const [seenPanchangaKey, setSeenPanchangaKey] = useState("");
  if (panchangaKey !== seenPanchangaKey) {
    setSeenPanchangaKey(panchangaKey);
    setPanchanga(null);
    setPanchangaStatus(panchangaKey === "idle" ? "idle" : "loading");
  }
  useEffect(() => {
    if (location.status !== "READY" || nowMs <= 0) return undefined;
    let alive = true;
    panchangaForLocation(location, nowMs).then(
      (p) => { if (alive) { setPanchanga(p); setPanchangaStatus("ready"); } },
      () => { if (alive) { setPanchanga(null); setPanchangaStatus("error"); } },
    );
    return () => { alive = false; };
  }, [location, nowMs]);

  const [screen, setScreen] = useState<Screen>("home");
  const [prepHint, setPrepHint] = useState(false);
  // A search result can ask Home / Calendar to bring a section into view. The
  // hint is cleared once the user leaves that screen by any other route.
  const [homeFocus, setHomeFocus] = useState<"today" | "offline" | null>(null);
  const [calendarFocus, setCalendarFocus] = useState<"festivals" | null>(null);
  // Drop a stale focus hint the moment the user is somewhere else (render-time
  // reset, matching the Panchanga-key pattern above — no effect setState).
  const [focusOwnerScreen, setFocusOwnerScreen] = useState<Screen>("home");
  if (screen !== focusOwnerScreen) {
    setFocusOwnerScreen(screen);
    if (screen !== "home") setHomeFocus(null);
    if (screen !== "calendar") setCalendarFocus(null);
  }
  // The puja selected from the catalogue. Defaults to the only available
  // puja so the existing Home-screen fast paths ("Get puja ready", "My
  // puja") keep working without a trip through the catalogue first.
  const [selectedPujaSlug, setSelectedPujaSlug] = useState<string | null>(
    () => availablePujas()[0]?.slug ?? null,
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

  // The Home screen shows the *featured* puja card, so its progress must come
  // from the featured puja's own run - never from whichever puja is currently
  // selected for the detail / preparation / guided screens. Material readiness
  // is path-aware: Simple counts only Simple-path items, Complete counts its
  // own; a stale Complete-only marked id does not inflate a Simple total.
  const featuredSlug = featuredPuja?.slug ?? "";
  const featuredRun: PujaRun = getRun(progress, featuredSlug);
  const featuredReadiness = featuredPuja
    ? getPujaMaterialReadiness(
        featuredPuja,
        featuredRun.availableMaterialIds,
        featuredRun.pujaPath,
      )
    : null;

  /** Update shared (person-level) fields: mode / participants / language. */
  const patch = (update: Partial<PreparationProgress>) =>
    updateProgress((current) => ({ ...current, ...update }));

  /** Update the selected puja's own run. */
  const patchRun = (update: Partial<PujaRun>) =>
    updateProgress((current) => withRun(current, runSlug, update));

  const goHome = () => {
    setScreen("home");
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
      setScreen("people");
    }
  };

  // Resume the guided puja at the saved step, without resetting stepIndex.
  const resumePuja = () => {
    if (validateParticipants(activeList).valid) {
      setPrepHint(false);
      setScreen("puja");
    } else {
      setPrepHint(true);
      setScreen("people");
    }
  };

  // Home's "Get puja ready" / "Resume" act on the featured puja card, so point
  // the selection at the featured puja before entering preparation or the
  // guided puja. This keeps the featured card isolated from the catalogue
  // selection in both directions.
  const openFeaturedPreparation = () => {
    if (featuredSlug) setSelectedPujaSlug(featuredSlug);
    openPreparation();
  };
  const resumeFeaturedPuja = () => {
    if (featuredSlug) setSelectedPujaSlug(featuredSlug);
    resumePuja();
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
      setScreen("people");
    }
  };

  /** Open the Vinayaka Chavithi puja from the calendar / search. */
  const openPujaBySlug = (slug: string) => {
    if (findPujaBySlug(slug)) {
      setSelectedPujaSlug(slug);
      setScreen("puja-detail");
    }
  };

  /** Every search result routes to a real working screen. A route may also
   * ask the destination to scroll a section into view. */
  const handleSearchNavigate = (route: SearchRoute) => {
    setHomeFocus(null);
    setCalendarFocus(null);
    switch (route) {
      case "vinayaka-puja": return openPujaBySlug("vinayaka-chavithi");
      case "sankalpam": return goToSankalpam();
      case "today-panchanga": setHomeFocus("today"); return setScreen("home");
      case "calendar": return setScreen("calendar");
      case "calendar-festivals": setCalendarFocus("festivals"); return setScreen("calendar");
      case "people": return setScreen("people");
      case "location": return setScreen("location");
      case "offline-download": setHomeFocus("offline"); return setScreen("home");
      default: return setScreen("home");
    }
  };

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
              onClick={() => patch({ language: "EN" })}
            >
              English
            </button>
            <button
              type="button"
              className={language === "TE" ? "active" : ""}
              aria-pressed={language === "TE"}
              lang="te"
              onClick={() => patch({ language: "TE" })}
            >
              తెలుగు
            </button>
          </div>
        </header>

        {screen === "home" && (
          <HomeScreen
            setScreen={setScreen}
            openPreparation={openFeaturedPreparation}
            resumePuja={resumeFeaturedPuja}
            reviewMode={reviewMode}
            mode={mode}
            participantCount={activeList.length}
            materialsReady={featuredReadiness?.available ?? 0}
            materialsTotal={featuredReadiness?.total ?? 0}
            savedStepIndex={featuredRun.stepIndex}
            savedPath={featuredRun.pujaPath}
            runState={featuredRun.runState}
            todayEpochDay={todayEpochDay}
            nowMs={nowMs}
            location={location}
            featuredPuja={featuredPuja}
            panchanga={panchanga}
            panchangaStatus={panchangaStatus}
            language={language}
            focusHint={homeFocus}
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
          />
        )}
        {screen === "pujas" && (
          <PujaCatalogueScreen
            pujas={availablePujas()}
            comingSoonMessage={language === "TE" ? MORE_PUJAS_COMING_MESSAGE_TE : MORE_PUJAS_COMING_MESSAGE}
            onSelect={selectPuja}
            language={language}
          />
        )}
        {screen === "puja-detail" && selectedPuja && (
          <PujaDetailScreen puja={selectedPuja} onBegin={openPreparation} reviewMode={reviewMode} language={language} />
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
            done={openPreparation}
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
            goToPeople={() => setScreen("people")}
            start={() => {
              if (validateParticipants(activeList).valid) {
                setScreen("sankalpam-setup");
              } else {
                setPrepHint(true);
                setScreen("people");
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
                setScreen("people");
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
            setLanguage={(value) => patch({ language: value })}
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
          />
        )}
        {screen === "search" && (
          <SearchScreen language={language} onNavigate={handleSearchNavigate} />
        )}
        {screen === "reviewer-mode" && (
          <ReviewerModeScreen mode={presentationMode} setMode={setPresentationMode} />
        )}
        {screen === "candidate-review" && reviewMode && (
          <CandidateReviewScreen reviewerLabel="Proposed reviewer (not yet reviewed)" />
        )}

        {MAIN_NAV_SCREENS.includes(screen) && (
          <>
            {screen === "home" && (
              <button className="reviewer-mode-link" onClick={() => setScreen("reviewer-mode")}>
                For invited priests: Reviewer mode
              </button>
            )}
            {screen === "home" && reviewMode && (
              <button className="reviewer-mode-link" onClick={() => setScreen("candidate-review")}>
                Open the Vinayaka Chavithi puja candidate review
              </button>
            )}
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
              <button className={screen === "people" ? "active" : ""} onClick={() => setScreen("people")} aria-current={screen === "people" ? "page" : undefined}>
                <CircleUserRound size={21} /><span>{NAV_LABEL[language].people}</span>
              </button>
            </nav>
          </>
        )}
      </section>
    </main>
  );
}

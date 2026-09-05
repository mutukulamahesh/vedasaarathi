"use client";

// The application coordinator. This file owns navigation state and wires the
// platform screens together; it holds no ritual content of its own. Puja
// content reaches these screens only through the generic PujaDefinition
// objects served by lib/puja/catalogue.ts - this file never imports
// RITUAL_STEPS, MATERIALS, patri content, or PILOT_FESTIVAL directly.

import {
  ArrowLeft, CalendarDays, CircleUserRound, House, MapPin, PlayCircle,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { BetaNotice } from "@/components/platform/review-display";
import { HomeScreen } from "@/components/platform/home-screen";
import { LocationScreen } from "@/components/platform/location-screen";
import { PujaCatalogueScreen, PujaDetailScreen } from "@/components/platform/puja-catalogue-screen";
import { PeopleScreen } from "@/components/platform/people-screen";
import { PrepareScreen } from "@/components/platform/prepare-screen";
import { PujaScreen } from "@/components/platform/puja-screen";
import { CompleteScreen } from "@/components/platform/complete-screen";
import { ReviewerModeScreen } from "@/components/platform/reviewer-mode-screen";
import { PostPujaScreen } from "@/components/platform/post-puja-screen";

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
import { availablePujas, findPujaBySlug, MORE_PUJAS_COMING_MESSAGE } from "@/lib/puja/catalogue";
import {
  getProgressSnapshot, getServerProgressSnapshot, requestReset,
  subscribeToProgress, updateProgress, type PreparationProgress,
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
export { PujaScreen } from "@/components/platform/puja-screen";
export { CompleteScreen } from "@/components/platform/complete-screen";
export { PujaCatalogueScreen, PujaDetailScreen } from "@/components/platform/puja-catalogue-screen";
export { PostPujaScreen } from "@/components/platform/post-puja-screen";

export type Screen =
  | "home" | "location" | "pujas" | "puja-detail" | "people" | "prepare"
  | "puja" | "complete" | "immersion" | "reviewer-mode";

const PREVIOUS_SCREEN: Record<Screen, Screen> = {
  home: "home",
  location: "home",
  pujas: "home",
  "puja-detail": "pujas",
  people: "home",
  prepare: "home",
  puja: "prepare",
  complete: "home",
  immersion: "complete",
  "reviewer-mode": "home",
};

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
  const { mode, participants, availableMaterialIds, patriSelfReport, stepIndex, pujaPath, language } =
    progress;
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
  // Current timestamp for showing today's date in the saved location's own
  // time zone (see HomeScreen). Rounded to the minute - a date boundary
  // never falls inside one - so repeated calls within a single render return
  // the same value; useSyncExternalStore requires a stable snapshot, and
  // Date.now() alone changes every call, which forces React into an
  // infinite re-render loop ("Maximum update depth exceeded"). Same SSR-safe
  // pattern as todayEpochDay above - server snapshot is 0, never a guessed
  // real time.
  const nowMs = useSyncExternalStore(
    () => () => {},
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0,
  );

  const [screen, setScreen] = useState<Screen>("home");
  const [prepHint, setPrepHint] = useState(false);
  // The puja selected from the catalogue. Defaults to the only available
  // puja so the existing Home-screen fast paths ("Get puja ready", "My
  // puja") keep working without a trip through the catalogue first.
  const [selectedPujaSlug, setSelectedPujaSlug] = useState<string | null>(
    () => availablePujas()[0]?.slug ?? null,
  );
  const featuredPuja = availablePujas()[0] ?? null;
  const selectedPuja =
    (selectedPujaSlug ? findPujaBySlug(selectedPujaSlug) : undefined) ?? featuredPuja ?? undefined;

  const patch = (update: Partial<PreparationProgress>) =>
    updateProgress((current) => ({ ...current, ...update }));

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
    // requestReset asks the user to confirm before clearing saved progress.
    if (requestReset()) {
      setPrepHint(false);
      goHome();
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
          ) : (
            <button className="back-button" onClick={() => setScreen(PREVIOUS_SCREEN[screen])}>
              <ArrowLeft size={20} /> Back
            </button>
          )}
          {screen === "home" && (
            <span className="lang-note">Telugu version is being prepared</span>
          )}
        </header>

        {presentationMode === "FAMILY_BETA" && <BetaNotice />}

        {screen === "home" && (
          <HomeScreen
            setScreen={setScreen}
            openPreparation={openPreparation}
            mode={mode}
            participantCount={activeList.length}
            materialsReady={availableMaterialIds.length}
            todayEpochDay={todayEpochDay}
            nowMs={nowMs}
            location={location}
            featuredPuja={featuredPuja}
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
            comingSoonMessage={MORE_PUJAS_COMING_MESSAGE}
            onSelect={selectPuja}
          />
        )}
        {screen === "puja-detail" && selectedPuja && (
          <PujaDetailScreen puja={selectedPuja} onBegin={openPreparation} reviewMode={reviewMode} />
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
          />
        )}
        {screen === "prepare" && selectedPuja && (
          <PrepareScreen
            puja={selectedPuja}
            activeList={activeList}
            availableMaterialIds={availableMaterialIds}
            toggleMaterial={(id) =>
              patch({ availableMaterialIds: toggleValue(availableMaterialIds, id) })}
            patriSelfReport={patriSelfReport}
            setPatriSelfReport={(value) => patch({ patriSelfReport: value })}
            pujaPath={pujaPath}
            setPujaPath={(value) => patch({ pujaPath: value, stepIndex: 0 })}
            goToPeople={() => setScreen("people")}
            start={() => {
              if (validateParticipants(activeList).valid) {
                patch({ stepIndex: 0 });
                setScreen("puja");
              } else {
                setPrepHint(true);
                setScreen("people");
              }
            }}
            reviewMode={reviewMode}
          />
        )}
        {screen === "puja" && selectedPuja && (
          <PujaScreen
            puja={selectedPuja}
            stepIndex={stepIndex}
            setStepIndex={(index) => patch({ stepIndex: index })}
            finish={() => setScreen("complete")}
            path={pujaPath}
            language={language}
            setLanguage={(value) => patch({ language: value })}
            activeList={activeList}
            reviewMode={reviewMode}
            voices={voices}
          />
        )}
        {screen === "complete" && (
          <CompleteScreen
            home={goHome}
            restart={restart}
            immersion={selectedPuja?.postPujaGuidance ? () => setScreen("immersion") : null}
          />
        )}
        {screen === "immersion" && selectedPuja?.postPujaGuidance && (
          <PostPujaScreen
            guidance={selectedPuja.postPujaGuidance}
            home={goHome}
            reviewMode={reviewMode}
          />
        )}
        {screen === "reviewer-mode" && (
          <ReviewerModeScreen mode={presentationMode} setMode={setPresentationMode} />
        )}

        {screen === "home" && (
          <>
            <button className="reviewer-mode-link" onClick={() => setScreen("reviewer-mode")}>
              For invited priests: Reviewer mode
            </button>
            <nav className="bottom-nav" aria-label="Primary navigation">
              <button className="active"><House size={21} /><span>Home</span></button>
              <button disabled aria-label="Calendar - coming soon" title="Coming soon"><CalendarDays size={21} /><span>Calendar</span></button>
              <button onClick={() => setScreen("pujas")}><PlayCircle size={21} /><span>Pujas</span></button>
              <button onClick={() => setScreen("people")}><CircleUserRound size={21} /><span>Profile</span></button>
            </nav>
          </>
        )}
      </section>
    </main>
  );
}

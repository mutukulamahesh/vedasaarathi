"use client";

// VedaSaarathi Simple V1 - the application coordinator.
//
// A controlled product reset (see docs/ for the full platform this branch
// does not touch). Exactly five stages, no bottom navigation, no platform
// screens (calendar, search, people management, participant modes,
// Simple/Complete path choice, Reviewer mode, candidate review) reachable
// from here. Those screens and every engine/content/audio module they use
// are UNCHANGED and still present in the repo for future development - this
// file simply never imports or renders most of them.
//
//   Welcome+location -> Today+festival -> Prepare+Sankalpam -> Guided puja
//   -> Completion

import { useEffect, useState, useSyncExternalStore } from "react";

import { WelcomeScreen } from "@/components/simple/welcome-screen";
import { TodayScreen } from "@/components/simple/today-screen";
import { PrepareSankalpamScreen } from "@/components/simple/prepare-sankalpam-screen";
import { PujaScreen } from "@/components/platform/puja-screen";
import { CompleteScreen } from "@/components/platform/complete-screen";
import { PostPujaScreen } from "@/components/platform/post-puja-screen";

// Re-exported ONLY so pre-existing tests of these still-live, reusable
// platform components (unrelated to this file's own default export) can keep
// importing them via this module, exactly as the full platform's coordinator
// did. Nothing here is rendered by Home() below, and re-exporting an existing
// component adds no new capability.
export { HomeScreen } from "@/components/platform/home-screen";
export { LocationScreen } from "@/components/platform/location-screen";
export { CandidateSelect, LineageFieldRow } from "@/components/platform/people-screen";
export { PeopleScreen } from "@/components/platform/people-screen";
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
export { ReviewerModeScreen } from "@/components/platform/reviewer-mode-screen";

import { createParticipant, type Participant } from "@/lib/content/participants";
import {
  getLocationSnapshot, getServerLocationSnapshot, requestLocationClear,
  subscribeToLocation, updateLocationState,
} from "@/lib/storage/location";
import {
  getMinuteSnapshot, getServerMinuteSnapshot, subscribeToMinute,
} from "@/lib/puja/clock";
import { availablePujas } from "@/lib/puja/catalogue";
import { panchangaForLocation, type LocationPanchanga } from "@/lib/panchanga";
import { defaultSankalpamChoices } from "@/lib/sankalpam";
import {
  getProgressSnapshot, getRun, getServerProgressSnapshot, requestRunReset,
  subscribeToProgress, updateProgress, withRun,
} from "@/lib/storage/preparation";
import {
  getServerVoicesSnapshot, getVoicesSnapshot, subscribeToVoices,
} from "@/lib/speech/voices";

// The one participant id this simplified journey ever writes. Kept stable so
// a saved name/Gotra survives reload/resume.
const FAMILY_PARTICIPANT_ID = "family";

export type SimpleStage = "welcome" | "today" | "prepare" | "puja" | "complete";

// Kept only so components/platform/home-screen.tsx (unused by this
// simplified coordinator, but still a live, reusable file for future
// development) keeps compiling standalone against the full platform's
// original screen-id union.
export type Screen =
  | "home" | "location" | "pujas" | "puja-detail" | "people" | "prepare"
  | "sankalpam-setup" | "puja" | "complete" | "immersion" | "reviewer-mode"
  | "candidate-review" | "calendar" | "search";

export default function Home() {
  const progress = useSyncExternalStore(
    subscribeToProgress, getProgressSnapshot, getServerProgressSnapshot,
  );
  const language = progress.language;
  const participant: Participant =
    progress.participants.find((p) => p.id === FAMILY_PARTICIPANT_ID) ??
    createParticipant(FAMILY_PARTICIPANT_ID);

  const voices = useSyncExternalStore(subscribeToVoices, getVoicesSnapshot, getServerVoicesSnapshot);
  const location = useSyncExternalStore(subscribeToLocation, getLocationSnapshot, getServerLocationSnapshot);
  const nowMs = useSyncExternalStore(subscribeToMinute, getMinuteSnapshot, getServerMinuteSnapshot);

  // Panchanga for the saved location, recomputed each minute for the current
  // civil date. Reset synchronously in render on a key change so a previous
  // location's values are never shown for even one frame; refetched via an
  // effect. This is the SAME approach the full platform's Home screen uses.
  const [panchanga, setPanchanga] = useState<LocationPanchanga | null>(null);
  const [panchangaStatus, setPanchangaStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const panchangaKey =
    location.status === "READY" && nowMs > 0
      ? `${location.latitude},${location.longitude},${location.timezone},${Math.floor(nowMs / 60_000)}`
      : "idle";
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

  const puja = availablePujas()[0] ?? null;
  const runSlug = puja?.slug ?? "";
  const run = getRun(progress, runSlug);
  const sankalpamChoices = run.sankalpamChoices ?? defaultSankalpamChoices();
  const festivalToday = panchanga?.festival?.inDays === 0;

  // Stage starts on Welcome, then is routed ONCE, on mount, to wherever a
  // returning family's saved state says they were (so a reload resumes into
  // Today/an in-progress puja/Completion without needing to re-answer
  // location). After that one-time resume routing, every further stage
  // change comes only from this file's own explicit handlers (Continue,
  // Change location, Start puja, ...) - in particular, saving a location for
  // the first time must NOT silently skip the Welcome screen's own explicit
  // "Continue" action (see components/simple/welcome-screen.tsx and app spec
  // section 1), which a naive "route whenever location.status changes" rule
  // would do, since a fresh NOT_SET->READY save is not distinguishable from
  // the resume case by status alone.
  //
  // The real (non-SSR-placeholder) location/progress snapshots are read
  // directly from the stores in a macrotask after mount, not from the
  // `location`/`run` values already in scope above: those only reflect the
  // real client value once React has re-rendered past the hydration-safe
  // server snapshot, and a plain effect may not call setState synchronously
  // in its own body (see react-hooks/set-state-in-effect) - the same
  // setTimeout-wrapped pattern used in location-screen.tsx for geoSupported.
  const [stage, setStage] = useState<SimpleStage>("welcome");
  useEffect(() => {
    const id = setTimeout(() => {
      const realLocation = getLocationSnapshot();
      if (realLocation.status === "READY") {
        const realRun = getRun(getProgressSnapshot(), availablePujas()[0]?.slug ?? "");
        if (realRun.runState === "IN_PROGRESS") setStage("puja");
        else if (realRun.runState === "COMPLETED") setStage("complete");
        else setStage("today");
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);
  // Murti/keeping-vs-immersion guidance is a DETAIL VIEW of the Completion
  // stage (stage 5), not a separate stage - shown only when the puja
  // actually has post-puja guidance to offer.
  const [showImmersion, setShowImmersion] = useState(false);
  if (stage !== "complete" && showImmersion) setShowImmersion(false);

  const patch = (update: Partial<typeof progress>) =>
    updateProgress((current) => ({ ...current, ...update }));
  const patchRun = (update: Partial<typeof run>) =>
    updateProgress((current) => withRun(current, runSlug, update));
  const setParticipant = (next: Participant) =>
    updateProgress((current) => ({
      ...current,
      mode: "FAMILY",
      participants: [next],
    }));

  const toggleMaterial = (id: string) => {
    const ids = run.availableMaterialIds;
    patchRun({ availableMaterialIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  };

  const goToday = () => setStage("today");
  const startOrPreviewPuja = () => {
    patchRun({ stepIndex: 0, runState: "IN_PROGRESS", pujaPath: "COMPLETE" });
    setStage("puja");
  };
  const restart = () => {
    if (requestRunReset(runSlug)) setStage("today");
  };

  return (
    <main className="app-shell">
      <section className="phone-shell simple-shell">
        {stage === "welcome" && (
          <WelcomeScreen
            location={location}
            saveLocation={(next) => updateLocationState(() => next)}
            setLocationStatus={(status) =>
              updateLocationState((current) => (current.status === "READY" ? current : { status }))}
            clearLocation={() => requestLocationClear()}
            language={language}
            setLanguage={(value) => patch({ language: value })}
            onContinue={goToday}
          />
        )}

        {stage === "today" && (
          <TodayScreen
            location={location}
            panchanga={panchanga}
            panchangaStatus={panchangaStatus}
            nowMs={nowMs}
            language={language}
            onChangeLocation={() => setStage("welcome")}
            onStartPuja={() => setStage("prepare")}
            onPreviewPuja={() => setStage("prepare")}
          />
        )}

        {stage === "prepare" && puja && (
          <PrepareSankalpamScreen
            puja={puja}
            participant={participant}
            setParticipant={setParticipant}
            availableMaterialIds={run.availableMaterialIds}
            toggleMaterial={toggleMaterial}
            location={location}
            panchanga={panchanga}
            choices={sankalpamChoices}
            setChoices={(next) => patchRun({ sankalpamChoices: next })}
            festivalToday={Boolean(festivalToday)}
            language={language}
            onStartPuja={startOrPreviewPuja}
          />
        )}

        {stage === "puja" && puja && (
          <PujaScreen
            puja={puja}
            stepIndex={run.stepIndex}
            setStepIndex={(index) => patchRun({ stepIndex: index })}
            finish={() => {
              patchRun({ runState: "COMPLETED" });
              setStage("complete");
            }}
            path="COMPLETE"
            language={language}
            setLanguage={(value) => patch({ language: value })}
            activeList={participant.name.trim() ? [participant] : []}
            mode="FAMILY"
            location={location}
            reviewMode={false}
            voices={voices}
            panchanga={panchanga}
            sankalpamChoices={sankalpamChoices}
            setSankalpamChoices={(next) => patchRun({ sankalpamChoices: next })}
          />
        )}

        {stage === "complete" && showImmersion && puja?.postPujaGuidance && (
          <PostPujaScreen
            guidance={puja.postPujaGuidance}
            home={() => { setShowImmersion(false); goToday(); }}
            reviewMode={false}
            language={language}
          />
        )}
        {stage === "complete" && !showImmersion && (
          <CompleteScreen
            home={goToday}
            restart={restart}
            immersion={puja?.postPujaGuidance ? () => setShowImmersion(true) : null}
            puja={puja}
            path="COMPLETE"
            language={language}
            allowCorrectionReport={false}
          />
        )}
      </section>
    </main>
  );
}

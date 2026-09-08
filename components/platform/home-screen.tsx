"use client";

// The platform home screen. It reads puja content only through the generic
// PujaDefinition passed in as `featuredPuja` - never RITUAL_STEPS, MATERIALS,
// patri content, or PILOT_FESTIVAL directly.
//
// FAMILY_BETA shows an honest compact "today" card: the saved location and the
// Gregorian date calculated in that location's timezone - nothing else. No
// "Pilot data" label, no "Being verified" Tithi/Nakshatra, no placeholder
// sunrise, no fabricated festival countdown. REVIEWER mode may show
// Panchanga-development diagnostics. Real Panchanga is a separately tracked
// feature.

import {
  BookOpenCheck, CalendarDays, Check, ChevronRight, ListChecks, MapPin,
  Sparkles, UsersRound,
} from "lucide-react";

import type { LocationState } from "@/lib/location/model";
import { locationSummaryLabel } from "@/lib/location/model";
import type { ParticipantMode } from "@/lib/content/participants";
import type { PujaDefinition, PujaPathId } from "@/lib/puja/types";
import { stepsForPujaPath } from "@/lib/puja/types";
import type { PujaRunState } from "@/lib/storage/preparation";
import { formatTodayInTimezone } from "@/lib/puja/calendar";
import { formatEpochDay, pujaFestivalCountdown } from "@/lib/puja/festival";
import type { Screen } from "@/app/page";

const MODE_SUMMARY: Record<ParticipantMode, string> = {
  SELF: "Only me",
  FAMILY: "My family",
  GROUP: "Students or friends",
};

export function HomeScreen({
  setScreen, openPreparation, resumePuja, reviewMode = false, mode, participantCount,
  materialsReady, savedStepIndex = 0, savedPath = "SIMPLE", runState = "NOT_STARTED",
  todayEpochDay, nowMs, location, featuredPuja,
}: {
  setScreen: (screen: Screen) => void;
  openPreparation: () => void;
  /** Jump straight into the guided puja at the saved step (no reset). */
  resumePuja?: () => void;
  reviewMode?: boolean;
  mode: ParticipantMode;
  participantCount: number;
  materialsReady: number;
  /** Saved guided-puja step index, for the "Resume" affordance. */
  savedStepIndex?: number;
  savedPath?: PujaPathId;
  /** Explicit run lifecycle for the featured puja. */
  runState?: PujaRunState;
  todayEpochDay: number;
  /** Current timestamp, used only to show today's date in the saved location's
   * own time zone. */
  nowMs: number;
  location: LocationState;
  featuredPuja: PujaDefinition | null;
}) {
  const savedTotal = featuredPuja
    ? stepsForPujaPath(featuredPuja, savedPath).length
    : 0;
  const pujaCompleted = runState === "COMPLETED";
  // Resume shows for a genuinely unfinished run - including a run left on
  // step 1 (stepIndex === 0), because IN_PROGRESS is set the moment a path
  // is started.
  const canResume =
    Boolean(resumePuja) && runState === "IN_PROGRESS" && participantCount > 0;
  const locationLabel = locationSummaryLabel(location);
  const locationReady = location.status === "READY";
  const localizedToday = locationReady
    ? formatTodayInTimezone(nowMs, location.timezone)
    : null;
  const todayLabel = localizedToday ?? formatEpochDay(todayEpochDay) ?? "Today";
  const festival = featuredPuja?.festival ?? null;
  const countdown = festival
    ? pujaFestivalCountdown(todayEpochDay, festival)
    : ({ state: "unknown" } as const);
  const totalMaterials = featuredPuja?.materials.items.length ?? 0;

  return (
    <div className="content">
      <div className="welcome-row">
        <div>
          <p className="kicker">NAMASKARAM</p>
          <h1>Welcome</h1>
          <p className="welcome-copy">Here is what matters today.</p>
        </div>
      </div>
      {!locationReady && (
        <button className="location-nudge" onClick={() => setScreen("location")}>
          <MapPin size={16} />
          <span>
            <strong>{locationLabel}</strong>
            <small>Save your location so dates are calculated for your city.</small>
          </span>
          <ChevronRight size={16} />
        </button>
      )}

      <article className="today-card">
        <p className="eyebrow">
          {locationReady ? `TODAY IN ${locationLabel.toUpperCase()}` : "TODAY"}
        </p>
        <h2>{todayLabel}</h2>
        {locationReady ? (
          <p className="plain-note">
            Gregorian date in your saved time zone ({location.timezone}). Tithi,
            Nakshatra, sunrise and festival timings are not calculated yet.
          </p>
        ) : (
          <button className="source-link" onClick={() => setScreen("location")}>
            <MapPin size={14} /> Set your location
          </button>
        )}
        {reviewMode && (
          <div className="panchanga-grid">
            <div><span>Tithi</span><strong>Not calculated (dev)</strong></div>
            <div><span>Nakshatra</span><strong>Not calculated (dev)</strong></div>
            <div><span>Sunrise</span><strong>Not calculated (dev)</strong></div>
          </div>
        )}
      </article>

      <div className="section-title-row"><h2>Featured puja</h2><button disabled aria-label="Monthly calendar - coming soon" title="Coming soon">Coming soon</button></div>
      {featuredPuja ? (
        <article className="festival-card">
          <div className="festival-summary">
            <div className="festival-symbol"><Sparkles size={25} /></div>
            <div className="festival-copy">
              <h3>{featuredPuja.displayName}</h3>
              <p>Home puja</p>
            </div>
          </div>
          <button className="participant-box full-button" onClick={() => setScreen("people")}>
            <div>
              <UsersRound size={18} />
              <span>
                {MODE_SUMMARY[mode]} ·{" "}
                {participantCount === 1 ? "1 person" : `${participantCount} people`}
              </span>
            </div>
            <span>Change <ChevronRight size={15} /></span>
          </button>
          {materialsReady > 0 && (
            <div className="resume-line">
              <Check size={15} /> {materialsReady} of {totalMaterials} items marked ready
            </div>
          )}
          {pujaCompleted && (
            <div className="resume-line">
              <Check size={15} /> {savedPath === "SIMPLE" ? "Simple" : "Complete"} puja completed
            </div>
          )}
          {canResume && (
            <div className="resume-line">
              <Check size={15} /> {savedPath === "SIMPLE" ? "Simple" : "Complete"} puja in progress ·
              step {Math.min(savedStepIndex, Math.max(savedTotal - 1, 0)) + 1} of {savedTotal}
              <button className="link-button" onClick={resumePuja}>Resume</button>
            </div>
          )}
          <div className="festival-actions">
            <button className="secondary-action" onClick={() => setScreen("people")}>
              <UsersRound size={17} /> Add people
            </button>
            <button className="primary-action" onClick={openPreparation}>
              <ListChecks size={17} /> {pujaCompleted ? "Start a new puja" : canResume ? "Restart puja" : "Get puja ready"}
            </button>
          </div>
          {reviewMode && festival && (
            <p className="reviewer-diagnostic">
              Reviewer diagnostics: pilot festival date {festival.dateISO}
              {countdown.state === "upcoming" ? ` (${countdown.days} days out, epoch-day math)` : ""}.
              Not a validated per-location calculation.
            </p>
          )}
        </article>
      ) : (
        <article className="festival-card">
          <p>No puja is available yet.</p>
        </article>
      )}
      <div className="section-title-row"><h2>Quick access</h2></div>
      <div className="quick-grid">
        <button disabled aria-label="Festival calendar - coming soon" title="Coming soon"><CalendarDays size={22} /><span>Calendar (soon)</span></button>
        <button onClick={openPreparation}><BookOpenCheck size={22} /><span>My puja</span></button>
        <button onClick={() => setScreen("pujas")}><Sparkles size={22} /><span>Pujas</span></button>
        <button onClick={() => setScreen("people")}><UsersRound size={22} /><span>People</span></button>
      </div>
    </div>
  );
}

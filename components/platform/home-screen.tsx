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
import type { LocationPanchanga } from "@/lib/panchanga";
import { formatTodayInTimezone } from "@/lib/puja/calendar";
import { formatEpochDay, pujaFestivalCountdown } from "@/lib/puja/festival";
import type { Screen } from "@/app/page";

const MODE_SUMMARY: Record<ParticipantMode, string> = {
  SELF: "Only me",
  FAMILY: "My family",
  GROUP: "Students or friends",
};

const PANCHANGA_LABEL: Record<"sunrise" | "sunset" | "tithi" | "nakshatra", string> = {
  sunrise: "Sunrise",
  sunset: "Sunset",
  tithi: "Tithi",
  nakshatra: "Nakshatra",
};

const CONTEXT_LABEL: Record<
  "samvatsara" | "ayana" | "ritu" | "masa" | "paksha" | "vaara", string
> = {
  samvatsara: "Samvatsara",
  ayana: "Ayana",
  ritu: "Ritu",
  masa: "Masa",
  paksha: "Paksha",
  vaara: "Vaara",
};

export function HomeScreen({
  setScreen, openPreparation, resumePuja, reviewMode = false, mode, participantCount,
  materialsReady, materialsTotal = 0, savedStepIndex = 0, savedPath = "SIMPLE",
  runState = "NOT_STARTED", todayEpochDay, nowMs, location, featuredPuja,
  panchanga = null, panchangaStatus = "idle",
}: {
  setScreen: (screen: Screen) => void;
  openPreparation: () => void;
  /** Jump straight into the guided puja at the saved step (no reset). */
  resumePuja?: () => void;
  reviewMode?: boolean;
  mode: ParticipantMode;
  participantCount: number;
  /** Featured puja's path-aware material readiness: how many applicable items
   * are marked, and the total applicable to that run's selected path. */
  materialsReady: number;
  materialsTotal?: number;
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
  /** Validated Panchanga for the saved location (released fields only), or
   * null while loading / on error / when no location is set. See lib/panchanga. */
  panchanga?: LocationPanchanga | null;
  panchangaStatus?: "idle" | "loading" | "ready" | "error";
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

        {locationReady && panchangaStatus === "loading" && (
          <p className="panchanga-loading" role="status">
            Calculating today&rsquo;s panchanga for {locationLabel}&hellip;
          </p>
        )}

        {locationReady && panchangaStatus === "ready" && panchanga && panchanga.hasAny && (
          <>
            <dl className="panchanga-values">
              {panchanga.fields.map((f) => (
                <div key={f.key}>
                  <dt>{PANCHANGA_LABEL[f.key]}</dt>
                  <dd>
                    {f.value}
                    {f.endsAt && <span className="until"> · until {f.endsAt}</span>}
                    {f.atSunrise && (
                      <span className="at-sunrise"> · at sunrise: {f.atSunrise}</span>
                    )}
                  </dd>
                </div>
              ))}
              {panchanga.context.map((c) => (
                <div key={c.key}>
                  <dt>{CONTEXT_LABEL[c.key]}</dt>
                  <dd>
                    {c.value}
                    {c.note && <span className="context-note"> · {c.note}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {panchanga.festival && (
              <p className="panchanga-festival">
                <strong>Next {panchanga.festival.name}:</strong>{" "}
                {panchanga.festival.dateISO}
                {panchanga.festival.inDays === 0
                  ? " (today)"
                  : panchanga.festival.inDays > 0
                    ? ` (in ${panchanga.festival.inDays} day${panchanga.festival.inDays === 1 ? "" : "s"})`
                    : ""}
                {panchanga.festival.pujaWindow && (
                  <span className="until">
                    {" "}· Madhyahna puja window {panchanga.festival.pujaWindow.start}–
                    {panchanga.festival.pujaWindow.end}
                  </span>
                )}
              </p>
            )}
          </>
        )}

        {locationReady ? (
          <p className="plain-note">
            {panchangaStatus === "error"
              ? "Today’s panchanga could not be calculated for this location right now. "
              : panchangaStatus === "loading"
                ? `Gregorian date in your saved time zone (${location.timezone}). `
                : panchangaStatus === "ready" && panchanga && panchanga.hasAny
                  ? "Calculated for your location. The calculation method has been checked against selected published Panchanga examples. "
                  : `Gregorian date in your saved time zone (${location.timezone}). Tithi, Nakshatra and sunrise are not calculated yet. `}
            {panchanga && !panchanga.festivalUnavailable
              ? "The Vinayaka Chavithi date and Madhyahna puja window shown are calculated for your location using the madhyahna-vyapti rule, checked against published references. No general muhurtham service is provided."
              : "This app does not calculate a festival date, muhurtham or puja timing for your location."}
          </p>
        ) : (
          <button className="source-link" onClick={() => setScreen("location")}>
            <MapPin size={14} /> Set your location
          </button>
        )}
        {reviewMode && panchanga && (
          <div className="panchanga-grid">
            {panchanga.validation.map((r) => (
              <div key={r.field}>
                <span>{r.field}</span>
                <strong>{r.released ? "released" : "BLOCKED"}</strong>
              </div>
            ))}
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
              <Check size={15} /> {materialsReady} of {materialsTotal} items marked ready
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

"use client";

// The platform home screen. It reads puja content only through the generic
// PujaDefinition passed in as `featuredPuja` - never RITUAL_STEPS, MATERIALS,
// patri content, or PILOT_FESTIVAL directly. Today there is exactly one
// available puja, so `featuredPuja` is always Vinayaka Chavithi, but this
// screen has no Vinayaka-specific import and would render the same way for
// any future puja with the same shape.

import {
  BookOpenCheck, CalendarDays, Check, ChevronRight, ListChecks, MapPin,
  ShieldCheck, Sparkles, UsersRound,
} from "lucide-react";

import type { LocationState } from "@/lib/location/model";
import { locationSummaryLabel } from "@/lib/location/model";
import type { ParticipantMode } from "@/lib/content/participants";
import type { PujaDefinition } from "@/lib/puja/types";
import { formatTodayInTimezone } from "@/lib/puja/calendar";
import {
  PILOT_DATA_NOTE, formatEpochDay, formatPujaFestivalDate, pujaFestivalCountdown,
} from "@/lib/puja/festival";
import type { Screen } from "@/app/page";

const MODE_SUMMARY: Record<ParticipantMode, string> = {
  SELF: "Only me",
  FAMILY: "My family",
  GROUP: "Students or friends",
};

export function HomeScreen({
  setScreen, openPreparation, mode, participantCount, materialsReady, todayEpochDay,
  nowMs, location, featuredPuja,
}: {
  setScreen: (screen: Screen) => void;
  openPreparation: () => void;
  mode: ParticipantMode;
  participantCount: number;
  materialsReady: number;
  todayEpochDay: number;
  /** Current timestamp, used only to show today's date in the saved
   * location's own time zone - never the festival countdown, which stays
   * epoch-day based regardless of location. */
  nowMs: number;
  location: LocationState;
  featuredPuja: PujaDefinition | null;
}) {
  const locationLabel = locationSummaryLabel(location);
  const locationReady = location.status === "READY";
  // A saved location's time zone can differ from the browser's own - "today"
  // for that location must come from its exact zone, never the device's.
  const localizedToday = locationReady
    ? formatTodayInTimezone(nowMs, location.timezone)
    : null;
  const todayLabel = localizedToday ?? formatEpochDay(todayEpochDay) ?? "Pilot preview";
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
            <small>Festival dates and puja timings can differ by city.</small>
          </span>
          <ChevronRight size={16} />
        </button>
      )}
      <article className="today-card">
        <div className="card-heading-row">
          <div>
            <p className="eyebrow">
              {locationReady ? `TODAY IN ${locationLabel.toUpperCase()}` : "TODAY"}
            </p>
            <h2>{todayLabel}</h2>
          </div>
          <div className="status-chip"><ShieldCheck size={14} /> Pilot data</div>
        </div>
        <div className="panchanga-grid">
          <div><span>Tithi</span><strong>Being verified</strong></div>
          <div><span>Nakshatra</span><strong>Being verified</strong></div>
          <div><span>Sunrise</span><strong>Local time</strong></div>
        </div>
        <p className="plain-note">
          {locationReady
            ? "Your location is saved. Panchanga calculations for this location are being prepared."
            : `${PILOT_DATA_NOTE} We will show these values only after the local calculation is checked.`}
        </p>
      </article>
      <div className="section-title-row"><h2>Coming up</h2><button disabled aria-label="Monthly calendar - coming soon" title="Coming soon">Coming soon</button></div>
      {featuredPuja ? (
        <article className="festival-card">
          <div className="festival-summary">
            <div className="festival-symbol"><Sparkles size={25} /></div>
            <div className="festival-copy">
              {festival && <p className="eyebrow accent">{formatPujaFestivalDate(festival).toUpperCase()}</p>}
              <h3>{featuredPuja.displayName}</h3>
              <p>Home puja · pilot data</p>
            </div>
            <div className="countdown">
              {countdown.state === "upcoming" && (
                <>
                  <strong>{countdown.days}</strong>
                  <span>{countdown.days === 1 ? "day" : "days"}</span>
                </>
              )}
              {countdown.state === "today" && (
                <>
                  <strong>Today</strong>
                  <span>&nbsp;</span>
                </>
              )}
              {countdown.state === "past" && (
                <>
                  <strong>—</strong>
                  <span>date passed</span>
                </>
              )}
              {countdown.state === "unknown" && (
                <>
                  <strong>—</strong>
                  <span>days</span>
                </>
              )}
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
          <div className="festival-actions">
            <button className="secondary-action" onClick={() => setScreen("people")}>
              <UsersRound size={17} /> Add people
            </button>
            <button className="primary-action" onClick={openPreparation}>
              <ListChecks size={17} /> Get puja ready
            </button>
          </div>
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

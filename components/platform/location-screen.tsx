"use client";

// Location setup: device geolocation (only on explicit button press, never
// automatic) plus an always-available manual form. There is no geocoding
// anywhere in this app, so a device fix only ever supplies latitude,
// longitude, accuracy, and the device's own time zone - the user still names
// their own city, region, and country before saving. Nothing here is sent
// anywhere; it is saved only in this browser via lib/storage/location.ts.
//
// This screen never navigates the app itself - it calls `onSaved` after a
// successful save and lets the caller (the application coordinator) decide
// what to do, keeping this component reusable outside this one app shell.

import { MapPin, ShieldCheck } from "lucide-react";
import { useState } from "react";

import {
  locationSummaryLabel, sanitizeAccuracyMeters, validateReadyLocation,
  type LocationFieldError, type LocationSource, type LocationState, type ReadyLocation,
} from "@/lib/location/model";
import { detectDeviceTimezone } from "@/lib/location/timezone";
import { isGeolocationSupported, requestDeviceLocation } from "@/lib/location/geolocation";

type UnreadyStatus = Exclude<LocationState["status"], "READY">;

interface LocationFormState {
  city: string;
  region: string;
  country: string;
  timezone: string;
  latitude: string;
  longitude: string;
}

function emptyLocationForm(): LocationFormState {
  return {
    city: "",
    region: "",
    country: "",
    // A helpful, editable starting point - never applied silently, always
    // visible and changeable before anything is saved.
    timezone: detectDeviceTimezone() ?? "",
    latitude: "",
    longitude: "",
  };
}

function locationFormFromState(location: LocationState): LocationFormState {
  if (location.status !== "READY") return emptyLocationForm();
  return {
    city: location.city,
    region: location.region,
    country: location.country,
    timezone: location.timezone,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
  };
}

/**
 * Shown right after a device location fix, in place of any claim that the
 * app detected the city automatically - it never did, and never will without
 * a separate, explicit geocoding feature.
 */
export const DEVICE_COORDINATES_ONLY_MESSAGE =
  "Your device provided the coordinates. Please enter or confirm the city, " +
  "state and country.";

/**
 * A short technical delay (not a "read this" affordance) between showing the
 * "Location saved." confirmation and calling onSaved(). Without it, React 18
 * batches the confirmation's state update together with the caller's own
 * navigation state update into one commit, and the confirmation would never
 * actually render before this screen unmounts.
 */
export const LOCATION_SAVED_NAVIGATE_DELAY_MS = 400;

export function LocationScreen({
  location, saveLocation, setLocationStatus, clearLocation, onSaved,
}: {
  location: LocationState;
  saveLocation: (next: ReadyLocation) => void;
  setLocationStatus: (status: UnreadyStatus) => void;
  /** Returns whether the user actually confirmed the clear. */
  clearLocation: () => boolean;
  /** Called once, shortly after a successful save (first save or edit). */
  onSaved?: () => void;
}) {
  const [form, setForm] = useState<LocationFormState>(() => locationFormFromState(location));
  const [source, setSource] = useState<LocationSource>(
    location.status === "READY" ? location.source : "MANUAL",
  );
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(
    location.status === "READY" ? location.accuracyMeters : null,
  );
  const [requesting, setRequesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<LocationFieldError[]>([]);
  // Manual editing lives behind this flag once a location is already saved,
  // so the compact card - not the full form - is what a returning user sees.
  const [editing, setEditing] = useState(false);
  // True for the brief window between a successful save and onSaved actually
  // navigating away. Without it, a first-time save (where `editing` was
  // never true - there was no compact card to edit from yet) would see
  // `location.status` reactively turn READY and immediately collapse the
  // form - and its "Location saved." confirmation - before either ever got
  // a real commit.
  const [justSaved, setJustSaved] = useState(false);

  const geoSupported = isGeolocationSupported();
  const errorFor = (field: LocationFieldError["field"]) =>
    errors.find((error) => error.field === field)?.message;
  const showForm = location.status !== "READY" || editing || justSaved;

  const updateField = (field: keyof LocationFormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleUseMyLocation = async () => {
    if (requesting) return; // never send a second request while one is pending
    setRequesting(true);
    setStatusMessage("Requesting your location…");

    const outcome = await requestDeviceLocation(
      typeof navigator !== "undefined" ? navigator.geolocation : undefined,
    );

    setRequesting(false);

    if (outcome.kind === "GRANTED") {
      setForm((current) => ({
        ...current,
        latitude: String(outcome.latitude),
        longitude: String(outcome.longitude),
        timezone: detectDeviceTimezone() ?? current.timezone,
      }));
      setSource("DEVICE");
      setAccuracyMeters(outcome.accuracyMeters);
      setErrors([]);
      // The device supplies coordinates only - never a city, region, or
      // country name. There is no geocoding step here, and none is claimed.
      setStatusMessage(DEVICE_COORDINATES_ONLY_MESSAGE);
      return;
    }

    // A failed request never overwrites an existing saved, ready location -
    // it only ever affects the transient status when nothing is saved yet.
    if (location.status !== "READY") {
      if (outcome.kind === "PERMISSION_DENIED") setLocationStatus("PERMISSION_DENIED");
      else setLocationStatus("UNAVAILABLE");
    }

    if (outcome.kind === "PERMISSION_DENIED") {
      setStatusMessage(
        "Location permission was denied. You can allow it in your browser settings, or enter your location manually below.",
      );
    } else if (outcome.kind === "TIMEOUT") {
      setStatusMessage("The location request timed out. Try again, or enter your location manually below.");
    } else if (outcome.kind === "UNSUPPORTED") {
      setStatusMessage("This browser does not support device location. Enter your location manually below.");
    } else {
      setStatusMessage("Your location could not be determined. Enter it manually below.");
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();

    const formErrors: LocationFieldError[] = [];
    if (form.latitude.trim() === "") {
      formErrors.push({ field: "latitude", message: "Enter a latitude." });
    }
    if (form.longitude.trim() === "") {
      formErrors.push({ field: "longitude", message: "Enter a longitude." });
    }

    const candidate = {
      city: form.city.trim(),
      region: form.region.trim(),
      country: form.country.trim(),
      timezone: form.timezone.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      savedAt: new Date().toISOString(),
    };

    const modelErrors =
      formErrors.length === 0
        ? validateReadyLocation(candidate)
        : validateReadyLocation(candidate).filter(
            (error) => error.field !== "latitude" && error.field !== "longitude",
          );

    const allErrors = [...formErrors, ...modelErrors];
    setErrors(allErrors);
    if (allErrors.length > 0) {
      setStatusMessage("Please fix the highlighted fields before saving.");
      return;
    }

    saveLocation({ status: "READY", ...candidate, source, accuracyMeters });
    setStatusMessage("Location saved.");
    setJustSaved(true);
    if (onSaved) {
      setTimeout(() => {
        setJustSaved(false);
        setEditing(false);
        onSaved();
      }, LOCATION_SAVED_NAVIGATE_DELAY_MS);
    } else {
      setJustSaved(false);
      setEditing(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setStatusMessage(null);
    setErrors([]);
  };

  const handleCancelEdit = () => {
    // Discard any unsaved typing and restore exactly what is on record.
    setForm(locationFormFromState(location));
    setSource(location.status === "READY" ? location.source : "MANUAL");
    setAccuracyMeters(location.status === "READY" ? location.accuracyMeters : null);
    setErrors([]);
    setStatusMessage(null);
    setEditing(false);
  };

  const handleClear = () => {
    // Only reset local UI state when the user actually confirmed the clear -
    // declining must leave the saved location and every visible field alone.
    if (!clearLocation()) return;
    setForm(emptyLocationForm());
    setSource("MANUAL");
    setAccuracyMeters(null);
    setErrors([]);
    setStatusMessage(null);
    setEditing(false);
  };

  const displayAccuracyMeters =
    location.status === "READY" ? sanitizeAccuracyMeters(location.accuracyMeters) : null;

  return (
    <div className="flow-content">
      <p className="kicker">LOCATION</p>
      <h1>Set your location</h1>
      <p className="flow-intro">
        Festival dates and puja timings can differ by city. We use your
        location and time zone to show the right day and time for where you
        are.
      </p>
      <div className="safety-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Your location is saved only on this device in this version.</strong>
          <p>It is never sent to a server, an analytics service, or any AI feature.</p>
        </div>
      </div>

      {location.status === "READY" && !editing && !justSaved && (
        <article className="location-current">
          <h2>Saved location</h2>
          <p>{locationSummaryLabel(location)}</p>
          <p className="location-meta">
            {location.country} · {location.timezone} ·{" "}
            {location.source === "DEVICE" ? "From device location" : "Entered manually"}
            {displayAccuracyMeters !== null && ` · accurate to about ${Math.round(displayAccuracyMeters)} m`}
          </p>
          <div className="location-current-actions">
            <button type="button" className="link-button" onClick={handleEdit}>
              Edit location
            </button>
            <button type="button" className="link-button" onClick={handleClear}>
              Clear location
            </button>
          </div>
        </article>
      )}

      {showForm && (
        <>
          <button
            type="button"
            className="wide-primary"
            onClick={handleUseMyLocation}
            disabled={requesting || !geoSupported}
          >
            <MapPin size={18} /> {requesting ? "Requesting location…" : "Use my location"}
          </button>
          {!geoSupported && (
            <p className="field-error">This browser does not support device location. Enter your location manually below.</p>
          )}
          <p aria-live="polite" role="status" className="info-note location-status">
            {statusMessage ?? ""}
          </p>

          <form className="form-card location-form" onSubmit={handleSave}>
            <h2>Enter or confirm your location</h2>
            <p className="lineage-plain">
              There is no automatic place lookup in this version. A device
              location fix only ever gives coordinates and a time zone - type
              the exact city, state, and country yourself.
            </p>

            <label>
              City
              <input
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                aria-invalid={errorFor("city") ? true : undefined}
              />
            </label>
            {errorFor("city") && <p className="field-error">{errorFor("city")}</p>}

            <label>
              State or region (optional)
              <input value={form.region} onChange={(event) => updateField("region", event.target.value)} />
            </label>

            <label>
              Country
              <input
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
                aria-invalid={errorFor("country") ? true : undefined}
              />
            </label>
            {errorFor("country") && <p className="field-error">{errorFor("country")}</p>}

            <label>
              Time zone
              <input
                value={form.timezone}
                onChange={(event) => updateField("timezone", event.target.value)}
                placeholder="America/Chicago"
                aria-invalid={errorFor("timezone") ? true : undefined}
              />
            </label>
            {errorFor("timezone") && <p className="field-error">{errorFor("timezone")}</p>}

            <label>
              Latitude
              <input
                value={form.latitude}
                onChange={(event) => updateField("latitude", event.target.value)}
                inputMode="decimal"
                placeholder="-90 to 90"
                aria-invalid={errorFor("latitude") ? true : undefined}
              />
            </label>
            {errorFor("latitude") && <p className="field-error">{errorFor("latitude")}</p>}

            <label>
              Longitude
              <input
                value={form.longitude}
                onChange={(event) => updateField("longitude", event.target.value)}
                inputMode="decimal"
                placeholder="-180 to 180"
                aria-invalid={errorFor("longitude") ? true : undefined}
              />
            </label>
            {errorFor("longitude") && <p className="field-error">{errorFor("longitude")}</p>}

            <button className="wide-primary" type="submit">
              Save location
            </button>
            {location.status === "READY" && editing && (
              <button type="button" className="link-button" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </form>
        </>
      )}
    </div>
  );
}

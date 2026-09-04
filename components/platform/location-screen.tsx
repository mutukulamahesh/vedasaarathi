"use client";

// Location setup: device geolocation (only on explicit button press, never
// automatic) plus an always-available manual form. There is no geocoding
// anywhere in this app, so a device fix only ever supplies latitude,
// longitude, accuracy, and the device's own time zone - the user still names
// their own city, region, and country before saving. Nothing here is sent
// anywhere; it is saved only in this browser via lib/storage/location.ts.

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

export function LocationScreen({
  location, saveLocation, setLocationStatus, clearLocation,
}: {
  location: LocationState;
  saveLocation: (next: ReadyLocation) => void;
  setLocationStatus: (status: UnreadyStatus) => void;
  /** Returns whether the user actually confirmed the clear. */
  clearLocation: () => boolean;
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

  const geoSupported = isGeolocationSupported();
  const errorFor = (field: LocationFieldError["field"]) =>
    errors.find((error) => error.field === field)?.message;

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
      setStatusMessage(
        "Location found. Add your city and country below, then save.",
      );
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

      {location.status === "READY" && (
        <article className="location-current">
          <h2>Saved location</h2>
          <p>{locationSummaryLabel(location)}</p>
          <p className="location-meta">
            {location.country} · {location.timezone} ·{" "}
            {location.source === "DEVICE" ? "From device location" : "Entered manually"}
            {displayAccuracyMeters !== null && ` · accurate to about ${Math.round(displayAccuracyMeters)} m`}
          </p>
          <button type="button" className="link-button" onClick={handleClear}>
            Clear location
          </button>
        </article>
      )}

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
          Manual entry is always available, even after using device location.
          There is no place lookup in this version - type the exact values.
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
      </form>
    </div>
  );
}

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
import { useEffect, useRef, useState } from "react";

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

type Lang = "EN" | "TE";

const L = {
  EN: {
    kicker: "LOCATION",
    heading: "Set your location",
    intro: "Festival dates and puja timings can differ by city. We use your location and time zone to show the right day and time for where you are.",
    privacyTitle: "Your location is saved only on this device in this version.",
    privacyBody: "It is never sent to a server, an analytics service, or any AI feature.",
    savedHeading: "Saved location",
    fromDevice: "From device location",
    enteredManually: "Entered manually",
    accurateTo: (m: number) => ` · accurate to about ${m} m`,
    editLocation: "Edit location",
    clearLocation: "Clear location",
    useMyLocation: "Use my location",
    requesting: "Requesting location…",
    noGeoSupport: "This browser does not support device location. Enter your location manually below.",
    formHeading: "Enter or confirm your location",
    formIntro: "There is no automatic place lookup in this version. A device location fix only ever gives coordinates and a time zone - type the exact city, state, and country yourself.",
    city: "City",
    regionOptional: "State or region (optional)",
    country: "Country",
    timezone: "Time zone",
    timezonePlaceholder: "America/Chicago",
    latitude: "Latitude",
    latitudePlaceholder: "-90 to 90",
    longitude: "Longitude",
    longitudePlaceholder: "-180 to 180",
    save: "Save location",
    saving: "Saving…",
    cancel: "Cancel",
    latRequired: "Enter a latitude.",
    lngRequired: "Enter a longitude.",
    fixHighlighted: "Please fix the highlighted fields before saving.",
    locationSaved: "Location saved.",
    deviceCoordsOnly: "Your device provided the coordinates. Please enter or confirm the city, state and country.",
    permissionDenied: "Location permission was denied. You can allow it in your browser settings, or enter your location manually below.",
    timedOut: "The location request timed out. Try again, or enter your location manually below.",
    unsupported: "This browser does not support device location. Enter your location manually below.",
    couldNotDetermine: "Your location could not be determined. Enter it manually below.",
  },
  TE: {
    kicker: "స్థానం",
    heading: "మీ స్థానం సెట్ చేయండి",
    intro: "పండుగ తేదీలు, పూజ సమయాలు నగరాన్ని బట్టి మారవచ్చు. మీరు ఉన్న చోటికి సరైన రోజు, సమయం చూపించడానికి మీ స్థానం, టైమ్‌జోన్ ఉపయోగిస్తాము.",
    privacyTitle: "మీ స్థానం ఈ వెర్షన్‌లో ఈ పరికరంలో మాత్రమే సేవ్ అవుతుంది.",
    privacyBody: "ఇది సర్వర్‌కు, అనలిటిక్స్ సేవకు, లేదా ఏ AI ఫీచర్‌కూ ఎప్పుడూ పంపబడదు.",
    savedHeading: "సేవ్ చేసిన స్థానం",
    fromDevice: "పరికర స్థానం నుండి",
    enteredManually: "మాన్యువల్‌గా నమోదు చేశారు",
    accurateTo: (m: number) => ` · సుమారు ${m} మీ. ఖచ్చితత్వం`,
    editLocation: "స్థానం మార్చండి",
    clearLocation: "స్థానం తొలగించండి",
    useMyLocation: "నా స్థానం వాడండి",
    requesting: "స్థానం కోరుతోంది…",
    noGeoSupport: "ఈ బ్రౌజర్ పరికర స్థానానికి మద్దతు ఇవ్వదు. కింద మాన్యువల్‌గా మీ స్థానం నమోదు చేయండి.",
    formHeading: "మీ స్థానాన్ని నమోదు చేయండి లేదా నిర్ధారించండి",
    formIntro: "ఈ వెర్షన్‌లో స్వయంచాలక స్థల శోధన లేదు. పరికర స్థానం అక్షాంశం, రేఖాంశం, టైమ్‌జోన్ మాత్రమే ఇస్తుంది - నగరం, రాష్ట్రం, దేశం మీరే ఖచ్చితంగా టైప్ చేయండి.",
    city: "నగరం",
    regionOptional: "రాష్ట్రం లేదా ప్రాంతం (ఐచ్ఛికం)",
    country: "దేశం",
    timezone: "టైమ్‌జోన్",
    timezonePlaceholder: "America/Chicago",
    latitude: "అక్షాంశం",
    latitudePlaceholder: "-90 నుండి 90",
    longitude: "రేఖాంశం",
    longitudePlaceholder: "-180 నుండి 180",
    save: "స్థానం సేవ్ చేయండి",
    saving: "సేవ్ చేస్తోంది…",
    cancel: "రద్దు చేయండి",
    latRequired: "అక్షాంశం నమోదు చేయండి.",
    lngRequired: "రేఖాంశం నమోదు చేయండి.",
    fixHighlighted: "సేవ్ చేయడానికి ముందు గుర్తించిన ఫీల్డ్‌లను సరిచేయండి.",
    locationSaved: "స్థానం సేవ్ అయింది.",
    deviceCoordsOnly: "మీ పరికరం నిర్దేశాంకాలు ఇచ్చింది. దయచేసి నగరం, రాష్ట్రం, దేశం నమోదు చేయండి లేదా నిర్ధారించండి.",
    permissionDenied: "స్థాన అనుమతి తిరస్కరించబడింది. మీ బ్రౌజర్ సెట్టింగ్స్‌లో అనుమతించవచ్చు, లేదా కింద మాన్యువల్‌గా నమోదు చేయండి.",
    timedOut: "స్థాన అభ్యర్థన సమయం ముగిసింది. మళ్ళీ ప్రయత్నించండి, లేదా మాన్యువల్‌గా నమోదు చేయండి.",
    unsupported: "ఈ బ్రౌజర్ పరికర స్థానానికి మద్దతు ఇవ్వదు. మాన్యువల్‌గా నమోదు చేయండి.",
    couldNotDetermine: "మీ స్థానం నిర్ధారించలేకపోయాము. దయచేసి మాన్యువల్‌గా నమోదు చేయండి.",
  },
} as const;

export function LocationScreen({
  location, saveLocation, setLocationStatus, clearLocation, onSaved, language = "EN",
}: {
  location: LocationState;
  saveLocation: (next: ReadyLocation) => void;
  setLocationStatus: (status: UnreadyStatus) => void;
  /** Returns whether the user actually confirmed the clear. */
  clearLocation: () => boolean;
  /** Called once, shortly after a successful save (first save or edit). */
  onSaved?: () => void;
  language?: Lang;
}) {
  const te = language === "TE";
  const t = te ? L.TE : L.EN;
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
  // True from a successful save until onSaved has actually navigated away.
  // It keeps the form (and its "Location saved." confirmation) on screen
  // through that window - a first-time save would otherwise see
  // `location.status` reactively turn READY and collapse both before either
  // got a real commit - and it disables the Save button so the save cannot
  // be triggered again while completion is pending.
  const [savePending, setSavePending] = useState(false);
  // Synchronous mirror of savePending: a second click or submit in the same
  // tick (before the state re-render disables the button) is rejected here.
  const savePendingRef = useRef(false);
  // The pending onSaved timer, so it can be cleared on unmount - a location
  // screen the user has already left must never fire its onSaved.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []);

  // `navigator` does not exist during SSR, but IS already available on the
  // client's very first (hydrating) render - unlike useSyncExternalStore,
  // a plain function call gets no automatic "match the server snapshot on
  // first render" treatment, so calling isGeolocationSupported() directly in
  // the render body mismatches immediately and React throws a hydration
  // error. The real answer is read in a macrotask after mount instead (an
  // effect may not call setState synchronously in its own body - only from
  // an async callback - see react-hooks/set-state-in-effect).
  const [geoSupported, setGeoSupported] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setGeoSupported(isGeolocationSupported()), 0);
    return () => clearTimeout(id);
  }, []);
  const errorFor = (field: LocationFieldError["field"]) =>
    errors.find((error) => error.field === field)?.message;
  const showForm = location.status !== "READY" || editing || savePending;

  const updateField = (field: keyof LocationFormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleUseMyLocation = async () => {
    if (requesting) return; // never send a second request while one is pending
    setRequesting(true);
    setStatusMessage(t.requesting);

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
      setStatusMessage(t.deviceCoordsOnly);
      return;
    }

    // A failed request never overwrites an existing saved, ready location -
    // it only ever affects the transient status when nothing is saved yet.
    if (location.status !== "READY") {
      if (outcome.kind === "PERMISSION_DENIED") setLocationStatus("PERMISSION_DENIED");
      else setLocationStatus("UNAVAILABLE");
    }

    if (outcome.kind === "PERMISSION_DENIED") {
      setStatusMessage(t.permissionDenied);
    } else if (outcome.kind === "TIMEOUT") {
      setStatusMessage(t.timedOut);
    } else if (outcome.kind === "UNSUPPORTED") {
      setStatusMessage(t.unsupported);
    } else {
      setStatusMessage(t.couldNotDetermine);
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    // Repeated clicks or submissions while a save is already completing are
    // ignored - never a second save, never a second onSaved.
    if (savePendingRef.current) return;

    const formErrors: LocationFieldError[] = [];
    if (form.latitude.trim() === "") {
      formErrors.push({ field: "latitude", message: t.latRequired });
    }
    if (form.longitude.trim() === "") {
      formErrors.push({ field: "longitude", message: t.lngRequired });
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
        ? validateReadyLocation(candidate, language)
        : validateReadyLocation(candidate, language).filter(
            (error) => error.field !== "latitude" && error.field !== "longitude",
          );

    const allErrors = [...formErrors, ...modelErrors];
    setErrors(allErrors);
    if (allErrors.length > 0) {
      setStatusMessage(t.fixHighlighted);
      return;
    }

    saveLocation({ status: "READY", ...candidate, source, accuracyMeters });
    setStatusMessage(t.locationSaved);

    if (onSaved) {
      savePendingRef.current = true;
      setSavePending(true);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        savePendingRef.current = false;
        setSavePending(false);
        setEditing(false);
        onSaved();
      }, LOCATION_SAVED_NAVIGATE_DELAY_MS);
    } else {
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
    <div className="flow-content" lang={te ? "te" : undefined}>
      <p className="kicker">{t.kicker}</p>
      <h1>{t.heading}</h1>
      <p className="flow-intro">
        {t.intro}
      </p>
      <div className="safety-note">
        <ShieldCheck size={19} />
        <div>
          <strong>{t.privacyTitle}</strong>
          <p>{t.privacyBody}</p>
        </div>
      </div>

      {location.status === "READY" && !editing && !savePending && (
        <article className="location-current">
          <h2>{t.savedHeading}</h2>
          <p>{locationSummaryLabel(location)}</p>
          <p className="location-meta">
            {location.country} · {location.timezone} ·{" "}
            {location.source === "DEVICE" ? t.fromDevice : t.enteredManually}
            {displayAccuracyMeters !== null && t.accurateTo(Math.round(displayAccuracyMeters))}
          </p>
          <div className="location-current-actions">
            <button type="button" className="link-button" onClick={handleEdit}>
              {t.editLocation}
            </button>
            <button type="button" className="link-button" onClick={handleClear}>
              {t.clearLocation}
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
            <MapPin size={18} /> {requesting ? t.requesting : t.useMyLocation}
          </button>
          {!geoSupported && (
            <p className="field-error">{t.noGeoSupport}</p>
          )}
          <p aria-live="polite" role="status" className="info-note location-status">
            {statusMessage ?? ""}
          </p>

          <form className="form-card location-form" onSubmit={handleSave}>
            <h2>{t.formHeading}</h2>
            <p className="lineage-plain">
              {t.formIntro}
            </p>

            <label>
              {t.city}
              <input
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                aria-invalid={errorFor("city") ? true : undefined}
              />
            </label>
            {errorFor("city") && <p className="field-error">{errorFor("city")}</p>}

            <label>
              {t.regionOptional}
              <input value={form.region} onChange={(event) => updateField("region", event.target.value)} />
            </label>

            <label>
              {t.country}
              <input
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
                aria-invalid={errorFor("country") ? true : undefined}
              />
            </label>
            {errorFor("country") && <p className="field-error">{errorFor("country")}</p>}

            <label>
              {t.timezone}
              <input
                value={form.timezone}
                onChange={(event) => updateField("timezone", event.target.value)}
                placeholder={t.timezonePlaceholder}
                aria-invalid={errorFor("timezone") ? true : undefined}
              />
            </label>
            {errorFor("timezone") && <p className="field-error">{errorFor("timezone")}</p>}

            <label>
              {t.latitude}
              <input
                value={form.latitude}
                onChange={(event) => updateField("latitude", event.target.value)}
                inputMode="decimal"
                placeholder={t.latitudePlaceholder}
                aria-invalid={errorFor("latitude") ? true : undefined}
              />
            </label>
            {errorFor("latitude") && <p className="field-error">{errorFor("latitude")}</p>}

            <label>
              {t.longitude}
              <input
                value={form.longitude}
                onChange={(event) => updateField("longitude", event.target.value)}
                inputMode="decimal"
                placeholder={t.longitudePlaceholder}
                aria-invalid={errorFor("longitude") ? true : undefined}
              />
            </label>
            {errorFor("longitude") && <p className="field-error">{errorFor("longitude")}</p>}

            <button className="wide-primary" type="submit" disabled={savePending}>
              {savePending ? t.saving : t.save}
            </button>
            {location.status === "READY" && editing && (
              <button type="button" className="link-button" onClick={handleCancelEdit}>
                {t.cancel}
              </button>
            )}
          </form>
        </>
      )}
    </div>
  );
}

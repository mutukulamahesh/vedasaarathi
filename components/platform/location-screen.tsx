"use client";

// Location setup: device geolocation (only on explicit button press, never
// automatic) plus an always-available manual form. A successful device fix
// also tries an ON-DEVICE suggestion for city, region and country - matched
// locally against a bundled place list (see lib/location/reverse-geocode.ts).
// Nothing is ever sent anywhere for this: the place list is a same-origin
// file, fetched and matched entirely in the browser. The suggestion always
// lands in the same editable fields the user can already change, and nothing
// is saved until the user presses "Save location" - never presented as an
// authoritative result. Saved data itself is kept only in this browser via
// lib/storage/location.ts.
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
import { findNearestPlace, loadPlacesDataset, type PlaceMatch } from "@/lib/location/reverse-geocode";

type Lang = "EN" | "TE";

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
 * A short technical delay (not a "read this" affordance) between showing the
 * "Location saved." confirmation and calling onSaved(). Without it, React 18
 * batches the confirmation's state update together with the caller's own
 * navigation state update into one commit, and the confirmation would never
 * actually render before this screen unmounts.
 */
export const LOCATION_SAVED_NAVIGATE_DELAY_MS = 400;

const FIELD_ERROR_TE: Record<LocationFieldError["field"], string> = {
  city: "నగరం (ఊరు) పేరు నమోదు చేయండి.",
  country: "దేశం పేరు నమోదు చేయండి.",
  timezone: "సరైన టైమ్ జోన్ నమోదు చేయండి, ఉదాహరణకు America/Chicago.",
  latitude: "అక్షాంశం (latitude) -90 నుండి 90 మధ్య సంఖ్య అయి ఉండాలి.",
  longitude: "రేఖాంశం (longitude) -180 నుండి 180 మధ్య సంఖ్య అయి ఉండాలి.",
  savedAt: "సేవ్ చేసిన సమయం సరైనదిగా ఉండాలి.",
};

const T = {
  EN: {
    kicker: "LOCATION",
    title: "Set your location",
    intro:
      "Festival dates and puja timings can differ by city. We use your " +
      "location and time zone to show the right day and time for where you " +
      "are.",
    safetyStrong: "Your location is saved only on this device in this version.",
    safetyBody: "It is never sent to a server, an analytics service, or any AI feature.",
    savedH2: "Saved location",
    fromDevice: "From device location",
    enteredManually: "Entered manually",
    accurateTo: (m: number) => `accurate to about ${m} m`,
    editLocation: "Edit location",
    clearLocation: "Clear location",
    useMyLocation: "Use my location",
    requestingLocation: "Requesting location…",
    noGeoSupport: "This browser does not support device location. Enter your location manually below.",
    requestingStatus: "Requesting your location…",
    findingPlace: "Looking up the nearest known place…",
    matched: (city: string) =>
      `Your device provided the coordinates. We matched them to the nearest ` +
      `known place, ${city}. Check it's correct, then edit anything that ` +
      `needs it before saving.`,
    coordinatesOnly:
      "Your device provided the coordinates. We could not match them to a " +
      "known place - please enter the city, state and country yourself.",
    permissionDenied:
      "Location permission was denied. You can allow it in your browser settings, or enter your location manually below.",
    timeout: "The location request timed out. Try again, or enter your location manually below.",
    unsupported: "This browser does not support device location. Enter your location manually below.",
    genericFailure: "Your location could not be determined. Enter it manually below.",
    fixErrors: "Please fix the highlighted fields before saving.",
    saved: "Location saved.",
    formH2: "Enter or confirm your location",
    formIntro:
      "A device location fix can suggest the nearest known city on this " +
      "device, from a bundled place list - nothing is sent anywhere to do " +
      "this. It is only a suggestion: check it, edit anything that's wrong, " +
      "or type your own, before saving.",
    cityLabel: "City",
    regionLabel: "State or region (optional)",
    countryLabel: "Country",
    timezoneLabel: "Time zone",
    latitudeLabel: "Latitude",
    longitudeLabel: "Longitude",
    saveLocation: "Save location",
    saving: "Saving…",
    cancel: "Cancel",
    enterLatitude: "Enter a latitude.",
    enterLongitude: "Enter a longitude.",
  },
  TE: {
    // "స్థానం" matches the term already used for "location" throughout the
    // app (Home, Calendar, Search); "ప్రదేశం" is kept only for "place" in the
    // narrower sense of a suggested place-list entry, to distinguish it from
    // "your location" in the same sentence.
    kicker: "స్థానం",
    title: "మీ స్థానం సెట్ చేయండి",
    intro:
      "పండుగల తేదీలు, పూజా సమయాలు నగరాన్ని బట్టి మారవచ్చు. మీరు ఉన్న చోటుకు " +
      "సరైన రోజు, సమయం చూపించడానికి మేము మీ స్థానం, టైమ్ జోన్ ఉపయోగిస్తాము.",
    safetyStrong: "మీ స్థానం ఈ వెర్షన్‌లో ఈ పరికరంలో మాత్రమే సేవ్ చేయబడుతుంది.",
    safetyBody: "ఇది సర్వర్‌కు, అనలిటిక్స్ సేవకు లేదా ఏ AI ఫీచర్‌కు కూడా ఎప్పుడూ పంపబడదు.",
    savedH2: "సేవ్ చేసిన స్థానం",
    fromDevice: "పరికర స్థానం నుండి",
    enteredManually: "మీరే నమోదు చేశారు",
    accurateTo: (m: number) => `సుమారు ${m} మీ. ఖచ్చితత్వంతో`,
    editLocation: "స్థానాన్ని మార్చండి",
    clearLocation: "స్థానాన్ని తొలగించండి",
    useMyLocation: "నా స్థానాన్ని ఉపయోగించండి",
    requestingLocation: "స్థానం కోరుతోంది…",
    noGeoSupport: "ఈ బ్రౌజర్ పరికర స్థానాన్ని సపోర్ట్ చేయదు. కింద మీ స్థానాన్ని మీరే నమోదు చేయండి.",
    requestingStatus: "మీ స్థానాన్ని కోరుతోంది…",
    findingPlace: "సమీప తెలిసిన ప్రదేశం కోసం చూస్తోంది…",
    matched: (city: string) =>
      `మీ పరికరం నిర్దేశాంకాలు (coordinates) ఇచ్చింది. వాటిని సమీప తెలిసిన ` +
      `ప్రదేశం, ${city}కి సరిపోల్చాము. ఇది సరైనదేనా చూసి, సేవ్ చేసే ముందు ` +
      `అవసరమైతే మార్చండి.`,
    coordinatesOnly:
      "మీ పరికరం నిర్దేశాంకాలు (coordinates) ఇచ్చింది. వాటిని తెలిసిన ఏ " +
      "ప్రదేశంతోనూ సరిపోల్చలేకపోయాము - దయచేసి నగరం, రాష్ట్రం, దేశం మీరే నమోదు చేయండి.",
    permissionDenied:
      "స్థానం అనుమతి నిరాకరించబడింది. మీ బ్రౌజర్ సెట్టింగ్‌లలో దీన్ని అనుమతించవచ్చు, లేదా కింద మీ స్థానాన్ని మీరే నమోదు చేయండి.",
    timeout: "స్థానం కోసం అభ్యర్థన సమయం ముగిసింది. మళ్ళీ ప్రయత్నించండి, లేదా కింద మీరే నమోదు చేయండి.",
    unsupported: "ఈ బ్రౌజర్ పరికర స్థానాన్ని సపోర్ట్ చేయదు. కింద మీ స్థానాన్ని మీరే నమోదు చేయండి.",
    genericFailure: "మీ స్థానాన్ని నిర్ధారించలేకపోయాము. కింద దీన్ని మీరే నమోదు చేయండి.",
    fixErrors: "సేవ్ చేసే ముందు గుర్తించిన ఫీల్డ్‌లను సరిచేయండి.",
    saved: "స్థానం సేవ్ అయింది.",
    formH2: "మీ స్థానాన్ని నమోదు చేయండి లేదా నిర్ధారించండి",
    formIntro:
      "పరికర స్థాన నిర్ధారణ ఈ పరికరంలోనే, ఒక సిద్ధంగా ఉన్న ప్రదేశాల జాబితా నుండి, " +
      "సమీప తెలిసిన నగరాన్ని సూచించగలదు - దీని కోసం ఏమీ ఎక్కడికీ పంపబడదు. ఇది " +
      "కేవలం ఒక సూచన మాత్రమే: దీన్ని చూసి, తప్పు ఉంటే మార్చి, లేదా మీ సొంతంగా " +
      "నమోదు చేసి, తర్వాతే సేవ్ చేయండి.",
    cityLabel: "నగరం",
    regionLabel: "రాష్ట్రం లేదా ప్రాంతం (ఐచ్ఛికం)",
    countryLabel: "దేశం",
    timezoneLabel: "టైమ్ జోన్",
    latitudeLabel: "అక్షాంశం (Latitude)",
    longitudeLabel: "రేఖాంశం (Longitude)",
    saveLocation: "స్థానాన్ని సేవ్ చేయండి",
    saving: "సేవ్ అవుతోంది…",
    cancel: "రద్దు చేయండి",
    enterLatitude: "అక్షాంశం (latitude) నమోదు చేయండి.",
    enterLongitude: "రేఖాంశం (longitude) నమోదు చేయండి.",
  },
} satisfies Record<Lang, Record<string, unknown>>;

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
  const L = T[language];
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
  // Set only by a successful on-device place match, so the form can show a
  // brief "this was suggested" note next to the fields it just filled in -
  // cleared the moment the user types over any of them.
  const [placeMatch, setPlaceMatch] = useState<PlaceMatch | null>(null);
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
  // Guards the async "Use my location" -> on-device place-lookup flow
  // against three races: a second request starting before the first
  // request's lookup finishes, the component unmounting mid-lookup, and the
  // user typing their own city/region/country while a lookup is still in
  // flight. Incremented at the start of every new request AND on unmount, so
  // any pending continuation's captured id simply stops matching current -
  // one check (`requestIdRef.current !== requestId`) covers "superseded by a
  // newer request" and "the screen has been left" the same way, with no
  // separate isMounted flag needed.
  const requestIdRef = useRef(0);
  // True once the user edits city/region/country after the CURRENT lookup
  // cleared them (reset to false right at that clear) - checked before the
  // lookup applies its result, so the user's own typing is never clobbered
  // by a slower-resolving lookup that started before they typed it.
  const fieldsEditedSinceRequestRef = useRef(false);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      // Invalidate any in-flight "Use my location" request: its captured id
      // can never match requestIdRef.current again, so its continuation (if
      // still pending when this screen unmounts) will see the mismatch and
      // return without touching any state.
      requestIdRef.current += 1;
    };
  }, []);

  const geoSupported = isGeolocationSupported();
  const errorFor = (field: LocationFieldError["field"]) => {
    const found = errors.find((error) => error.field === field);
    if (!found) return undefined;
    return language === "TE" ? FIELD_ERROR_TE[field] : found.message;
  };
  const showForm = location.status !== "READY" || editing || savePending;

  const updateField = (field: keyof LocationFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "city" || field === "region" || field === "country") {
      setPlaceMatch(null);
      // Marks this field as the user's own, even if a lookup is still in
      // flight for the request that cleared it - see requestIdRef above.
      fieldsEditedSinceRequestRef.current = true;
    }
  };

  const handleUseMyLocation = async () => {
    if (requesting) return; // never send a second request while one is pending
    const requestId = ++requestIdRef.current;
    setRequesting(true);
    setPlaceMatch(null);
    setStatusMessage(L.requestingStatus);

    const outcome = await requestDeviceLocation(
      typeof navigator !== "undefined" ? navigator.geolocation : undefined,
    );

    // A newer request has since started, or this screen has been left - an
    // older result must never overwrite whatever is current now.
    if (requestIdRef.current !== requestId) return;

    if (outcome.kind === "GRANTED") {
      const { latitude, longitude } = outcome;
      // Start tracking fresh: any city/region/country edit from this point
      // on belongs to the user, not to this lookup, and the lookup below
      // must not clobber it once it resolves.
      fieldsEditedSinceRequestRef.current = false;
      // Never leave a stale place name sitting next to new coordinates -
      // clear city/region/country immediately, then fill them back in only
      // if the on-device lookup below finds a confident match the user
      // hasn't since replaced with their own typing.
      setForm((current) => ({
        ...current,
        city: "",
        region: "",
        country: "",
        latitude: String(latitude),
        longitude: String(longitude),
        timezone: detectDeviceTimezone() ?? current.timezone,
      }));
      setSource("DEVICE");
      setAccuracyMeters(outcome.accuracyMeters);
      setErrors([]);
      setStatusMessage(L.findingPlace);

      // requesting stays true for this whole lookup too (not just the
      // geolocation call above) - a second "Use my location" press must
      // wait for it, so two lookups can never race each other via the
      // button. requestIdRef below is the defense the button alone can't
      // provide: it also covers unmount and a field edited mid-lookup.
      const dataset = await loadPlacesDataset();

      if (requestIdRef.current !== requestId) return;
      setRequesting(false);

      if (fieldsEditedSinceRequestRef.current) {
        // The user already typed their own city/region/country while this
        // lookup was still in flight - respect that. Whatever they typed is
        // already on screen; this lookup's result (matched or not) is simply
        // discarded rather than overwriting it.
        return;
      }

      const match =
        dataset.kind === "LOADED" ? findNearestPlace(latitude, longitude, dataset.places) : null;

      if (match) {
        setForm((current) => ({ ...current, city: match.city, region: match.region, country: match.country }));
        setPlaceMatch(match);
        setStatusMessage(L.matched(match.city));
      } else {
        setStatusMessage(L.coordinatesOnly);
      }
      return;
    }

    setRequesting(false);

    // A failed request never overwrites an existing saved, ready location -
    // it only ever affects the transient status when nothing is saved yet.
    if (location.status !== "READY") {
      if (outcome.kind === "PERMISSION_DENIED") setLocationStatus("PERMISSION_DENIED");
      else setLocationStatus("UNAVAILABLE");
    }

    if (outcome.kind === "PERMISSION_DENIED") {
      setStatusMessage(L.permissionDenied);
    } else if (outcome.kind === "TIMEOUT") {
      setStatusMessage(L.timeout);
    } else if (outcome.kind === "UNSUPPORTED") {
      setStatusMessage(L.unsupported);
    } else {
      setStatusMessage(L.genericFailure);
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    // Repeated clicks or submissions while a save is already completing are
    // ignored - never a second save, never a second onSaved.
    if (savePendingRef.current) return;

    const formErrors: LocationFieldError[] = [];
    if (form.latitude.trim() === "") {
      formErrors.push({ field: "latitude", message: L.enterLatitude });
    }
    if (form.longitude.trim() === "") {
      formErrors.push({ field: "longitude", message: L.enterLongitude });
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
      setStatusMessage(L.fixErrors);
      return;
    }

    saveLocation({ status: "READY", ...candidate, source, accuracyMeters });
    setStatusMessage(L.saved);

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
    setPlaceMatch(null);
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
    setPlaceMatch(null);
    setEditing(false);
  };

  const displayAccuracyMeters =
    location.status === "READY" ? sanitizeAccuracyMeters(location.accuracyMeters) : null;

  return (
    <div className="flow-content">
      <p className="kicker">{L.kicker}</p>
      <h1>{L.title}</h1>
      <p className="flow-intro">{L.intro}</p>
      <div className="safety-note">
        <ShieldCheck size={19} />
        <div>
          <strong>{L.safetyStrong}</strong>
          <p>{L.safetyBody}</p>
        </div>
      </div>

      {location.status === "READY" && !editing && !savePending && (
        <article className="location-current">
          <h2>{L.savedH2}</h2>
          <p>{locationSummaryLabel(location)}</p>
          <p className="location-meta">
            {location.country} · {location.timezone} ·{" "}
            {location.source === "DEVICE" ? L.fromDevice : L.enteredManually}
            {displayAccuracyMeters !== null && ` · ${L.accurateTo(Math.round(displayAccuracyMeters))}`}
          </p>
          <div className="location-current-actions">
            <button type="button" className="link-button" onClick={handleEdit}>
              {L.editLocation}
            </button>
            <button type="button" className="link-button" onClick={handleClear}>
              {L.clearLocation}
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
            <MapPin size={18} /> {requesting ? L.requestingLocation : L.useMyLocation}
          </button>
          {!geoSupported && <p className="field-error">{L.noGeoSupport}</p>}
          <p aria-live="polite" role="status" className="info-note location-status">
            {statusMessage ?? ""}
          </p>

          <form className="form-card location-form" onSubmit={handleSave}>
            <h2>{L.formH2}</h2>
            <p className="lineage-plain">{L.formIntro}</p>

            <label>
              {L.cityLabel}
              <input
                value={form.city}
                onChange={(event) => updateField("city", event.target.value)}
                aria-invalid={errorFor("city") ? true : undefined}
              />
            </label>
            {errorFor("city") && <p className="field-error">{errorFor("city")}</p>}

            <label>
              {L.regionLabel}
              <input value={form.region} onChange={(event) => updateField("region", event.target.value)} />
            </label>

            <label>
              {L.countryLabel}
              <input
                value={form.country}
                onChange={(event) => updateField("country", event.target.value)}
                aria-invalid={errorFor("country") ? true : undefined}
              />
            </label>
            {errorFor("country") && <p className="field-error">{errorFor("country")}</p>}

            {placeMatch !== null && (
              <p className="info-note">
                {language === "TE"
                  ? "నగరం, రాష్ట్రం, దేశం ఈ పరికరంలోనే సూచించబడ్డాయి."
                  : "City, region and country were suggested on this device."}
              </p>
            )}

            <label>
              {L.timezoneLabel}
              <input
                value={form.timezone}
                onChange={(event) => updateField("timezone", event.target.value)}
                placeholder="America/Chicago"
                aria-invalid={errorFor("timezone") ? true : undefined}
              />
            </label>
            {errorFor("timezone") && <p className="field-error">{errorFor("timezone")}</p>}

            <label>
              {L.latitudeLabel}
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
              {L.longitudeLabel}
              <input
                value={form.longitude}
                onChange={(event) => updateField("longitude", event.target.value)}
                inputMode="decimal"
                placeholder="-180 to 180"
                aria-invalid={errorFor("longitude") ? true : undefined}
              />
            </label>
            {errorFor("longitude") && <p className="field-error">{errorFor("longitude")}</p>}

            <button className="wide-primary" type="submit" disabled={savePending}>
              {savePending ? L.saving : L.saveLocation}
            </button>
            {location.status === "READY" && editing && (
              <button type="button" className="link-button" onClick={handleCancelEdit}>
                {L.cancel}
              </button>
            )}
          </form>
        </>
      )}
    </div>
  );
}

// Browser device-location requests.
//
// Wraps navigator.geolocation.getCurrentPosition in a Promise that always
// resolves (never rejects) with a discriminated outcome, so callers handle
// every case explicitly - granted, denied, unavailable, timed out, or the
// browser has no geolocation API at all - instead of one generic catch block.
// The geolocation object is injected so this is testable without a browser.

export type GeolocationOutcome =
  | { kind: "GRANTED"; latitude: number; longitude: number; accuracyMeters: number | null }
  | { kind: "PERMISSION_DENIED" }
  | { kind: "POSITION_UNAVAILABLE" }
  | { kind: "TIMEOUT" }
  | { kind: "UNSUPPORTED" };

export interface GeolocationRequestOptions {
  timeoutMs?: number;
  maximumAgeMs?: number;
  enableHighAccuracy?: boolean;
}

/** Reasonable defaults for a one-off "where am I" request, not a live track. */
export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAXIMUM_AGE_MS = 5 * 60_000;
export const DEFAULT_ENABLE_HIGH_ACCURACY = false;

// The standard GeolocationPositionError codes, restated as plain numbers so a
// fake error object in a test does not need to supply the named constants.
const GEOLOCATION_ERROR_CODE = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;

/** The minimal shape this module needs from navigator.geolocation. */
export interface GeolocationLike {
  getCurrentPosition(
    onSuccess: (position: {
      coords: { latitude: number; longitude: number; accuracy?: number | null };
    }) => void,
    onError: (error: { code: number; message?: string }) => void,
    options?: {
      timeout?: number;
      maximumAge?: number;
      enableHighAccuracy?: boolean;
    },
  ): void;
}

export function isGeolocationSupported(
  nav: { geolocation?: unknown } | undefined = typeof navigator !== "undefined" ? navigator : undefined,
): boolean {
  return !!nav && !!nav.geolocation;
}

/**
 * Request the device's current position exactly once. Never called
 * automatically - only in direct response to the user pressing "Use my
 * location". Resolves with UNSUPPORTED immediately when no geolocation object
 * is available, instead of throwing.
 */
export function requestDeviceLocation(
  geolocation: GeolocationLike | undefined,
  options: GeolocationRequestOptions = {},
): Promise<GeolocationOutcome> {
  if (!geolocation) {
    return Promise.resolve({ kind: "UNSUPPORTED" });
  }

  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maximumAgeMs = DEFAULT_MAXIMUM_AGE_MS,
    enableHighAccuracy = DEFAULT_ENABLE_HIGH_ACCURACY,
  } = options;

  return new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        resolve({
          kind: "GRANTED",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters:
            typeof position.coords.accuracy === "number" ? position.coords.accuracy : null,
        });
      },
      (error) => {
        if (error.code === GEOLOCATION_ERROR_CODE.PERMISSION_DENIED) {
          resolve({ kind: "PERMISSION_DENIED" });
        } else if (error.code === GEOLOCATION_ERROR_CODE.TIMEOUT) {
          resolve({ kind: "TIMEOUT" });
        } else {
          resolve({ kind: "POSITION_UNAVAILABLE" });
        }
      },
      { timeout: timeoutMs, maximumAge: maximumAgeMs, enableHighAccuracy },
    );
  });
}

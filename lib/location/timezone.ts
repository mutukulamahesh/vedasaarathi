// Device time zone detection.
//
// Only ever reads the time zone the device itself reports. Never derives a
// time zone from latitude/longitude - that is a common but unreliable
// shortcut, and this app does not do it.

import { isValidTimezone } from "./model";

/**
 * The IANA time zone the device reports, or null when it is unavailable or
 * not a real time zone Intl recognizes.
 */
export function detectDeviceTimezone(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimezone(timezone) ? timezone : null;
  } catch {
    return null;
  }
}

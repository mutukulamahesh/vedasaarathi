// Build a SankalpamRequest from the app's own state (participants, mode, saved
// location, the released Home Panchanga, and the persisted setup choices).
// Pure — no React, no storage — so the setup screen, the puja screen and tests
// all assemble the SAME request.

import type { Participant, ParticipantMode } from "@/lib/content/participants";
import type { LocationState } from "@/lib/location/model";
import type { LocationPanchanga } from "@/lib/panchanga";

import type { SankalpamChoices } from "./choices";
import type { SankalpamGroupMode, SankalpamRequest } from "./generator";

const GROUP_MODE: Record<ParticipantMode, SankalpamGroupMode> = {
  SELF: "INDIVIDUAL",
  FAMILY: "FAMILY",
  GROUP: "GROUP",
};

/** Map the released Home Panchanga (context lines + fields) onto the eight
 * calendar values the generator understands. */
export function panchangaToSlots(p: LocationPanchanga | null | undefined) {
  if (!p) return {};
  const ctx = Object.fromEntries(p.context.map((c) => [c.key, c.value]));
  const tithiField = p.fields.find((f) => f.key === "tithi")?.value ?? "";
  const nakField = p.fields.find((f) => f.key === "nakshatra")?.value ?? "";
  // "Krishna Chaturdasi" -> tithi "Chaturdasi"; paksha comes from context.
  const tithi = tithiField.split(/\s+/).slice(1).join(" ") || tithiField;
  return {
    samvatsara: ctx.samvatsara || undefined,
    ayana: ctx.ayana || undefined,
    ritu: ctx.ritu || undefined,
    masa: ctx.masa || undefined,
    paksha: ctx.paksha || undefined,
    vaara: ctx.vaara || undefined,
    tithi: tithi || undefined,
    nakshatra: nakField || undefined,
  };
}

export function localCivilDate(location: LocationState): string {
  if (location.status === "READY") {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: location.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
  }
  return new Date().toISOString().slice(0, 10);
}

export function buildSankalpamRequest(opts: {
  purpose: string;
  deity?: string | null;
  mode: ParticipantMode;
  participants: Participant[];
  location: LocationState;
  panchanga: LocationPanchanga | null | undefined;
  choices: SankalpamChoices;
}): SankalpamRequest {
  const { location } = opts;
  return {
    purpose: opts.purpose,
    deity: opts.deity ?? null,
    groupMode: GROUP_MODE[opts.mode],
    people: opts.participants.map((p) => ({
      name: p.name,
      lineage: { gotra: p.gotra, veda: p.veda, sutra: p.sutra, sampradaya: p.sampradaya },
    })),
    place:
      location.status === "READY"
        ? { country: location.country, region: location.region, timezone: location.timezone }
        : {},
    localDateISO: localCivilDate(location),
    panchanga: panchangaToSlots(opts.panchanga),
    choices: opts.choices,
  };
}

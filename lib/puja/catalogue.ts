// The puja catalogue: every puja service the platform knows about. Adding a
// new real puja means adding a new service module here - this file never
// invents a placeholder or "coming soon" puja with no real content.

import { VINAYAKA_PUJA } from "@/lib/pujas/vinayaka/service";
import { DIWALI_PUJA } from "@/lib/pujas/diwali-lakshmi/service";
import type { PujaDefinition } from "./types";

export const PUJA_CATALOGUE: readonly PujaDefinition[] = [VINAYAKA_PUJA, DIWALI_PUJA];

/** Shown under the catalogue instead of any invented future puja. */
export const MORE_PUJAS_COMING_MESSAGE = "More pujas will be added.";
export const MORE_PUJAS_COMING_MESSAGE_TE = "మరిన్ని పూజలు త్వరలో చేరుస్తాము.";

export function availablePujas(): readonly PujaDefinition[] {
  return PUJA_CATALOGUE.filter((puja) => puja.availability === "AVAILABLE");
}

export function findPujaBySlug(slug: string): PujaDefinition | undefined {
  return PUJA_CATALOGUE.find((puja) => puja.slug === slug);
}

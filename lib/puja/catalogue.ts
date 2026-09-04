// The puja catalogue: every puja service the platform knows about. Vinayaka
// Chavithi is the first and, for now, only available service. Adding a
// second real puja means adding a second service module here - this file
// never invents a placeholder or "coming soon" puja with no real content.

import { VINAYAKA_PUJA } from "@/lib/pujas/vinayaka/service";
import type { PujaDefinition } from "./types";

export const PUJA_CATALOGUE: readonly PujaDefinition[] = [VINAYAKA_PUJA];

/** Shown under the catalogue instead of any invented future puja. */
export const MORE_PUJAS_COMING_MESSAGE = "More pujas will be added.";

export function availablePujas(): readonly PujaDefinition[] {
  return PUJA_CATALOGUE.filter((puja) => puja.availability === "AVAILABLE");
}

export function findPujaBySlug(slug: string): PujaDefinition | undefined {
  return PUJA_CATALOGUE.find((puja) => puja.slug === slug);
}

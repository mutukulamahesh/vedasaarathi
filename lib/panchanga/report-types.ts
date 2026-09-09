// Shared shape of the build-verified validation report. Kept in its own file
// so the browser Panchanga module (./index.ts) can reference the type without
// importing ./validation.ts (which runs the historical fixtures + festival
// scan and must never reach the client bundle).

export interface FieldResult {
  field: "sunrise" | "sunset" | "tithi" | "nakshatra" | "festival";
  released: boolean;
  cases: {
    place: string;
    dateISO: string;
    /** "name" = element name at sunrise; "transition" = its end timestamp. */
    kind?: "name" | "transition";
    computed: string;
    published: string;
    ok: boolean;
    deltaMin?: number;
    provenanceUrl: string;
    provenanceComplete: boolean;
  }[];
}

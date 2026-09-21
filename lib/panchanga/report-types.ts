// Shared shape of the build-verified validation report. Kept in its own file
// so the browser Panchanga module (./index.ts) can reference the type without
// importing ./validation.ts (which runs the historical fixtures + festival
// scan and must never reach the client bundle).

export type PanchangaField =
  | "sunrise"
  | "sunset"
  | "tithi"
  | "nakshatra"
  | "vaara"
  | "ritu"
  | "ayana"
  | "samvatsara"
  | "festival"
  | "pujaWindow";

export interface FieldResult {
  field: PanchangaField;
  released: boolean;
  cases: {
    place: string;
    dateISO: string;
    /** "name" = element name at sunrise; "transition" = its end timestamp;
     * "value" = a descriptive field; "window" = a start/end clock pair. */
    kind?: "name" | "transition" | "value" | "window";
    computed: string;
    published: string;
    ok: boolean;
    deltaMin?: number;
    provenanceUrl: string;
    provenanceComplete: boolean;
  }[];
}

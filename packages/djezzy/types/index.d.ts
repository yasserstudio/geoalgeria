// Type definitions for @geoalgeria/djezzy
// Data sourced from Djezzy (Optimum Telecom Algérie, djezzy.dz).

/** A geocoded Djezzy boutique (retail store). */
export interface Boutique {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-001"). */
  id: string;
  /** Djezzy internal store code (e.g. "Z56"). */
  code: string;
  /** Record type discriminator ("boutique"). */
  type: string;
  /** Boutique name / label as published by Djezzy. */
  name: string;
  /** Store category tier (e.g. "A", "A+", "B", "B+", "C", "C-"), or null if unspecified. */
  category: string | null;
  /** Street address in French. */
  address: string | null;
  /** Opening hours as published (e.g. "08H00 - 18H00"), or null. */
  hours: string | null;
  /** Djezzy opening code, or null when not published. */
  code_ouverture: string | null;
  /** Wilaya code as a zero-padded string ("01".."69"), nearest-centroid join. */
  wilaya_code: string;
  /** Commune code (geoalgeria code_commune), nearest-centroid best-effort. Null when the nearest commune lacks an ONS code. */
  commune_code: number | null;
  /** Commune name (French), nearest-centroid best-effort. */
  commune: string;
  /** Latitude (boutiques are fully geocoded). */
  lat: number;
  /** Longitude (boutiques are fully geocoded). */
  lng: number;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  boutiques: number;
  wilayas_covered: number;
  boutiques_geocoded: number;
  note: string;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
}

/** All Djezzy boutiques. */
export function boutiques(): Boutique[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  boutiques: typeof boutiques;
  metadata: typeof metadata;
};
export default _default;

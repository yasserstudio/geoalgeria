// Type definitions for @geoalgeria/mosquees
// A Wikidata (CC0) + OpenStreetMap (ODbL) composite of mosques in Algeria.

/** Where a record came from. */
export type MosqueeSource = "wikidata" | "wikidata+osm" | "osm";

/** A geocoded mosque (muslim place of worship). */
export interface Mosquee {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-0914"). */
  id: string;
  /** Provenance: Wikidata, OSM, or both (matched within ~150 m). */
  source: MosqueeSource;
  /** Wikidata QID (e.g. "Q28717404"), or null for OSM-only records. */
  wikidata: string | null;
  /** OSM element id (e.g. "way/292876445"), or null for Wikidata-only records. */
  osm_id: string | null;
  /** Best available display name (French preferred, else Arabic), or null if unnamed. */
  name: string | null;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** French / Latin-script name, or null. */
  name_fr: string | null;
  /** Denomination where known ("sunni" | "ibadi" | "sufi"), or null. */
  denomination: string | null;
  /** Wilaya code as a zero-padded string ("01".."69"), nearest-centroid join. */
  wilaya_code: string;
  /** Commune code (geoalgeria code_commune), nearest-centroid best-effort. Null when the nearest commune lacks an ONS code. */
  commune_code: number | null;
  /** Commune name (French), nearest-centroid best-effort. */
  commune: string;
  /** Latitude. */
  lat: number;
  /** Longitude. */
  lng: number;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  mosquees: number;
  named: number;
  by_source: { wikidata: number; "wikidata+osm": number; osm: number };
  wilayas_covered: number;
  mosquees_geocoded: number;
  /** MARW national mosque count, for honest coverage framing. */
  official_total: number;
  coverage_note: string;
  linkage_note: string;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
}

/** All mosques. */
export function mosquees(): Mosquee[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  mosquees: typeof mosquees;
  metadata: typeof metadata;
};
export default _default;

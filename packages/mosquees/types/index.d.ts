// Type definitions for @geoalgeria/mosquees (schema v2).
// A Wikidata (CC0) + OpenStreetMap (ODbL) composite of mosques in Algeria,
// checked against the Ministry of Religious Affairs (MARW) national count.
// Records follow the canonical GeoRecord contract (zero-padded string
// wilaya_code, geo_precision/geo_method/source/refs) plus the fields below.

/** Denomination, where known. */
export type Denomination = "ibadi" | "sufi" | "sunni";

/** Where a record came from — Wikidata, OSM, or both matched within ~150 m. */
export type MosqueeSource = "osm" | "wikidata" | "wikidata+osm";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` means there is no coordinate at all — not observed in this dataset
 *  (every mosque is geocoded), but part of the shared contract vocabulary. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. */
export type GeoMethod = "osm_node" | "osm_relation" | "osm_way" | "wikidata";

/** External identifiers keyed by source system. */
export interface Refs {
  /** OSM element id (e.g. "way/292876445"), present when an OSM feature matched. */
  osm?: string;
  /** Wikidata QID (e.g. "Q28717404"), present when a Wikidata item matched. */
  wikidata?: string;
}

/** A geocoded mosque (Muslim place of worship). */
export interface Mosquee {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-0914"). Unique within this file. */
  id: string;
  /** Best available display name (French preferred, else Arabic), or null if unnamed. */
  name: string | null;
  /** French / Latin-script name, or null. */
  name_fr: string | null;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"), nearest-centroid join. */
  wilaya_code: string;
  /** Commune (ONS) code, nearest-centroid best-effort. Null when unresolved. */
  commune_code: string | null;
  /** Commune name (French), nearest-centroid best-effort. */
  commune: string;
  /** Latitude — every mosque in this dataset is geocoded. */
  lat: number;
  /** Longitude — every mosque in this dataset is geocoded. */
  lng: number;
  /** "exact" for an OSM/Wikidata point, "approximate" when the match is coarser. */
  geo_precision: "exact" | "approximate";
  /** How `lat`/`lng` were obtained. */
  geo_method: GeoMethod;
  /** Provenance: Wikidata, OSM, or both. */
  source: MosqueeSource;
  /** External identifiers: OSM and/or Wikidata, matching `source`. */
  refs: Refs;
  /** Denomination, or null when unknown. */
  denomination: Denomination | null;
}

/** One provenance entry in `metadata.sources[]`. */
export interface SourceRef {
  key: string;
  name: string;
  url?: string;
  license: string;
  retrieved?: string;
  evidence_type?: "official" | "crowdsourced" | "derived";
}

/** Dataset metadata (data/metadata.json) — canonical fields plus mosque stats. */
export interface Metadata {
  package: "@geoalgeria/mosquees";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — every mosque. */
  geocoded_count: number;
  geocoded_pct: number;
  /** Count by `geo_precision`. */
  precision: { exact: number; approximate: number };
  /** MARW's counted national total, for honest coverage framing. */
  estimated_universe: number | null;
  coverage_pct: number | null;
  coverage_note: string;
  wilayas_covered: number;
  /** `[minLng, minLat, maxLng, maxLat]`, or null when nothing is geocoded. */
  bbox: [number, number, number, number] | null;
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  /** Records with a non-null name. */
  named: number;
  /** Count by `source`. */
  by_source: Partial<Record<MosqueeSource, number>>;
  linkage_note: string;
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

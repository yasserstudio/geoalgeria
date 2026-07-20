// Type definitions for @geoalgeria/djezzy (schema v2).
// Djezzy (Optimum Telecom Algérie) retail stores, sourced from
// djezzy.dz/nos-boutiques. Records follow the canonical GeoRecord contract
// (zero-padded string wilaya_code, string ONS commune_code, geo_precision/
// geo_method/source/refs) plus the store-specific fields below.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. Every store in this dataset carries a
 *  real Djezzy-published point. */
export type GeoMethod = "operator_point";

/** Store category tier, as classified by Djezzy. */
export type StoreCategory = "A" | "A+" | "B" | "B+" | "C" | "C-";

/** External identifiers keyed by source system. */
export interface Refs {
  /** Djezzy internal store code (e.g. "Z56"). */
  djezzy: string;
}

/** A Djezzy retail store. */
export interface Boutique {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "01-001"). Unique within this dataset. */
  id: string;
  /** Store name as published by Djezzy. */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code, nearest-centroid best-effort. */
  commune_code: string;
  /** Commune name (French), nearest-centroid best-effort. */
  commune: string;
  /** Latitude — every store carries a real operator point. */
  lat: number;
  /** Longitude. */
  lng: number;
  /** Always "exact": the point comes from Djezzy's own store directory. */
  geo_precision: GeoPrecision;
  /** Always "operator_point". */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "djezzy". */
  source: "djezzy";
  /** External identifiers: Djezzy's internal store code. */
  refs: Refs;
  /** Record type discriminator. */
  type: "boutique";
  /** Store category tier, or null if unspecified. */
  category: StoreCategory | null;
  /** Street address. */
  address: string;
  /** Opening hours as published (e.g. "08H00 - 18H00"). */
  hours: string;
  /** Djezzy opening code, or null when not published. */
  code_ouverture: string | null;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus store stats. */
export interface Metadata {
  package: "@geoalgeria/djezzy";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates. */
  geocoded_count: number;
  geocoded_pct: number;
  /** Count by `geo_precision` among geocoded records; ungeocoded records carry none. */
  precision: { exact: number; approximate: number };
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
  /** Count by record type (always `{ boutique: record_count }` today). */
  by_type: Partial<Record<"boutique", number>>;
  linkage_note: string;
}

/** All Djezzy stores. */
export function boutiques(): Boutique[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  boutiques: typeof boutiques;
  metadata: typeof metadata;
};
export default _default;

// Type definitions for @geoalgeria/ooredoo (schema v2).
// Ooredoo Algérie retail network from the operator's public locator API
// (trouvez-nous), geocoded and linked to the geoalgeria commune set.

/** Store type: Espace Ooredoo, City Shop Ooredoo, Espace Services Ooredoo. */
export type OoredooType = "CSO" | "EO" | "ESO";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` means there is no coordinate at all — not observed in this dataset
 *  (every store is geocoded), but part of the shared contract vocabulary. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. Always `"operator_api"`: every point
 *  comes straight from the Ooredoo locator API. */
export type GeoMethod = "operator_api";

/** External identifiers keyed by source system. */
export interface Refs {
  /** Ooredoo's own store id in the trouvez-nous API. */
  ooredoo: string;
}

/** An Ooredoo store. */
export interface OoredooStore {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-004"). Unique within this file. */
  id: string;
  /** Store name / code (e.g. "EO ROUIBA", "ESO000717"). */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code. */
  commune_code: string;
  /** Commune name (French), nearest-centroid match. */
  commune: string;
  /** Latitude (real API point). */
  lat: number;
  /** Longitude (real API point). */
  lng: number;
  /** `"exact"`, or `"approximate"` where the operator-API coordinate is rounded
   *  too coarse, or is shared with another store, to be a per-store point. */
  geo_precision: "exact" | "approximate";
  /** Always `"operator_api"`. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "ooredoo". */
  source: "ooredoo";
  /** External identifiers: the operator's own store id. */
  refs: Refs;
  /** Store type. */
  type: OoredooType;
  /** French label for the type. */
  type_label_fr: string;
  /** Arabic label for the type. */
  type_label_ar: string;
  /** Street address as listed by the operator. */
  address: string;
  /** The operator's own declared wilaya name, for transparency — a few points
   *  carry inaccurate source coordinates, so their derived `wilaya_code`/
   *  `commune` (nearest-centroid) may not match this. */
  operator_wilaya: string;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus Ooredoo stats. */
export interface Metadata {
  package: "@geoalgeria/ooredoo";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — every store. */
  geocoded_count: number;
  geocoded_pct: number;
  /** Count by `geo_precision`. */
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
  /** Count by `type`. */
  by_type: Record<OoredooType, number>;
}

/** All Ooredoo stores. */
export function stores(): OoredooStore[];
/** A single store by id, or null. */
export function storeById(id: string): OoredooStore | null;
/** Stores in a wilaya (accepts numeric or zero-padded code). */
export function storesByWilaya(code: string | number): OoredooStore[];
/** Stores of a given type ("EO" | "CSO" | "ESO"). */
export function storesByType(type: OoredooType | string): OoredooStore[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  stores: typeof stores;
  storeById: typeof storeById;
  storesByWilaya: typeof storesByWilaya;
  storesByType: typeof storesByType;
  metadata: typeof metadata;
};
export default _default;

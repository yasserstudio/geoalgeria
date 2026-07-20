// Type definitions for @geoalgeria/gares-routieres (schema v2).
// Algeria's intercity bus Stations (gares routières), managed by SOGRAL —
// locations and surface areas from the SOGRAL live API.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained: a real SOGRAL point ("exact") or a
 *  fallback estimate ("approx") for the one station without one. */
export type GeoMethod = "exact" | "approx";

/** External identifiers keyed by source system. */
export interface Refs {
  /** SOGRAL location code (`213-000{wilaya}{commune}`). */
  sogral: string;
}

/** An intercity bus Station (gare routière) operated by SOGRAL. */
export interface Station {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "01-01"). Unique within this dataset. */
  id: string;
  /** Station display name (distinguishes multiple stations per city). */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code as a 4-digit string. */
  commune_code: string;
  /** Commune name (French). */
  commune: string;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** "exact" for a SOGRAL point, "approximate" for the one fallback estimate. */
  geo_precision: GeoPrecision;
  /** How `lat`/`lng` were obtained. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "sogral". */
  source: "sogral";
  /** External identifiers — the SOGRAL location code. */
  refs: Refs;
  /** Official gare name as published by SOGRAL. */
  official_name: string;
  /** Postal address. */
  address: string;
  /** Total surface area, in m². */
  surface_total_m2: number;
  /** Built/covered surface area, in m². */
  surface_built_m2: number;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus gare stats. */
export interface Metadata {
  package: "@geoalgeria/gares-routieres";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — all of them. */
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
  /** Count by `geo_method`. */
  by_geo_method: Partial<Record<GeoMethod, number>>;
  linkage_note: string;
}

/** All intercity bus Stations (74). */
export function stations(): Station[];
/** One Station by id, or null. */
export function stationById(id: string): Station | null;
/** Stations in a wilaya — accepts "16", 16, or "01". */
export function stationsByWilaya(code: string | number): Station[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  stations: typeof stations;
  stationById: typeof stationById;
  stationsByWilaya: typeof stationsByWilaya;
  metadata: typeof metadata;
};
export default _default;

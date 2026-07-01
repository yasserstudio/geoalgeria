// Type definitions for @geoalgeria/gares-routieres
// Algeria's intercity bus stations (gares routières), sourced from SOGRAL.

/** An intercity bus station (gare routière) operated by SOGRAL. */
export interface Station {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-01"). */
  id: string;
  /** SOGRAL agency id (stable upstream key). */
  sogral_id: number;
  /** SOGRAL location code `213-000{wilaya}{commune}`. */
  sogral_code: string | null;
  /** Station display name (distinguishes multiple stations per city). */
  name: string;
  /** Official gare name, or null. */
  official_name: string | null;
  /** Postal address, or null. */
  address: string | null;
  /** Wilaya code, zero-padded to 2 digits ("01"–"69"). Joins `geoalgeria` wilayas. */
  wilaya_code: string;
  /** Commune name (French), nearest-centroid join. */
  commune: string | null;
  /** Commune code (geoalgeria code_commune), or null. */
  commune_code: number | null;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** "exact" (from SOGRAL/OSM) or "approx" (commune-centroid fallback). */
  geo_precision: "exact" | "approx";
  /** Total surface area in m², or null. */
  surface_total_m2: number | null;
  /** Built/covered surface area in m², or null. */
  surface_built_m2: number | null;
  /** Source URL. */
  source: string;
}

/** Dataset provenance and counts (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  stations: number;
  wilayas_covered: number;
  geocoded: number;
  geo_precision_note: string;
  linkage_note: string;
  generated_at: string;
}

/** All intercity bus stations (74). */
export function stations(): Station[];
/** One station by id, or null. */
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

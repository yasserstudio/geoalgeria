// Type definitions for @geoalgeria/ferroviaire
// A Wikidata (CC0) + OpenStreetMap (ODbL) composite of Algeria's rail & urban transit.

/** Transit node kind. */
export type StationType = "rail" | "tram" | "metro" | "underground" | "aerial_tram" | "gondola";

/** Where a record came from. */
export type StationSource = "wikidata" | "wikidata+osm" | "osm";

/** A rail or urban-transit node (station / stop). */
export interface Station {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-001"). */
  id: string;
  /** Best available display name (French preferred, else Arabic), or null. */
  name: string | null;
  /** French / Latin-script name, or null. */
  name_fr: string | null;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** Node kind. */
  type: StationType;
  /** Line membership where known (Wikidata P81 / OSM), or null. */
  line: string | null;
  /** Operating company: "SNTF" (rail), "SETRAM" (tram), "SEMA" (metro), or null. */
  operator: string | null;
  /** Network name (tram city network / "Métro d'Alger"), or null. */
  network: string | null;
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
  /** Geocoding precision (always "exact" for this dataset). */
  geo_precision: "exact";
  /** Provenance. */
  source: StationSource;
  /** Wikidata QID, or null. */
  wikidata: string | null;
  /** OSM element id (e.g. "node/123"), or null. */
  osm_id: string | null;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  stations: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  by_operator: Record<string, number>;
  wilayas_covered: number;
  coverage_note: string;
  linkage_note: string;
  generated_at: string;
}

/** All transit nodes (744). */
export function stations(): Station[];
/** Nodes of a given type ("rail" | "tram" | "metro" | …). */
export function stationsByType(type: StationType | string): Station[];
/** Nodes in a wilaya — accepts "16", 16, or "01". */
export function stationsByWilaya(code: string | number): Station[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  stations: typeof stations;
  stationsByType: typeof stationsByType;
  stationsByWilaya: typeof stationsByWilaya;
  metadata: typeof metadata;
};
export default _default;

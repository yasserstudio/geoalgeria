// Type definitions for @geoalgeria/ferroviaire (schema v2).
// Algeria's rail & urban-transit Stations — trains, trams, the Algiers metro,
// and aerial tramways/gondolas — compiled from Wikidata (CC0) and
// OpenStreetMap (ODbL).

/** Station kind. Station is the mode-neutral term (see CONTEXT.md) for a
 *  train station, tram/metro stop, or aerial-tramway/gondola station. */
export type StationType = "rail" | "tram" | "metro" | "aerial_tram" | "gondola";

/** Operating company. */
export type Operator = "SNTF" | "SETRAM" | "SEMA";

/** Transit network a Station belongs to (tram/metro city network). */
export type Network =
  | "Alger"
  | "Constantine"
  | "Mostaganem"
  | "Métro d'Alger"
  | "Oran"
  | "Ouargla"
  | "Sidi Bel Abbès"
  | "Sétif";

/** Where a Station's match came from. */
export type StationSource = "osm" | "wikidata" | "wikidata+osm";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained — every Station in this dataset carries a
 *  real Wikidata or OSM point. */
export type GeoMethod = "osm_node" | "osm_way" | "wikidata";

/** External identifiers keyed by source system. At least one is present. */
export interface Refs {
  /** Wikidata QID, present when the Station matched a Wikidata entity. */
  wikidata?: string;
  /** OSM element id (e.g. "node/4273180789"), present when the Station matched an OSM element. */
  osm?: string;
}

/** A rail or urban-transit Station (train, tram, metro, aerial tramway/gondola). */
export interface Station {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "02-001"). Unique within this dataset. */
  id: string;
  /** Best available display name (French preferred, else Arabic), or null. */
  name: string | null;
  /** French / Latin-script name, or null. */
  name_fr: string | null;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code as a 4-digit string, best-effort. Null when unresolved. */
  commune_code: string | null;
  /** Commune name (French), nearest-centroid join. */
  commune: string;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** Always "exact": every Station carries a real Wikidata/OSM point. */
  geo_precision: "exact";
  /** How `lat`/`lng` were obtained. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]`. */
  source: StationSource;
  /** External identifiers (Wikidata QID and/or OSM element id). */
  refs: Refs;
  /** Station kind. */
  type: StationType;
  /** Line name where known (Wikidata P81 / OSM), or null. */
  line: string | null;
  /** Operating company, or null when unknown. */
  operator: Operator | null;
  /** Transit network (tram/metro city network), or null when not applicable. */
  network: Network | null;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus rail/transit stats. */
export interface Metadata {
  package: "@geoalgeria/ferroviaire";
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
  /** Count by type; kinds with no records are absent. */
  by_type: Partial<Record<StationType, number>>;
  /** Count by operator; operators with no records are absent. */
  by_operator: Partial<Record<Operator, number>>;
  linkage_note: string;
}

/** All rail & urban-transit Stations. */
export function stations(): Station[];
/** One Station by id, or null. */
export function stationById(id: string): Station | null;
/** Stations of a given kind ("rail" | "tram" | "metro" | …). */
export function stationsByType(type: StationType | string): Station[];
/** Stations in a wilaya — accepts "16", 16, or "01". */
export function stationsByWilaya(code: string | number): Station[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  stations: typeof stations;
  stationById: typeof stationById;
  stationsByType: typeof stationsByType;
  stationsByWilaya: typeof stationsByWilaya;
  metadata: typeof metadata;
};
export default _default;

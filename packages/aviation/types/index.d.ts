// Type definitions for @geoalgeria/aviation (schema v2).
// Civil airports of Algeria — the National Civil Aviation Authority (ANAC)
// listing, geocoded from ANAC's own published coordinates.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained — always ANAC's own published point. */
export type GeoMethod = "source_point";

/** External identifiers keyed by source system. */
export interface Refs {
  /** ICAO (OACI) code, duplicated from the top-level `icao` field. */
  icao: string;
}

/** A civil airport, as published by ANAC. */
export interface Airport {
  /** Stable id — the ICAO code, lowercased (e.g. "daad"). */
  id: string;
  /** Official airport name in French. */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Always null — this dataset is wilaya-level only, no commune linkage. */
  commune_code: null;
  /** Always null — see `commune_code`. */
  commune: null;
  /** Latitude (WGS84). Every airport carries ANAC's own published point. */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** Always "exact": every point comes straight from ANAC, not a fallback. */
  geo_precision: "exact";
  /** Always "source_point" — see `geo_precision`. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "anac". */
  source: "anac";
  /** External identifiers: the ICAO code. */
  refs: Refs;
  /** ICAO (OACI) code — matches /^DA[A-Z]{2}$/ (e.g. "DAAD"). */
  icao: string;
  /** IATA code — not published by ANAC; always null today. Typed as
   *  `string | null` so a future populated value is not a breaking change. */
  iata: string | null;
  /** Postal address as listed by ANAC. */
  address: string;
  /** Contact phone, or null if none is given. */
  phone: string | null;
  /** Official website URL. */
  website: string;
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

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  package: "@geoalgeria/aviation";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — equal to `record_count`: ANAC publishes a
   *  point for every airport. */
  geocoded_count: number;
  geocoded_pct: number;
  precision: { exact: number; approximate: number };
  estimated_universe: number | null;
  coverage_pct: number | null;
  coverage_note: string;
  wilayas_covered: number;
  /** `[minLng, minLat, maxLng, maxLat]`. */
  bbox: [number, number, number, number] | null;
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  /** Airports with a published IATA code — currently 0 (ANAC does not publish them). */
  with_iata: number;
}

/** All civil airports (33). */
export function airports(): Airport[];
/** One airport by ICAO code (case-insensitive), or null if none matches. */
export function airportByIcao(code: string): Airport | null;
/** Airports in a wilaya — accepts "16", 16, or "01". */
export function airportsByWilaya(code: string | number): Airport[];
/** Dataset metadata (counts, source, generated_at). */
export function metadata(): Metadata;

declare const _default: {
  airports: typeof airports;
  airportByIcao: typeof airportByIcao;
  airportsByWilaya: typeof airportsByWilaya;
  metadata: typeof metadata;
};
export default _default;

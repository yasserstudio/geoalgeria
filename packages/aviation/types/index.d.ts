// Type definitions for @geoalgeria/aviation (schema v2).
// Civil airports of Algeria: the National Civil Aviation Authority (ANAC)
// listing, geocoded from ANAC's own published coordinates, plus the three
// airports ANAC's map omits and every IATA code, both from OurAirports.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained: always the source's own published point. */
export type GeoMethod = "source_point";

/** External identifiers keyed by source system. */
export interface Refs {
  /** ICAO (OACI) code, duplicated from the top-level `icao` field. */
  icao: string;
  /** IATA code, duplicated from the top-level `iata` field. Optional because
   *  `refs` omits null values entirely: an airport with no assigned IATA code
   *  ships `refs: { icao }`, with no `iata` key at all. Typing it required would
   *  make `refs.iata.length` compile and then throw on the first such record,
   *  which is exactly the case the top-level `iata` promises is non-breaking. */
  iata?: string;
}

/** A civil airport. */
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
  /** Latitude (WGS84). Every airport carries its source's own published point. */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** Always "exact": every point comes straight from a source, not a fallback. */
  geo_precision: "exact";
  /** Always "source_point" — see `geo_precision`. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]`. "anac" for the 33 airports on
   *  ANAC's map; "ourairports" for the three it omits (HRM, MZW, LOO). */
  source: "anac" | "ourairports";
  /** External identifiers: the ICAO and IATA codes. */
  refs: Refs;
  /** ICAO (OACI) code — matches /^DA[A-Z]{2}$/ (e.g. "DAAD"). */
  icao: string;
  /** IATA code (e.g. "ALG"). ANAC does not publish these; they are backfilled
   *  from OurAirports on an ICAO join, each confirmed by coordinate distance.
   *  Populated on all 36 records today, but still typed nullable: a future
   *  airport with no assigned IATA code must not be a breaking change. */
  iata: string | null;
  /** Postal address as listed by ANAC, or null on the OurAirports supplements,
   *  which have no upstream contact fields. */
  address: string | null;
  /** Contact phone, or null if none is given. */
  phone: string | null;
  /** Official website URL, or null, see `address`. */
  website: string | null;
}

/** One provenance entry in `metadata.sources[]`. */
export interface SourceRef {
  key: string;
  name: string;
  url?: string;
  license: string;
  retrieved?: string;
  /** "official" for ANAC, "crowdsourced" for OurAirports, which is
   *  volunteer-edited and so is neither a government register nor a
   *  first-party operator feed. */
  evidence_type?: "official" | "crowdsourced" | "derived";
  /** The exact upstream bytes this build read. Both of this package's sources
   *  are live documents, and OurAirports regenerates continuously, so
   *  `retrieved` alone cannot say what a shipped value came from. */
  snapshot?: SourceSnapshot;
}

/** An attestation of the upstream artifact a build read. Records what was
 *  fetched; it is not a pin and never rejects a changed upstream. */
export interface SourceSnapshot {
  /** The artifact actually fetched, which may be more specific than
   *  `SourceRef.url`: ANAC's is the versioned map file, not the page. */
  url: string;
  /** SHA-256 of the fetched bytes, lowercase hex. */
  sha256: string;
  /** Size of the fetched bytes. */
  bytes: number;
  /** The upstream's own `Last-Modified` as an ISO date, where it publishes one. */
  last_modified?: string;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  package: "@geoalgeria/aviation";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — equal to `record_count`: both sources publish a
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
  /** Airports carrying an IATA code — currently all 36. */
  with_iata: number;
  /** Record count per `source` key, e.g. `{ anac: 33, ourairports: 3 }`. */
  by_source: Record<string, number>;
}

/** All civil airports (36). */
export function airports(): Airport[];
/** One airport by ICAO code (case-insensitive), or null if none matches. */
export function airportByIcao(code: string): Airport | null;
/** One airport by IATA code (case-insensitive), or null if none matches.
 *  All 36 records carry a code today; a record with a null `iata` would simply
 *  be unreachable through this lookup, and `airportByIcao` still finds it. */
export function airportByIata(code: string): Airport | null;
/** Airports in a wilaya — accepts "16", 16, or "01". */
export function airportsByWilaya(code: string | number): Airport[];
/** Dataset metadata (counts, source, generated_at). */
export function metadata(): Metadata;

declare const _default: {
  airports: typeof airports;
  airportByIcao: typeof airportByIcao;
  airportByIata: typeof airportByIata;
  airportsByWilaya: typeof airportsByWilaya;
  metadata: typeof metadata;
};
export default _default;

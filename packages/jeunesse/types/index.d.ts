// Type definitions for @geoalgeria/jeunesse (schema v2).
// Youth Establishments of Algeria — auberges & maisons de jeunes, camps, and
// sports complexes, from the Ministry of Youth and Sports SIG.

/** The nine youth-Establishment type codes published on the MJS GIS. */
export type TypeCode =
  | "AJ" | "BA" | "CC" | "CJ" | "CLS" | "CSP" | "FJ" | "MJ" | "SPA";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained — every Establishment in this dataset
 *  carries a real point from the MJS GIS. */
export type GeoMethod = "sig_mjs";

/** A youth Establishment, as published by the Ministry of Youth and Sports GIS. */
export interface Institution {
  /** Stable id, unique within this dataset. Opaque — do not parse. */
  id: string;
  /** Official name, in French. `null` for the records the source leaves blank. */
  name: string | null;
  /** Arabic name, or `null` where none is published. */
  name_ar: string | null;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code. Currently null for every establishment (the MJS GIS
   *  gives a commune name only); typed as `string | null` so a future
   *  populated value is not a breaking change. */
  commune_code: string | null;
  /** Commune name (French, uppercase as published). */
  commune: string;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** `"exact"`, or `"approximate"` where the MJS GIS coordinate is rounded too
   *  coarse, or is shared with another establishment, to be a per-facility point. */
  geo_precision: "exact" | "approximate";
  /** How `lat`/`lng` were obtained. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "mjs". */
  source: "mjs";
  /** Establishment type code. */
  type: TypeCode;
  /** Canonical French label for the type (e.g. "Maison de jeunes"). */
  type_label_fr: string;
  /** Canonical Arabic label for the type. */
  type_label_ar: string;
  /** Daïra name (French, uppercase as published). */
  daira: string;
  /** Street address as published, or `null`. */
  address: string | null;
  /** Reception/intake capacity, or `null` if not published. */
  capacity: number | null;
  /** Year the Establishment was received/commissioned, or `null`. */
  year: number | null;
  /** `true` if operational, `false` if not, `null` if unknown. */
  operational: boolean | null;
  /** `true`/`false` for PMR (reduced-mobility) accessibility, `null` if unknown. */
  pmr: boolean | null;
  /** Built-up area in m², or `null`. */
  surface_built_m2: number | null;
  /** Land (plot) area in m², or `null`. */
  surface_land_m2: number | null;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus youth-Establishment stats. */
export interface Metadata {
  package: "@geoalgeria/jeunesse";
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
  /** Count by type; codes with no records are absent. */
  by_type: Partial<Record<TypeCode, number>>;
  /** How many records carry an Arabic name. */
  named_ar: number;
}

/** All youth Establishments (~2,334). */
export function institutions(): Institution[];
/** One Establishment by id, or `null` if none matches. */
export function institutionById(id: string | number): Institution | null;
/** Establishments in a wilaya — accepts "16", 16, or "01". */
export function institutionsByWilaya(code: string | number): Institution[];
/** Establishments of a type — accepts a type code (case-insensitive), e.g. "mj". */
export function institutionsByType(code: TypeCode | string): Institution[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  institutions: typeof institutions;
  institutionById: typeof institutionById;
  institutionsByWilaya: typeof institutionsByWilaya;
  institutionsByType: typeof institutionsByType;
  metadata: typeof metadata;
};
export default _default;

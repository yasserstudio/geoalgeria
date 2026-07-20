// Type definitions for @geoalgeria/sports (schema v2).
// Sports facilities of Algeria (stadiums, gyms, fields, pools) from the
// Ministry of Youth and Sports SIG. Records follow the canonical GeoRecord
// contract (zero-padded string wilaya_code, geo_precision/geo_method/source)
// plus the fields below.

/** Facility type code, as published by the Ministry of Youth and Sports SIG. */
export type TypeCode =
  | "AJF" | "AJL" | "BL" | "BN" | "BNA" | "CDT" | "CE" | "CFR" | "CRP"
  | "CT" | "CXS" | "EJT" | "EPS" | "GS" | "P25" | "P50" | "PA" | "PP"
  | "SA" | "SF" | "SOMS" | "SS" | "STOMS" | "TF" | "TR" | "TSP" | "UHR";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` means there is no coordinate at all — not observed in this dataset
 *  (every facility is geocoded), but part of the shared contract vocabulary. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. Always `"sig_mjs"`: every point comes
 *  from the Ministry of Youth and Sports SIG. */
export type GeoMethod = "sig_mjs";

/** A sports facility. */
export interface Facility {
  /** Stable id, zero-padded sequential string (e.g. "00001"). Unique within this file. */
  id: string;
  /** Facility name, or null when unnamed in the source. */
  name: string | null;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code — always null: the SIG resolves to a commune name only;
   *  typed as `string | null` so a future value is not a break. */
  commune_code: string | null;
  /** Commune name, as published by the SIG (not necessarily canonical casing). */
  commune: string;
  /** Latitude — every facility in this dataset is geocoded. */
  lat: number;
  /** Longitude — every facility in this dataset is geocoded. */
  lng: number;
  /** `"exact"`, or `"approximate"` where the SIG coordinate is rounded too coarse,
   *  or is shared with another facility, to be a per-facility point. */
  geo_precision: "exact" | "approximate";
  /** Always `"sig_mjs"`. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "mjs". */
  source: "mjs";
  /** Facility type code. */
  type: TypeCode;
  /** French label for the type. */
  type_label_fr: string;
  /** Daira (as published by the SIG). */
  daira: string;
  /** Street address, or null. */
  address: string | null;
  /** Capacity (spectators/users), or null when unknown. */
  capacity: number | null;
  /** Year built/commissioned, or null when unknown. */
  year: number | null;
  /** Operational status, or null when unknown. */
  operational: boolean | null;
  /** Accessible to persons with reduced mobility, or null when unknown. */
  pmr: boolean | null;
  /** Built (covered) surface in m², or null when unknown. */
  surface_built_m2: number | null;
  /** Total land surface in m², or null when unknown. */
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

/** Dataset metadata (data/metadata.json) — canonical fields plus facility stats. */
export interface Metadata {
  package: "@geoalgeria/sports";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — every facility. */
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
  /** Count by `type`; codes with no records are absent. */
  by_type: Partial<Record<TypeCode, number>>;
  /** Records with a non-null name. */
  named: number;
}

/** All sports facilities. */
export function facilities(): Facility[];
/** A single facility by id (numeric or zero-padded string), or null. */
export function facilityById(id: number | string): Facility | null;
/** Facilities in a wilaya — accepts `16` or `"16"`. */
export function facilitiesByWilaya(code: string | number): Facility[];
/** Facilities of a given type code (e.g. "TSP"). */
export function facilitiesByType(code: string): Facility[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  facilities: typeof facilities;
  facilityById: typeof facilityById;
  facilitiesByWilaya: typeof facilitiesByWilaya;
  facilitiesByType: typeof facilitiesByType;
  metadata: typeof metadata;
};
export default _default;

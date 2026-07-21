// Type definitions for @geoalgeria/poste (schema v2).
// Post offices and ATMs (GAB) of Algérie Poste, sourced from baridimap.poste.dz.
// Records follow the canonical GeoRecord contract (zero-padded string
// wilaya_code, string ONS commune_code, geo_precision/geo_method/source) plus
// the postal-specific fields below.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. `null` on an ungeocoded record — no method
 *  produced a point, so none can be named. */
export type GeoMethod = "baridimap" | null;

/** Office class/category as published by Algérie Poste. */
export type OfficeClass = "CE" | "GA" | "HC" | "R1" | "R2" | "R3" | "R4";

/** ATM operational status as published by Algérie Poste. `"1"` is an
 *  undocumented source value carried through verbatim rather than guessed at. */
export type AtmStatus = "OPEN" | "CLOSED (OFFLINE)" | "1";

/** A post office (bureau de poste). */
export interface PostOffice {
  /** Stable id, unique within this file. Opaque — do not parse. */
  id: string;
  /** Office name (French / transliterated). */
  name: string;
  /** Office name in Arabic. */
  name_ar: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code as a 4-digit string. */
  commune_code: string;
  /** Commune name (French). */
  commune: string;
  /** Commune name in Arabic. */
  commune_ar: string;
  /** Latitude, or null when the office is not geocoded. */
  lat: number | null;
  /** Longitude, or null. Both coordinates are set, or both are null. */
  lng: number | null;
  /** `"exact"` for a Baridimap point, `null` when `lat`/`lng` are null —
   *  a record with no point asserts no precision. */
  geo_precision: GeoPrecision;
  /** How `lat`/`lng` were obtained; null when there are none. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "baridimap". */
  source: "baridimap";
  /** Office class/category. */
  class: OfficeClass;
  /** 5-digit postal code. */
  postal_code: string;
  /** Previous postal code, or null when the office was never renumbered. */
  postal_code_old: string | null;
  /** Street address. */
  address: string;
}

/** An ATM (GAB — distributeur automatique). */
export interface Atm {
  /** Stable id, unique within this file. Opaque — do not parse. */
  id: string;
  /** ATM name/label. */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code. Currently null for every ATM (the source resolves ATMs
   *  to a commune name only); typed as `string | null` so a future populated
   *  value is not a breaking change. */
  commune_code: string | null;
  /** Commune name (French). */
  commune: string;
  /** Commune name in Arabic. */
  commune_ar: string;
  /** Latitude, or null when the ATM is not geocoded. */
  lat: number | null;
  /** Longitude, or null. Both coordinates are set, or both are null. */
  lng: number | null;
  /** `"exact"` for a Baridimap point, `null` when `lat`/`lng` are null. */
  geo_precision: GeoPrecision;
  /** How `lat`/`lng` were obtained; null when there are none. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "baridimap". */
  source: "baridimap";
  /** Operational status. */
  status: AtmStatus;
  /** 5-digit postal code of the hosting office. */
  postal_code: string;
  /** Previous postal code, or null when never renumbered. */
  postal_code_old: string | null;
  /** Street address. Currently null for every ATM (the source omits it); typed
   *  as `string | null` so a future populated value is not a breaking change. */
  address: string | null;
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

/** One data file described in `metadata.entities[]`. */
export interface EntityRef {
  file: string;
  count: number;
}

/** Dataset metadata (data/metadata.json) — canonical fields plus postal stats. */
export interface Metadata {
  package: "@geoalgeria/poste";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  /** Post offices + ATMs. */
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
  /** Per-file record counts (postoffices.json, atms.json). */
  entities: EntityRef[];
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  distinct_postal_codes: number;
}

/** All post offices. */
export function postOffices(): PostOffice[];
/** All ATMs. */
export function atms(): Atm[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  postOffices: typeof postOffices;
  atms: typeof atms;
  metadata: typeof metadata;
};
export default _default;

// Type definitions for @geoalgeria/formation-professionnelle (schema v2).
// Vocational training establishments published by the Ministry of Vocational
// Training (MFEP) via takwin.dz. Records follow the canonical GeoRecord
// contract (zero-padded string wilaya_code, geo_precision/geo_method/source)
// plus the MFEP-specific fields below.

/** Establishment type slugs in the MFEP vocational training network. */
export type EstablishmentType =
  | "dfep"
  | "ifep"
  | "insfp"
  | "iep"
  | "cfpa"
  | "annexe_cfpa"
  | "annexe_cnfepd"
  | "annexe_insfp"
  | "prive"
  | "infep";

/** Public or private sector. */
export type Secteur = "public" | "prive";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the establishment has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. `null` on an ungeocoded record — no method
 *  produced a point, so none can be named. */
export type GeoMethod = "takwin" | null;

/** A vocational training establishment, as published by the MFEP via takwin.dz. */
export interface Establishment {
  /** Stable id, a zero-padded sequence string (e.g. "00001"). Unique within
   *  this dataset. Opaque — do not parse. */
  id: string;
  /** Official name (Arabic). */
  name: string;
  /** Official name (French), or `null` when the source omits it. */
  name_fr: string | null;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code. Currently null for every establishment (the source
   *  gives a commune name only); typed as `string | null` for the future. */
  commune_code: string | null;
  /** Commune name (Arabic). */
  commune: string;
  /** Latitude (WGS84), or `null` when the source has no coordinates. */
  lat: number | null;
  /** Longitude (WGS84), or `null`. Both coordinates are set, or both are null. */
  lng: number | null;
  /** `"exact"` for a takwin.dz point, `null` when `lat`/`lng` are null —
   *  a record with no point asserts no precision. */
  geo_precision: GeoPrecision;
  /** How `lat`/`lng` were obtained; null when there are none. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "mfep". */
  source: "mfep";
  /** Establishment category. */
  type: EstablishmentType;
  /** Arabic label for the type. */
  type_label: string;
  /** Abbreviation (French preferred, Arabic fallback), or `null`. */
  abreviation: string | null;
  /** MFEP establishment code. */
  code: string;
  /** `"public"` or `"prive"` (accredited private institution). */
  secteur: Secteur;
  /** Street address (Arabic), or `null`. */
  adresse: string | null;
  /** Street address (French), or `null`. */
  adresse_fr: string | null;
  /** Phone number, or `null`. */
  telephone: string | null;
  /** Fax number, or `null`. */
  fax: string | null;
  /** Email address, or `null`. */
  email: string | null;
  /** Website URL, or `null`. */
  site_web: string | null;
  /** Facebook page URL, or `null`. */
  facebook: string | null;
  /** Theoretical capacity (trainees), or `null` when unknown/zero. */
  capacite: number | null;
  /** Realized/operational capacity, or `null`. */
  capacite_reelle: number | null;
  /** Surface area in square metres, or `null`. */
  surface_m2: number | null;
  /** Whether the establishment has boarding facilities. */
  internat: boolean;
  /** Theoretical boarding capacity, or `null`. */
  capacite_internat: number | null;
  /** Vocational specializations offered (Arabic), or `null`. */
  vocations: string[] | null;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus MFEP stats. */
export interface Metadata {
  package: "@geoalgeria/formation-professionnelle";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
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
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  /** Count by type; categories with no records are absent. */
  by_type: Partial<Record<EstablishmentType, number>>;
  /** Count by sector. */
  by_secteur: Record<Secteur, number>;
}

/** Every vocational training establishment. */
export function establishments(): Establishment[];
/** One establishment by id, or `null` if none matches. Accepts the padded
 *  string form ("00001") or its numeric equivalent. */
export function establishmentById(id: number | string): Establishment | null;
/** Establishments in a wilaya — accepts `"16"`, `16`, or `"01"`. */
export function establishmentsByWilaya(code: string | number): Establishment[];
/** Establishments of a type — accepts a slug (case-insensitive), e.g. `"cfpa"`. */
export function establishmentsByType(type: string): Establishment[];
/** Dataset metadata (counts, sources, updated). */
export function metadata(): Metadata;

declare const _default: {
  establishments: typeof establishments;
  establishmentById: typeof establishmentById;
  establishmentsByWilaya: typeof establishmentsByWilaya;
  establishmentsByType: typeof establishmentsByType;
  metadata: typeof metadata;
};
export default _default;

// Type definitions for @geoalgeria/enseignement-superieur (schema v2).
// Algeria's higher-education network (universities, grandes écoles, ENS,
// centres universitaires) from the Ministry of Higher Education and
// Scientific Research (MESRS).

/** The institution categories in the MESRS higher-education network. */
export type InstitutionType = "universite" | "grande_ecole" | "ens" | "centre_universitaire";

/** Whether the institution is a public establishment or a licensed private one. */
export type Sector = "public" | "private";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How a record's coordinates were placed: `campus` = a real campus point;
 *  `commune` = the centroid of its commune; `wilaya` = the centroid of its
 *  wilaya (the fallback for private/other-ministry institutions, which MESRS
 *  publishes without an address). */
export type GeoMethod = "campus" | "commune" | "wilaya";

/** Ministries other than MESRS that pedagogically supervise a subset of institutions. */
export type SupervisoryMinistry =
  | "Ministère de la Culture et des Arts"
  | "Ministère de la Défense nationale"
  | "Ministère de la Poste et des Télécommunications"
  | "Ministère de la Santé"
  | "Ministère du Travail, de l'Emploi et de la Sécurité sociale";

/** A higher-education institution, as published by the MESRS. */
export interface Institution {
  /** Stable id, assigned by this package (the MESRS source publishes none). Opaque — do not parse. */
  id: string;
  /** Official French name. Null for private/other-ministry institutions, which
   *  MESRS lists in Arabic only — read `name_ar` for those. */
  name: string | null;
  /** Official Arabic name. Present for every private/other-ministry institution
   *  and backfilled for most of the public network; null otherwise. */
  name_ar: string | null;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code. Currently null for every institution (the MESRS source
   *  gives no commune code); typed as `string | null` so a future populated
   *  value is not a breaking change. */
  commune_code: string | null;
  /** Commune name (French), best-effort. Null when the record is placed at a
   *  wilaya centroid (`geo_precision === "approximate"` with `geo_method === "wilaya"`). */
  commune: string | null;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** "exact" for a real campus point, "approximate" for a commune/wilaya centroid. */
  geo_precision: GeoPrecision;
  /** How `lat`/`lng` were placed — see {@link GeoMethod}. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "mesrs". */
  source: "mesrs";
  /** Institution category. */
  type: InstitutionType;
  /** Canonical French label for the type (e.g. "Université", "École normale supérieure"). */
  type_label_fr: string;
  /** Public establishment or licensed private institution. */
  sector: Sector;
  /** For institutions under another ministry (Défense, Santé, Culture, …) that
   *  MESRS supervises pedagogically; null for the MESRS network itself. */
  supervisory_ministry: SupervisoryMinistry | null;
  /** The institution's official website, as listed by the ministry, or null. */
  website: string | null;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus institution stats. */
export interface Metadata {
  package: "@geoalgeria/enseignement-superieur";
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
  /** Count by type. */
  by_type: Partial<Record<InstitutionType, number>>;
  /** Count by sector. */
  by_sector: Partial<Record<Sector, number>>;
  /** Count by `geo_method`. */
  by_geo_method: Partial<Record<GeoMethod, number>>;
}

/** Every higher-education institution. */
export function institutions(): Institution[];
/** One institution by id, or `null` if none matches. Accepts the id as a
 *  number or string (compared both ways since `Institution.id` is an
 *  opaque zero-padded string, e.g. "00001"). */
export function institutionById(id: number | string): Institution | null;
/** Institutions in a wilaya — accepts `"16"`, `16`, or `"01"`. */
export function institutionsByWilaya(code: string | number): Institution[];
/** Institutions of a category — accepts a type (case-insensitive), e.g. `"universite"`. */
export function institutionsByType(type: string): Institution[];
/** Institutions in a sector — `"public"` or `"private"` (case-insensitive). */
export function institutionsBySector(sector: string): Institution[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  institutions: typeof institutions;
  institutionById: typeof institutionById;
  institutionsByWilaya: typeof institutionsByWilaya;
  institutionsByType: typeof institutionsByType;
  institutionsBySector: typeof institutionsBySector;
  metadata: typeof metadata;
};
export default _default;

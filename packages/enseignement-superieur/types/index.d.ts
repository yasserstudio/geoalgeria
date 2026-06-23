/** The institution categories in the MESRS higher-education network. */
export type InstitutionType = "universite" | "grande_ecole" | "ens" | "centre_universitaire";

/** Whether the institution is a public establishment or a licensed private one. */
export type Sector = "public" | "private";

/** How a record's coordinates were placed. `campus` = an OSM-geocoded point for the
 *  institution; `commune` = the centroid of its commune (city), from the geoalgeria
 *  flagship, used where OSM can't find the campus by name; `wilaya` = the centroid of
 *  its wilaya (the fallback when only the wilaya is known — all private/other-ministry
 *  institutions, which the source publishes without an address). */
export type GeoPrecision = "campus" | "commune" | "wilaya";

/** A higher-education institution, as published by the MESRS. */
export interface Institution {
  /** Stable id (1-based), assigned by this package (the ministry publishes no id). */
  id: number;
  /** Official French name. `null` for private/other-ministry institutions, which the
   *  ministry lists in Arabic only — read `name_ar` for those. */
  name: string | null;
  /** Official Arabic name. Present for every private/other-ministry institution and
   *  backfilled for ~88% of the public network (joined on website); `null` otherwise. */
  name_ar: string | null;
  /** Institution category. */
  type: InstitutionType;
  /** French label for the type (e.g. `"Université"`, `"École normale supérieure"`). */
  type_fr: string;
  /** Public establishment or licensed private institution. */
  sector: Sector;
  /** For institutions under another ministry (Défense, Santé, Culture, …) that MESRS
   *  supervises pedagogically — the supervising ministry's French name; `null` for the
   *  MESRS network itself. */
  supervisory_ministry: string | null;
  /** The institution's official website, as listed by the ministry, or `null`. */
  website: string | null;
  /** Commune (French) the coordinates fall in, from the geoalgeria flagship; `null`
   *  when the record is placed at a wilaya centroid (`geo_precision === "wilaya"`). */
  commune: string | null;
  /** Wilaya code, zero-padded to 2 digits. Joins `geoalgeria` wilayas (69-wilaya scheme). */
  wilaya_code: string;
  /** Wilaya name, in French, from the geoalgeria flagship. */
  wilaya_name: string;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** Coordinate provenance — see {@link GeoPrecision}. */
  geo_precision: GeoPrecision;
  /** Source page the record was derived from. */
  source: string;
}

/** Dataset provenance and counts. */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  institutions: number;
  /** Record count per institution type. */
  by_type: Partial<Record<InstitutionType, number>>;
  /** Record count per sector (public / private). */
  by_sector: Partial<Record<Sector, number>>;
  /** Record count per coordinate-precision level. */
  by_precision: Partial<Record<GeoPrecision, number>>;
  wilayas_covered: number;
  /** How many records carry an Arabic name. */
  name_ar_count: number;
  /** Institutions that could not be placed (no geocode and no resolvable wilaya). */
  dropped: number;
  generated_at: string;
}

/** Every higher-education institution. */
export function institutions(): Institution[];
/** One institution by id, or `null` if none matches. */
export function institutionById(id: number | string): Institution | null;
/** Institutions in a wilaya — accepts `"16"`, `16`, or `"01"`. */
export function institutionsByWilaya(code: string | number): Institution[];
/** Institutions of a category — accepts a type (case-insensitive), e.g. `"universite"`. */
export function institutionsByType(type: string): Institution[];
/** Institutions in a sector — `"public"` or `"private"` (case-insensitive). */
export function institutionsBySector(sector: string): Institution[];
/** Dataset metadata (counts, source, generated_at). */
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

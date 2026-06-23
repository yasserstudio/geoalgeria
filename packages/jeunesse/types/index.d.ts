/** The nine youth-establishment type codes published on the MJS GIS. */
export type TypeCode =
  | "MJ" | "CSP" | "SPA" | "AJ" | "CJ" | "CLS" | "FJ" | "CC" | "BA";

/** A youth establishment, as published by the Ministère de la Jeunesse et des Sports GIS. */
export interface Institution {
  /** Stable sequential id (1…N), assigned at build time after sorting. */
  id: number;
  /** Official name, in French. `null` for the ~5% the source leaves blank. */
  name: string | null;
  /**
   * Arabic name, backfilled from the legacy ministry map by nearest-neighbour
   * geo-match (≤200 m, type-checked). `null` where no confident match exists (~41%).
   */
  name_ar: string | null;
  /** Type code (short, stable key), e.g. `"MJ"`, `"CSP"`, `"AJ"`. */
  type_code: TypeCode;
  /** French type label (e.g. `"Maison de jeunes"`). */
  type_fr: string;
  /** Indicative Arabic type label (e.g. `"دار الشباب"`). */
  type_ar: string;
  /** Street address as published, or `null`. */
  address: string | null;
  /** Commune name (French, uppercase as published), or `null`. */
  commune: string | null;
  /** Daïra name (French, uppercase as published), or `null`. */
  daira: string | null;
  /** Wilaya code, zero-padded to 2 digits (`"01"`–`"58"`). Joins `geoalgeria` wilayas. */
  wilaya_code: string;
  /** Wilaya name (French, uppercase as published). */
  wilaya_name: string;
  /** Reception/intake capacity, or `null` if not published. */
  capacity: number | null;
  /** Year the establishment was received/commissioned, or `null`. */
  year: number | null;
  /** `true` if operational, `false` if not, `null` if unknown. */
  operational: boolean | null;
  /** `true`/`false` for PMR (reduced-mobility) accessibility, `null` if unknown. */
  pmr: boolean | null;
  /** Built-up area in m², or `null`. */
  surface_built_m2: number | null;
  /** Land (plot) area in m², or `null`. */
  surface_land_m2: number | null;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** Source the record was derived from. */
  source: string;
}

/** Dataset provenance and counts. */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  institutions: number;
  /** Record count per type code. */
  by_type: Partial<Record<TypeCode, number>>;
  wilayas_covered: number;
  /** How many records received a backfilled Arabic name. */
  name_ar_matched: number;
  /** Records excluded (no geometry, out-of-country, or no wilaya). */
  dropped: number;
  generated_at: string;
}

/** All youth establishments (~2,334). */
export function institutions(): Institution[];
/** One establishment by id, or `null` if none matches. */
export function institutionById(id: number | string): Institution | null;
/** Establishments in a wilaya — accepts `"16"`, `16`, or `"01"`. */
export function institutionsByWilaya(code: string | number): Institution[];
/** Establishments of a type — accepts a type code (case-insensitive), e.g. `"mj"`. */
export function institutionsByType(code: string): Institution[];
/** Dataset metadata (counts, source, generated_at). */
export function metadata(): Metadata;

declare const _default: {
  institutions: typeof institutions;
  institutionById: typeof institutionById;
  institutionsByWilaya: typeof institutionsByWilaya;
  institutionsByType: typeof institutionsByType;
  metadata: typeof metadata;
};
export default _default;

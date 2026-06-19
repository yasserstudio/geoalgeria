/** The nine institution-type codes published by the ministry. */
export type TypeCode = "MJ" | "AJ" | "CC" | "CS" | "SPA" | "CJ" | "CLS" | "CLJ" | "PAL";

/** A youth or sports institution, as published by the Ministère de la Jeunesse. */
export interface Institution {
  /** Stable id assigned by the ministry. */
  id: number;
  /** Official name, in Arabic — the ministry publishes names in Arabic only. */
  name: string;
  /** Institution-type code (the ministry's own acronym), e.g. `"MJ"`, `"CS"`, `"AJ"`. */
  type_code: TypeCode;
  /** Type label in Arabic, as published (e.g. `"دار الشباب"`). */
  type_ar: string;
  /** Indicative French label for the type (e.g. `"Maison de jeunes"`). */
  type_fr: string;
  /** Commune name, in Arabic, as published. */
  commune: string;
  /** Daïra name, in Arabic, as published. */
  daira: string;
  /** Wilaya code, zero-padded to 2 digits (`"01"`–`"58"`). Joins `geoalgeria` wilayas. */
  wilaya_code: string;
  /** Wilaya name, in Arabic, as published. Join `geoalgeria` on `wilaya_code` for French. */
  wilaya_name: string;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** Source page the record was derived from. */
  source: string;
}

/** Dataset provenance and counts. */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  institutions: number;
  /** Record count per institution-type code. */
  by_type: Partial<Record<TypeCode, number>>;
  wilayas_covered: number;
  /** Records excluded for unrecoverable (placeholder/out-of-country) coordinates. */
  dropped: number;
  generated_at: string;
}

/** All youth & sports institutions (2,076). */
export function institutions(): Institution[];
/** One institution by id, or `null` if none matches. */
export function institutionById(id: number | string): Institution | null;
/** Institutions in a wilaya — accepts `"16"`, `16`, or `"01"`. */
export function institutionsByWilaya(code: string | number): Institution[];
/** Institutions of a type — accepts a type code (case-insensitive), e.g. `"mj"`. */
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

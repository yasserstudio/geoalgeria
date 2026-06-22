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

/** A vocational training establishment, as published by the MFEP via takwin.dz. */
export interface Establishment {
  /** Stable id (1-based), assigned by this package. */
  id: number;
  /** Official name (Arabic). */
  name: string;
  /** Official name (French), or `null` when the source omits it. */
  name_fr: string | null;
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
  /** Commune name (Arabic), or `null`. */
  commune: string | null;
  /** Wilaya code, zero-padded to 2 digits (58-wilaya scheme, source's own). */
  wilaya_code: string;
  /** Latitude (WGS84), or `null` when the source has no coordinates. */
  lat: number | null;
  /** Longitude (WGS84), or `null` when the source has no coordinates. */
  lng: number | null;
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
  /** Vocational specializations offered, or `null`. */
  vocations: string[] | null;
  /** Data source identifier. */
  source: string;
}

/** Dataset provenance and counts. */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  establishments: number;
  by_type: Partial<Record<EstablishmentType, number>>;
  by_secteur: Record<Secteur, number>;
  geocoded: number;
  wilayas_covered: number;
  generated_at: string;
}

/** Every vocational training establishment. */
export function establishments(): Establishment[];
/** One establishment by id, or `null` if none matches. */
export function establishmentById(id: number | string): Establishment | null;
/** Establishments in a wilaya — accepts `"16"`, `16`, or `"01"`. */
export function establishmentsByWilaya(code: string | number): Establishment[];
/** Establishments of a type — accepts a slug (case-insensitive), e.g. `"cfpa"`. */
export function establishmentsByType(type: string): Establishment[];
/** Dataset metadata (counts, source, generated_at). */
export function metadata(): Metadata;

declare const _default: {
  establishments: typeof establishments;
  establishmentById: typeof establishmentById;
  establishmentsByWilaya: typeof establishmentsByWilaya;
  establishmentsByType: typeof establishmentsByType;
  metadata: typeof metadata;
};
export default _default;

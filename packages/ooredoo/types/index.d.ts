// Type definitions for @geoalgeria/ooredoo
// Ooredoo Algérie retail network from the operator's public locator API,
// geocoded and linked to the geoalgeria commune set.

/** Store type: Espace Ooredoo, City Shop Ooredoo, Espace Services Ooredoo. */
export type OoredooType = "EO" | "CSO" | "ESO";

/** Provenance — the ooredoo.dz locator API. */
export type OoredooSource = "ooredoo.dz";

/** Coordinates are real API points. */
export type GeoPrecision = "exact";

/** An Ooredoo store. */
export interface OoredooStore {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-004"). */
  id: string;
  /** Provenance — always "ooredoo.dz". */
  source: OoredooSource;
  /** Ooredoo's own store id (API `id`), for provenance. */
  ooredoo_id: string | null;
  /** Store name / code (e.g. "EO ROUIBA", "ESO000717"). */
  name: string;
  /** Store type. */
  type: OoredooType;
  /** French label for the type. */
  type_label_fr: string;
  /** Arabic label for the type. */
  type_label_ar: string;
  /** Street address as listed, or null. */
  address: string | null;
  /** Wilaya name (French), current 69-wilaya scheme. */
  wilaya: string;
  /** Wilaya name (Arabic). */
  wilaya_ar: string;
  /** Wilaya code as a zero-padded string ("01".."69"). */
  wilaya_code: string;
  /** Commune name (French), nearest-centroid match. */
  commune: string;
  /** Commune code (geoalgeria code_commune). */
  commune_code: number;
  /** The operator's own declared wilaya (legacy 48-scheme label), for transparency. */
  operator_wilaya: string | null;
  /** Latitude (real API point). */
  lat: number;
  /** Longitude (real API point). */
  lng: number;
  /** Always "exact". */
  geo_precision: GeoPrecision;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  ooredoo: number;
  by_type: Record<OoredooType, number>;
  wilayas_covered: number;
  ooredoo_geocoded: number;
  note: string;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
}

/** All Ooredoo stores. */
export function stores(): OoredooStore[];
/** A single store by id, or null. */
export function storeById(id: string): OoredooStore | null;
/** Stores in a wilaya (accepts numeric or zero-padded code). */
export function storesByWilaya(code: string | number): OoredooStore[];
/** Stores of a given type ("EO" | "CSO" | "ESO"). */
export function storesByType(type: OoredooType | string): OoredooStore[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  stores: typeof stores;
  storeById: typeof storeById;
  storesByWilaya: typeof storesByWilaya;
  storesByType: typeof storesByType;
  metadata: typeof metadata;
};
export default _default;

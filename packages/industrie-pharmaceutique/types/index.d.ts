// Type definitions for @geoalgeria/industrie-pharmaceutique
// Algeria's approved pharmaceutical manufacturers — the Ministry of Pharmaceutical
// Industry (MIP) fabrication register, geocoded against the geoalgeria commune set.

/** Manufacturing nature: medicines, medical devices, or both. */
export type PharmaNature = "pp" | "dm" | "mixte";

/** Establishment role (this layer is the fabrication register). */
export type PharmaRole = "fabricant";

/** Provenance: MIP register, plus how the location was resolved. */
export type PharmaSource = "mip" | "mip+2023" | "mip+research";

/** How the coordinates were obtained. */
export type GeoPrecision = "commune_centroid" | "wilaya_centroid" | "none";

/** An approved pharmaceutical manufacturing establishment. */
export interface PharmaManufacturer {
  /** Stable id, `{wilaya_code}-{nature}-{seq}` (e.g. "16-pp-03"). */
  id: string;
  /** Operator (company) name as listed in the MIP register. */
  name: string;
  /** Same as `name` — the registered operator. */
  operateur: string;
  /** Establishment role — always "fabricant" in this layer. */
  role: PharmaRole;
  /** Manufacturing nature. */
  nature: PharmaNature;
  /** Canonical French label for the nature. */
  nature_label_fr: string;
  /** Canonical Arabic label for the nature. */
  nature_label_ar: string;
  /** Wilaya name (French). */
  wilaya: string;
  /** Wilaya name (Arabic). */
  wilaya_ar: string;
  /** Wilaya code (1..69). */
  wilaya_code: number;
  /** Commune name (French), when resolved. Null when only the wilaya is known. */
  commune: string | null;
  /** Commune code (geoalgeria code_commune), when resolved. Null otherwise. */
  commune_code: number | null;
  /** Latitude (commune or wilaya centroid). */
  lat: number | null;
  /** Longitude (commune or wilaya centroid). */
  lng: number | null;
  /** Provenance of identity + location. */
  source: PharmaSource;
  /** How `lat`/`lng` were obtained. */
  geo_precision: GeoPrecision;
  /** URL slug. */
  slug: string;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  "industrie-pharmaceutique": number;
  by_nature: Record<PharmaNature, number>;
  by_role: Record<PharmaRole, number>;
  by_geo_precision: Record<GeoPrecision, number>;
  wilayas_covered: number;
  geocoded: number;
  linkage_note: string;
  coverage_note: string;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
}

/** All approved pharmaceutical manufacturers. */
export function manufacturers(): PharmaManufacturer[];
/** A single manufacturer by id, or null. */
export function manufacturerById(id: string): PharmaManufacturer | null;
/** Manufacturers in a wilaya (accepts numeric or string code). */
export function manufacturersByWilaya(code: string | number): PharmaManufacturer[];
/** Manufacturers of a given nature ("pp" | "dm" | "mixte"). */
export function manufacturersByNature(nature: PharmaNature | string): PharmaManufacturer[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  manufacturers: typeof manufacturers;
  manufacturerById: typeof manufacturerById;
  manufacturersByWilaya: typeof manufacturersByWilaya;
  manufacturersByNature: typeof manufacturersByNature;
  metadata: typeof metadata;
};
export default _default;

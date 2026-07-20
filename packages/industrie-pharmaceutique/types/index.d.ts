// Type definitions for @geoalgeria/industrie-pharmaceutique (schema v2).
// Algeria's approved pharmaceutical manufacturers — the Ministry of Pharmaceutical
// Industry (MIP) fabrication register, geocoded against the geoalgeria commune set.
// Records follow the canonical GeoRecord contract from @geoalgeria/schema.

/** Manufacturing nature: medicines, medical devices, or both. */
export type PharmaNature = "pp" | "dm" | "mixte";

/** Establishment role (this layer is the fabrication register). */
export type PharmaRole = "fabricant";

/** Provenance key into `metadata.sources[]` — the MIP fabrication register. */
export type PharmaSource = "mip";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`. */
export type GeoPrecision = "exact" | "approximate";

/** How the point was resolved. The register publishes no coordinates, so every
 *  record sits on a commune (or, unresolved, a wilaya) centroid. */
export type PharmaGeoMethod = "commune_centroid" | "wilaya_centroid";

/** External identifiers keyed by source system. The MIP register publishes none,
 *  so the field is absent from every record. */
export type Refs = Record<string, string>;

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
  /** Wilaya code as a zero-padded string ("01".."69"). */
  wilaya_code: string;
  /** Commune name (French), when resolved. Null when only the wilaya is known. */
  commune: string | null;
  /** Commune (ONS) code as a 4-digit string, when resolved. Null otherwise. */
  commune_code: string | null;
  /** Latitude (commune or wilaya centroid). */
  lat: number | null;
  /** Longitude (commune or wilaya centroid). */
  lng: number | null;
  /** Provenance key into `metadata.sources[]`. */
  source: PharmaSource;
  /** Always "approximate" — a centroid, never a surveyed point. */
  geo_precision: GeoPrecision;
  /** Which centroid `lat`/`lng` came from. */
  geo_method: PharmaGeoMethod;
  /** External identifiers. Absent for this dataset. */
  refs?: Refs;
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

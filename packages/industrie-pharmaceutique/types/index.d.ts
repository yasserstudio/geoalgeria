// Type definitions for @geoalgeria/industrie-pharmaceutique (schema v2).
// Algeria's approved pharmaceutical & medical-device Manufacturers — the
// Ministry of Pharmaceutical Industry (MIP) register, geocoded to commune/
// wilaya centroids (the register publishes no coordinates of its own).

/** Manufacturing nature: medicines ("pp"), medical devices ("dm"), or both. */
export type PharmaNature = "pp" | "dm" | "mixte";

/** Establishment role — this layer is the fabrication register. */
export type PharmaRole = "fabricant";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** Which centroid the point came from — the register publishes no
 *  coordinates, so every Manufacturer sits on a commune (or, unresolved, a
 *  wilaya) centroid. */
export type GeoMethod = "commune_centroid" | "wilaya_centroid";

/** An approved pharmaceutical/medical-device Manufacturer. */
export interface PharmaManufacturer {
  /** Stable id, `{wilaya_code}-{nature}-{seq}` (e.g. "02-dm-01"). Unique within this dataset. */
  id: string;
  /** Operator (company) name as listed in the MIP register. */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code as a 4-digit string, when resolved. Null when only the wilaya is known. */
  commune_code: string | null;
  /** Commune name (French), when resolved. Null when only the wilaya is known. */
  commune: string | null;
  /** Latitude (commune or wilaya centroid). */
  lat: number;
  /** Longitude (commune or wilaya centroid). */
  lng: number;
  /** Always "approximate": the register publishes no coordinates, so every point is a centroid. */
  geo_precision: "approximate";
  /** Which centroid `lat`/`lng` came from. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "mip". */
  source: "mip";
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
  /** URL slug. */
  slug: string;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus manufacturer stats. */
export interface Metadata {
  package: "@geoalgeria/industrie-pharmaceutique";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — all of them (centroid-geocoded). */
  geocoded_count: number;
  geocoded_pct: number;
  /** Count by `geo_precision` — always all-approximate for this dataset. */
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
  /** Count by nature. */
  by_nature: Partial<Record<PharmaNature, number>>;
  /** Count by role — always all-"fabricant" for this dataset. */
  by_role: Partial<Record<PharmaRole, number>>;
  /** Count by `geo_method`. */
  by_geo_method: Partial<Record<GeoMethod, number>>;
  linkage_note: string;
}

/** All approved pharmaceutical/medical-device Manufacturers. */
export function manufacturers(): PharmaManufacturer[];
/** A single Manufacturer by id, or null. */
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

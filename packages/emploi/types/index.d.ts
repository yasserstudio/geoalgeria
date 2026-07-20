// Type definitions for @geoalgeria/emploi (schema v2).
// ANEM employment agencies — AWEM at wilaya level, ALEM at local level (anem.dz).
// Records follow the canonical GeoRecord contract (zero-padded string
// wilaya_code, geo_precision/geo_method/source) plus the agency fields below.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. `null` on an ungeocoded record — no method
 *  produced a point, so none can be named. */
export type GeoMethod = "anem" | null;

/** A wilaya-level employment agency (AWEM). */
export interface Awem {
  /** Stable id, unique within this file. Opaque — do not parse. */
  id: string;
  /** Agency name. */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code. Currently null for every AWEM (the source resolves to
   *  wilaya only); typed as `string | null` so a future value is not a break. */
  commune_code: string | null;
  /** Commune name. Currently null for every AWEM; see `commune_code`. */
  commune: string | null;
  /** Latitude — AWEM agencies are fully geocoded. */
  lat: number;
  /** Longitude — AWEM agencies are fully geocoded. */
  lng: number;
  /** Always `"exact"`: every AWEM carries a real point. */
  geo_precision: "exact";
  /** Always `"anem"`: the point comes from the ANEM directory. */
  geo_method: "anem";
  /** Provenance key into `metadata.sources[]` — always "anem". */
  source: "anem";
  /** Record type discriminator. */
  type: "AWEM";
  /** Internal ANEM code, or null when none is assigned. */
  code: string | null;
  /** Street address. */
  address: string;
  /** Phone number. */
  phone: string;
  /** Fax number. */
  fax: string;
  /** Contact email. */
  email: string;
  /** Agency manager/director. */
  manager: string;
}

/** A local employment agency (ALEM). */
export interface Alem {
  /** Stable id, unique within this file. Opaque — do not parse. */
  id: string;
  /** Agency name. */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code. Currently null for every ALEM; typed as
   *  `string | null` so a future populated value is not a breaking change. */
  commune_code: string | null;
  /** Commune name. Currently null for every ALEM; see `commune_code`. */
  commune: string | null;
  /** Latitude, or null when the agency could not be geocoded. */
  lat: number | null;
  /** Longitude, or null. Both coordinates are set, or both are null. */
  lng: number | null;
  /** `"exact"` for an ANEM point, `null` when `lat`/`lng` are null. */
  geo_precision: GeoPrecision;
  /** How `lat`/`lng` were obtained; null when there are none. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "anem". */
  source: "anem";
  /** Record type discriminator. */
  type: "ALEM";
  /** Internal ANEM code, or null when none is assigned. */
  code: string | null;
  /** Street address. */
  address: string;
  /** Phone number. */
  phone: string;
  /** Fax number, or null. */
  fax: string | null;
  /** Contact email, or null. */
  email: string | null;
  /** Agency manager/director. */
  manager: string;
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

/** One data file described in `metadata.entities[]`. */
export interface EntityRef {
  file: string;
  count: number;
}

/** Dataset metadata (data/metadata.json) — canonical fields plus ANEM stats. */
export interface Metadata {
  package: "@geoalgeria/emploi";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  /** AWEM + ALEM. */
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
  /** Per-file record counts (awem.json, alem.json). */
  entities: EntityRef[];
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  /** Count by record type. */
  by_type: { AWEM: number; ALEM: number };
}

/** All wilaya-level agencies (AWEM). */
export function awem(): Awem[];
/** All local agencies (ALEM). */
export function alem(): Alem[];
/** AWEM and ALEM combined (AWEM first). Ids are unique across the merged set —
 *  narrow on `type`. */
export function agencies(): Array<Awem | Alem>;
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  awem: typeof awem;
  alem: typeof alem;
  agencies: typeof agencies;
  metadata: typeof metadata;
};
export default _default;

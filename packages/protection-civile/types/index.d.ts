// Type definitions for @geoalgeria/protection-civile (schema v2).
// Algeria's Protection Civile (civil protection / fire & rescue) units, from the
// DGPC's own published dataset (dgpc.dz), geocoded and linked to the geoalgeria
// commune set.
// Records follow the canonical GeoRecord contract from @geoalgeria/schema
// (zero-padded string wilaya_code, string ONS commune_code, geo_precision/
// geo_method/source/refs) plus the unit-specific fields below. The declarations
// are inlined rather than imported: @geoalgeria/schema is a build-time contract
// enforced by CI and is never published, so a published .d.ts that imported it
// would not resolve for consumers.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `exact` is a real per-unit DGPC point; `approximate` marks the handful of
 *  units the DGPC publishes at a coincident (shared) coordinate. */
export type GeoPrecision = "exact" | "approximate";

/** How the point was obtained — always the DGPC's published coordinate. */
export type GeoMethod = "dgpc_map";

/** The DGPC status tier of a unit (verbatim from the source `statut`). */
export type Statut =
  | "UNITE SECONDAIRE"
  | "POSTE AVANCE"
  | "UNITE DE SECTEUR"
  | "UNITE PRINCIPALE"
  | "SIEGE DE DIRECTION WILAYA"
  | "POSTE DE SECOURS ROUTIER"
  | "UNITE MARINE"
  | "U.N D'INSTRUCTION ET D'INTERVENTION"
  | "DIRECTION GENERALE"
  | "CELLULE DE SECURITE";

/** External identifiers keyed by source system. */
export interface Refs {
  /** The DGPC feature objectid, as a string. */
  dgpc: string;
  /** The DGPC's own pre-2026-reform wilaya code ("01".."58"), preserved as a receipt. */
  dgpc_wilaya: string;
}

/** A Protection Civile unit, sourced from the DGPC (dgpc.dz). Every field is
 *  present on every record; commune fields are `null` where the join found none. */
export interface ProtectionCivileUnit {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-001"). Unique within this file. */
  id: string;
  /** Display name (Arabic — the source carries no French name). */
  name: string;
  /** Arabic name (nom_ar). */
  name_ar: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69") — re-derived by
   *  point-in-polygon against the 69 post-2026-reform boundaries. */
  wilaya_code: string;
  /** Commune (ONS) code as a string, or null where the name match found none. */
  commune_code: string | null;
  /** Commune name (French), or null. */
  commune: string | null;
  /** Latitude (WGS84) — every unit is geocoded. */
  lat: number;
  /** Longitude (WGS84) — every unit is geocoded. */
  lng: number;
  /** Coordinate provenance. */
  geo_precision: GeoPrecision;
  /** How the point was obtained. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "dgpc". */
  source: "dgpc";
  /** External ids — `{ dgpc: "1", dgpc_wilaya: "27" }`. */
  refs: Refs;
  /** DGPC status tier. */
  statut: Statut;
  /** Address as published by the DGPC, or null. */
  address: string | null;
  /** Phone number, or null. */
  tel: string | null;
  /** Fax number, or null. */
  fax: string | null;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus unit enrichment stats. */
export interface Metadata {
  package: "@geoalgeria/protection-civile";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — every unit. */
  geocoded_count: number;
  geocoded_pct: number;
  /** Count by `geo_precision`. */
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
  /** Count of units by `statut`. */
  by_statut: Record<string, number>;
  with_tel: number;
  with_fax: number;
  with_address: number;
  with_commune: number;
  linkage_note: string;
}

/** All Protection Civile units. */
export function units(): ProtectionCivileUnit[];
/** A single unit by id, or null. */
export function unitById(id: string | number): ProtectionCivileUnit | null;
/** Units in a wilaya (accepts numeric or zero-padded code). */
export function unitsByWilaya(code: string | number): ProtectionCivileUnit[];
/** Units of a given DGPC status tier. */
export function unitsByStatut(statut: Statut): ProtectionCivileUnit[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  units: typeof units;
  unitById: typeof unitById;
  unitsByWilaya: typeof unitsByWilaya;
  unitsByStatut: typeof unitsByStatut;
  metadata: typeof metadata;
};
export default _default;

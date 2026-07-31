// Type definitions for @geoalgeria/telecom (schema v2).
// Mobile-network coverage in Algeria, from each operator's published coverage
// map. Records follow the canonical GeoRecord contract from @geoalgeria/schema
// (zero-padded string wilaya_code, geo_precision/geo_method/source) plus the
// coverage-specific fields below. The declarations are inlined rather than
// imported: @geoalgeria/schema is a build-time contract enforced by CI and is
// never published, so a published .d.ts that imported it would not resolve for
// consumers.

/** Network technology. Extends additively as new generations are added. */
export type Technology = "5G";

/** Operator slug. Extends as operators are added. */
export type Operator = "djezzy" | "mobilis" | "ooredoo";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  Djezzy and Mobilis publish cell-site points (`exact`, save a handful of
 *  coarse or coincident points demoted to `approximate`); Ooredoo publishes
 *  covered communes, so its points are `approximate` by construction. */
export type GeoPrecision = "exact" | "approximate";

/** How the point was obtained. */
export type GeoMethod = "operator_map" | "operator_commune_point";

/** A single coverage point, as claimed by the operator (presence, not
 *  measured RF coverage). Every record is geocoded. */
export interface CoverageSite {
  /** Deterministic id (operator + fixed-precision coordinates + label);
   *  operator-prefixed, unique across the whole technology. */
  id: string;
  /** Site label (locality/commune), or null when the source gives none. */
  name: string | null;
  /** Zero-padded wilaya code ("01".."69"); joins to geoalgeria. */
  wilaya_code: string;
  /** Always null: operators publish free-text names, no ONS codes. */
  commune_code: string | null;
  /** Commune name (French), or null. */
  commune: string | null;
  /** Commune name (Arabic), or null. */
  commune_ar: string | null;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** Coordinate provenance. */
  geo_precision: GeoPrecision;
  /** How the point was obtained. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — the operator slug. */
  source: Operator;
  /** Operator that published this site. */
  operator: Operator;
  /** Network technology (currently always "5G"). */
  technology: Technology;
  /** Street address, or null when the source gives none. */
  address: string | null;
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

/** One per-file entry in `metadata.entities[]`. */
export interface EntityRef {
  file: string;
  count: number;
}

/** Dataset metadata (data/metadata.json) — canonical fields plus coverage stats. */
export interface Metadata {
  package: "@geoalgeria/telecom";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — every site. */
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
  /** The per-operator data files and their record counts. */
  entities: EntityRef[];
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) of the operator-map snapshot. */
  updated: string;
  /** Technologies present in this release (e.g. ["5G"]). */
  technologies: Technology[];
  /** Site count by technology. */
  by_technology: Record<string, number>;
  /** Site count by operator. */
  by_operator: Record<string, number>;
}

/** All coverage sites for a technology (default "5G"), all operators. */
export function coverage(technology?: Technology): CoverageSite[];
/** Coverage sites for a single operator. */
export function coverageByOperator(operator: Operator, technology?: Technology): CoverageSite[];
/** Technologies present in this release. */
export function technologies(): Technology[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  coverage: typeof coverage;
  coverageByOperator: typeof coverageByOperator;
  technologies: typeof technologies;
  metadata: typeof metadata;
};
export default _default;

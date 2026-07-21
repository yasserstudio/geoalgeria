// Type definitions for @geoalgeria/buses (schema v2).
// Algeria's urban bus networks (line-level). Multi-operator by design;
// today's snapshot covers ETUSA (Alger) only, sourced from French Wikipedia.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record carries no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. Always null today: this dataset is
 *  line-level, with no per-line geometry. */
export type GeoMethod = null;

/** An urban bus line. */
export interface BusLine {
  /** Stable id, `{operator}-{line}` (e.g. "etusa-1"). */
  id: string;
  /** Display name: `Ligne {line} — {terminus1} ↔ {terminus2}`. */
  name: string;
  /** Wilaya code, zero-padded to 2 digits ("16" for Alger). */
  wilaya_code: string;
  /** Always null — a line spans several communes, see `communes_served`. */
  commune_code: null;
  /** Always null — see `commune_code`. */
  commune: null;
  /** Always null — this dataset is line-level, with no per-line geometry. */
  lat: null;
  /** Always null — see `lat`. */
  lng: null;
  /** Always null: the record carries no point at all, so it asserts no precision. */
  geo_precision: null;
  /** Always null — see `geo_precision`. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "wikipedia". Not a
   *  URL; see `source_url` for that. */
  source: "wikipedia";
  /** Operating company (e.g. "ETUSA"). Not narrowed to a literal union —
   *  this dataset is designed to cover multiple operators over time. */
  operator: string;
  /** Network / city (e.g. "Alger"). */
  network: string;
  /** Line number/label as published (e.g. "1", "16B"). */
  line: string;
  /** First terminus. */
  terminus1: string;
  /** Second terminus. */
  terminus2: string;
  /** Number of stops where published, or null. */
  stops: number | null;
  /** Communes served (French display names). */
  communes_served: string[];
  /** Metro/tram/gare stations served en route (French display names). */
  stations_served: string[];
  /** URL of the source page the line was read from. */
  source_url: string;
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

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  package: "@geoalgeria/buses";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Always 0 — no coordinates exist for this dataset. */
  geocoded_count: number;
  geocoded_pct: number;
  precision: { exact: number; approximate: number };
  /** Estimated size of ETUSA's full passenger network (~122 lines). */
  estimated_universe: number | null;
  coverage_pct: number | null;
  coverage_note: string;
  wilayas_covered: number;
  /** Always null — no coordinates exist for this dataset. */
  bbox: [number, number, number, number] | null;
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  operators: string[];
  by_operator: Record<string, number>;
  with_stop_count: number;
}

/** All bus lines. */
export function lines(): BusLine[];
/** One line by id, or null. */
export function lineById(id: string): BusLine | null;
/** Lines for an operator (case-insensitive). */
export function linesByOperator(operator: string): BusLine[];
/** Distinct operators present. */
export function operators(): string[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  lines: typeof lines;
  lineById: typeof lineById;
  linesByOperator: typeof linesByOperator;
  operators: typeof operators;
  metadata: typeof metadata;
};
export default _default;

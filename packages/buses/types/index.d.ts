// Type definitions for @geoalgeria/buses
// Algeria's urban bus networks (line-level). Multi-operator; v1: ETUSA (Alger).

/** An urban bus line. */
export interface BusLine {
  /** Stable id, `{operator}-{line}` (e.g. "etusa-1"). */
  id: string;
  /** Operating company (e.g. "ETUSA"). */
  operator: string;
  /** Network / city (e.g. "Alger"). */
  network: string;
  /** Line number/label as published (e.g. "1", "16B"). */
  line: string;
  /** First terminus, or null. */
  terminus1: string | null;
  /** Second terminus, or null. */
  terminus2: string | null;
  /** Number of stops where published, or null. */
  stops: number | null;
  /** Communes served (French display names). */
  communes_served: string[];
  /** Metro/tram/gare stations served en route (French display names). */
  stations_served: string[];
  /** Wilaya code, zero-padded to 2 digits ("16" for Alger). Joins `geoalgeria`. */
  wilaya_code: string;
  /** Source URL. */
  source: string;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  lines: number;
  operators: string[];
  by_operator: Record<string, number>;
  with_stop_count: number;
  wilayas_covered: number;
  coverage_note: string;
  generated_at: string;
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

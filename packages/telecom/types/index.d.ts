// Type definitions for @geoalgeria/telecom
// Mobile-network coverage in Algeria, sourced from operator coverage maps.

/** Network technology. Extends additively as new generations are added. */
export type Technology = "5G";

/** Operator slug. Extends as operators are added. */
export type Operator = "djezzy" | "mobilis" | "ooredoo";

/** A single coverage point — an operator-published 5G cell-site location. */
export interface CoverageSite {
  /** Deterministic id (operator + fixed-precision coordinates + label); stable
   *  across re-fetches. */
  id: string;
  /** Network technology (currently always "5G"). */
  technology: Technology;
  /** Operator that published this site. */
  operator: Operator;
  /** Site label (locality/commune), or null when the source gives none. */
  name: string | null;
  /** Street address, or null when the source gives none. */
  address: string | null;
  /** Commune name (French), or null. */
  commune: string | null;
  /** Commune name (Arabic), or null. */
  commune_ar: string | null;
  /** Commune code joining to geoalgeria communes, or null when unresolved. */
  commune_code: string | null;
  /** Zero-padded wilaya code ("01".."58"); joins to geoalgeria. */
  wilaya_code: string;
  /** Latitude. */
  lat: number;
  /** Longitude. */
  lng: number;
  /** Origin URL of the operator map. */
  source: string;
}

/** Per-technology coverage summary. */
export interface CoverageSummary {
  total: number;
  by_operator: Record<string, number>;
  wilayas_covered: number;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  license: string;
  technologies: Technology[];
  sources: Record<string, string>;
  coverage: Record<Technology, CoverageSummary>;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
  note: string;
}

/** All coverage sites for a technology (default "5G"). */
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

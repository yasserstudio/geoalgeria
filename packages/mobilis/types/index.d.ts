// Type definitions for @geoalgeria/mobilis (schema v2).
// Mobilis commercial agencies and approved points of sale (mobilis.dz).
// Records follow the canonical GeoRecord contract (zero-padded string
// wilaya_code, geo_precision/geo_method/source) plus the operator-specific
// fields below.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. `null` on an ungeocoded record — no method
 *  produced a point, so none can be named. */
export type GeoMethod = "mobilis" | null;

/** A geocoded Mobilis commercial agency. */
export interface Agence {
  /** Stable id, prefixed `ag-` to stay unique alongside {@link Pdv} inside
   *  {@link all}. Opaque — do not parse. */
  id: string;
  /** Agency name in French. */
  name: string;
  /** Agency name in Arabic. */
  name_ar: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code. Currently null for every agency (the locator gives no
   *  commune); typed as `string | null` so a future value is not a break. */
  commune_code: string | null;
  /** Commune name. Currently null for every agency; see `commune_code`. */
  commune: string | null;
  /** Latitude — agencies are fully geocoded. */
  lat: number;
  /** Longitude — agencies are fully geocoded. */
  lng: number;
  /** Always `"exact"`: every agency carries a real locator point. */
  geo_precision: "exact";
  /** Always `"mobilis"`: the point comes from the operator's own locator. */
  geo_method: "mobilis";
  /** Provenance key into `metadata.sources[]` — always "mobilis". */
  source: "mobilis";
  /** Record type discriminator. */
  type: "agence";
  /** Mobilis internal code. */
  code: string;
  /** Street address in French. */
  address: string;
  /** Street address in Arabic. */
  address_ar: string;
}

/** An approved point of sale — a third-party resale partner, listed at commune
 *  level. The Mobilis locator publishes no coordinates for these, so they are
 *  density-only by design. */
export interface Pdv {
  /** Stable id, prefixed `pdv-` to stay unique alongside {@link Agence} inside
   *  {@link all}. Opaque — do not parse. */
  id: string;
  /** Point-of-sale name. */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code. Currently null for every point of sale (the directory
   *  gives a commune name only); typed as `string | null` for the future. */
  commune_code: string | null;
  /** Commune name. */
  commune: string;
  /** Always null — points of sale carry no coordinate. */
  lat: null;
  /** Always null — points of sale carry no coordinate. */
  lng: null;
  /** Always null: `geo_precision` is null if and only if `lat`/`lng` are. */
  geo_precision: null;
  /** Always null — no method produced a point, so none can be named. */
  geo_method: null;
  /** Provenance key into `metadata.sources[]` — always "mobilis". */
  source: "mobilis";
  /** Record type discriminator. */
  type: "pdv";
  /** Mobilis internal code. */
  code: string;
  /** Street address. */
  address: string;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus Mobilis stats. */
export interface Metadata {
  package: "@geoalgeria/mobilis";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  /** Agencies + points of sale. */
  record_count: number;
  /** Records with coordinates — the agencies only. */
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
  /** Per-file record counts (agences.json, pdv.json). */
  entities: EntityRef[];
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  /** Count by record type. */
  by_type: { agence: number; pdv: number };
}

/** All Mobilis agencies. */
export function agences(): Agence[];
/** All approved points of sale. */
export function pdv(): Pdv[];
/** Agencies and points of sale combined (agencies first). Ids are unique across
 *  the merged set — narrow on `type`. */
export function all(): Array<Agence | Pdv>;
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  agences: typeof agences;
  pdv: typeof pdv;
  all: typeof all;
  metadata: typeof metadata;
};
export default _default;

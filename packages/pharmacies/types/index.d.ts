// Type definitions for @geoalgeria/pharmacies (schema v2).
// Algeria's pharmacies (officines) from OpenStreetMap (ODbL), geocoded and
// linked to the geoalgeria commune set.
// Records follow the canonical GeoRecord contract from @geoalgeria/schema
// (zero-padded string wilaya_code, string ONS commune_code, geo_precision/
// geo_method/source/refs) plus the pharmacy-specific fields below. The
// declarations are inlined rather than imported: @geoalgeria/schema is a
// build-time contract enforced by CI and is never published, so a published
// .d.ts that imported it would not resolve for consumers.

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  Never null here — every pharmacy carries a real coordinate. */
export type GeoPrecision = "exact" | "approximate";

/** How the point was obtained: `osm_node` = a surveyed node (exact),
 *  `osm_centroid` = the centroid of a building/area (approximate). */
export type GeoMethod = "osm_node" | "osm_centroid";

/** External identifiers keyed by source system. */
export interface Refs {
  /** OSM element, e.g. "node/3012904279". */
  osm: string;
}

/** A pharmacy (officine), sourced from OpenStreetMap (ODbL). Every field is
 *  present on every record; the optional ones are `null` where OSM has no tag. */
export interface Pharmacy {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-00042"). Unique within this file. */
  id: string;
  /** Best display name, or null (many OSM pharmacies are unnamed). */
  name: string | null;
  /** French/Latin name, or null. */
  name_fr: string | null;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code as a string, or null where the join found no commune. */
  commune_code: string | null;
  /** Commune name. */
  commune: string;
  /** Latitude (WGS84) — every pharmacy is geocoded. */
  lat: number;
  /** Longitude (WGS84) — every pharmacy is geocoded. */
  lng: number;
  /** Coordinate provenance. */
  geo_precision: GeoPrecision;
  /** How the point was obtained. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "osm". */
  source: "osm";
  /** External ids — `{ osm: "node/3012904279" }`. */
  refs: Refs;
  /** Operator/chain, or null (rare in Algeria). */
  operator: string | null;
  /** Phone number as tagged, or null. */
  phone: string | null;
  /** Opening hours (OSM `opening_hours` syntax), or null. */
  opening_hours: string | null;
  /** Whether it dispenses prescription medicine (`dispensing`), or null if untagged. */
  dispensing: boolean | null;
  /** Street address from OSM addr:* tags, or null. */
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

/** Dataset metadata (data/metadata.json) — canonical fields plus pharmacy enrichment stats. */
export interface Metadata {
  package: "@geoalgeria/pharmacies";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — every pharmacy. */
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
  /** Records carrying any name. */
  named: number;
  with_phone: number;
  with_hours: number;
  with_address: number;
  with_dispensing: number;
  linkage_note: string;
}

/** All pharmacies. */
export function pharmacies(): Pharmacy[];
/** A single pharmacy by id, or null. */
export function pharmacyById(id: string | number): Pharmacy | null;
/** Pharmacies in a wilaya (accepts numeric or zero-padded code). */
export function pharmaciesByWilaya(code: string | number): Pharmacy[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  pharmacies: typeof pharmacies;
  pharmacyById: typeof pharmacyById;
  pharmaciesByWilaya: typeof pharmaciesByWilaya;
  metadata: typeof metadata;
};
export default _default;

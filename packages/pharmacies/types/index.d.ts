// Type definitions for @geoalgeria/pharmacies (schema v2).
// Records conform to the canonical GeoRecord from @geoalgeria/schema, plus the
// pharmacy-specific fields below. See @geoalgeria/schema for the shared contract.

import type { GeoRecord, DatasetMetadata } from "@geoalgeria/schema";

/** A pharmacy (officine), sourced from OpenStreetMap (ODbL). */
export interface Pharmacy extends GeoRecord {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-00042"). */
  id: string;
  /** Best display name, or null (many OSM pharmacies are unnamed). */
  name: string | null;
  /** Provenance key — always "osm". */
  source: "osm";
  /** External ids — `{ osm: "node/3012904279" }`. */
  refs: { osm: string };
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
  /** How the point was obtained: node = surveyed (exact), centroid = building (approximate). */
  geo_method: "osm_node" | "osm_centroid";
}

/** Dataset metadata (data/metadata.json) — canonical fields plus pharmacy enrichment stats. */
export interface Metadata extends DatasetMetadata {
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

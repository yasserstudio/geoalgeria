// Type definitions for @geoalgeria/pharmacies
// Algeria's pharmacies (officines) from OpenStreetMap, geocoded and linked to the
// geoalgeria commune set.

/** Provenance — OpenStreetMap. */
export type PharmacySource = "osm";

/** How the coordinates were obtained. */
export type GeoPrecision = "osm_node" | "osm_centroid";

/** A pharmacy (officine). */
export interface Pharmacy {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-00042"). */
  id: string;
  /** Provenance — always "osm". */
  source: PharmacySource;
  /** OSM element id (e.g. "node/3012904279"). */
  osm_id: string;
  /** Best available display name, or null (many OSM pharmacies are unnamed). */
  name: string | null;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** Latin (French) name, or null. */
  name_fr: string | null;
  /** Operator/chain, or null (rare in Algeria). */
  operator: string | null;
  /** Phone number as tagged, or null. */
  phone: string | null;
  /** Opening hours (OSM `opening_hours` syntax), or null. */
  opening_hours: string | null;
  /** Whether the pharmacy dispenses prescription medicine (`dispensing`), or null if untagged. */
  dispensing: boolean | null;
  /** Wilaya name (French). */
  wilaya: string;
  /** Wilaya name (Arabic). */
  wilaya_ar: string;
  /** Wilaya code as a zero-padded string ("01".."69"). */
  wilaya_code: string;
  /** Commune name (French), nearest-centroid match — best-effort. */
  commune: string;
  /** Commune code (geoalgeria code_commune), best-effort; null where the commune has no code upstream. */
  commune_code: number | null;
  /** Street address from OSM addr:* tags, or null. */
  address: string | null;
  /** Latitude. */
  lat: number;
  /** Longitude. */
  lng: number;
  /** node = surveyed point; centroid = building outline center. */
  geo_precision: GeoPrecision;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  pharmacies: number;
  named: number;
  with_phone: number;
  with_hours: number;
  with_address: number;
  with_dispensing: number;
  wilayas_covered: number;
  pharmacies_geocoded: number;
  /** Approximate national officine count, for honest coverage framing. */
  official_total: number;
  coverage_note: string;
  linkage_note: string;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
}

/** All pharmacies. */
export function pharmacies(): Pharmacy[];
/** A single pharmacy by id, or null. */
export function pharmacyById(id: string): Pharmacy | null;
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

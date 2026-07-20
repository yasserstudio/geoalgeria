// Type definitions for @geoalgeria/sante (schema v2).
// Public health establishments of Algeria — the Ministry of Health (MoH)
// registry, geocoded via OpenStreetMap (ODbL) and Wikidata (CC0).
// Records follow the canonical GeoRecord contract from @geoalgeria/schema
// (zero-padded string wilaya_code, string ONS commune_code, geo_precision/
// geo_method/source/refs) plus the health-specific fields below.

/** Establishment category. */
export type HealthType = "eph" | "epsp" | "ehs" | "chu" | "clinique" | "hopital";

/** Ownership sector. The MoH registry is public; private clinics carry "private". */
export type HealthSector = "public" | "private";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the establishment has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. `null` on an ungeocoded record — no method
 *  produced a point, so none can be named. */
export type GeoMethod = "osm_point" | "wikidata_point" | "commune_centroid" | null;

/** External identifiers keyed by source system. */
export interface Refs {
  /** MoH post id on sante.gov.dz. */
  msp: string;
  /** OSM element id (e.g. "way/432370657") when an OSM facility matched. */
  osm?: string;
  /** Wikidata QID when a Wikidata facility matched. */
  wikidata?: string;
}

/** A public health establishment. */
export interface HealthEstablishment {
  /** Stable id, `{wilaya_code}-{type}-{seq}` (e.g. "22-eph-01"). Unique within this dataset. */
  id: string;
  /** Best available display name (French preferred, else Arabic). */
  name: string;
  /** French name, or null. */
  name_fr: string | null;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code as a 4-digit string, best-effort. Null when unresolved. */
  commune_code: string | null;
  /** Commune name (French), best-effort from the establishment locality. Null when unresolved. */
  commune: string | null;
  /** Latitude, or null when the establishment could not be geocoded. */
  lat: number | null;
  /** Longitude, or null. Both coordinates are set, or both are null. */
  lng: number | null;
  /** "exact" for an OSM/Wikidata point, "approximate" for a commune centroid,
   *  `null` when `lat`/`lng` are null — a record with no point asserts no precision. */
  geo_precision: GeoPrecision;
  /** How `lat`/`lng` were obtained; null when there are none. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "msp" (the MoH registry).
   *  The geocoding sources are named per record in {@link HealthEstablishment.refs}. */
  source: "msp";
  /** External identifiers: always the MoH post id, plus OSM/Wikidata where matched. */
  refs: Refs;
  /** Establishment category. */
  type: HealthType;
  /** Canonical French label for the type. */
  type_label_fr: string;
  /** Canonical Arabic label for the type. */
  type_label_ar: string;
  /** Ownership sector ("public" for the MoH registry). */
  sector: HealthSector;
  /** URL slug of the source post (French post preferred). */
  slug: string;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus health stats. */
export interface Metadata {
  package: "@geoalgeria/sante";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
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
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  /** Count by type; categories with no records are absent. */
  by_type: Partial<Record<HealthType, number>>;
  /** Count by sector; the MoH registry is public-only today. */
  by_sector: Partial<Record<HealthSector, number>>;
  /** Count by `geo_method`; ungeocoded records are absent (they have no method). */
  by_geo_method: Partial<Record<Exclude<GeoMethod, null>, number>>;
  bilingual: number;
  linkage_note: string;
}

/** All public health establishments. */
export function sante(): HealthEstablishment[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  sante: typeof sante;
  metadata: typeof metadata;
};
export default _default;

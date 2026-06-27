// Type definitions for @geoalgeria/sante
// Public health establishments of Algeria — the Ministère de la Santé (MSP)
// registry, geocoded via OpenStreetMap (ODbL) and Wikidata (CC0).

/** Establishment category. */
export type HealthType = "eph" | "epsp" | "ehs" | "chu" | "clinique" | "hopital";

/** Ownership sector. The MSP registry is public; private clinics carry "private". */
export type HealthSector = "public" | "private";

/** Where the record's identity came from, plus which geo sources contributed a precise point. */
export type HealthSource =
  | "msp"
  | "msp+osm"
  | "msp+wikidata"
  | "msp+osm+wikidata";

/** How the coordinates were obtained. */
export type GeoPrecision =
  | "osm_point"
  | "wikidata_point"
  | "commune_centroid"
  | "none";

/** A public health establishment. */
export interface HealthEstablishment {
  /** Stable id, `{wilaya_code}-{type}-{seq}` (e.g. "22-eph-01"). */
  id: string;
  /** Best available display name (French preferred, else Arabic). */
  name: string;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** French name, or null. */
  name_fr: string | null;
  /** Establishment category. */
  type: HealthType;
  /** Canonical French label for the type. */
  type_label_fr: string;
  /** Canonical Arabic label for the type. */
  type_label_ar: string;
  /** Ownership sector ("public" for the MSP registry). */
  sector: HealthSector;
  /** Wilaya name (French). */
  wilaya: string;
  /** Wilaya name (Arabic). */
  wilaya_ar: string;
  /** Wilaya code as a zero-padded string ("01".."69"). */
  wilaya_code: string;
  /** Commune name (French), best-effort from the establishment locality. Null when unresolved. */
  commune: string | null;
  /** Commune code (geoalgeria code_commune), best-effort. Null when unresolved. */
  commune_code: number | null;
  /** Latitude, or null when the establishment could not be geocoded. */
  lat: number | null;
  /** Longitude, or null when the establishment could not be geocoded. */
  lng: number | null;
  /** Provenance: MSP registry, plus OSM/Wikidata where a precise point matched. */
  source: HealthSource;
  /** How `lat`/`lng` were obtained. */
  geo_precision: GeoPrecision;
  /** Wikidata QID when a Wikidata facility matched, else null. */
  wikidata: string | null;
  /** OSM element id (e.g. "node/123") when an OSM facility matched, else null. */
  osm_id: string | null;
  /** Source post id on sante.gov.dz (French post preferred). */
  msp_id: number;
  /** URL slug of the source post (French post preferred). */
  slug: string;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  sante: number;
  by_type: Record<HealthType, number>;
  by_sector: Record<HealthSector, number>;
  by_geo_precision: Record<GeoPrecision, number>;
  wilayas_covered: number;
  geocoded: number;
  bilingual: number;
  linkage_note: string;
  coverage_note: string;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
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

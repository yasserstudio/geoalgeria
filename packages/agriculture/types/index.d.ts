// Type definitions for @geoalgeria/agriculture
// Agriculture-sector institutions of Algeria — the Ministry of Agriculture,
// Rural Development and Fisheries (MADR) institutional directory, geocoded
// against the geoalgeria commune set.

/** Institution network / category. */
export type AgricultureType =
  | "dsa"
  | "conservation_forets"
  | "institut_recherche"
  | "centre_formation"
  | "chambre_agriculture"
  | "office_public"
  | "groupe_public";

/** Ownership sector (the MADR directory is entirely public-sector). */
export type AgricultureSector = "public";

/** Where the record's identity came from, plus which geo sources contributed a precise point. */
export type AgricultureSource = "madr" | "madr+wikidata";

/** How the coordinates were obtained. */
export type GeoPrecision =
  | "wikidata_point"
  | "commune_centroid"
  | "wilaya_centroid"
  | "none";

/** An agriculture-sector institution. */
export interface AgricultureInstitution {
  /** Stable id, `{wilaya_code}-{type}-{seq}` (e.g. "16-office_public-01"). */
  id: string;
  /** Best available display name (French preferred, else Arabic). */
  name: string;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** French name, or null (most named entities are Arabic-only at source). */
  name_fr: string | null;
  /** Institution network / category. */
  type: AgricultureType;
  /** Canonical French label for the type. */
  type_label_fr: string;
  /** Canonical Arabic label for the type. */
  type_label_ar: string;
  /** Ownership sector (always "public" for the MADR directory). */
  sector: AgricultureSector;
  /** Latin abbreviation (e.g. "INRAA", "OAIC", "ITMAS Alger"), or null. */
  abbreviation: string | null;
  /** Wilaya name (French). */
  wilaya: string;
  /** Wilaya name (Arabic). */
  wilaya_ar: string;
  /** Wilaya code as a zero-padded string ("01".."58"). */
  wilaya_code: string;
  /** Commune name (French), best-effort from the address. Null when unresolved. */
  commune: string | null;
  /** Commune code (geoalgeria code_commune), best-effort. Null when unresolved. */
  commune_code: number | null;
  /** Latitude (commune/wilaya centroid, or a precise point). */
  lat: number | null;
  /** Longitude (commune/wilaya centroid, or a precise point). */
  lng: number | null;
  /** Street address (Arabic) as listed in the directory, or null. */
  address: string | null;
  /** Phone number (digits), or null. */
  phone: string | null;
  /** Fax number (digits), or null. */
  fax: string | null;
  /** Provenance: MADR directory, plus Wikidata where a precise point matched. */
  source: AgricultureSource;
  /** How `lat`/`lng` were obtained. */
  geo_precision: GeoPrecision;
  /** Wikidata QID when a Wikidata entity matched, else null. */
  wikidata: string | null;
  /** OSM element id (e.g. "node/123") when an OSM entity matched, else null. */
  osm_id: string | null;
  /** URL slug. */
  slug: string;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  agriculture: number;
  by_type: Record<AgricultureType, number>;
  by_sector: Record<AgricultureSector, number>;
  by_geo_precision: Record<GeoPrecision, number>;
  wilayas_covered: number;
  geocoded: number;
  linkage_note: string;
  coverage_note: string;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
}

/** All agriculture-sector institutions. */
export function agriculture(): AgricultureInstitution[];
/** A single institution by id, or null. */
export function institutionById(id: string): AgricultureInstitution | null;
/** Institutions in a wilaya (accepts numeric or zero-padded code). */
export function institutionsByWilaya(code: string | number): AgricultureInstitution[];
/** Institutions of a given type. */
export function institutionsByType(type: AgricultureType | string): AgricultureInstitution[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  agriculture: typeof agriculture;
  institutionById: typeof institutionById;
  institutionsByWilaya: typeof institutionsByWilaya;
  institutionsByType: typeof institutionsByType;
  metadata: typeof metadata;
};
export default _default;

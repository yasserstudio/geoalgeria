// Type definitions for @geoalgeria/agriculture (schema v2).
// Agriculture-sector institutions of Algeria — the Ministry of Agriculture,
// Rural Development and Fisheries (MADR) institutional directory, geocoded
// against the geoalgeria commune/wilaya centroid set.

/** Institution network / category. */
export type AgricultureType =
  | "centre_formation"
  | "chambre_agriculture"
  | "conservation_forets"
  | "dsa"
  | "groupe_public"
  | "institut_recherche"
  | "office_public";

/** Ownership sector (the MADR directory is entirely public-sector). */
export type AgricultureSector = "public";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained — always a centroid fallback; no
 *  institution in this directory carries a surveyed point. */
export type GeoMethod = "commune_centroid" | "wilaya_centroid";

/** One provenance entry in `metadata.sources[]`. */
export interface SourceRef {
  key: string;
  name: string;
  url?: string;
  license: string;
  retrieved?: string;
  evidence_type?: "official" | "crowdsourced" | "derived";
}

/** An agriculture-sector institution. */
export interface AgricultureInstitution {
  /** Stable id, `{wilaya_code}-{type}-{seq}` (e.g. "01-centre_formation-01"). */
  id: string;
  /** Best available display name (Arabic preferred, else French). */
  name: string;
  /** French name, or null — most entities are Arabic-only at source. */
  name_fr: string | null;
  /** Arabic name. */
  name_ar: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."58"). */
  wilaya_code: string;
  /** Commune (ONS) code, best-effort nearest-centroid join. Null when unresolved. */
  commune_code: string | null;
  /** Commune name (French), best-effort. Null when unresolved. */
  commune: string | null;
  /** Latitude — a commune or wilaya centroid, never a surveyed point. */
  lat: number;
  /** Longitude — see `lat`. */
  lng: number;
  /** Always "approximate": every position here is a centroid fallback. */
  geo_precision: "approximate";
  /** How `lat`/`lng` were derived. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "madr". */
  source: "madr";
  /** Institution network / category. */
  type: AgricultureType;
  /** Canonical French label for the type. */
  type_label_fr: string;
  /** Canonical Arabic label for the type. */
  type_label_ar: string;
  /** Ownership sector (always "public" for the MADR directory). */
  sector: AgricultureSector;
  /** Latin abbreviation (e.g. "ITMAS Adrar"), or null. */
  abbreviation: string | null;
  /** Street address (Arabic) as listed in the directory, or null. */
  address: string | null;
  /** Phone number (digits). */
  phone: string;
  /** Fax number (digits), or null. */
  fax: string | null;
  /** URL slug. */
  slug: string;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  package: "@geoalgeria/agriculture";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates — equal to `record_count`: every institution
   *  resolves to at least a wilaya centroid. */
  geocoded_count: number;
  geocoded_pct: number;
  /** Count by `geo_precision`; this dataset is centroid-only, so `exact` is 0. */
  precision: { exact: number; approximate: number };
  estimated_universe: number | null;
  coverage_pct: number | null;
  coverage_note: string;
  wilayas_covered: number;
  /** `[minLng, minLat, maxLng, maxLat]`. */
  bbox: [number, number, number, number] | null;
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  /** Count by type. */
  by_type: Partial<Record<AgricultureType, number>>;
  /** Count by sector (always public-only today). */
  by_sector: Partial<Record<AgricultureSector, number>>;
  /** Count by `geo_method`. */
  by_geo_method: Partial<Record<GeoMethod, number>>;
  linkage_note: string;
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

// Type definitions for @geoalgeria/culture (schema v2).
// Algeria's cultural atlas — the Ministry of Culture's "Cartes du Patrimoine
// Culturel Algérien" portal (cartes.patrimoineculturelalgerien.org), bilingual
// FR/AR heritage sites and cultural establishments, each carrying the
// portal's own published coordinate.

/** Kind of cultural place. The first five are the portal's heritage/institution
 *  layers; the last six are cultural establishments from the combined map. */
export type CulturalType =
  // heritage & institutions
  | "protected-cultural-property"
  | "museum"
  | "museum-moudjahid"
  | "theatre"
  | "library"
  // cultural establishments / venues
  | "cultural-house"
  | "cultural-palace"
  | "cultural-center"
  | "cultural-directorate"
  | "cinema"
  | "arts-school";

/** Coarse grouping: protected sites/museums/theatres/libraries vs. operating establishments. */
export type CulturalCategory = "heritage" | "establishment";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained. Every place in this dataset carries the
 *  portal's own published point. */
export type GeoMethod = "source_point";

/** External identifiers keyed by source system. */
export interface Refs {
  /** Node id of the record on the Patrimoine Culturel portal. */
  patrimoine: string;
}

/** A cultural place — heritage site or cultural establishment. */
export interface CulturalSite {
  /** Stable id, `{wilaya_code}-{type_code}-{seq}` (e.g. "16-museum-01"). Unique within this dataset. */
  id: string;
  /** Best available display name (French preferred, else Arabic). */
  name: string;
  /** French name. */
  name_fr: string;
  /** Arabic name. */
  name_ar: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code, nearest-centroid best-effort. Null when unresolved. */
  commune_code: string | null;
  /** Commune name (French), nearest-centroid best-effort. */
  commune: string;
  /** Latitude — every place carries the portal's published point. */
  lat: number;
  /** Longitude. */
  lng: number;
  /** Always "exact": the portal publishes a real point for every place. */
  geo_precision: GeoPrecision;
  /** Always "source_point": the coordinate is the portal's own point, not a derived centroid. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "patrimoine". */
  source: "patrimoine";
  /** External identifiers: the portal's own node id. */
  refs: Refs;
  /** Kind of cultural place. */
  type: CulturalType;
  /** Coarse grouping ("heritage" for the 5 institution layers, "establishment" for the 6 venue layers). */
  category: CulturalCategory;
  /** Canonical French label for the type. */
  type_label_fr: string;
  /** Canonical Arabic label for the type. */
  type_label_ar: string;
  /** True when the portal offers a 360° virtual tour of the place. */
  has_virtual_tour: boolean;
  /** Deep link to the place's record on the portal. */
  url: string;
  /** URL slug of the place name. */
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

/** Dataset metadata (data/metadata.json) — canonical fields plus culture stats. */
export interface Metadata {
  package: "@geoalgeria/culture";
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
  by_type: Partial<Record<CulturalType, number>>;
  /** Count by category. */
  by_category: Partial<Record<CulturalCategory, number>>;
  /** Places offering a 360° virtual tour. */
  virtual_tours: number;
  linkage_note: string;
}

/** All cultural places. */
export function culture(): CulturalSite[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  culture: typeof culture;
  metadata: typeof metadata;
};
export default _default;

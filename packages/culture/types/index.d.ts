// Type definitions for @geoalgeria/culture
// Algeria's cultural atlas — the Ministry of Culture's "Cartes du Patrimoine
// Culturel Algérien" portal (cartes.patrimoineculturelalgerien.org), bilingual
// FR/AR, with coordinates as published by the portal.

/**
 * Kind of cultural place. The first five are the portal's heritage/institution
 * layers; the last six are cultural establishments from the combined map.
 */
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

/** Coarse grouping: protected sites + museums + theatres + libraries vs. operating establishments. */
export type CulturalCategory = "heritage" | "establishment";

/** Provenance of the record. */
export type CultureSource = "patrimoineculturel";

/** How the coordinates were obtained. The portal publishes a point for every place. */
export type GeoPrecision = "source_point";

/** A cultural place. */
export interface CulturalSite {
  /** Stable id, `{wilaya_code}-{type_code}-{seq}` (e.g. "16-museum-01"). */
  id: string;
  /** Best available display name (French preferred, else Arabic). */
  name: string;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** French name, or null. */
  name_fr: string | null;
  /** Kind of cultural place. */
  type: CulturalType;
  /** Coarse grouping (`heritage` for the 5 institution layers, `establishment` for the 6 venue layers). */
  category: CulturalCategory;
  /** Canonical French label for the type. */
  type_label_fr: string;
  /** Canonical Arabic label for the type. */
  type_label_ar: string;
  /** True when the portal offers a 360° virtual tour of the place. */
  has_virtual_tour: boolean;
  /** Wilaya name (French). */
  wilaya: string;
  /** Wilaya name (Arabic). */
  wilaya_ar: string;
  /** Wilaya code as a zero-padded string ("01".."69", current Law 26-06 scheme). */
  wilaya_code: string;
  /** Commune name (French), nearest-centroid best-effort. Null when unresolved. */
  commune: string | null;
  /** Commune code (geoalgeria code_commune), best-effort. Null when unresolved. */
  commune_code: number | null;
  /** Provenance (the Patrimoine Culturel portal). */
  source: CultureSource;
  /** How `lat`/`lng` were obtained (always the portal's published point). */
  geo_precision: GeoPrecision;
  /** Deep link to the place's record on the portal, or null. */
  url: string | null;
  /** Node id of the French record on the portal, or null. */
  node_id_fr: number | null;
  /** Node id of the Arabic record on the portal, or null. */
  node_id_ar: number | null;
  /** URL slug of the place name. */
  slug: string;
  /** Latitude (always present — every place carries a source point). */
  lat: number;
  /** Longitude (always present). */
  lng: number;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  culture: number;
  by_type: Record<CulturalType, number>;
  by_category: Record<CulturalCategory, number>;
  by_geo_precision: Record<GeoPrecision, number>;
  wilayas_covered: number;
  geocoded: number;
  bilingual: number;
  virtual_tours: number;
  linkage_note: string;
  coverage_note: string;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
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

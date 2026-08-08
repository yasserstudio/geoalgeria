// Type definitions for @geoalgeria/cliniques (schema v2).
// Clinics and proximity-care facilities of Algeria, compiled from OpenStreetMap
// (ODbL) and classified by type. Records follow the canonical GeoRecord contract
// (zero-padded string wilaya_code, string ONS commune_code, geo_precision/
// geo_method/source/refs) plus the facility-specific fields below.
//
// This is the OSM community tier of the health sector. The Ministry of Health
// registry tier (CHU/EPH/EHS/EPSP) is deliberately excluded here and lives in
// @geoalgeria/sante; the two describe different populations and must not be summed.

/** Provenance of the record. OSM is the sole source. */
export type CliniqueSource = "osm";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`. */
export type GeoPrecision = "exact" | "approximate";

/** How the coordinate was obtained: a surveyed OSM node, or the centroid of
 *  the facility's OSM building/area. */
export type GeoMethod = "osm_node" | "osm_centroid";

/** Kind of care facility, classified from the French + Arabic name. */
export type CliniqueType =
  | "polyclinique" // polyclinique / عيادة متعددة الخدمات (public proximity tier)
  | "salle_de_soins" // salle de soins / dispensaire / قاعة علاج / مستوصف
  | "centre_sante" // centre de santé / centre de soins / مركز صحي
  | "maternite" // maternité / clinique d'accouchement
  | "clinique"; // residual care record (mostly private clinics)

/** Ownership sector. Asserted from `operator:type`, from a privé/خاصة/مصحة name,
 *  or structurally for the two public proximity types; null when unknown. */
export type CliniqueSector = "public" | "private";

/** External identifiers keyed by source system. */
export interface Refs {
  /** OSM element id (e.g. "node/11119062179"). */
  osm: string;
}

/** A geocoded clinic or proximity-care facility. */
export interface Clinique {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "01-00001"). Unique within this dataset. */
  id: string;
  /** Best available display name (raw OSM name preferred, else FR/AR), or null if unnamed. */
  name: string | null;
  /** French / Latin-script name, or null. */
  name_fr: string | null;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code, nearest-centroid within the containing wilaya. Null when unresolved. */
  commune_code: string | null;
  /** Commune name (French), nearest-centroid best-effort. */
  commune: string;
  /** Latitude, every facility in this dataset is geocoded. */
  lat: number;
  /** Longitude. */
  lng: number;
  /** "exact" for a surveyed OSM node, "approximate" for a building/area centroid. */
  geo_precision: GeoPrecision;
  /** How `lat`/`lng` were obtained. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]`, always "osm". */
  source: CliniqueSource;
  /** External identifiers: the matched OSM element. */
  refs: Refs;
  /** Facility type, classified from the FR/AR name. */
  type: CliniqueType;
  /** Canonical French label for the type. */
  type_label_fr: string;
  /** Canonical Arabic label for the type. */
  type_label_ar: string;
  /** Ownership sector when asserted, else null. */
  sector: CliniqueSector | null;
  /** OSM `healthcare:speciality`, a ";"-joined list (e.g. "gynaecology;paediatrics"); null if absent. */
  speciality: string | null;
  /** Single-line address from OSM addr:* tags, or null when none are present. */
  address: string | null;
  /** Phone from OSM `phone` / `contact:phone`, or null. */
  phone: string | null;
  /** Opening hours in OSM syntax (e.g. "24/7"), or null. */
  opening_hours: string | null;
  /** `true` when OSM tags `emergency=yes`; null when it says nothing (never false:
   *  a silent map is not a claim that there is no emergency service). */
  emergency: true | null;
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

/** Dataset metadata (data/metadata.json), canonical fields plus facility stats. */
export interface Metadata {
  package: "@geoalgeria/cliniques";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  /** Records with coordinates. */
  geocoded_count: number;
  geocoded_pct: number;
  /** Count by `geo_precision`. */
  precision: { exact: number; approximate: number };
  /** Always null: nothing official enumerates this population (see coverage_note). */
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
  /** Records carrying a non-null `name`. */
  named: number;
  /** Count by type. */
  by_type: Partial<Record<CliniqueType, number>>;
  /** Count by sector; records with no sector signal are absent. */
  by_sector: Partial<Record<CliniqueSector, number>>;
  /** Records carrying a `phone`. */
  with_phone: number;
  /** Records carrying an `address`. */
  with_address: number;
  linkage_note: string;
}

/** All clinics and proximity-care facilities. */
export function cliniques(): Clinique[];
/** One facility by its `id`, or null. */
export function cliniqueById(id: string | number): Clinique | null;
/** Facilities in a wilaya, by code ("16" or 16). */
export function cliniquesByWilaya(code: string | number): Clinique[];
/** Facilities of one type. */
export function cliniquesByType(type: CliniqueType): Clinique[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  cliniques: typeof cliniques;
  cliniqueById: typeof cliniqueById;
  cliniquesByWilaya: typeof cliniquesByWilaya;
  cliniquesByType: typeof cliniquesByType;
  metadata: typeof metadata;
};
export default _default;

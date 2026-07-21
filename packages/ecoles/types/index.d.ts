// Type definitions for @geoalgeria/ecoles (schema v2).
// Schools of Algeria, compiled from OpenStreetMap (ODbL) and classified by
// education cycle. Records follow the canonical GeoRecord contract
// (zero-padded string wilaya_code, string ONS commune_code, geo_precision/
// geo_method/source/refs) plus the school-specific fields below.

/** Provenance of the record. OSM is the sole source (Wikidata is school-poor). */
export type EcoleSource = "osm";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record has no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How the coordinate was obtained: a surveyed OSM node, or the centroid of
 *  the school's OSM building/area. */
export type GeoMethod = "osm_node" | "osm_centroid";

/** Education cycle in the Algerian system. */
export type EcoleCycle =
  | "primaire" // école primaire (ISCED 1)
  | "moyen" // collège d'enseignement moyen / CEM (ISCED 2)
  | "secondaire" // lycée (ISCED 3)
  | "prescolaire" // préscolaire / maternelle / روضة (ISCED 0)
  | "autre"; // school of undetermined cycle

/** Establishment kind — what the "école" is, orthogonal to its cycle. */
export type EcoleKind =
  | "regular" // a standard école / CEM / lycée / maternelle
  | "langues" // language school / institute (cycle "autre")
  | "coranique" // Quranic school (cycle "autre")
  | "conduite" // driving school / auto-école (cycle "autre")
  | "formation" // vocational / training centre (cycle "autre")
  | "special"; // adapted / special-needs school (keeps a cycle)

/** ";"-joined ISCED 2011 levels served, as tagged in OSM `isced:level`. */
export type IscedLevels = "0" | "0;1" | "1" | "2" | "2;3;4" | "3" | "4";

/** Ownership sector, only when an explicit signal is present in OSM. */
export type EcoleSector = "public" | "private";

/** External identifiers keyed by source system. */
export interface Refs {
  /** OSM element id (e.g. "node/10022159975"). */
  osm: string;
}

/** A geocoded school or kindergarten. */
export interface Ecole {
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
  /** Commune (ONS) code, nearest-centroid best-effort. Null when unresolved. */
  commune_code: string | null;
  /** Commune name (French), nearest-centroid best-effort. */
  commune: string;
  /** Latitude — every school in this dataset is geocoded. */
  lat: number;
  /** Longitude. */
  lng: number;
  /** "exact" for a surveyed OSM node, "approximate" for a building/area centroid. */
  geo_precision: GeoPrecision;
  /** How `lat`/`lng` were obtained. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "osm". */
  source: EcoleSource;
  /** External identifiers: the matched OSM element. */
  refs: Refs;
  /** Education cycle, inferred from isced:level + the FR/AR name. */
  cycle: EcoleCycle;
  /** Canonical French label for the cycle. */
  cycle_label_fr: string;
  /** Canonical Arabic label for the cycle. */
  cycle_label_ar: string;
  /** Establishment kind (mostly "regular"; special-purpose kinds carry cycle "autre"). */
  kind: EcoleKind;
  /** Canonical French label for the kind. */
  kind_label_fr: string;
  /** Canonical Arabic label for the kind. */
  kind_label_ar: string;
  /** ISCED levels served, from OSM `isced:level`; null if absent. */
  isced_levels: IscedLevels | null;
  /** Ownership sector when asserted (operator:type or a privé/خاص name), else null. */
  sector: EcoleSector | null;
  /** Single-line address from OSM addr:* tags, or null when none are present. */
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

/** Dataset metadata (data/metadata.json) — canonical fields plus school stats. */
export interface Metadata {
  package: "@geoalgeria/ecoles";
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
  /** Approximate size of the national school network (Ministry of National Education), for honest coverage framing. */
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
  /** Records carrying a non-null `name`. */
  named: number;
  /** Count by cycle. */
  by_cycle: Partial<Record<EcoleCycle, number>>;
  /** Count by kind. */
  by_kind: Partial<Record<EcoleKind, number>>;
  /** Count by sector; records with no sector signal are absent. */
  by_sector: Partial<Record<EcoleSector, number>>;
  /** Records carrying an `address`. */
  with_address: number;
  cycle_note: string;
  kind_note: string;
}

/** All schools and kindergartens. */
export function ecoles(): Ecole[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  ecoles: typeof ecoles;
  metadata: typeof metadata;
};
export default _default;

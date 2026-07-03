// Type definitions for @geoalgeria/ecoles
// Schools of Algeria, extracted from OpenStreetMap (ODbL) and classified by cycle.

/** Where a record came from. OSM is the sole source (Wikidata is school-poor). */
export type EcoleSource = "osm";

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

/** Ownership sector, only when an explicit signal is present. */
export type EcoleSector = "public" | "private";

/** How the coordinates were obtained. */
export type GeoPrecision = "osm_node" | "osm_centroid";

/** A geocoded school or kindergarten. */
export interface Ecole {
  /** Stable id, `{wilaya_code}-{seq}` (e.g. "16-00042"). */
  id: string;
  /** Provenance — always "osm". */
  source: EcoleSource;
  /** OSM element id (e.g. "way/292876445"). */
  osm_id: string;
  /** Best available display name (raw name preferred, else FR/AR), or null if unnamed. */
  name: string | null;
  /** Arabic name, or null. */
  name_ar: string | null;
  /** French / Latin-script name, or null. */
  name_fr: string | null;
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
  /** ISCED levels served, sorted ";"-joined ("0;1", "2", "1;2;3"), from OSM isced:level; null if absent. */
  isced_levels: string | null;
  /** Ownership sector when asserted (operator:type or a privé/خاص name), else null. */
  sector: EcoleSector | null;
  /** Wilaya name (French), nearest-centroid join. */
  wilaya: string;
  /** Wilaya name (Arabic). */
  wilaya_ar: string;
  /** Wilaya code as a zero-padded string ("01".."69"). */
  wilaya_code: string;
  /** Commune name (French), nearest-centroid best-effort. */
  commune: string;
  /** Commune code (geoalgeria code_commune), nearest-centroid best-effort. */
  commune_code: number | null;
  /** Single-line address from OSM addr:* tags, or null when none are present. */
  address: string | null;
  /** Latitude. */
  lat: number;
  /** Longitude. */
  lng: number;
  /** How `lat`/`lng` were obtained (surveyed node vs building centroid). */
  geo_precision: GeoPrecision;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  ecoles: number;
  named: number;
  by_cycle: Record<EcoleCycle, number>;
  by_kind: Record<EcoleKind, number>;
  by_sector: { public: number; private: number; unknown: number };
  /** Records carrying an `address`. */
  with_address: number;
  /** Records carrying `isced_levels`. */
  with_isced: number;
  wilayas_covered: number;
  ecoles_geocoded: number;
  /** Approximate national school-network size, for honest coverage framing. */
  official_total: number;
  coverage_note: string;
  cycle_note: string;
  kind_note: string;
  linkage_note: string;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
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

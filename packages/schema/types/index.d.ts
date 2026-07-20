// Canonical type contract for GeoAlgeria data packages (schema v2).
// Every @geoalgeria/* dataset record conforms to GeoRecord (plus domain-specific
// extra fields); each data/metadata.json conforms to DatasetMetadata; the
// repo-level catalog (index.json) conforms to Manifest.

/** Coordinate provenance, coarse-grained. Detail (e.g. "osm_node") goes in `geo_method`.
 *  `null` when the record carries no coordinate at all — see {@link GeoRecord.geo_precision}. */
export type GeoPrecision = "exact" | "approximate" | null;

/** Operational status of a facility/asset. Absent means unknown. */
export type Lifecycle = "operating" | "planned" | "closed" | "unknown";

/** How a source establishes a record: an official register, community mapping, or
 *  our own computation. Declared per source (SourceRef.evidence_type). */
export type EvidenceType = "official" | "crowdsourced" | "derived";

/** Cross-dataset external identifiers. Keys are source systems, values their native ids. */
export interface Refs {
  /** OpenStreetMap element, e.g. "node/3012904279". */
  osm?: string;
  /** Wikidata QID, e.g. "Q1234". */
  wikidata?: string;
  /** Ministry of Health establishment id. */
  msp?: string;
  [system: string]: string | undefined;
}

/** Bounding box `[minLng, minLat, maxLng, maxLat]`. */
export type BBox = [number, number, number, number];

/** The canonical facility/point record shared by every sector dataset. */
export interface GeoRecord {
  /** Opaque stable id, unique within its own file — NOT globally unique, and not
   *  unique across files even within one package (contract decision 10). Treat it
   *  as a join key scoped by file. */
  id: string;
  /** Best display name (domain default), or null where the source is unnamed. */
  name?: string | null;
  /** French/Latin name, where distinct. */
  name_fr?: string | null;
  /** Arabic name, where available. */
  name_ar?: string | null;
  /** Wilaya code, zero-padded 2-digit string "01".."69". */
  wilaya_code: string;
  /** Commune (ONS) code as a string, or null when unknown. First 2 digits === wilaya_code. */
  commune_code?: string | null;
  /** Commune name (French). */
  commune?: string | null;
  /** Commune name (Arabic). */
  commune_ar?: string | null;
  /** Latitude (WGS84), or null when ungeocoded. */
  lat: number | null;
  /** Longitude (WGS84), or null when ungeocoded. */
  lng: number | null;
  /** Coordinate provenance. Null if and only if `lat`/`lng` are null: a record with
   *  no point asserts no precision (and no method). Enforced by `validateRecords`. */
  geo_precision: GeoPrecision;
  /** Free-form geocoding-method detail, e.g. "osm_node", "commune_centroid".
   *  Required (non-empty) on a geocoded record and null on an ungeocoded one —
   *  no method produced a point. Enforced by `validateRecords`, both directions. */
  geo_method: string | null;
  /** Operational status, where the source reports it. Absent means unknown. */
  lifecycle?: Lifecycle;
  /** Domain type code. */
  type?: string;
  /** Human label for `type` (French). */
  type_label_fr?: string;
  /** Human label for `type` (Arabic). */
  type_label_ar?: string;
  /** Provenance key into DatasetMetadata.sources[].key. */
  source?: string;
  /** External identifiers. */
  refs?: Refs;
  /** Datasets may carry additional domain-specific fields. */
  [field: string]: unknown;
}

/** One provenance entry. */
export interface SourceRef {
  /** Short stable key referenced by GeoRecord.source. */
  key: string;
  /** Human-readable source name. */
  name: string;
  /** Source URL. */
  url?: string;
  /** License string (SPDX-ish or descriptive). */
  license: string;
  /** ISO date the data was retrieved. */
  retrieved?: string;
  /** How this source establishes its records. */
  evidence_type?: EvidenceType;
}

/** Canonical data/metadata.json shape. */
export interface DatasetMetadata {
  /** npm package name, e.g. "@geoalgeria/sante". */
  package: string;
  /** Contract version this dataset conforms to. */
  schema_version: string;
  title_fr?: string;
  title_ar?: string;
  title_en?: string;
  /** Total records. */
  record_count: number;
  /** Records with finite coordinates. */
  geocoded_count: number;
  /** geocoded_count / record_count × 100, 1 dp. */
  geocoded_pct: number;
  /** Count by geo_precision among geocoded records. */
  precision?: { exact: number; approximate: number };
  /** Count by lifecycle among records that declare one. Omitted when none do. */
  lifecycle?: { operating: number; planned: number; closed: number; unknown: number };
  /** Estimated real-world total (the honest denominator), or null if unknown. */
  estimated_universe?: number | null;
  /** record_count / estimated_universe × 100, or null. */
  coverage_pct?: number | null;
  /** Human note on coverage honesty. */
  coverage_note?: string;
  /** Distinct wilaya_code values present. */
  wilayas_covered: number;
  /** Data bounding box, or null when ungeocoded. */
  bbox?: BBox | null;
  /** Per-file counts for multi-file packages. */
  entities?: { file: string; count: number }[];
  /** Provenance. */
  sources: SourceRef[];
  /** Primary license string. */
  license: string;
  /** ISO date this dataset was last generated. */
  updated: string;
}

/** A coverage figure and the universe it divides by, never a bare percentage. */
export interface CoverageRatio {
  pct: number;
  /** The estimated real-world total the percentage divides by. */
  of: number;
  /** The sentence that says what that universe is. Always present. */
  note: string;
}

/** One row in the repo catalog, as emitted by `buildManifest`. */
export interface DatasetEntry {
  package: string;
  /** null for the packages that predate the v2 contract. */
  schema_version: string | null;
  title?: string;
  record_count: number;
  geocoded_count: number | null;
  geocoded_pct: number;
  precision?: { exact: number; approximate: number };
  /** Present only when the package states an estimated universe and the ratio is ≤ 100%. */
  coverage?: CoverageRatio;
  /** The same three fields when the ratio exceeds 100% — a comparison against an
   *  official count, not coverage of it (see `buildManifest`). Never both. */
  ratio?: CoverageRatio;
  wilayas_covered: number;
  bbox: BBox | null;
  license: string;
  updated: string;
}

/** The repo-level machine-readable catalog (index.json). */
export interface Manifest {
  schema_version: string;
  generated?: string;
  /** How to read the catalog — emitted verbatim by scripts/build-catalog.mjs. */
  note?: string;
  datasets: DatasetEntry[];
}

/** Result of a validation pass. Errors block a release; warnings are advisory. */
export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export interface ValidateOptions {
  /** Require at least one non-empty name field per record. */
  requireName?: boolean;
  /** Wilaya boundary polygons for the point-in-wilaya check (from `loadBoundaries`). */
  boundaries?: BoundaryIndex;
}

/** A `wilaya_code → GeoJSON geometry` lookup for boundary checks. */
export type BoundaryIndex = Map<string, { type: string; coordinates: unknown }>;

// ---- runtime API ----

export const SCHEMA_VERSION: string;
export const GEO_PRECISION: readonly GeoPrecision[];
export const LIFECYCLE: readonly Lifecycle[];
export const EVIDENCE_TYPE: readonly EvidenceType[];
export const WILAYA_CODES: readonly string[];
export const DZ_BBOX: { minLng: number; maxLng: number; minLat: number; maxLat: number };
/** Fewest fraction digits a coordinate must carry to be called `exact`. */
export const MIN_EXACT_DECIMALS: number;

export function wcode(c: string | number | null | undefined): string | null;
export function round6(n: number | string | null | undefined): number | null;
export function toCSV(rows: Record<string, unknown>[], cols: string[]): string;
export function toGeoJSON(rows: GeoRecord[]): {
  type: "FeatureCollection";
  features: unknown[];
};
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number;
export function bbox(rows: GeoRecord[]): BBox | null;

export function pointInGeometry(
  lng: number,
  lat: number,
  geometry: { type: string; coordinates: unknown } | null | undefined,
): boolean;
export function pointInWilaya(
  lng: number,
  lat: number,
  wilayaCode: string,
  boundaries: BoundaryIndex,
): boolean;
/**
 * Build a `wilaya_code → geometry` index from a boundary FeatureCollection.
 * Throws on an empty index, on any unusable feature, and on duplicate codes —
 * `pointInWilaya` treats an un-indexed code as "inside", so a degraded index
 * would silently pass every record instead of checking it.
 */
export function loadBoundaries(
  featureCollection: { features?: { properties?: Record<string, unknown>; geometry: unknown }[] },
  codeProp?: string,
): BoundaryIndex;
/**
 * `wilaya_code → set of bordering wilaya_codes`, from shared boundary vertices.
 * Throws if any wilaya borders nothing — an adjacency map that answers "no"
 * everywhere would report every out-of-boundary point as a mislink.
 */
export function wilayaNeighbours(featureCollection: {
  features?: { properties?: Record<string, unknown>; geometry: unknown }[];
}): Map<string, Set<string>>;

/** Fraction digits in a number's shortest round-trip decimal form (0 for integers). */
export function fractionDigits(n: number): number;
/** A point is only as precise as its coarser axis → min of the two digit counts. */
export function coordDecimals(lat: number | null, lng: number | null): number;
/** Indexes of the rows whose coordinate is carried by at least one other row in the
 *  same collection — a point several records share is not a per-facility point.
 *  Ungeocoded rows are never members. */
export function sharedPoints(rows: GeoRecord[]): Set<number>;

export function validateRecords(records: GeoRecord[], opts?: ValidateOptions): ValidationResult;
export function validateMetadata(meta: DatasetMetadata): ValidationResult;

export interface BuildMetadataInput {
  package: string;
  records: GeoRecord[];
  sources: SourceRef[];
  license: string;
  updated: string;
  estimatedUniverse?: number | null;
  coverageNote?: string;
  titles?: { fr?: string; ar?: string; en?: string };
  entities?: { file: string; count: number }[];
}
export function evidenceForSourceKey(key: string): EvidenceType;
export function buildMetadata(input: BuildMetadataInput): DatasetMetadata;
export function buildManifest(
  metadatas: DatasetMetadata[],
  opts?: { generated?: string; note?: string },
): Manifest;
export function buildDcat(
  meta: DatasetMetadata,
  opts?: {
    homepage?: string;
    /** Repository URL, emitted as schema.org `sameAs`. */
    repo?: string;
    /** One `DataDownload` per shipped file. */
    distributions?: { name: string; format: string; url: string }[];
  },
): Record<string, unknown>;

// Type definitions for @geoalgeria/livraison (schema v2).
// Algeria's COD / e-commerce delivery layer: the carrier registry, geocoded
// stop-desks compiled from each carrier's own public agency feed, and
// per-carrier coverage rollups. Only `stopdesks` are GeoRecords — carriers
// and coverage are registry/rollup shapes with no coordinates.

/** Service model a carrier offers. */
export type CarrierType = "both" | "home" | "stop_desk";
/** Domestic vs international operator. */
export type CarrierScope = "domestic" | "international";
/** How openly the carrier publishes its agency locations. */
export type OpenAgencyData = "addresses" | "geocoded" | "none";
/** Public API availability. */
export type CarrierApi = "aggregator" | "documented" | "licensed" | "none" | "private";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` means there is no coordinate at all — not observed in this dataset
 *  (every stop-desk is geocoded), but part of the shared contract vocabulary. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How a stop-desk's coordinate was obtained. Always `"carrier_relay"`: every
 *  point here comes from a carrier's own published agency feed. */
export type GeoMethod = "carrier_relay";

/** Carrier ids that publish an open, geocoded agency feed and so key into
 *  `StopDesk.source` / `metadata.sources[]`. Narrower than {@link Operator}:
 *  a few carriers appear as `operator` via a federated feed (e.g. Yalidine's)
 *  without being a `source` themselves. */
export type SourceKey = "anderson" | "guepex" | "maystro" | "noest" | "yalidine";

/** Every carrier id that owns at least one geocoded stop-desk. */
export type Operator =
  | "anderson"
  | "easyandspeed"
  | "guepex"
  | "maystro"
  | "noest"
  | "speedmail"
  | "wecanservices"
  | "yalidine"
  | "zimou-express";

/** A delivery carrier in the registry. */
export interface Carrier {
  /** Stable lowercase id (e.g. `"yalidine"`). Unique within this file. */
  id: string;
  /** Company name (e.g. `"Yalidine Express"`). */
  name: string;
  /** Official website, or `null` if none/unknown. */
  website: string | null;
  /** Service model. */
  type: CarrierType;
  /** Cash-on-delivery supported. */
  cod: boolean;
  /** Domestic vs international operator. */
  scope: CarrierScope;
  /** How openly the carrier publishes its agency locations. */
  open_agency_data: OpenAgencyData;
  /** Public API availability. */
  api: CarrierApi;
  /** Short free-text note on the carrier / its data. */
  notes: string;
  /** True when this carrier has geocoded stop-desks in the `stopdesks` dataset. */
  in_stopdesks: boolean;
  /** Number of geocoded stop-desks for this carrier (0 if none open). */
  stopdesk_count: number;
  /** Wilayas reached by this carrier's stop-desks. */
  stopdesk_wilaya_count: number;
}

/** A geocoded stop-desk. */
export interface StopDesk {
  /** Stable id (shared across the source relay feeds). Unique within this file. */
  id: string;
  /** Stop-desk name. */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code — always null: carrier relay feeds publish a commune
   *  name only; typed as `string | null` so a future value is not a break. */
  commune_code: string | null;
  /** Commune name as published by the source. */
  commune: string;
  /** Latitude (WGS84). Every stop-desk in this dataset is geocoded. */
  lat: number;
  /** Longitude (WGS84). Every stop-desk in this dataset is geocoded. */
  lng: number;
  /** Always `"exact"` — carrier relay feeds publish a real per-desk point. */
  geo_precision: "exact";
  /** Always `"carrier_relay"`. */
  geo_method: GeoMethod;
  /** Authoritative provenance key into `metadata.sources[]` — the first entry
   *  of {@link StopDesk.sources}. */
  source: SourceKey;
  /** Which open sources list this stop-desk (a stop-desk can be listed by more
   *  than one federated feed). */
  sources: SourceKey[];
  /** Operating carrier id — joins {@link Carrier.id}. */
  operator: Operator;
  /** Street address as published by the source, or `null`. */
  address: string | null;
}

/** Per-carrier stop-desk presence. */
export interface CarrierCoverage {
  /** Carrier id — joins {@link Carrier.id}. */
  operator: Operator;
  /** Carrier name. */
  carrier_name: string;
  /** Number of stop-desks. */
  stopdesks: number;
  /** Number of distinct wilayas with a stop-desk. */
  wilaya_count: number;
  /** Wilaya codes with at least one stop-desk, zero-padded — same key type as
   *  {@link StopDesk.wilaya_code}, so the two join directly. */
  wilayas: string[];
  /** Number of distinct communes with a stop-desk. */
  commune_count: number;
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

/** Dataset metadata (data/metadata.json) — canonical fields plus livraison stats. */
export interface Metadata {
  package: "@geoalgeria/livraison";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  /** Stop-desks only — carriers and coverage are registry/rollup, not GeoRecords. */
  record_count: number;
  /** Records with coordinates — every stop-desk. */
  geocoded_count: number;
  geocoded_pct: number;
  /** Count by `geo_precision`. */
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
  /** Size of the carrier registry. */
  carriers: number;
  /** Total geocoded stop-desks. */
  stopdesks: number;
  /** Rows in `coverage.json`. */
  coverage: number;
  /** Stop-desk count per carrier id. */
  by_operator: Partial<Record<Operator, number>>;
}

/** The delivery-carrier registry. */
export function carriers(): Carrier[];
/** Geocoded stop-desks. */
export function stopdesks(): StopDesk[];
/** Per-carrier stop-desk presence. */
export function coverage(): CarrierCoverage[];
/** One carrier by id or name (case-insensitive), or `null`. */
export function carrierById(key: string): Carrier | null;
/** Stop-desks in a wilaya — accepts `16` or `"16"`. */
export function stopdesksByWilaya(code: string | number): StopDesk[];
/** Stop-desks operated by a carrier id (e.g. `"guepex"`). */
export function stopdesksByCarrier(key: string): StopDesk[];
/** Coverage row for one carrier id (e.g. `"yalidine"`), or `null`. */
export function coverageByCarrier(key: string): CarrierCoverage | null;
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  carriers: typeof carriers;
  stopdesks: typeof stopdesks;
  coverage: typeof coverage;
  carrierById: typeof carrierById;
  stopdesksByWilaya: typeof stopdesksByWilaya;
  stopdesksByCarrier: typeof stopdesksByCarrier;
  coverageByCarrier: typeof coverageByCarrier;
  metadata: typeof metadata;
};
export default _default;

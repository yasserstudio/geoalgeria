// Type definitions for @geoalgeria/livraison (schema v2).
// Stop-desks follow the canonical GeoRecord contract from @geoalgeria/schema
// (zero-padded string wilaya_code, geo_precision/geo_method/source). Carriers and
// coverage are registry/rollup shapes and are not GeoRecords.

export type CarrierType = "stop_desk" | "home" | "both";
export type CarrierScope = "domestic" | "international";
/** How openly the carrier publishes its agency locations. */
export type OpenAgencyData = "geocoded" | "addresses" | "none";
export type CarrierApi = "documented" | "private" | "licensed" | "aggregator" | "none";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`. */
export type GeoPrecision = "exact" | "approximate";

/** External identifiers keyed by source system. Carrier relay feeds publish
 *  none, so the field is absent from every record. */
export type Refs = Record<string, string>;

/** A delivery carrier in the registry. */
export interface Carrier {
  /** Stable lowercase id (e.g. `"yalidine"`). */
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
  /** True when this carrier has geocoded stop-desks in the `stopdesks` dataset. */
  in_stopdesks: boolean;
  /** Number of geocoded stop-desks for this carrier (0 if none open). */
  stopdesk_count: number;
  /** Wilayas reached by this carrier's stop-desks. */
  stopdesk_wilaya_count: number;
  /** Short free-text note on the carrier / its data. */
  notes: string | null;
}

/** A geocoded stop-desk / relay point. */
export interface StopDesk {
  /** Stable stop-desk id (shared across the source relay maps). */
  id: string;
  /** Operating carrier id — joins {@link Carrier.id}. */
  operator: string;
  /** Stop-desk name. */
  name: string;
  /** Street address as published by the source, or `null`. */
  address: string | null;
  /** Commune name as published by the source, or `null`. */
  commune: string | null;
  /** Commune (ONS) code — always null: relay feeds publish a commune name only. */
  commune_code: string | null;
  /** Wilaya code as a zero-padded string (`"01"`..`"69"`), linked to the
   *  `geoalgeria` model. */
  wilaya_code: string;
  /** Latitude (WGS84). Every stop-desk in this dataset is geocoded. */
  lat: number;
  /** Longitude (WGS84). Every stop-desk in this dataset is geocoded. */
  lng: number;
  /** Always `"exact"` — carrier relay feeds publish a real per-desk point. */
  geo_precision: GeoPrecision;
  /** Always `"carrier_relay"`. */
  geo_method: string;
  /** Authoritative provenance key into `metadata.sources[]` — the first entry of
   *  {@link StopDesk.sources}. */
  source: string;
  /** Which open sources list this stop-desk (`"yalidine"`, `"guepex"`). */
  sources: string[];
  /** External identifiers. Absent for this dataset. */
  refs?: Refs;
}

/** Per-carrier stop-desk presence. */
export interface CarrierCoverage {
  /** Carrier id — joins {@link Carrier.id}. */
  operator: string;
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

/** Dataset provenance and counts. */
export interface Metadata {
  source: string;
  origin_stopdesks: string[];
  carriers_source: string;
  license: string;
  carriers: number;
  stopdesks: number;
  coverage: number;
  stopdesks_geocoded: number;
  wilayas_covered: number;
  generated_at: string;
}

/** The delivery-carrier registry. */
export function carriers(): Carrier[];
/** Geocoded stop-desk / relay points. */
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
/** Dataset metadata (counts, sources, generated_at). */
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

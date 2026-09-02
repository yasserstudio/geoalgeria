export type GeoPrecision = "exact" | "approximate" | null;
export type SourceKey = "wikipedia" | "osm" | "wikipedia+osm" | "etus-tiaret" | "etusto" | "etus-bejaia" | "etus-msila" | "etus-sidi-bel-abbes" | "etus-setif" | "etus-setif+osm";
export type SequenceStatus = "osm_member_order_unvalidated";
export type ServicePeriod = "regular" | "friday" | "saturday";
export type ServiceDay = "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

export interface BusServiceHours {
  period: ServicePeriod;
  days: ServiceDay[];
  direction_from?: string;
  direction_to?: string;
  first_departure: string | null;
  last_departure: string | null;
  operates: boolean;
}

export interface BusDeparture {
  time: string;
  note: string | null;
}

export interface BusDepartureSchedule {
  direction_from: string;
  direction_to: string;
  /** Null when the official page does not state which service days apply. */
  days: ServiceDay[] | null;
  days_note: string | null;
  departures: BusDeparture[];
}

export interface BusLine {
  id: string;
  name: string | null;
  wilaya_code: string;
  commune_code: null;
  commune: null;
  lat: null;
  lng: null;
  geo_precision: null;
  geo_method: null;
  source: SourceKey;
  operator_id: string;
  operator: string;
  network: string;
  line: string;
  terminus1: string | null;
  terminus1_fr?: string;
  terminus1_ar?: string;
  terminus2: string | null;
  terminus2_fr?: string;
  terminus2_ar?: string;
  stops: number | null;
  major_stops: number | null;
  service_hours: BusServiceHours[];
  departure_schedules?: BusDepartureSchedule[];
  route_diagram_url?: string | null;
  communes_served: string[];
  stations_served: string[];
  shape_id: string | null;
  osm_relation_ids: number[];
  source_refs: SourceKey[];
  source_url?: string;
}

export interface BusStation {
  id: string;
  name: string | null;
  name_fr: string | null;
  name_ar: string | null;
  wilaya_code: string;
  commune_code: null;
  commune: null;
  lat: number;
  lng: number;
  geo_precision: Exclude<GeoPrecision, null>;
  geo_method: "osm_node";
  source: "osm";
  osm_type: "node";
  osm_id: number;
  refs: { osm: string };
  operator_ids: string[];
  line_ids: string[];
  wilaya_method: "point_in_wilaya" | "operator_scope";
  roles: string[];
  highway: string | null;
  public_transport: string | null;
}

export interface BusOperator {
  id: string;
  name: string;
  name_fr: string;
  name_ar: string | null;
  wilaya_codes: string[];
  scope: "urban_suburban";
  line_count: number;
  shape_count: number;
  source_refs: SourceKey[];
}

export interface MultiLineStringGeometry { type: "MultiLineString"; coordinates: number[][][]; }

export interface BusShape {
  id: string;
  line_id: string;
  operator_id: string;
  operator: string;
  network: string;
  line: string;
  name: string | null;
  wilaya_code: string;
  terminus1: string | null;
  terminus1_fr?: string;
  terminus1_ar?: string;
  terminus2: string | null;
  terminus2_fr?: string;
  terminus2_ar?: string;
  source: "osm";
  osm_relation_ids: number[];
  geometry: MultiLineStringGeometry;
}

export interface BusDirection {
  id: string;
  line_id: string;
  shape_id: string;
  osm_relation_id: number;
  from: string | null;
  to: string | null;
  via: string | null;
  public_transport_version: 2 | null;
  sequence_status: SequenceStatus;
  source: "osm" | "etus-setif+osm";
  source_refs: SourceKey[];
}

export interface StationMembership {
  id: string;
  direction_id: string;
  line_id: string;
  station_id: string;
  osm_relation_id: number;
  /** Zero-based position in the raw OSM relation member array. */
  osm_member_index: number;
  /** One-based position among Station members in that Direction. */
  source_sequence: number;
  role: string | null;
  sequence_status: SequenceStatus;
  source: "osm";
}

export interface SourceRef {
  key: string;
  name: string;
  url?: string;
  license: string;
  retrieved: string;
  evidence_type: "official" | "crowdsourced" | "derived";
}

export interface Metadata {
  package: "@geoalgeria/buses";
  schema_version: "2.0.0";
  title_fr: string;
  title_ar: string;
  title_en: string;
  record_count: number;
  entities: { file: string; count: number }[];
  geocoded_count: number;
  geocoded_pct: number;
  precision: { exact: number; approximate: number };
  estimated_universe: null;
  coverage_pct: null;
  coverage_note: string;
  wilayas_covered: number;
  bbox: [number, number, number, number];
  sources: SourceRef[];
  license: string;
  updated: string;
  operators: string[];
  by_operator: Record<string, number>;
  with_stop_count: number;
  with_major_stop_count: number;
  with_service_hours: number;
  with_departure_schedules: number;
  shapes: number;
  directions: number;
  stations: number;
  station_memberships: number;
}

export function lines(): BusLine[];
export function lineById(id: string): BusLine | null;
export function linesByWilaya(code: string | number): BusLine[];
export function linesByOperator(operator: string): BusLine[];
/** Backward-compatible list of Operator display labels. */
export function operators(): string[];
export function operatorRecords(): BusOperator[];
export function operatorById(id: string): BusOperator | null;
export function shapes(): BusShape[];
export function shapeById(id: string): BusShape | null;
export function shapeForLine(lineId: string): BusShape | null;
export function directions(): BusDirection[];
export function directionsByLine(lineId: string): BusDirection[];
export function stations(): BusStation[];
export function stationById(id: string): BusStation | null;
export function stationsByLine(lineId: string): BusStation[];
export function stationsByWilaya(code: string | number): BusStation[];
export function stationMemberships(): StationMembership[];
export function membershipsByDirection(directionId: string): StationMembership[];
export function metadata(): Metadata;

declare const _default: {
  lines: typeof lines; lineById: typeof lineById; linesByWilaya: typeof linesByWilaya; linesByOperator: typeof linesByOperator;
  operators: typeof operators; operatorRecords: typeof operatorRecords; operatorById: typeof operatorById;
  shapes: typeof shapes; shapeById: typeof shapeById; shapeForLine: typeof shapeForLine;
  directions: typeof directions; directionsByLine: typeof directionsByLine;
  stations: typeof stations; stationById: typeof stationById; stationsByLine: typeof stationsByLine; stationsByWilaya: typeof stationsByWilaya;
  stationMemberships: typeof stationMemberships; membershipsByDirection: typeof membershipsByDirection;
  metadata: typeof metadata;
};
export default _default;

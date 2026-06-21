export type LodgingType =
  | "hotel"
  | "hostel"
  | "guest_house"
  | "apartment"
  | "chalet"
  | "motel"
  | "alpine_hut";

export type AttractionType =
  | "attraction"
  | "artwork"
  | "museum"
  | "viewpoint"
  | "theme_park"
  | "zoo"
  | "cave"
  | "waterfall"
  | "tourist_attraction";

export type HistoricType =
  | "archaeological_site"
  | "memorial"
  | "monument"
  | "ruins"
  | "castle"
  | "tomb"
  | "city_gate"
  | "fort"
  | "citywalls"
  | "palace"
  | "fortification"
  | "church_building"
  | "war_memorial"
  | "château"
  | "building"
  | "heritage"
  | "mosque"
  | "battlefield"
  | "manor"
  | "wreck"
  | (string & {});

export type ThermalType = "hammam" | "ain" | "source" | "forage";

export type ParkCategory = "national_park" | "nature_reserve" | "protected_area";

export type Layer = "lodging" | "attraction" | "historic" | "thermal_spring" | "park";

interface Base {
  id: number;
  name: string;
  name_ar?: string;
  name_fr?: string;
  wilaya_code: string;
  lat: number;
  lng: number;
  source: string;
}

export interface Lodging extends Base {
  type: LodgingType;
  stars?: number;
  rooms?: number;
  phone?: string;
  website?: string;
  address?: string;
  osm_id?: number;
}

export interface Attraction extends Base {
  type: AttractionType;
  description?: string;
  wikipedia?: string;
  wikidata?: string;
  osm_id?: number;
}

export interface Historic extends Base {
  type: HistoricType;
  heritage?: string;
  heritage_status?: string;
  wikipedia?: string;
  wikidata?: string;
  osm_id?: number;
}

export interface ThermalSpring extends Base {
  type: ThermalType;
  temperature_c?: number;
  debit_l_s?: number;
  altitude_m?: number;
  minerality?: string;
  wilaya_name: string;
  commune_name: string;
}

export interface Park extends Base {
  category: ParkCategory;
  protection_title?: string;
  wikidata?: string;
  osm_id?: number;
}

export type Place = (Lodging | Attraction | Historic | ThermalSpring | Park) & {
  layer: Layer;
};

export interface Metadata {
  name: string;
  description: string;
  version: string;
  lodging: number;
  attractions: number;
  historic: number;
  thermal_springs: number;
  parks: number;
  total: number;
  wilaya_coverage: number;
  sources: string[];
  licenses: Record<string, string>;
  last_updated: string;
}

export function lodging(): Lodging[];
export function attractions(): Attraction[];
export function historic(): Historic[];
export function thermalSprings(): ThermalSpring[];
export function parks(): Park[];
export function all(): Place[];
export function byWilaya(code: string | number): Place[];
export function byLayer(layer: Layer): (Lodging | Attraction | Historic | ThermalSpring | Park)[];
export function metadata(): Metadata;

declare const _default: {
  lodging: typeof lodging;
  attractions: typeof attractions;
  historic: typeof historic;
  thermalSprings: typeof thermalSprings;
  parks: typeof parks;
  all: typeof all;
  byWilaya: typeof byWilaya;
  byLayer: typeof byLayer;
  metadata: typeof metadata;
};
export default _default;

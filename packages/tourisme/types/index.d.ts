// Type definitions for @geoalgeria/tourisme (schema v2).
// Tourism points of Algeria: attractions, historic sites, lodging and parks
// from OpenStreetMap (ODbL), plus thermal springs from the ASAL Geoportail
// (official). Five layer files, merged by `all()` into one collection.

/** Lodging type, as tagged in OSM. */
export type LodgingType =
  | "alpine_hut" | "apartment" | "chalet" | "guest_house" | "hostel" | "hotel" | "motel";

/** Attraction type, as tagged in OSM. */
export type AttractionType =
  | "artwork" | "attraction" | "cave" | "museum" | "theme_park"
  | "tourist_attraction" | "viewpoint" | "waterfall" | "zoo";

/** Thermal-spring type, as published by ASAL. */
export type ThermalType = "ain" | "forage" | "hammam" | "source";

/** Protected-area category, as tagged in OSM. */
export type ParkCategory = "national_park" | "nature_reserve" | "protected_area";

/** The five merged layers, as tagged by `all()`/`byLayer()`. */
export type Layer = "lodging" | "attraction" | "historic" | "thermal_spring" | "park";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` means there is no coordinate at all — not observed in this dataset
 *  (every tourism point is geocoded), but part of the shared contract vocabulary. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How a point's coordinate was obtained — also the value of `source` for this
 *  dataset. `"asal"` on thermal springs; on the other four layers `"osm"`, or
 *  `"wikidata"` for the 115 records that come from a Wikidata item rather than
 *  an OSM feature (and are CC0, not ODbL — see the licence section of the README). */
export type GeoMethod = "asal" | "osm" | "wikidata";

/** External identifiers keyed by source system. Every record on the four OSM
 *  layers carries at least one of these, but not necessarily an OSM id — a
 *  minority of records matched only on Wikidata. */
export interface Refs {
  /** OSM element id (numeric, without a `node/way/relation` prefix). */
  osm?: string;
  /** Wikidata QID (e.g. "Q2664184"), present when a Wikidata item matched. */
  wikidata?: string;
  /** Wikipedia sitelink as OSM tags it — `"<lang>:<article title>"`
   *  (e.g. `"fr:Timgad"`), present when the source carried one. */
  wikipedia?: string;
}

/** Fields shared by every layer. */
interface Base {
  /** Stable id, prefixed per layer (`lodging-`, `attraction-`, `historic-`,
   *  `thermal-spring-`, `park-`) so ids stay unique when {@link all} merges
   *  the five layers into one collection. Unique within its own file. */
  id: string;
  /** Display name. */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code — always null: OSM/ASAL sources carry no ONS join;
   *  typed as `string | null` so a future value is not a break. */
  commune_code: string | null;
  /** Commune name, or null. Only thermal springs carry a real commune name —
   *  the other four layers always carry null (point sources, no commune join). */
  commune: string | null;
  /** Latitude — every tourism point in this dataset is geocoded. */
  lat: number;
  /** Longitude — every tourism point in this dataset is geocoded. */
  lng: number;
  /** `"exact"`, or `"approximate"` where the source coordinate is rounded too
   *  coarse, or is shared with another record, to be a per-site point. */
  geo_precision: "exact" | "approximate";
  /** How the coordinate was obtained: `"osm"` for four layers, `"asal"` for
   *  thermal springs. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — same domain as `geo_method`. */
  source: GeoMethod;
}

/** A lodging establishment (hotel, hostel, guest house, …). */
export interface Lodging extends Base {
  type: LodgingType;
  /** French name, when distinct from `name`. */
  name_fr?: string;
  /** Arabic name, when distinct from `name`. */
  name_ar?: string;
  /** External identifiers — every lodging record carries an OSM id. */
  refs: Refs;
  /** Street address as tagged in OSM, when published. */
  address?: string;
  /** Contact phone, when published. Several numbers are `;`-separated, as OSM tags them. */
  phone?: string;
  /** Website URL, when published. */
  website?: string;
  /** Star rating, when published. */
  stars?: number;
  /** Number of rooms, when published. */
  rooms?: number;
}

/** A tourist attraction (viewpoint, museum, artwork, …). */
export interface Attraction extends Base {
  type: AttractionType;
  /** French name, when known. */
  name_fr?: string;
  /** Arabic name, when known. */
  name_ar?: string;
  /** External identifiers — an OSM id, a Wikidata QID, or both. */
  refs: Refs;
  /** Free-text description carried by the source, when published. */
  description?: string;
}

/** A historic site (archaeological site, monument, fort, …). OSM's `historic`
 *  tag is long-tailed and exceeds what this dataset can honestly enumerate as
 *  a literal union, so `type` is a free-form string. */
export interface Historic extends Base {
  type: string;
  /** French name, when known. */
  name_fr?: string;
  /** Arabic name, when known. */
  name_ar?: string;
  /** External identifiers — an OSM id, a Wikidata QID, or both. */
  refs: Refs;
  /** OSM `heritage` tag — the protection level as a string (e.g. `"1"`). */
  heritage?: string;
  /** OSM `heritage:operator`-style status text
   *  (e.g. `"part of UNESCO World Heritage Site"`). */
  heritage_status?: string;
}

/** A thermal spring / hot-water point (ASAL Geoportail). The only layer with
 *  a real `commune` and no `refs` (ASAL has no OSM/Wikidata linkage). */
export interface ThermalSpring extends Base {
  type: ThermalType;
  /** Commune name — always a real value for thermal springs (unlike the
   *  other four layers, where {@link Base.commune} is always null). */
  commune: string;
  /** Water temperature in °C. */
  temperature_c: number;
  /** Flow rate in litres/second. */
  debit_l_s: number;
  /** Altitude in metres. */
  altitude_m: number;
  /** Mineral composition, when published. */
  minerality?: string;
}

/** A national park, nature reserve, or other protected area. */
export interface Park extends Base {
  /** Protected-area category — parks have no `type` field, unlike the other layers. */
  category: ParkCategory;
  /** French name, when known. */
  name_fr?: string;
  /** Arabic name, when known. */
  name_ar?: string;
  /** External identifiers — an OSM id, a Wikidata QID, or both. */
  refs: Refs;
}

/** Any of the five layers, tagged with which one it came from — the shape
 *  returned by {@link all} and {@link byLayer}. */
export type Place = (Lodging | Attraction | Historic | ThermalSpring | Park) & {
  layer: Layer;
};

/** One provenance entry in `metadata.sources[]`. */
export interface SourceRef {
  key: string;
  name: string;
  url?: string;
  license: string;
  retrieved?: string;
  evidence_type?: "official" | "crowdsourced" | "derived";
}

/** One data file described in `metadata.entities[]`. */
export interface EntityRef {
  file: string;
  count: number;
}

/** Dataset metadata (data/metadata.json) — canonical fields plus tourism stats. */
export interface Metadata {
  package: "@geoalgeria/tourisme";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  /** All five layers combined. */
  record_count: number;
  /** Records with coordinates — every tourism point. */
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
  /** Per-file record counts (attractions.json, historic.json, lodging.json,
   *  parks.json, thermal-springs.json). */
  entities: EntityRef[];
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  /** Count by `type`/`category`, merged across all five layers into one dict —
   *  not broken out per layer, and spanning too many distinct values (OSM's
   *  long-tailed `historic` tag especially) to type as a literal union. */
  by_type: Partial<Record<string, number>>;
}

/** All lodging establishments. */
export function lodging(): Lodging[];
/** All tourist attractions. */
export function attractions(): Attraction[];
/** All historic sites. */
export function historic(): Historic[];
/** All thermal springs. */
export function thermalSprings(): ThermalSpring[];
/** All parks and protected areas. */
export function parks(): Park[];
/** All five layers merged into one collection, each tagged with `layer`. */
export function all(): Place[];
/** Tourism points in a wilaya, across all layers — accepts `16` or `"16"`. */
export function byWilaya(code: string | number): Place[];
/** Records for one layer (e.g. `"thermal_spring"`); unknown layers return `[]`. */
export function byLayer(layer: Layer): (Lodging | Attraction | Historic | ThermalSpring | Park)[];
/** Dataset metadata. */
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

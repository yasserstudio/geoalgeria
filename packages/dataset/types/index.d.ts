// `geoalgeria` is a CommonJS module (`module.exports = {…}`), so its types use
// `export = algeriaGeodata`. An export assignment cannot coexist with other
// top-level `export` statements (TS2309), so every public type lives inside the
// `algeriaGeodata` namespace and merges with the value of the same name. Consumers
// reach them through the import: e.g. `import geo = require("geoalgeria")` then
// `geo.Wilaya`, or with esModuleInterop `import geo from "geoalgeria"`.
declare namespace algeriaGeodata {
  export interface Wilaya {
    code: number;
    name_fr: string;
    name_ar: string;
    phone_code: string | null;
    postal_code: string;
    latitude: number;
    longitude: number;
    /** The year the wilaya became official, i.e. the year the law creating it
     *  took effect: `"original"` for the 48 of Law 84-09 (1984), `"2019"` for
     *  49-58 (Law 19-12), `"2026"` for 59-69 (Law n° 26-06, *JO* n° 25 of
     *  5 April 2026). Never the year a reform was announced: the 59-69 cohort
     *  was announced on 2025-11-16 and is still `"2026"`. */
    created: "original" | "2019" | "2026";
    /** The `code_commune` of the wilaya's Capital (chef-lieu), as fixed by the
     *  decrees that name the chefs-lieux of the wilayas: décret n° 84-79 of
     *  3 April 1984 for 1-48, décret présidentiel n° 21-117 of 22 March 2021
     *  for 49-58, décret présidentiel n° 26-206 of 25 May 2026 for 59-69.
     *  Join it to `Commune.code_commune` for the capital's names, postal code
     *  and coordinates; the wilaya does not duplicate them. Never derived from
     *  `name_fr`: wilaya 16's capital is `1601` (Alger Centre), and 53, 54 and
     *  57 spell their capital commune differently from the wilaya. A commune
     *  promoted into wilayas 59-69 keeps its 2021 mother-wilaya ONS prefix, so
     *  a capital code need not start with `code`: wilaya 59 reads `319`.
     *  Per-wilaya provenance: `data/wilaya-capitals.metadata.json`. */
    capital_commune_code: number;
    parent_wilaya?: string;
  }

  export interface WilayaDetailed {
    code: number;
    name_fr: string;
    name_ar: string;
    name_en: string;
    /** The year the wilaya became official, as a number: `1984`, `2019` or
     *  `2026`. Same meaning as `Wilaya.created`, which spells the 1984 cohort
     *  `"original"`. */
    created: number;
    /** Same value and meaning as `Wilaya.capital_commune_code`. */
    capital_commune_code: number;
    dairas_count: number;
    communes_count: number;
    law?: string;
    mother_wilaya_code?: number;
    note?: string;
    dairas_source?: string;
    dairas?: DairaDetail[];
    communes?: CommuneBasic[];
  }

  export interface DairaDetail {
    name_ar: string;
    name_fr: string;
    communes?: CommuneBasic[];
  }

  export interface CommuneBasic {
    name_ar: string;
    name_fr: string;
  }

  export interface WilayaDataset {
    metadata: DatasetMetadata;
    wilayas: WilayaDetailed[];
  }

  export interface DatasetMetadata {
    title: string;
    total_wilayas: number;
    total_communes: number;
    total_dairas: number;
    reforms: Reform[];
    sources: string[];
    last_updated: string;
    notes: string[];
  }

  export interface Reform {
    /** The year the reform took effect, matching the `created` of the wilayas
     *  it added. The 59-69 reform is `2026` (Law n° 26-06 of 4 April 2026),
     *  not 2025, the year it was announced. */
    year: number;
    law: string;
    journal_officiel?: string;
    description: string;
    wilayas_added?: string;
  }

  export interface Commune {
    name_fr: string;
    name_ar: string;
    wilaya_code: number;
    daira: string | null;
    /** `null` on the 5 communes for which no citable postal code was found. */
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
    /** Unique ONS 2021 WWCC commune code. Communes promoted into wilayas
     *  59-69 retain their 2021 mother-wilaya prefix, so the prefix does not
     *  necessarily equal `wilaya_code`. */
    code_commune: number;
  }

  /** One record's former names, kept so an older spelling still finds it. */
  export interface NameHistoryEntry {
    /** Present on a commune entry; absent on a wilaya entry. */
    code_commune?: number;
    /** Present on a wilaya entry; absent on a commune entry. */
    code?: number;
    wilaya_code?: number;
    name_fr: string;
    name_ar: string;
    /** Earlier French spellings. Empty when only the Arabic name moved. */
    former_names_fr: string[];
    /** Earlier Arabic spellings. Empty when only the French name moved. */
    former_names_ar: string[];
    /** The official text that replaced each former name, one line per source. */
    sources: string[];
  }

  export interface NameHistory {
    metadata: {
      title: string;
      description: string;
      updated: string;
      sources: { key: string; name: string; url: string; evidence_type: string }[];
    };
    wilayas: NameHistoryEntry[];
    communes: NameHistoryEntry[];
  }

  export interface Daira {
    id: number;
    wilaya_code: number;
    name_fr: string;
    commune_count: number;
  }

  export interface CommuneEcommerce {
    id: number;
    commune_name_fr: string;
    commune_name_ar: string;
    daira_name_fr: string | null;
    wilaya_code: number;
    wilaya_name_fr: string;
    wilaya_name_ar: string;
    /** `null` on the same 5 communes as `Commune.postal_code`. */
    postal_code: string | null;
  }

  export interface WilayaWithCommunes extends Wilaya {
    communes: Commune[];
  }

  export interface DeliveryZone {
    wilaya_code: number;
    wilaya_name_fr: string;
    zone: string | null;
    home_delivery: boolean | null;
    desk_delivery: boolean | null;
    estimated_days: number | null;
  }

  export interface DeliveryProvider {
    provider: string;
    provider_name: string;
    last_updated: string | null;
    zones: DeliveryZone[];
  }

  /** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
   *  `null` when the record has no coordinate at all. */
  export type GeoPrecision = "exact" | "approximate" | null;

  /** How the coordinate was obtained. `null` on an ungeocoded record: no
   *  method produced a point, so none can be named. */
  export type GeoMethod = "baridimap" | null;

  /** Office class/category as published by Algérie Poste. */
  export type OfficeClass = "CE" | "GA" | "HC" | "R1" | "R2" | "R3" | "R4";

  /** ATM operational status as published by Algérie Poste. `"1"` is an
   *  undocumented source value carried through verbatim rather than guessed at. */
  export type AtmStatus = "OPEN" | "CLOSED (OFFLINE)" | "1";

  /** A post office (bureau de poste). Mirrored from @geoalgeria/poste. */
  export interface PostOffice {
    /** Stable id, unique within this file. Opaque: do not parse. */
    id: string;
    name: string;
    name_ar: string;
    /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
    wilaya_code: string;
    /** Commune (ONS) code as a 4-digit string. */
    commune_code: string;
    /** Algérie Poste's provider-native commune code when it differs from the
     *  normalized ONS join. Omitted when both values agree. */
    source_commune_code?: string;
    /** Commune name (French). */
    commune: string;
    /** Commune name in Arabic. */
    commune_ar: string;
    /** Latitude, or null when the office is not geocoded. */
    lat: number | null;
    /** Longitude, or null. Both coordinates are set, or both are null. */
    lng: number | null;
    /** `null` when `lat`/`lng` are null: a record with no point asserts no
     *  precision. */
    geo_precision: GeoPrecision;
    /** How `lat`/`lng` were obtained; null when there are none. */
    geo_method: GeoMethod;
    source: "baridimap";
    class: OfficeClass;
    postal_code: string;
    /** Previous postal code, or null when the office was never renumbered. */
    postal_code_old: string | null;
    address: string;
  }

  /** An ATM (GAB). Mirrored from @geoalgeria/poste. */
  export interface Atm {
    /** Stable id, unique within this file. Opaque: do not parse. */
    id: string;
    name: string;
    /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
    wilaya_code: string;
    /** Commune (ONS) code. Currently null for every ATM (the source resolves
     *  ATMs to a commune name only); typed as `string | null` for the future. */
    commune_code: string | null;
    /** Commune name (French). */
    commune: string;
    /** Commune name in Arabic. */
    commune_ar: string;
    /** Latitude, or null when the ATM is not geocoded. */
    lat: number | null;
    /** Longitude, or null. Both coordinates are set, or both are null. */
    lng: number | null;
    /** `null` when `lat`/`lng` are null. */
    geo_precision: GeoPrecision;
    /** How `lat`/`lng` were obtained; null when there are none. */
    geo_method: GeoMethod;
    source: "baridimap";
    status: AtmStatus;
    postal_code: string;
    /** Previous postal code, or null when never renumbered. */
    postal_code_old: string | null;
    /** Street address. Currently null for every ATM (the source omits it);
     *  typed as `string | null` so a future value is not a breaking change. */
    address: string | null;
  }
}

declare const algeriaGeodata: {
  readonly wilayas: algeriaGeodata.Wilaya[];
  readonly communes: algeriaGeodata.Commune[];
  readonly dairas: algeriaGeodata.Daira[];
  readonly ecommerce: algeriaGeodata.CommuneEcommerce[];
  readonly all: algeriaGeodata.WilayaWithCommunes[];
  readonly nameHistory: algeriaGeodata.NameHistory;
  readonly postOffices: algeriaGeodata.PostOffice[];
  readonly atms: algeriaGeodata.Atm[];
  getWilaya(code: number): algeriaGeodata.Wilaya | undefined;
  getCommunesByWilaya(wilayaCode: number): algeriaGeodata.Commune[];
  getDairasByWilaya(wilayaCode: number): algeriaGeodata.Daira[];
  findCommune(name: string): algeriaGeodata.Commune[];
  findByPostalCode(postalCode: string): algeriaGeodata.Commune[];
  getPostOfficesByCommune(codeCommune: number | string): algeriaGeodata.PostOffice[];
};

export = algeriaGeodata;

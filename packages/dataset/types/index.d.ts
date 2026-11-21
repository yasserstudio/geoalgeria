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
    /** The postal code of the wilaya's capital commune
     *  (`capital_commune_code`), the same value that commune carries: a wilaya
     *  has no postal code of its own. Its two-digit prefix is the issuing
     *  office's wilaya, so it need not equal `code`; wilaya 59 reads `03001`,
     *  its chef-lieu Aflou's own code, and 11 of the 69 are in that case. */
    postal_code: string;
    /** The wilaya's point: the centre of its capital commune
     *  (`capital_commune_code`), the same value that commune carries and not a
     *  second reading of it. A wilaya has no point of its own. */
    latitude: number;
    /** See `latitude`: the capital commune's own longitude. */
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
    /** The id of this record's own OpenStreetMap administrative relation:
     *  `admin_level=8` for a commune, `admin_level=4` for a wilaya. Harvested from
     *  the Overpass capture the commune-centre audit fetched, `timestamp_osm_base`
     *  2026-09-29T12:54:47Z, through the linkage that audit decided: the relation's
     *  `ref:ONS` (commune) or `ref` (wilaya) tag, then a pre-2019-reform ONS code
     *  scoped to the mother wilaya, then six reviewed per-relation pins. Never a
     *  name match. `null` on the 4 communes the capture has no relation for (630,
     *  1634, 2110, 4703). No id repeats across records, and a wilaya's relation is
     *  its own, not its capital commune's. ODbL 1.0, (c) OpenStreetMap
     *  contributors; see the package NOTICE. */
    osm_relation_id: number | null;
    /** The Wikidata item (`Q` then digits) that the same relation is tagged with,
     *  read as published and never resolved from a name. `null` where the relation
     *  carries no `wikidata` tag, and always `null` where `osm_relation_id` is.
     *  Same terms as `osm_relation_id`. */
    wikidata: string | null;
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
    /** The id of this record's own OpenStreetMap administrative relation:
     *  `admin_level=8` for a commune, `admin_level=4` for a wilaya. Harvested from
     *  the Overpass capture the commune-centre audit fetched, `timestamp_osm_base`
     *  2026-09-29T12:54:47Z, through the linkage that audit decided: the relation's
     *  `ref:ONS` (commune) or `ref` (wilaya) tag, then a pre-2019-reform ONS code
     *  scoped to the mother wilaya, then six reviewed per-relation pins. Never a
     *  name match. `null` on the 4 communes the capture has no relation for (630,
     *  1634, 2110, 4703). No id repeats across records, and a wilaya's relation is
     *  its own, not its capital commune's. ODbL 1.0, (c) OpenStreetMap
     *  contributors; see the package NOTICE. */
    osm_relation_id: number | null;
    /** The Wikidata item (`Q` then digits) that the same relation is tagged with,
     *  read as published and never resolved from a name. `null` where the relation
     *  carries no `wikidata` tag, and always `null` where `osm_relation_id` is.
     *  Same terms as `osm_relation_id`. */
    wikidata: string | null;
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
    /** The wilaya (1 to 58) this commune belonged to on the 58-wilaya map, in force
     *  from Law 19-12 (JORA of 18 December 2019) to Law n° 26-06 (JORA of 5 April
     *  2026): `wilaya_code` itself for wilayas 1 to 58, the mother wilaya for 59 to
     *  69. Read from `wilayaLineage`, which cites the text for each wilaya. */
    wilaya_code_58: number;
    /** The wilaya (1 to 48) this commune belonged to on the 48-wilaya map of Law
     *  84-09 as it stood just before Law 19-12, so the 24 communes Ordonnance 97-14
     *  moved into Algiers read 16: `wilaya_code` itself for wilayas 1 to 48, the mother
     *  wilaya for 49 to 69. El Borma (3021) reads 30 in all three fields although
     *  Law 19-12 lists it under Touggourt; `wilayaLineage.exceptions` says why. */
    wilaya_code_48: number;
    daira: string | null;
    /** The postal code of the commune's principal Algérie Poste office. Its first
     *  two digits are that office's wilaya at the time the code was issued, so like
     *  `code_commune` the prefix does not necessarily equal `wilaya_code`: Algérie
     *  Poste kept the old numbering through the 2026 reform, so Aflou is `03001` in
     *  wilaya 59. 108 of the 1,540 coded communes are in that case, all of them in
     *  wilayas 59-69. `null` on the 1 commune for which no citable code was found. */
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
    /** Unique ONS 2021 WWCC commune code. Communes promoted into wilayas
     *  59-69 retain their 2021 mother-wilaya prefix, so the prefix does not
     *  necessarily equal `wilaya_code`. */
    code_commune: number;
    /** The id of this record's own OpenStreetMap administrative relation:
     *  `admin_level=8` for a commune, `admin_level=4` for a wilaya. Harvested from
     *  the Overpass capture the commune-centre audit fetched, `timestamp_osm_base`
     *  2026-09-29T12:54:47Z, through the linkage that audit decided: the relation's
     *  `ref:ONS` (commune) or `ref` (wilaya) tag, then a pre-2019-reform ONS code
     *  scoped to the mother wilaya, then six reviewed per-relation pins. Never a
     *  name match. `null` on the 4 communes the capture has no relation for (630,
     *  1634, 2110, 4703). No id repeats across records, and a wilaya's relation is
     *  its own, not its capital commune's. ODbL 1.0, (c) OpenStreetMap
     *  contributors; see the package NOTICE. */
    osm_relation_id: number | null;
    /** The Wikidata item (`Q` then digits) that the same relation is tagged with,
     *  read as published and never resolved from a name. `null` where the relation
     *  carries no `wikidata` tag, and always `null` where `osm_relation_id` is.
     *  Same terms as `osm_relation_id`. */
    wikidata: string | null;
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

  /** One official text the phone-code ledger relies on. */
  export interface PhoneCodeSource {
    key: string;
    /** The document's own title. */
    name: string;
    url: string;
    /** The document's own date, or null when it carries none, with `date_note`. */
    document_date: string | null;
    date_note?: string;
    /** The date the document was read. */
    retrieved: string;
    evidence_type: "official";
  }

  /** Which declared document, where in it, and what it said there. */
  export interface PhoneCodeCitation {
    /** A key in `metadata.sources`. */
    source_key: string;
    /** Where in the document: an article, item, page, annex, table or section. */
    article: string;
    finding: string;
  }

  /** Why a wilaya of the cohort has no code: the authorities searched and the
   *  texts read, so the null is auditable rather than bare. */
  export interface PhoneCodeReason {
    statement: string;
    searched_on: string;
    searched: {
      authority: string;
      looked_for: string;
      citations: PhoneCodeCitation[];
    }[];
    note?: string;
  }

  /** One wilaya's `phone_code` and the evidence for it: either a value with its
   *  citations, or null with `reason` naming an entry in `metadata.reasons`. */
  export interface PhoneCodeProvenanceEntry {
    code: number;
    name_fr: string;
    name_ar: string;
    phone_code: string | null;
    /** Present when `phone_code` is null. */
    reason?: string;
    /** Present when `phone_code` is a value. */
    citations?: PhoneCodeCitation[];
    /** Set when the code equals the one carried by the wilaya this was split from,
     *  which must be declared rather than left to look like a copy. */
    same_as_mother_wilaya?: true;
    mother_note?: string;
  }

  /** Why each wilaya of the 2026 cohort (codes 59 to 69) carries the `phone_code`
   *  it carries. A code enters it only with an official citation. */
  export interface PhoneCodeProvenance {
    metadata: {
      title: string;
      description: string;
      scope: string;
      rule: string;
      updated: string;
      sources: PhoneCodeSource[];
      reasons: Record<string, PhoneCodeReason>;
      note?: string;
    };
    wilayas: PhoneCodeProvenanceEntry[];
  }

  /** The Journal officiel text a daira's commune list was checked against. */
  export interface DairaAuditCitation {
    /** `decret-26-253` or `decret-21-198` for `decree_table`; `decret-91-306` for
     *  `agrees_1991`; `decret-92-66` only under `amended_by`. */
    source: "decret-26-253" | "decret-21-198" | "decret-91-306" | "decret-92-66";
    decree: string;
    journal_officiel: string;
    /** The article and the wilaya table, e.g. "Annexe, tableau de la wilaya 02". */
    article: string;
    /** The Journal officiel page, or a range such as "1293-1294". */
    page: string;
    /** The PDF on joradp.dz; for 26-253 the Arabic edition the page refers to. */
    url: string;
    url_ar?: string;
    /** Décret exécutif 92-66, on the 1991 rows it re-tabled. */
    amended_by?: DairaAuditCitation;
  }

  /** How far a daira's commune list has been checked against the Journal officiel. */
  export interface DairaAudit {
    /** `decree_table`: read from a whole-wilaya table of 26-253 (2026) or 21-198 (2021).
     *  `agrees_1991`: agrees with 91-306 (1991), as amended by 92-66 where it applies;
     *  amendments of 1993 to 2020 were not exhaustively searched.
     *  `null`: not graded; the communes are unchanged. */
    status: "decree_table" | "agrees_1991" | null;
    citation: DairaAuditCitation | null;
  }

  /** One citation in the Wilaya lineage: a key of `metadata.sources` and the
   *  article it points at. */
  export interface WilayaLineageCitation {
    source: string;
    article: string;
    note?: string;
    page?: string;
    /** On the creating article of a wilaya 49 to 69: how many communes it lists. */
    communes_in_text?: number;
  }

  export interface WilayaLineageSource {
    key: string;
    name: string;
    journal_officiel?: string;
    url: string;
    url_ar?: string;
    capture?: string;
    evidence_type: "official";
    covers: string;
  }

  /** One current wilaya and the wilaya it belonged to on each earlier map. */
  export interface WilayaLineageEntry {
    code: number;
    created: number;
    wilaya_code_58: number;
    wilaya_code_48: number;
    citations: WilayaLineageCitation[];
  }

  /** A commune Ordonnance 97-14 moved into Algiers (16) before Law 19-12, so its
   *  `wilaya_code_48` is 16. */
  export interface WilayaLineageTransfer {
    code_commune: number;
    name_in_text: string;
    from_wilaya_code: number;
    to_wilaya_code: number;
    effective: string;
    source: string;
    article: string;
  }

  /** A commune whose fields depart from the text that created its wilaya, with the reason. */
  export interface WilayaLineageException {
    code_commune: number;
    name_in_text: string;
    wilaya_code: number;
    wilaya_code_58: number;
    wilaya_code_48: number;
    /** The wilaya that text lists it under. */
    listed_under_wilaya_code: number;
    reason: string;
    citations: WilayaLineageCitation[];
  }

  /** The Wilaya lineage: the 69 wilayas on the 58-wilaya and 48-wilaya maps. */
  export interface WilayaLineage {
    metadata: {
      title_en: string;
      title_fr: string;
      title_ar: string;
      description: string;
      fields: Record<"wilaya_code_58" | "wilaya_code_48", string>;
      carriers: string[];
      not_carried_by: string[];
      license: string;
      sources: WilayaLineageSource[];
    };
    wilayas: WilayaLineageEntry[];
    transfers: WilayaLineageTransfer[];
    exceptions: WilayaLineageException[];
  }

  export interface Daira {
    id: number;
    wilaya_code: number;
    name_fr: string;
    commune_count: number;
    /** `null` where no source was read (57 rows, all of Algiers among them). */
    name_ar: string | null;
    /** Where `name_ar` comes from: the Arabic table of decree 26-253 or 21-198, or
     *  the `name_ar` of the seat commune the daira is named after. `null` exactly
     *  when `name_ar` is. */
    name_ar_source: "decree_26_253_ar" | "decree_21_198_ar" | "seat_commune" | null;
    audit: DairaAudit;
  }

  /** The kinds of record `search` returns. */
  export type SearchType = "wilaya" | "daira" | "commune";

  /** What a query and a name amount to, decided from their Search keys by
   *  `@geoalgeria/normalize`: equal Conservative keys, a prefix of the name at a
   *  word boundary, or either of those by the Loose keys only. */
  export type SearchMatch = "exact" | "prefix" | "loose";

  export interface SearchOptions {
    /** At most this many results. Default 10. */
    limit?: number;
    /** Only these kinds of record. Default all three. An unknown type throws a
     *  `TypeError`. */
    types?: SearchType[];
  }

  /** One `search` result. Results come ranked: `exact`, then `prefix`, then
   *  `loose`; a Wilaya before a Daira before a Commune of the same Match class;
   *  then in name order. */
  export interface SearchResult {
    type: SearchType;
    /** The Wilaya's `code`, the Daira's `id` or the Commune's `code_commune`. */
    code: number;
    /** The current name, even when a Former name made the match. */
    name_fr: string;
    /** `null` on a Daira, whose rows carry no Arabic name yet. */
    name_ar: string | null;
    /** The Wilaya the record is in; a Wilaya's own code for a Wilaya. */
    wilaya_code: number;
    match: SearchMatch;
    /** `"former"` when only a Former name from `nameHistory` made the match;
     *  absent when a current name did. */
    matched?: "former";
  }

  export interface CommuneEcommerce {
    id: number;
    commune_name_fr: string;
    commune_name_ar: string;
    daira_name_fr: string | null;
    wilaya_code: number;
    wilaya_name_fr: string;
    wilaya_name_ar: string;
    /** `null` on the same 1 commune as `Commune.postal_code`. */
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
    /** BaridiMap's own wilaya code, when the ATM's commune has since moved to
     *  one of the new wilayas and the published code is the current one. */
    source_wilaya_code?: string;
    /** Commune (ONS) code. Null unless the wilaya was reconciled or a reviewed
     *  correction filled it; BaridiMap itself resolves ATMs to a commune name. */
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
    /** Present when a versioned evidence review corrected this record
     *  (quality/overrides/poste.json). */
    review_status?: "corrected";
    reviewed_at?: string;
    reviewed_by?: string;
    review_evidence?: string[];
  }
}

declare const algeriaGeodata: {
  readonly wilayas: algeriaGeodata.Wilaya[];
  readonly communes: algeriaGeodata.Commune[];
  readonly dairas: algeriaGeodata.Daira[];
  readonly ecommerce: algeriaGeodata.CommuneEcommerce[];
  readonly all: algeriaGeodata.WilayaWithCommunes[];
  readonly nameHistory: algeriaGeodata.NameHistory;
  readonly phoneCodeProvenance: algeriaGeodata.PhoneCodeProvenance;
  readonly wilayaLineage: algeriaGeodata.WilayaLineage;
  readonly postOffices: algeriaGeodata.PostOffice[];
  readonly atms: algeriaGeodata.Atm[];
  getWilaya(code: number): algeriaGeodata.Wilaya | undefined;
  getCommunesByWilaya(wilayaCode: number): algeriaGeodata.Commune[];
  getDairasByWilaya(wilayaCode: number): algeriaGeodata.Daira[];
  findCommune(name: string): algeriaGeodata.Commune[];
  /** Ranked Wilayas, Dairas and Communes for a query, with Arabic harakat, alef
   *  and hamza variants and Latin accents folded. An empty query returns `[]`.
   *  Needs Node 20.19+ or 22.12+ (it loads the `@geoalgeria/normalize` ES module)
   *  or a bundler. */
  search(query: string, options?: algeriaGeodata.SearchOptions): algeriaGeodata.SearchResult[];
  findByPostalCode(postalCode: string): algeriaGeodata.Commune[];
  getPostOfficesByCommune(codeCommune: number | string): algeriaGeodata.PostOffice[];
};

export = algeriaGeodata;

// Type definitions for @geoalgeria/banques (schema v2).
// Licensed banks, financial institutions and their branches in Algeria —
// the Banque d'Algérie agréé roster, plus each institution's own branch
// locator where one is published.

export type InstitutionType = "bank" | "financial_institution";
export type Ownership = "public" | "private_foreign" | "private_domestic";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record carries no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** How a coordinate was obtained. Only branches ever carry a point — the
 *  registry entries (banks/institutions) are never geocoded. */
export type GeoMethod = "bank_locator" | null;

/** A licensed bank or financial institution — a registry entry (head office
 *  only, not a geocoded premises). */
export interface Institution {
  /** Stable lowercase id, equal to the lowercased acronym (e.g. "bna"). */
  id: string;
  /** Canonical display name — same value as `name_fr`. */
  name: string;
  /** Official French legal name. */
  name_fr: string;
  /** Official Arabic name, or null when the institution publishes none. */
  name_ar: string | null;
  /** Head-office wilaya code, zero-padded 2-digit string. Every institution
   *  in this registry is headquartered in Algiers ("16") today. */
  wilaya_code: string;
  /** Always null — the register states a head-office city, not a commune. */
  commune_code: null;
  /** Always null — see `commune_code`. */
  commune: null;
  /** Always null — registry entries are institutions, not geocoded premises. */
  lat: null;
  /** Always null — see `lat`. */
  lng: null;
  /** Always null: the record carries no point, so it asserts no precision. */
  geo_precision: null;
  /** Always null — no geocoding method produced a point. */
  geo_method: null;
  /** Provenance key into `metadata.sources[]` — always "boa" (Banque d'Algérie). */
  source: "boa";
  /** Common acronym (e.g. "BNA", "CPA"). */
  acronym: string;
  /** 3-digit Algerian RIB "code banque" (zero-padded, e.g. "001"); null for
   *  non-deposit institutions. */
  bank_code: string | null;
  type: InstitutionType;
  ownership: Ownership;
  /** Country of the controlling owner (e.g. "Algeria", "France", "Bahrain"). */
  ownership_country: string;
  /** Controlling parent/group (e.g. "Bank ABC (Arab Banking Corporation)",
   *  "État algérien"); null for consortium-owned entities with no single parent. */
  parent_company: string | null;
  /** Head-office SWIFT/BIC (11 chars), or null when not applicable. */
  swift_bic: string | null;
  website: string | null;
  hq_address: string | null;
  hq_city: string;
  year_established: number | null;
}

/** A bank (deposit-taking, agréé by the Banque d'Algérie). */
export type Bank = Institution & { type: "bank" };

/** A bank branch/agency location, from the bank's official locator. */
export interface Branch {
  /** Stable id, "{bank_id}-{n}" (e.g. "abc-1"). */
  id: string;
  /** Branch name (e.g. "Head Office"). */
  name: string;
  /** Wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Always null — bank locators publish no commune. */
  commune_code: null;
  /** Always null — see `commune_code`. */
  commune: null;
  /** Null when the source gave no usable (in-Algeria) coordinates. */
  lat: number | null;
  lng: number | null;
  /** "exact" when the locator published a point, null when it did not — an
   *  address-only branch carries null coordinates and asserts no precision. */
  geo_precision: GeoPrecision;
  /** "bank_locator" on a geocoded branch, null on an address-only one. */
  geo_method: GeoMethod;
  /** Provenance key into `metadata.sources[]` — always "bank_locator". */
  source: "bank_locator";
  /** Owning bank's id (links to Bank.id / Institution.id, e.g. "abc"). */
  bank_id: string;
  address: string | null;
  phone: string | null;
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

/** One data file described in `metadata.entities[]`. */
export interface EntityRef {
  file: string;
  count: number;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  package: "@geoalgeria/banques";
  schema_version: string;
  title_fr: string;
  title_ar: string;
  title_en: string;
  /** Banks + financial institutions + branches. */
  record_count: number;
  /** Branches with coordinates. */
  geocoded_count: number;
  geocoded_pct: number;
  precision: { exact: number; approximate: number };
  estimated_universe: number | null;
  coverage_pct: number | null;
  coverage_note: string;
  wilayas_covered: number;
  /** `[minLng, minLat, maxLng, maxLat]`. */
  bbox: [number, number, number, number] | null;
  /** Per-file record counts (banks.json, institutions.json, branches.json). */
  entities: EntityRef[];
  sources: SourceRef[];
  license: string;
  /** ISO date (YYYY-MM-DD) the dataset was regenerated. */
  updated: string;
  banks: number;
  institutions: number;
  branches: number;
  branches_geocoded: number;
  banks_with_branches: number;
}

/** All licensed banks. */
export function banks(): Bank[];
/** All non-bank financial institutions (leasing companies, etc.). */
export function institutions(): Institution[];
/** Banks and institutions combined (banks first). */
export function all(): Institution[];
/** All bank branch/agency locations. */
export function branches(): Branch[];
/** A single institution by id or acronym (case-insensitive), or null. */
export function byId(key: string): Institution | null;
/** Branches for one bank, by its id or acronym (case-insensitive). */
export function branchesByBank(bankId: string): Branch[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  banks: typeof banks;
  institutions: typeof institutions;
  all: typeof all;
  branches: typeof branches;
  byId: typeof byId;
  branchesByBank: typeof branchesByBank;
  metadata: typeof metadata;
};
export default _default;

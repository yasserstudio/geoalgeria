// Type definitions for @geoalgeria/banques (schema v2).
// Records follow the canonical GeoRecord contract from @geoalgeria/schema
// (zero-padded string wilaya_code, geo_precision/geo_method/source) plus the
// banking-specific fields below.

export type InstitutionType = "bank" | "financial_institution";
export type Ownership = "public" | "private_foreign" | "private_domestic";

/** Coordinate provenance, coarse-grained. Detail lives in `geo_method`.
 *  `null` when the record carries no coordinate at all. */
export type GeoPrecision = "exact" | "approximate" | null;

/** External identifiers keyed by source system. None are published for this
 *  sector today, so the field is absent from every record. */
export type Refs = Record<string, string>;

export interface Institution {
  /** Stable lowercase id, equal to the lowercased acronym (e.g. "bna"). */
  id: string;
  /** Canonical display name — same value as `name_fr`. */
  name: string;
  /** Common acronym (e.g. "BNA", "CPA"). */
  acronym: string;
  /** 3-digit Algerian RIB "code banque" (zero-padded, e.g. "001"); null for
   *  non-deposit institutions and where unverified. */
  bank_code: string | null;
  /** Official French legal name. */
  name_fr: string;
  /** Official Arabic name, or null when the institution publishes none. */
  name_ar: string | null;
  type: InstitutionType;
  ownership: Ownership;
  /** Country of the controlling owner (e.g. "Algeria", "France", "Bahrain"). */
  ownership_country: string;
  /** Controlling parent/group (e.g. "Société Générale", "État algérien"); null
   *  for consortium-owned entities with no single parent. */
  parent_company: string | null;
  /** Head-office SWIFT/BIC (11 chars), or null when not applicable/unverified. */
  swift_bic: string | null;
  website: string | null;
  hq_address: string | null;
  hq_city: string | null;
  /** Head-office wilaya code, zero-padded 2-digit string ("01".."69"). */
  wilaya_code: string;
  /** Commune (ONS) code — always null: the register states a head-office city, not a commune. */
  commune_code: string | null;
  /** Commune name — always null, see `commune_code`. */
  commune: string | null;
  /** Always null — registry entries are institutions, not geocoded premises. */
  lat: number | null;
  /** Always null — see `lat`. */
  lng: number | null;
  /** Always null: the record carries no point, only a head-office wilaya, so it
   *  asserts no coordinate precision. */
  geo_precision: null;
  /** Always null — no geocoding method produced a point. */
  geo_method: null;
  /** Provenance key into `metadata.sources[]` — always "boa" (Banque d'Algérie). */
  source: "boa";
  /** External identifiers. Absent for this dataset. */
  refs?: Refs;
  year_established: number | null;
}

/** A bank (deposit-taking, agréé by the Banque d'Algérie). */
export type Bank = Institution & { type: "bank" };

/** A bank branch/agency location, from the bank's official locator. */
export interface Branch {
  /** Stable id, "{bank_id}-{n}" (e.g. "cpa-87"). */
  id: string;
  /** Owning bank's id (links to Bank.id / Institution.id, e.g. "cpa"). */
  bank_id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  /** Wilaya code as a zero-padded string ("01".."69"), from coordinates
   *  (nearest commune) or the stated wilaya. */
  wilaya_code: string;
  /** Commune (ONS) code — always null: bank locators publish no commune. */
  commune_code: string | null;
  /** Commune name — always null, see `commune_code`. */
  commune: string | null;
  /** Null when the source gave no usable (in-Algeria) coordinates. */
  lat: number | null;
  lng: number | null;
  /** "exact" when the locator published a point, `null` when it did not (those
   *  records carry null coordinates and therefore assert no precision). */
  geo_precision: GeoPrecision;
  /** "bank_locator" on a geocoded branch, null on an address-only one. */
  geo_method: "bank_locator" | null;
  /** Provenance key into `metadata.sources[]` — always "bank_locator". */
  source: "bank_locator";
  /** External identifiers. Absent for this dataset. */
  refs?: Refs;
}

export interface Metadata {
  source: string;
  origin: string;
  license: string;
  banks: number;
  institutions: number;
  total: number;
  generated_at: string;
  /** Present once branch data ships. */
  branches?: number;
  branches_geocoded?: number;
  banks_with_branches?: number;
}

export function banks(): Bank[];
export function institutions(): Institution[];
export function all(): Institution[];
export function branches(): Branch[];
export function byId(key: string): Institution | null;
export function branchesByBank(bankId: string): Branch[];
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

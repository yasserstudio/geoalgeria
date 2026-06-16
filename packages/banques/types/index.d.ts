// Type definitions for @geoalgeria/banques

export type InstitutionType = "bank" | "financial_institution";
export type Ownership = "public" | "private_foreign" | "private_domestic";

export interface Institution {
  /** Stable lowercase id, equal to the lowercased acronym (e.g. "bna"). */
  id: string;
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
  /** Head-office wilaya code, linked to the geoalgeria 69-wilaya model. */
  wilaya_code: number;
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
  /** Wilaya code (1–69), from coordinates (nearest commune) or the stated wilaya. */
  wilaya_code: number;
  /** Null when the source gave no usable (in-Algeria) coordinates. */
  lat: number | null;
  lng: number | null;
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

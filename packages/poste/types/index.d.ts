// Type definitions for @geoalgeria/poste
// Data sourced from Algérie Poste (baridimap.poste.dz).

/** A post office (bureau de poste). */
export interface PostOffice {
  /** Numeric office id. */
  id: number;
  /** Office name (French / transliterated). */
  name: string;
  /** Office name in Arabic. */
  name_ar: string;
  /** Office class/category (e.g. "RP"). */
  class: string;
  /** 5-digit postal code. */
  postal_code: string;
  /** Previous postal code, if the office was renumbered. */
  postal_code_old: string | null;
  /** Street address. */
  address: string;
  /** 4-digit zero-padded commune code; links to geoalgeria communes. */
  commune_code: string;
  /** Commune name in French. */
  commune_fr: string;
  /** Commune name in Arabic. */
  commune_ar: string;
  /** Wilaya code as a string ("1".."58"). */
  wilaya_code: string;
  /** Wilaya name in French. */
  wilaya_fr: string;
  /** Wilaya name in Arabic. */
  wilaya_ar: string;
  /** Latitude, or null when the office is not geocoded. */
  lat: number | null;
  /** Longitude, or null when the office is not geocoded. */
  lng: number | null;
}

/** An ATM (distributeur automatique). */
export interface Atm {
  /** ATM id. */
  id: string;
  /** ATM name/label. */
  name: string;
  /** Operational status. */
  status: string;
  /** 5-digit postal code of the hosting office. */
  postal_code: string;
  /** Previous postal code, if renumbered. */
  postal_code_old: string | null;
  /** Street address. Currently null for every ATM (the source omits it); typed
   *  as `string | null` so a future populated value is not a breaking change. */
  address: string | null;
  /** Commune name in French. */
  commune_fr: string;
  /** Commune name in Arabic. */
  commune_ar: string;
  /** Wilaya code as a string ("1".."58"). */
  wilaya_code: string;
  /** Wilaya name in French. */
  wilaya_fr: string;
  /** Wilaya name in Arabic. */
  wilaya_ar: string;
  /** Latitude, or null when not geocoded. */
  lat: number | null;
  /** Longitude, or null when not geocoded. */
  lng: number | null;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  api: string;
  license: string;
  postoffices: number;
  atms: number;
  distinct_postal_codes: number;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
}

/** All post offices. */
export function postOffices(): PostOffice[];
/** All ATMs. */
export function atms(): Atm[];
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  postOffices: typeof postOffices;
  atms: typeof atms;
  metadata: typeof metadata;
};
export default _default;

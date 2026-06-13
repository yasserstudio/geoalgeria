// Type definitions for @geoalgeria/mobilis
// Data sourced from Mobilis (ATM Mobilis, mobilis.dz).

/** A geocoded Mobilis commercial agency. */
export interface Agence {
  /** Agency id. */
  id: string;
  /** Mobilis internal code. */
  code: string;
  /** Record type discriminator (e.g. "agence"). */
  type: string;
  /** Agency name in French. */
  name: string;
  /** Agency name in Arabic. */
  name_ar: string;
  /** Street address in French. */
  address: string;
  /** Street address in Arabic. */
  address_ar: string;
  /** Wilaya code as a string ("1".."58"). */
  wilaya_code: string;
  /** Latitude (agencies are fully geocoded). */
  lat: number;
  /** Longitude (agencies are fully geocoded). */
  lng: number;
}

/** An approved point of sale (commune-level directory entry). */
export interface Pdv {
  /** Point-of-sale id. */
  id: string;
  /** Mobilis internal code. */
  code: string;
  /** Record type discriminator (e.g. "pdv"). */
  type: string;
  /** Point-of-sale name. */
  name: string;
  /** Street address. */
  address: string;
  /** Commune name. */
  commune: string;
  /** Wilaya code as a string ("1".."58"). */
  wilaya_code: string;
  /** Points of sale are not geocoded — always null. */
  lat: number | null;
  /** Points of sale are not geocoded — always null. */
  lng: number | null;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  agences: number;
  pdv: number;
  total: number;
  wilayas_covered: number;
  agences_geocoded: number;
  pdv_geocoded: number;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
}

/** All Mobilis agencies. */
export function agences(): Agence[];
/** All approved points of sale. */
export function pdv(): Pdv[];
/** Agencies and points of sale combined (agencies first). */
export function all(): Array<Agence | Pdv>;
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  agences: typeof agences;
  pdv: typeof pdv;
  all: typeof all;
  metadata: typeof metadata;
};
export default _default;

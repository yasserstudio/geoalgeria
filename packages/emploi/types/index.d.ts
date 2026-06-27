// Type definitions for @geoalgeria/emploi
// Data sourced from ANEM (National Employment Agency, anem.dz).

/** A wilaya-level employment agency (AWEM). */
export interface Awem {
  /** Agency id. */
  id: string;
  /** Internal ANEM code, if assigned. */
  code: string | null;
  /** Record type discriminator (e.g. "awem"). */
  type: string;
  /** Agency name. */
  name: string;
  /** Street address. */
  address: string;
  /** Phone number. */
  phone: string;
  /** Fax number. */
  fax: string;
  /** Contact email. */
  email: string;
  /** Agency manager/director. */
  manager: string;
  /** Wilaya code as a string ("1".."58"). */
  wilaya_code: string;
  /** Latitude (AWEM agencies are fully geocoded). */
  lat: number;
  /** Longitude (AWEM agencies are fully geocoded). */
  lng: number;
}

/** A local employment agency (ALEM). */
export interface Alem {
  /** Agency id. */
  id: string;
  /** Internal ANEM code, if assigned. */
  code: string | null;
  /** Record type discriminator (e.g. "alem"). */
  type: string;
  /** Agency name. */
  name: string;
  /** Street address. */
  address: string;
  /** Phone number. */
  phone: string;
  /** Fax number, if any. */
  fax: string | null;
  /** Contact email, if any. */
  email: string | null;
  /** Agency manager/director. */
  manager: string;
  /** Comma-separated list of communes served. */
  communes: string;
  /** Wilaya code as a string ("1".."58"). */
  wilaya_code: string;
  /** Latitude, or null when not geocoded. */
  lat: number | null;
  /** Longitude. */
  lng: number;
}

/** Dataset metadata (data/metadata.json). */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  awem: number;
  alem: number;
  total: number;
  wilayas_covered: number;
  /** ISO date (YYYY-MM-DD) the snapshot was generated. */
  generated_at: string;
}

/** All wilaya-level agencies (AWEM). */
export function awem(): Awem[];
/** All local agencies (ALEM). */
export function alem(): Alem[];
/** AWEM and ALEM combined (AWEM first). */
export function agencies(): Array<Awem | Alem>;
/** Dataset metadata. */
export function metadata(): Metadata;

declare const _default: {
  awem: typeof awem;
  alem: typeof alem;
  agencies: typeof agencies;
  metadata: typeof metadata;
};
export default _default;

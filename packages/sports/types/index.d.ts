export type TypeCode =
  | "TSP" | "AJF" | "SOMS" | "SS" | "BN" | "P25" | "PP"
  | "TF" | "SF" | "STOMS" | "PA" | "BL" | "CT" | "UHR"
  | "P50" | "SA" | "CE" | "BNA" | "CXS" | "CDT" | "AJL"
  | "CRP" | "EJT" | "TR" | "EPS" | "GS" | "CFR";

export interface Facility {
  id: number;
  name: string | null;
  type_code: TypeCode | null;
  type_fr: string | null;
  address: string | null;
  commune: string | null;
  daira: string | null;
  wilaya_code: string | null;
  wilaya_name: string | null;
  capacity: number | null;
  year: number | null;
  operational: boolean | null;
  pmr: boolean | null;
  surface_built_m2: number | null;
  surface_land_m2: number | null;
  lat: number;
  lng: number;
  source: string;
}

export interface Metadata {
  source: string;
  origin: string;
  license: string;
  facilities: number;
  by_type: Partial<Record<TypeCode, number>>;
  wilayas_covered: number;
  dropped: number;
  generated_at: string;
}

export function facilities(): Facility[];
export function facilityById(id: number | string): Facility | null;
export function facilitiesByWilaya(code: string | number): Facility[];
export function facilitiesByType(code: string): Facility[];
export function metadata(): Metadata;

declare const _default: {
  facilities: typeof facilities;
  facilityById: typeof facilityById;
  facilitiesByWilaya: typeof facilitiesByWilaya;
  facilitiesByType: typeof facilitiesByType;
  metadata: typeof metadata;
};
export default _default;

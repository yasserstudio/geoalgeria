/** A civil airport, as published by ANAC. */
export interface Airport {
  /** Stable id — the ICAO code, lowercased (e.g. `"daag"`). */
  id: string;
  /** Official airport name in French (e.g. `"Aéroport d'Alger – Houari Boumediene"`). */
  name: string;
  /** ICAO (OACI) code — always matches `/^DA[A-Z]{2}$/` (e.g. `"DAAG"`). */
  icao: string;
  /** IATA code — not published by ANAC; always `null` (reserved for later enrichment). */
  iata: string | null;
  /** Postal address as listed by ANAC, or `null` if none is given. */
  address: string | null;
  /** Contact phone, or `null` if none is given. */
  phone: string | null;
  /** Official website URL, or `null` if none is given. */
  website: string | null;
  /** Wilaya code, zero-padded to 2 digits (`"01"`–`"69"`). Joins `geoalgeria` wilayas. */
  wilaya_code: string;
  /** Latitude (WGS84). */
  lat: number;
  /** Longitude (WGS84). */
  lng: number;
  /** ANAC source page the record was derived from. */
  source: string;
}

/** Dataset provenance and counts. */
export interface Metadata {
  source: string;
  origin: string;
  license: string;
  airports: number;
  wilayas_covered: number;
  generated_at: string;
}

/** All civil airports (33). */
export function airports(): Airport[];
/** One airport by ICAO code (case-insensitive), or `null` if none matches. */
export function airportByIcao(code: string): Airport | null;
/** Airports in a wilaya — accepts `"16"`, `16`, or `"01"`. */
export function airportsByWilaya(code: string | number): Airport[];
/** Dataset metadata (counts, source, generated_at). */
export function metadata(): Metadata;

declare const _default: {
  airports: typeof airports;
  airportByIcao: typeof airportByIcao;
  airportsByWilaya: typeof airportsByWilaya;
  metadata: typeof metadata;
};
export default _default;

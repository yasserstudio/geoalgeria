// @geoalgeria/aviation: lightweight loaders for Algeria's civil airports
// (ANAC, plus the three ANAC's map omits and every IATA code, from OurAirports).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const airports = () => load("airports.json"); // 36 civil airports
export const airportByIcao = (code) =>
  airports().find((a) => a.icao === String(code).toUpperCase()) ?? null;
// The other natural key. Flight feeds, booking systems and timetables speak IATA,
// not ICAO, so this is the lookup most callers coming from schedule data want.
// `iata` is typed nullable, but no extra null guard is needed: String(code) is
// always a non-empty string, so a null code cannot match a null value.
export const airportByIata = (code) =>
  airports().find((a) => a.iata === String(code).toUpperCase()) ?? null;
export const airportsByWilaya = (code) => {
  const w = String(code).padStart(2, "0"); // accepts "16", 16, or "01"
  return airports().filter((a) => a.wilaya_code === w);
};
export const metadata = () => load("metadata.json");

// --- routes -----------------------------------------------------------------
// A route is a link between two airports, not a place, so these are separate
// from airports() rather than mixed into it. Every route is DIRECTIONAL: the
// Algiers-Budapest triangle flies each way on a different day of the week, so
// ALG->BUD and BUD->ALG are two records and neither implies the other.
const allRoutes = () => load("routes.json");

/** Nonstop routes that are flying, seasonal, suspended or of unclear cadence.
 *  Excludes announced-but-not-yet-operating ones: see plannedRoutes(). */
export const routes = () => allRoutes().filter((r) => !r.planned);

/** Announced but not yet operating. A separate collection on purpose, so an
 *  announcement can never be counted as a destination the airline serves. */
export const plannedRoutes = () => allRoutes().filter((r) => r.planned);

/** Both ends of every route, including the foreign airports that airports()
 *  does not carry (it is Algeria only). Needed to draw a route on a map. */
export const routeEndpoints = () => load("route-endpoints.json");

/** Routes departing an airport, by IATA code (case-insensitive). Directional:
 *  this returns departures, not everything touching the airport. */
export const routesFrom = (code) => {
  const c = String(code).toUpperCase();
  return routes().filter((r) => r.from === c);
};

export default {
  airports, airportByIcao, airportByIata, airportsByWilaya, metadata,
  routes, plannedRoutes, routeEndpoints, routesFrom,
};

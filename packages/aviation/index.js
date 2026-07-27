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
export const airportsByWilaya = (code) => {
  const w = String(code).padStart(2, "0"); // accepts "16", 16, or "01"
  return airports().filter((a) => a.wilaya_code === w);
};
export const metadata = () => load("metadata.json");

export default { airports, airportByIcao, airportsByWilaya, metadata };

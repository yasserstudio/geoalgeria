// @geoalgeria/gares-routieres — loaders for Algeria's intercity bus stations (SOGRAL).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const stations = () => load("stations.json"); // 74 gares routières (SOGRAL)
export const stationById = (id) =>
  stations().find((s) => s.id === id) ?? null;
export const stationsByWilaya = (code) => {
  const w = String(code).padStart(2, "0"); // accepts "16", 16, or "01"
  return stations().filter((s) => s.wilaya_code === w);
};
export const metadata = () => load("metadata.json");

export default { stations, stationById, stationsByWilaya, metadata };

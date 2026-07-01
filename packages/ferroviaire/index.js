// @geoalgeria/ferroviaire — loaders for Algeria's rail & urban-transit network.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const stations = () => load("stations.json"); // 744 rail/tram/metro/… nodes
export const stationsByType = (type) =>
  stations().filter((s) => s.type === String(type).toLowerCase());
export const stationsByWilaya = (code) => {
  const w = String(code).padStart(2, "0"); // accepts "16", 16, or "01"
  return stations().filter((s) => s.wilaya_code === w);
};
export const metadata = () => load("metadata.json");

export default { stations, stationsByType, stationsByWilaya, metadata };

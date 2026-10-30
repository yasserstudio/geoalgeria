// @geoalgeria/gares-routieres: loaders for Algeria's intercity bus stations (SOGRAL).
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const stations = () => load("stations.json"); // 74 gares routières (SOGRAL)
export const stationById = (id) =>
  stations().find((s) => s.id === id) ?? null;
export const stationsByWilaya = (code) => {
  const w = String(code).padStart(2, "0"); // accepts "16", 16, or "01"
  return stations().filter((s) => s.wilaya_code === w);
};
export const metadata = () => load("metadata.json");

export default { stations, stationById, stationsByWilaya, metadata };

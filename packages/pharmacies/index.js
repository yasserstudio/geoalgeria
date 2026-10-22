// @geoalgeria/pharmacies: lightweight loaders for Algeria's pharmacies (OpenStreetMap).
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const pharmacies = () => load("pharmacies.json"); // geocoded pharmacies (OSM), wilaya/commune-linked
export const pharmacyById = (id) =>
  pharmacies().find((r) => r.id === String(id)) ?? null;
export const pharmaciesByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return pharmacies().filter((r) => r.wilaya_code === w);
};
export const metadata = () => load("metadata.json");

export default { pharmacies, pharmacyById, pharmaciesByWilaya, metadata };

// @geoalgeria/ooredoo: lightweight loaders for the Ooredoo Algérie retail network.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const stores = () => load("stores.json"); // geocoded Ooredoo stores (EO/CSO/ESO)
export const storeById = (id) => stores().find((r) => r.id === String(id)) ?? null;
export const storesByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return stores().filter((r) => r.wilaya_code === w);
};
/** Filter by store type: "EO" (Espace Ooredoo), "CSO" (City Shop), "ESO" (Espace Services). */
export const storesByType = (type) => {
  const t = String(type).toUpperCase();
  return stores().filter((r) => r.type === t);
};
export const metadata = () => load("metadata.json");

export default { stores, storeById, storesByWilaya, storesByType, metadata };

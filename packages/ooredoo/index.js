// @geoalgeria/ooredoo — lightweight loaders for the Ooredoo Algérie retail network.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

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

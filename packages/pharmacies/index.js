// @geoalgeria/pharmacies — lightweight loaders for Algeria's pharmacies (OpenStreetMap).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const pharmacies = () => load("pharmacies.json"); // geocoded pharmacies (OSM), wilaya/commune-linked
export const pharmacyById = (id) =>
  pharmacies().find((r) => r.id === String(id)) ?? null;
export const pharmaciesByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return pharmacies().filter((r) => r.wilaya_code === w);
};
export const metadata = () => load("metadata.json");

export default { pharmacies, pharmacyById, pharmaciesByWilaya, metadata };

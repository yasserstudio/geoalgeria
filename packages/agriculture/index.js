// @geoalgeria/agriculture — lightweight loaders for Algeria's agriculture-sector institutions.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const agriculture = () => load("agriculture.json"); // MADR institutional directory, geocoded
export const institutionById = (id) =>
  agriculture().find((r) => r.id === String(id)) ?? null;
export const institutionsByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return agriculture().filter((r) => r.wilaya_code === w);
};
export const institutionsByType = (type) => {
  const t = String(type).toLowerCase();
  return agriculture().filter((r) => r.type === t);
};
export const metadata = () => load("metadata.json");

export default { agriculture, institutionById, institutionsByWilaya, institutionsByType, metadata };

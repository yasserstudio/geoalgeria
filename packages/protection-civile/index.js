// @geoalgeria/protection-civile — lightweight loaders for Algeria's Protection
// Civile (civil protection / fire & rescue) units (DGPC).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const units = () => load("protection-civile.json"); // DGPC civil-protection units, geocoded
export const unitById = (id) =>
  units().find((r) => r.id === String(id)) ?? null;
export const unitsByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return units().filter((r) => r.wilaya_code === w);
};
export const unitsByStatut = (statut) => units().filter((r) => r.statut === statut);
export const metadata = () => load("metadata.json");

export default { units, unitById, unitsByWilaya, unitsByStatut, metadata };

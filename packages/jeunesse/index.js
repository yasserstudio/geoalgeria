// @geoalgeria/jeunesse — lightweight loaders for Algeria's youth establishments
// (Ministry of Youth and Sports — SIG).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const institutions = () => load("institutions.json"); // ~2,334 youth establishments
export const institutionById = (id) =>
  institutions().find((r) => r.id === String(id) || Number(r.id) === Number(id)) ?? null;
export const institutionsByWilaya = (code) => {
  const w = String(code).padStart(2, "0"); // accepts "16", 16, or "01"
  return institutions().filter((r) => r.wilaya_code === w);
};
export const institutionsByType = (code) => {
  const t = String(code).toUpperCase(); // accepts "MJ" or "mj"
  return institutions().filter((r) => r.type === t);
};
export const metadata = () => load("metadata.json");

export default { institutions, institutionById, institutionsByWilaya, institutionsByType, metadata };

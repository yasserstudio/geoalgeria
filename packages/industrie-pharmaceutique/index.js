// @geoalgeria/industrie-pharmaceutique — loaders for Algeria's approved pharmaceutical manufacturers.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const manufacturers = () => load("industrie-pharmaceutique.json"); // MIP fabrication register, geocoded
export const manufacturerById = (id) =>
  manufacturers().find((r) => r.id === String(id)) ?? null;
export const manufacturersByWilaya = (code) => {
  const w = Number(code);
  return manufacturers().filter((r) => r.wilaya_code === w);
};
/** Filter by nature: "pp" (medicines), "dm" (medical devices), or "mixte" (both). */
export const manufacturersByNature = (nature) => {
  const n = String(nature).toLowerCase();
  return manufacturers().filter((r) => r.nature === n);
};
export const metadata = () => load("metadata.json");

export default {
  manufacturers,
  manufacturerById,
  manufacturersByWilaya,
  manufacturersByNature,
  metadata,
};

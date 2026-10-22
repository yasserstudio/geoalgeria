// @geoalgeria/industrie-pharmaceutique: loaders for Algeria's approved pharmaceutical manufacturers.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const manufacturers = () => load("industrie-pharmaceutique.json"); // MIP fabrication register, geocoded
export const manufacturerById = (id) =>
  manufacturers().find((r) => r.id === String(id)) ?? null;
export const manufacturersByWilaya = (code) => {
  const w = String(code).padStart(2, "0"); // accepts "16", 16, or 1 / "01"
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

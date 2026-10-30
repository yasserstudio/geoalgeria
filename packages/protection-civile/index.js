// @geoalgeria/protection-civile: lightweight loaders for Algeria's Protection
// Civile (civil protection / fire & rescue) units (DGPC).
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

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

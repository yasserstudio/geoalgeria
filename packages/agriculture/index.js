// @geoalgeria/agriculture: lightweight loaders for Algeria's agriculture-sector institutions.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

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

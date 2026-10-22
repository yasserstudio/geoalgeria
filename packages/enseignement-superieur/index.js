// @geoalgeria/enseignement-superieur: lightweight loaders for Algeria's
// higher-education network (Ministry of Higher Education, MESRS).
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const institutions = () => load("institutions.json"); // every higher-ed institution
export const institutionById = (id) =>
  institutions().find((r) => r.id === String(id) || Number(r.id) === Number(id)) ?? null;
export const institutionsByWilaya = (code) => {
  const w = String(code).padStart(2, "0"); // accepts "16", 16, or "01"
  return institutions().filter((r) => r.wilaya_code === w);
};
export const institutionsByType = (type) => {
  const t = String(type).toLowerCase(); // "universite" | "grande_ecole" | "ens" | "centre_universitaire"
  return institutions().filter((r) => r.type === t);
};
export const institutionsBySector = (sector) => {
  const s = String(sector).toLowerCase(); // "public" | "private"
  return institutions().filter((r) => r.sector === s);
};
export const metadata = () => load("metadata.json");

export default { institutions, institutionById, institutionsByWilaya, institutionsByType, institutionsBySector, metadata };

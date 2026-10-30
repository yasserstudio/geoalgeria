// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const establishments = () => load("establishments.json");
export const establishmentById = (id) =>
  establishments().find((r) => r.id === String(id) || Number(r.id) === Number(id)) ?? null;
export const establishmentsByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return establishments().filter((r) => r.wilaya_code === w);
};
export const establishmentsByType = (type) => {
  const t = String(type).toLowerCase();
  return establishments().filter((r) => r.type === t);
};
export const metadata = () => load("metadata.json");

export default { establishments, establishmentById, establishmentsByWilaya, establishmentsByType, metadata };

// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const facilities = () => load("facilities.json");
export const facilityById = (id) =>
  facilities().find((r) => r.id === String(id) || Number(r.id) === Number(id)) ?? null;
export const facilitiesByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return facilities().filter((r) => r.wilaya_code === w);
};
export const facilitiesByType = (code) => {
  const t = String(code).toUpperCase();
  return facilities().filter((r) => r.type === t);
};
export const metadata = () => load("metadata.json");

export default { facilities, facilityById, facilitiesByWilaya, facilitiesByType, metadata };

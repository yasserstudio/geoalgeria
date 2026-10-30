// @geoalgeria/cliniques: lightweight loaders for Algeria's clinics and
// proximity-care facilities (OpenStreetMap).
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const cliniques = () => load("cliniques.json"); // geocoded clinics & proximity-care facilities (OSM), classified by type
export const cliniqueById = (id) => cliniques().find((r) => r.id === String(id)) ?? null;
export const cliniquesByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return cliniques().filter((r) => r.wilaya_code === w);
};
export const cliniquesByType = (type) => cliniques().filter((r) => r.type === type);
export const metadata = () => load("metadata.json");

export default { cliniques, cliniqueById, cliniquesByWilaya, cliniquesByType, metadata };

// @geoalgeria/cliniques: lightweight loaders for Algeria's clinics and
// proximity-care facilities (OpenStreetMap).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const cliniques = () => load("cliniques.json"); // geocoded clinics & proximity-care facilities (OSM), classified by type
export const cliniqueById = (id) => cliniques().find((r) => r.id === String(id)) ?? null;
export const cliniquesByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return cliniques().filter((r) => r.wilaya_code === w);
};
export const cliniquesByType = (type) => cliniques().filter((r) => r.type === type);
export const metadata = () => load("metadata.json");

export default { cliniques, cliniqueById, cliniquesByWilaya, cliniquesByType, metadata };

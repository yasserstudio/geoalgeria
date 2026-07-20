import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const facilities = () => load("facilities.json");
export const facilityById = (id) =>
  facilities().find((r) => r.id === String(id) || Number(r.id) === Number(id)) ?? null;
export const facilitiesByWilaya = (code) => {
  const w = String(code).padStart(2, "0");
  return facilities().filter((r) => r.wilaya_code === w);
};
export const facilitiesByType = (code) => {
  const t = String(code).toUpperCase();
  return facilities().filter((r) => r.type_code === t);
};
export const metadata = () => load("metadata.json");

export default { facilities, facilityById, facilitiesByWilaya, facilitiesByType, metadata };

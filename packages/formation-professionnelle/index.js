import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const establishments = () => load("establishments.json");
export const establishmentById = (id) =>
  establishments().find((r) => r.id === Number(id)) ?? null;
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

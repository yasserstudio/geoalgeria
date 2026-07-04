// @geoalgeria/ecoles — lightweight loaders for Algeria's schools (OpenStreetMap).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const ecoles = () => load("ecoles.json"); // 11k+ geocoded schools & kindergartens (OSM), classified by cycle
export const metadata = () => load("metadata.json");

export default { ecoles, metadata };

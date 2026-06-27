// @geoalgeria/sante — lightweight loaders for Algeria's public health establishments.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const sante = () => load("sante.json"); // public health establishments (MSP registry, geocoded)
export const metadata = () => load("metadata.json");

export default { sante, metadata };

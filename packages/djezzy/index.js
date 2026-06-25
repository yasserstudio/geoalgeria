// @geoalgeria/djezzy — lightweight loaders for the Djezzy retail-network data.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const boutiques = () => load("boutiques.json"); // 128 geocoded Djezzy boutiques
export const metadata = () => load("metadata.json");

export default { boutiques, metadata };

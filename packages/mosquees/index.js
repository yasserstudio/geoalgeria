// @geoalgeria/mosquees — lightweight loaders for the Algeria mosque composite.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const mosquees = () => load("mosquees.json"); // 20k+ geocoded mosques (Wikidata + OSM)
export const metadata = () => load("metadata.json");

export default { mosquees, metadata };

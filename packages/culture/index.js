// @geoalgeria/culture — lightweight loaders for Algeria's cultural atlas.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const culture = () => load("culture.json"); // cultural places (Patrimoine Culturel atlas, geocoded)
export const metadata = () => load("metadata.json");

export default { culture, metadata };

// @geoalgeria/poste — lightweight loaders for the post-office & ATM datasets.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const postOffices = () => load("postoffices.json");
export const atms = () => load("atms.json");
export const metadata = () => load("metadata.json");

export default { postOffices, atms, metadata };

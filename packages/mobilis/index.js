// @geoalgeria/mobilis — lightweight loaders for the Mobilis sales-network data.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const agences = () => load("agences.json"); // 165 geocoded Mobilis agencies
export const pdv = () => load("pdv.json"); //          12,180 approved points of sale
export const all = () => [...agences(), ...pdv()]; //  everything, agencies first
export const metadata = () => load("metadata.json");

export default { agences, pdv, all, metadata };

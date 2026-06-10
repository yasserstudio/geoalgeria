// @geoalgeria/emploi — lightweight loaders for the ANEM employment-agency data.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

export const awem = () => load("awem.json"); // 58 wilaya-level agencies
export const alem = () => load("alem.json"); // 273 local agencies
export const agencies = () => [...awem(), ...alem()]; // all 331, AWEM first
export const metadata = () => load("metadata.json");

export default { awem, alem, agencies, metadata };

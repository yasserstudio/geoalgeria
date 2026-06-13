// @geoalgeria/telecom — loaders for Algeria mobile-network coverage datasets.
// Coverage is namespaced by technology (coverage/<tech>/sites.json) so adding a
// future technology (e.g. 4G) is additive and needs no API change.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "data");
const load = (p) => JSON.parse(readFileSync(join(DATA, p), "utf-8"));

// All coverage sites for a technology (default "5G"), all operators.
export const coverage = (technology = "5G") =>
  load(`coverage/${String(technology).toLowerCase()}/sites.json`);

// Coverage sites for a single operator.
export const coverageByOperator = (operator, technology = "5G") =>
  coverage(technology).filter((s) => s.operator === operator);

// Technologies present in this release (e.g. ["5G"]).
export const technologies = () => metadata().technologies;

export const metadata = () => load("metadata.json");

export default { coverage, coverageByOperator, technologies, metadata };

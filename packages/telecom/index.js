// @geoalgeria/telecom: loaders for Algeria mobile-network coverage datasets.
// Coverage files are named data/<tech>-<operator>.json (5g-djezzy.json, ...) so
// adding a future technology (e.g. 4G) is additive and needs no API change.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

const OPERATORS = ["djezzy", "mobilis", "ooredoo"];
const file = (technology, operator) => `${String(technology).toLowerCase()}-${operator}.json`;

// All coverage sites for a technology (default "5G"), all operators. Ids are
// operator-prefixed, so the concatenation is collision-free.
export const coverage = (technology = "5G") =>
  OPERATORS.flatMap((op) => load(file(technology, op)));

// Coverage sites for a single operator. An unknown operator returns [] (the
// v1 filter-over-union behavior), not an fs error from a fabricated path.
export const coverageByOperator = (operator, technology = "5G") =>
  OPERATORS.includes(operator) ? load(file(technology, operator)) : [];

// Technologies present in this release (e.g. ["5G"]).
export const technologies = () => metadata().technologies;

export const metadata = () => load("metadata.json");

export default { coverage, coverageByOperator, technologies, metadata };

// @geoalgeria/emploi: lightweight loaders for the ANEM employment-agency data.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const awem = () => load("awem.json"); // 58 wilaya-level agencies
export const alem = () => load("alem.json"); // 273 local agencies
export const agencies = () => [...awem(), ...alem()]; // all 331, AWEM first
export const metadata = () => load("metadata.json");

export default { awem, alem, agencies, metadata };

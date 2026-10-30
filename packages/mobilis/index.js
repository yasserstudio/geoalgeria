// @geoalgeria/mobilis: lightweight loaders for the Mobilis sales-network data.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const agences = () => load("agences.json"); // 165 geocoded Mobilis agencies
export const pdv = () => load("pdv.json"); //          12,180 approved points of sale
export const all = () => [...agences(), ...pdv()]; //  everything, agencies first
export const metadata = () => load("metadata.json");

export default { agences, pdv, all, metadata };

// @geoalgeria/poste: lightweight loaders for the post-office & ATM datasets.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const postOffices = () => load("postoffices.json");
export const atms = () => load("atms.json");
export const metadata = () => load("metadata.json");

export default { postOffices, atms, metadata };

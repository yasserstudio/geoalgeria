// @geoalgeria/djezzy: lightweight loaders for the Djezzy retail-network data.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const boutiques = () => load("boutiques.json"); // 128 geocoded Djezzy boutiques
export const metadata = () => load("metadata.json");

export default { boutiques, metadata };

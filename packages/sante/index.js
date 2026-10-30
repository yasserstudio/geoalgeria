// @geoalgeria/sante: lightweight loaders for Algeria's public health establishments.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const sante = () => load("sante.json"); // public health establishments (MSP registry, geocoded)
export const metadata = () => load("metadata.json");

export default { sante, metadata };

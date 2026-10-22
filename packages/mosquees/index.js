// @geoalgeria/mosquees: lightweight loaders for the Algeria mosque composite.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const mosquees = () => load("mosquees.json"); // 20k+ geocoded mosques (Wikidata + OSM)
export const metadata = () => load("metadata.json");

export default { mosquees, metadata };

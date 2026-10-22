// @geoalgeria/culture: lightweight loaders for Algeria's cultural atlas.
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const culture = () => load("culture.json"); // cultural places (Patrimoine Culturel atlas, geocoded)
export const metadata = () => load("metadata.json");

export default { culture, metadata };

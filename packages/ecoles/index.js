// @geoalgeria/ecoles: lightweight loaders for Algeria's schools (OpenStreetMap).
// `load` reaches each data file by a literal path a bundler can follow; a path
// built at runtime builds fine and then throws ENOENT (loaders.cjs, #290).
import load from "./loaders.cjs";

export const ecoles = () => load("ecoles.json"); // 11k+ geocoded schools & kindergartens (OSM), classified by cycle
export const metadata = () => load("metadata.json");

export default { ecoles, metadata };

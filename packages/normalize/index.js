// @geoalgeria/normalize: search-key generation for Algerian place names.
//
// One small, pure package that everything indexing or querying GeoAlgeria names
// imports: the Web product, the Content release generator and Mobile all run this
// code, so identical keys are structural rather than something a test has to
// police. It carries no data about places, and ranking lives elsewhere.

export { conservativeKey } from "./src/conservative.js";

/**
 * The package's semver major, as a number. Any change to what a key function
 * returns for any input is a major version, because keys are baked into published
 * catalogs and installed catalogs are never migrated record by record. The Content
 * manifest records this number for the release it was built with.
 *
 * @type {number}
 */
export const NORMALIZE_VERSION = 1;

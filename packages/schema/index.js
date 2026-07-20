// @geoalgeria/schema — the canonical data contract for GeoAlgeria datasets.
// Types (types/index.d.ts) + a zero-dependency runtime validator + canonical
// metadata / manifest / DCAT builders + CSV/GeoJSON emit helpers.

export {
  SCHEMA_VERSION,
  GEO_PRECISION,
  LIFECYCLE,
  EVIDENCE_TYPE,
  WILAYA_CODES,
  DZ_BBOX,
  MIN_EXACT_DECIMALS,
} from "./src/constants.js";
export { round6, wcode, toCSV, toGeoJSON, haversine, bbox } from "./src/emit.js";
export {
  pointInGeometry,
  pointInWilaya,
  loadBoundaries,
  fractionDigits,
  coordDecimals,
  sharedPoints,
} from "./src/geo.js";
export { validateRecords, validateMetadata } from "./src/validate.js";
export { buildMetadata, buildManifest, buildDcat, evidenceForSourceKey } from "./src/build.js";

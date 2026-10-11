// @geoalgeria/schema: the canonical data contract for GeoAlgeria datasets.
// Types (types/index.d.ts) + a zero-dependency runtime validator + canonical
// metadata / manifest / DCAT builders + CSV/GeoJSON emit helpers + the Source
// rights registry and the one question it answers, `isSourceClearedFor`.

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
  wilayaNeighbours,
  fractionDigits,
  coordDecimals,
  sharedPoints,
} from "./src/geo.js";
export { validateRecords, validateMetadata } from "./src/validate.js";
export { buildMetadata, buildManifest, buildDcat, evidenceForSourceKey } from "./src/build.js";
export {
  REVIEW_STATUSES,
  REVIEW_PUBLISH_ACTIONS,
  validateReviewLedger,
  applyReviewedOverrides,
} from "./src/review.js";
export {
  ACCESS_CLASSES,
  RIGHTS_CLASSES,
  RIGHTS_BASES,
  PUBLICATION_TARGETS,
  NEVER_CLEARED_RIGHTS_CLASSES,
  rightsRegistry,
  rightsRecordFor,
  isSourceClearedFor,
  sourcesClearedFor,
} from "./src/rights.js";

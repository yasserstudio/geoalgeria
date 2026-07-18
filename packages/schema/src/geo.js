// Point-in-wilaya test for the geo-in-boundary validation.
// The schema package ships NO polygons — boundaries are injected by the caller
// (validate-packages.mjs loads whatever wilaya-polygon FeatureCollection exists).
// So a dataset can be checked "does every point fall inside its declared wilaya?"
// without this package taking on ~MBs of geometry or a hard dep on the boundaries.

/** Ray-casting: is (lng,lat) inside a single linear ring [[lng,lat], ...]?
 *  Returns false for malformed rings (non-array, <3 vertices, non-point vertex)
 *  rather than throwing — a validator must fail gracefully on bad geometry. */
function pointInRing(lng, lat, ring) {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i],
      pj = ring[j];
    if (!Array.isArray(pi) || !Array.isArray(pj)) return false;
    const xi = pi[0],
      yi = pi[1],
      xj = pj[0],
      yj = pj[1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Inside a Polygon (outer ring minus holes)? coords = [outerRing, hole1, ...]. */
function pointInPolygon(lng, lat, coords) {
  if (!Array.isArray(coords) || coords.length === 0 || !pointInRing(lng, lat, coords[0]))
    return false;
  for (let h = 1; h < coords.length; h++) {
    if (pointInRing(lng, lat, coords[h])) return false; // inside a hole
  }
  return true;
}

/** Inside a Polygon or MultiPolygon geometry? False (never throws) for malformed input. */
export function pointInGeometry(lng, lat, geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return false;
  if (geometry.type === "Polygon") return pointInPolygon(lng, lat, geometry.coordinates);
  if (geometry.type === "MultiPolygon")
    return geometry.coordinates.some((poly) => pointInPolygon(lng, lat, poly));
  return false;
}

/** Build a `wilaya_code → geometry` index from a boundary FeatureCollection.
 *  `codeProp` names the wilaya-code property; when omitted the common ones are tried. */
export function loadBoundaries(fc, codeProp) {
  const idx = new Map();
  for (const f of fc.features || []) {
    const p = f.properties || {};
    const raw =
      codeProp != null ? p[codeProp] : p.wilaya_code ?? p.code ?? p.WILAYA ?? p.id;
    if (raw == null) continue;
    const geom = f.geometry;
    // Skip malformed geometries so their wilaya simply isn't checked (pointInWilaya
    // returns true for un-indexed codes) rather than false-flagging every point in it.
    if (!geom || !Array.isArray(geom.coordinates) || !/Polygon$/.test(geom.type || "")) continue;
    idx.set(String(raw).padStart(2, "0"), geom);
  }
  return idx;
}

/** Is (lng,lat) inside the polygon for `wilayaCode`?
 *  Returns true when that wilaya has no boundary in the index (can't disprove → don't flag). */
export function pointInWilaya(lng, lat, wilayaCode, boundaries) {
  const geom = boundaries.get(String(wilayaCode).padStart(2, "0"));
  if (!geom) return true;
  return pointInGeometry(lng, lat, geom);
}

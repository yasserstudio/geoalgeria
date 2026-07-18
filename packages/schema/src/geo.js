// Point-in-wilaya test for the geo-in-boundary validation.
// The schema package ships NO polygons — boundaries are injected by the caller
// (validate-packages.mjs loads whatever wilaya-polygon FeatureCollection exists).
// So a dataset can be checked "does every point fall inside its declared wilaya?"
// without this package taking on ~MBs of geometry or a hard dep on the boundaries.

/** Ray-casting: is (lng,lat) inside a single linear ring [[lng,lat], ...]? */
function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1];
    const xj = ring[j][0],
      yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Inside a Polygon (outer ring minus holes)? coords = [outerRing, hole1, ...]. */
function pointInPolygon(lng, lat, coords) {
  if (!coords.length || !pointInRing(lng, lat, coords[0])) return false;
  for (let h = 1; h < coords.length; h++) {
    if (pointInRing(lng, lat, coords[h])) return false; // inside a hole
  }
  return true;
}

/** Inside a Polygon or MultiPolygon geometry? */
export function pointInGeometry(lng, lat, geometry) {
  if (!geometry) return false;
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
    idx.set(String(raw).padStart(2, "0"), f.geometry);
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

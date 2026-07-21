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
 *  `codeProp` names the wilaya-code property; when omitted the common ones are tried.
 *
 *  THROWS rather than returning a partial or empty index. pointInWilaya answers
 *  `true` for any code it has no polygon for — "can't disprove, don't flag" — so a
 *  degraded index does not weaken the check, it silently switches it off. That is
 *  how this check stayed dead: point this at the 69 *Point* features of
 *  dataset/geojson/wilayas.geojson and every feature is skipped, the index comes
 *  back empty, and the caller reports a clean run over data nothing looked at. A
 *  loud failure at load time is the only outcome that cannot be mistaken for a pass.
 *
 *  @throws {Error} if the index would be empty, if any feature is unusable
 *          (no code, or geometry that is not a Polygon/MultiPolygon), or if two
 *          features claim the same wilaya code (the second would replace the first).
 */
export function loadBoundaries(fc, codeProp) {
  const idx = new Map();
  const unusable = [];
  const duplicates = [];
  const features = (fc && fc.features) || [];
  features.forEach((f, i) => {
    const p = (f && f.properties) || {};
    const raw =
      codeProp != null ? p[codeProp] : p.wilaya_code ?? p.code ?? p.WILAYA ?? p.id;
    if (raw == null) return unusable.push(`#${i}: no wilaya code`);
    const geom = f && f.geometry;
    if (!geom || !Array.isArray(geom.coordinates) || !/Polygon$/.test(geom.type || ""))
      return unusable.push(`#${i} (code ${raw}): geometry is ${geom ? geom.type : "missing"}, not a Polygon/MultiPolygon`);
    const code = String(raw).padStart(2, "0");
    if (idx.has(code)) return duplicates.push(code);
    idx.set(code, geom);
  });

  const detail = (list) => list.slice(0, 5).join("; ") + (list.length > 5 ? ` (+${list.length - 5} more)` : "");
  if (idx.size === 0)
    throw new Error(
      `loadBoundaries: indexed 0 wilayas from ${features.length} feature(s) — ` +
        `every point would then be reported as inside its wilaya. ` +
        (unusable.length ? detail(unusable) : "the FeatureCollection has no features"),
    );
  if (unusable.length)
    throw new Error(
      `loadBoundaries: ${unusable.length} of ${features.length} feature(s) are unusable, so their ` +
        `wilayas would go unchecked while the run still reported clean — ${detail(unusable)}`,
    );
  if (duplicates.length)
    throw new Error(
      `loadBoundaries: duplicate wilaya code(s) ${[...new Set(duplicates)].join(", ")} — ` +
        `the later polygon silently replaces the earlier one`,
    );
  return idx;
}

/** Which wilayas border which, keyed by zero-padded code.
 *
 *  This is what separates the two kinds of "outside its declared wilaya": landing
 *  in a NEIGHBOUR is explainable by the geometry (the shipped outlines are
 *  simplified, median gap between kept vertices 3.4 km) or by a border-adjacent
 *  facility; landing in a wilaya that does not touch the declared one is not.
 *  Distance cannot make that call — Algeria's Saharan wilayas are hundreds of km
 *  across, so "40 km outside" is next-door in the south and three wilayas away in
 *  the north. Adjacency is scale-free.
 *
 *  Every boundary comes from one OSM extraction, so neighbours share vertices
 *  exactly and no tolerance is needed.
 *
 *  @param {{features: object[]}} fc  the wilaya-boundaries FeatureCollection
 *  @returns {Map<string, Set<string>>}
 *  @throws {Error} if any wilaya shares no vertex with any other — an adjacency
 *          map that answers "no" everywhere would call every outlier a mislink.
 */
export function wilayaNeighbours(fc) {
  const atVertex = new Map();
  const codes = [];
  for (const f of (fc && fc.features) || []) {
    const code = String(f.properties.code ?? f.properties.wilaya_code).padStart(2, "0");
    codes.push(code);
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys)
      for (const ring of poly)
        for (const [x, y] of ring) {
          const k = `${x},${y}`;
          if (!atVertex.has(k)) atVertex.set(k, new Set());
          atVertex.get(k).add(code);
        }
  }
  const adj = new Map(codes.map((c) => [c, new Set()]));
  for (const shared of atVertex.values())
    if (shared.size > 1) for (const a of shared) for (const b of shared) if (a !== b) adj.get(a).add(b);
  const isolated = [...adj].filter(([, s]) => s.size === 0).map(([c]) => c);
  if (isolated.length)
    throw new Error(
      `wilayaNeighbours: wilaya ${isolated.join(", ")} share no boundary vertex with any neighbour — ` +
        `every outlier would then be reported as a mislink`,
    );
  return adj;
}

/** Is (lng,lat) inside the polygon for `wilayaCode`?
 *  Returns true when that wilaya has no boundary in the index (can't disprove → don't flag). */
export function pointInWilaya(lng, lat, wilayaCode, boundaries) {
  const geom = boundaries.get(String(wilayaCode).padStart(2, "0"));
  if (!geom) return true;
  return pointInGeometry(lng, lat, geom);
}

// ---------------------------------------------------------------------------
// Can this coordinate honestly be called `exact`?
//
// `geo_precision` had no quality test behind it: anything with two finite axes
// was stamped "exact". Two things the numbers themselves can disprove:
//   - resolution — a value rounded to ≤2 fraction digits locates nothing smaller
//     than a neighbourhood (see MIN_EXACT_DECIMALS);
//   - uniqueness — a point carried by more than one record in the same file is
//     not a *per-facility* point, whichever facility it actually belongs to.
// Neither replaces judgement about the source; both are checks the data fails on
// its own terms, so they are contract errors rather than warnings.

/** Fraction digits in a number's shortest round-trip decimal form (0 for integers).
 *  Exponential forms (1e-7) have no literal fraction digits, so they report the
 *  exponent instead — never a spurious 0 that would read as whole-degree. */
export function fractionDigits(n) {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  const e = s.match(/e-(\d+)$/i);
  if (e) return Number(e[1]) + (s.indexOf(".") < 0 ? 0 : s.indexOf("e") - s.indexOf(".") - 1);
  const dot = s.indexOf(".");
  return dot < 0 ? 0 : s.length - dot - 1;
}

/** A point is only as precise as its coarser axis → min of the two digit counts. */
export function coordDecimals(lat, lng) {
  return Math.min(fractionDigits(lat), fractionDigits(lng));
}

/** Indexes of the rows whose coordinate is carried by at least one other row in
 *  the same collection. Ungeocoded rows are never members. */
export function sharedPoints(rows) {
  const byPoint = new Map();
  rows.forEach((r, i) => {
    if (!r || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return;
    const k = `${r.lat},${r.lng}`;
    if (!byPoint.has(k)) byPoint.set(k, []);
    byPoint.get(k).push(i);
  });
  const out = new Set();
  for (const idxs of byPoint.values()) if (idxs.length > 1) for (const i of idxs) out.add(i);
  return out;
}

// The 69 wilaya polygons must not overlap each other, and every ring must be a
// simple closed ring.
//
// Nothing checked this until a user reported it. Tlemcen (13) and El Aricha (63)
// overlapped completely: El Aricha became its own wilaya in the 2026 reform,
// carved out of Tlemcen, and OpenStreetMap added the new relation without
// shrinking the parent, so the parent still spanned its pre-reform extent. A
// third of the area Tlemcen drew was really El Aricha.
//
// It stayed invisible because nothing downstream errors on it. Both
// point-in-polygon resolvers in this project (containingWilayaCode here,
// wilayaCodeForPoint in the app) return the FIRST containing polygon, and 13
// precedes 63 in the file, so every El Aricha point silently resolved to
// Tlemcen: no exception, no warning, just the wrong wilaya on commune joins,
// wildfire attribution and per-wilaya density.
//
// WHY THE BOUND IS ABSOLUTE AND NEAR ZERO. The first version of this test
// sampled a grid and allowed 2% of the smaller wilaya's area, which is 424 km2
// next to Ouargla. A 2% band cannot see the failure these polygons actually
// produce: an edit that redraws one border and leaves a sliver a few hundred
// metres wide lying across a neighbour that gave nothing up. The 2026-09-29
// membership transfer shipped three such slivers (47 x 55 at 0.97 km2 over 44 km,
// 32 x 47 at 0.78 km2 over 33 km, 30 x 47 at 0.04 km2) and the 2% band passed
// them. So the overlap is now the exact intersection area rather than a sample
// count, and the bound is 0.01 km2 per pair. These polygons tile and share their
// arcs vertex for vertex, so the honest answer for every pair is zero.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import polygonClipping from "polygon-clipping";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fc = JSON.parse(
  readFileSync(join(ROOT, "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson"), "utf-8"),
);

/** Per-pair intersection area allowed, in km2. Not a band for simplification
 *  error: anything above this is one polygon lying on another. */
const MAX_PAIR_OVERLAP_KM2 = 0.01;

function inRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inPolygon = (p, poly) => inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h));
const asMulti = (geom) => (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates);
const inGeometry = (p, geom) => asMulti(geom).some((poly) => inPolygon(p, poly));

/**
 * Area of an intersection result, in km2, on a plane scaled at its own latitude.
 *
 * The spherical-excess formula this repository uses for a wilaya is the wrong one
 * for a sliver: it treats an edge as linear in (lon, sin lat), so three points that
 * are exactly collinear in lon/lat still bound a "triangle", and over 33 km that
 * reads 0.05 km2 of overlap where GEOS finds no intersection at all. The edges in
 * this file are straight in lon/lat, which is what an equirectangular plane
 * measures exactly.
 */
function sliverKm2(multi) {
  const pts = multi.flatMap((poly) => poly[0]);
  if (!pts.length) return 0;
  const lat0 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const kx = Math.cos((lat0 * Math.PI) / 180) * 111.32;
  const ky = 110.574;
  const shoelace = (ring) => {
    let s = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      s += ring[j][0] * kx * (ring[i][1] * ky) - ring[i][0] * kx * (ring[j][1] * ky);
    }
    return Math.abs(s) / 2;
  };
  return multi.reduce(
    (a, poly) => a + shoelace(poly[0]) - poly.slice(1).reduce((b, h) => b + shoelace(h), 0),
    0,
  );
}

function bbox(multi) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const poly of multi) {
    for (const [x, y] of poly[0]) {
      x1 = Math.min(x1, x); x2 = Math.max(x2, x);
      y1 = Math.min(y1, y); y2 = Math.max(y2, y);
    }
  }
  return [x1, y1, x2, y2];
}

const wilayas = fc.features.map((f) => ({
  code: Number(f.properties.code),
  geom: f.geometry,
  multi: asMulti(f.geometry),
  bb: bbox(asMulti(f.geometry)),
}));

test("the shipped wilaya polygons are 69 and each carries a code", () => {
  assert.equal(wilayas.length, 69);
  assert.deepEqual(
    wilayas.map((w) => w.code).sort((a, b) => a - b),
    Array.from({ length: 69 }, (_, i) => i + 1),
  );
});

// ---------------------------------------------------------------------------
// Ring validity. It runs before the overlap test because polygon-clipping's
// answer on a self-intersecting ring is not defined, so a broken ring has to
// fail as a broken ring rather than as a mystery overlap. The first cut of the
// 2026-09-29 membership transfer left wilaya 58 with a 14 km zero-width spike
// (idx 35-37 went 2.36,32.262 -> 2.324,32.385 -> 2.36,32.262, which GEOS reads
// as a ring self-intersection) and duplicate consecutive vertices in 58 and 47.
// ---------------------------------------------------------------------------

/** Sign of the cross product (b-a) x (c-a), with a tolerance that treats the
 *  degenerate case as collinear. 1e-12 deg2 is far below anything 3-decimal
 *  coordinates can express and far above double rounding on values near 35. */
const CROSS_EPS = 1e-12;
function crossSign(a, b, c) {
  const v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return v > CROSS_EPS ? 1 : v < -CROSS_EPS ? -1 : 0;
}
const onSegment = (a, b, p) =>
  Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) &&
  Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);

/** True when segments ab and cd share any point, collinear overlap included. */
function segmentsIntersect(a, b, c, d) {
  const d1 = crossSign(c, d, a);
  const d2 = crossSign(c, d, b);
  const d3 = crossSign(a, b, c);
  const d4 = crossSign(a, b, d);
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  if (d1 === 0 && onSegment(c, d, a)) return true;
  if (d2 === 0 && onSegment(c, d, b)) return true;
  if (d3 === 0 && onSegment(a, b, c)) return true;
  if (d4 === 0 && onSegment(a, b, d)) return true;
  return false;
}

const same = (p, q) => p[0] === q[0] && p[1] === q[1];

/** Every fault in one ring, named by vertex index so a failure is actionable. */
function ringFaults(ring) {
  const faults = [];
  if (ring.length < 4) {
    return [`only ${ring.length} positions, a ring needs 4`];
  }
  if (!same(ring[0], ring[ring.length - 1])) {
    faults.push(`not closed: [${ring[0]}] to [${ring[ring.length - 1]}]`);
  }

  // Open vertex list: the closing repeat is the ring's own, not a duplicate.
  const pts = ring.slice(0, -1);
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (same(pts[i], pts[j])) faults.push(`duplicate consecutive vertex at idx ${i}/${j}: [${pts[i]}]`);
  }
  for (let i = 0; i < n; i++) {
    const b = (i + 1) % n;
    const c = (i + 2) % n;
    if (same(pts[i], pts[c])) {
      faults.push(`zero-width spike at idx ${i}-${b}-${c}: [${pts[i]}] -> [${pts[b]}] -> [${pts[c]}]`);
    }
  }
  // Non-adjacent segment pairs. The widest ring in the file is 254 vertices, so
  // the quadratic pass is cheaper than the bookkeeping a sweep line would need.
  if (faults.length) return faults; // degenerate segments make the sign tests meaningless
  for (let i = 0; i < n; i++) {
    const a1 = pts[i];
    const a2 = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // the closing segment is adjacent to the first
      const b1 = pts[j];
      const b2 = pts[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) {
        faults.push(
          `self-intersection: segment ${i}-${(i + 1) % n} ([${a1}] -> [${a2}]) ` +
            `meets ${j}-${(j + 1) % n} ([${b1}] -> [${b2}])`,
        );
      }
    }
  }
  return faults;
}

test("every wilaya ring is closed, duplicate-free, spike-free and simple", () => {
  const offenders = [];
  for (const w of wilayas) {
    w.multi.forEach((poly, pi) => {
      poly.forEach((ring, ri) => {
        for (const fault of ringFaults(ring)) {
          offenders.push(`w${w.code} polygon ${pi} ring ${ri}: ${fault}`);
        }
      });
    });
  }
  assert.deepEqual(offenders, [], `invalid wilaya rings:\n${offenders.join("\n")}`);
});

test("no wilaya polygon overlaps another", () => {
  const offenders = [];
  for (let i = 0; i < wilayas.length; i++) {
    for (let j = i + 1; j < wilayas.length; j++) {
      const a = wilayas[i];
      const b = wilayas[j];
      // bbox reject first: 69 x 68 exact intersections would be needlessly slow
      if (a.bb[0] > b.bb[2] || a.bb[2] < b.bb[0] || a.bb[1] > b.bb[3] || a.bb[3] < b.bb[1]) continue;
      const inter = polygonClipping.intersection(a.multi, b.multi);
      const km2 = inter.length ? sliverKm2(inter) : 0;
      if (km2 > MAX_PAIR_OVERLAP_KM2) {
        const pts = inter.flatMap((poly) => poly[0]);
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        offenders.push(
          `w${a.code} x w${b.code}: ${km2.toFixed(4)} km2 ` +
            `from (${Math.min(...xs).toFixed(3)}, ${Math.min(...ys).toFixed(3)}) ` +
            `to (${Math.max(...xs).toFixed(3)}, ${Math.max(...ys).toFixed(3)})`,
        );
      }
    }
  }
  assert.deepEqual(offenders, [], `overlapping wilaya polygons:\n${offenders.join("\n")}`);
});

test("El Aricha (63) is outside Tlemcen (13), the pair that prompted this test", () => {
  const tlemcen = wilayas.find((w) => w.code === 13).geom;
  // Points across El Aricha's interior, from the reported case.
  for (const p of [[-1.26, 34.22], [-1.5, 34.35], [-1.3, 34.55], [-1.6, 34.2], [-0.95, 34.45]]) {
    assert.equal(inGeometry(p, tlemcen), false, `${p} should not be inside Tlemcen`);
  }
  // and the fix must not have eaten Tlemcen's own territory
  const elAricha = wilayas.find((w) => w.code === 63).geom;
  for (const p of [[-1.33, 34.64], [-1.32, 34.88], [-1.6, 35.0]]) {
    assert.equal(inGeometry(p, tlemcen), true, `${p} should still be inside Tlemcen`);
    assert.equal(inGeometry(p, elAricha), false, `${p} should not be inside El Aricha`);
  }
});

// The 69 wilaya polygons must not overlap each other.
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
// The pairwise test is what would have caught it at import time, so it runs on
// the SHIPPED polygons rather than on a fixture. Grid sampling, not exact
// geometry: the polygons are display-grade (simplified, 3-decimal coordinates),
// so neighbours touching along a shared border are expected and a tolerance
// below is required. A genuine containment shows up as a large percentage, not
// a fraction of one.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fc = JSON.parse(
  readFileSync(join(ROOT, "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson"), "utf-8"),
);

// A pair sharing a border can land a sample point on the wrong side of a
// simplified edge. 2% of the smaller wilaya's area absorbs that; a real
// containment is 100%, and the 2026-reform pair that prompted this test was 100%.
const TOLERANCE_PCT = 2;
const STEPS = 40;

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
const polygonsOf = (geom) => (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates);
const inGeometry = (p, geom) => polygonsOf(geom).some((poly) => inPolygon(p, poly));

function bbox(geom) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      x1 = Math.min(x1, c[0]); x2 = Math.max(x2, c[0]);
      y1 = Math.min(y1, c[1]); y2 = Math.max(y2, c[1]);
    } else c.forEach(walk);
  };
  walk(geom.coordinates);
  return [x1, y1, x2, y2];
}

const wilayas = fc.features.map((f) => ({
  code: Number(f.properties.code),
  geom: f.geometry,
  bb: bbox(f.geometry),
}));

test("the shipped wilaya polygons are 69 and each carries a code", () => {
  assert.equal(wilayas.length, 69);
  assert.deepEqual(
    wilayas.map((w) => w.code).sort((a, b) => a - b),
    Array.from({ length: 69 }, (_, i) => i + 1),
  );
});

test("no wilaya polygon overlaps another", () => {
  const offenders = [];
  for (const a of wilayas) {
    for (const b of wilayas) {
      if (a.code === b.code) continue;
      // bbox reject first: 69 x 68 full grid samples would be needlessly slow
      if (a.bb[0] > b.bb[2] || a.bb[2] < b.bb[0] || a.bb[1] > b.bb[3] || a.bb[3] < b.bb[1]) continue;
      const step = Math.max((b.bb[2] - b.bb[0]) / STEPS, (b.bb[3] - b.bb[1]) / STEPS);
      let inB = 0;
      let inBoth = 0;
      for (let x = b.bb[0]; x <= b.bb[2]; x += step) {
        for (let y = b.bb[1]; y <= b.bb[3]; y += step) {
          const p = [x, y];
          if (!inGeometry(p, b.geom)) continue;
          inB++;
          if (inGeometry(p, a.geom)) inBoth++;
        }
      }
      if (!inB) continue;
      const pct = (inBoth / inB) * 100;
      if (pct > TOLERANCE_PCT) {
        offenders.push(`${b.code} is ${pct.toFixed(0)}% inside ${a.code}`);
      }
    }
  }
  assert.deepEqual(offenders, [], "overlapping wilaya polygons");
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

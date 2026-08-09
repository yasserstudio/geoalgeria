#!/usr/bin/env node
/**
 * One-time geometry correction: subtract El Aricha (63) from Tlemcen (13).
 *
 * Reported by Karim OA (konfo.net), who hit it building the Sismoo mobile app:
 * the two wilaya polygons overlap. Confirmed here and upstream. El Aricha became
 * its own wilaya in the 2026 reform, carved out of Tlemcen, and OpenStreetMap
 * has the new relation (20815946, ref 63) but never shrank the parent relation
 * (1280702, ref 13), which still spans its pre-reform extent. Verified against a
 * live Overpass pull on 2026-08-09 (timestamp_osm_base 2026-08-08T16:16:37Z), so
 * re-sourcing from OSM reproduces the defect rather than fixing it.
 *
 * Effect before the fix: 100% of El Aricha's area also fell inside Tlemcen, and
 * El Aricha is a third of the area Tlemcen drew. Both point-in-polygon resolvers
 * in this project return the FIRST containing polygon, and 13 precedes 63 in the
 * file, so every point in El Aricha resolved to Tlemcen: wrong wilaya on the
 * commune join, wrong attribution for wildfire hotspots, and a Tlemcen density
 * understated by a third.
 *
 * An all-pairs scan found this to be the ONLY overlapping pair among the 69, so
 * this script is deliberately narrow rather than a general repair pass. The
 * shared border needs no reconciliation: 24 of El Aricha's 53 vertices are
 * already exactly coincident with Tlemcen's ring (both were extracted and
 * simplified together), so the difference reuses them and introduces no sliver.
 *
 * `prepare-boundaries.mjs` in the app repo builds the superseded GADM version
 * and must never run, so this edits the committed OSM-derived geometry in place
 * instead of regenerating it. Coordinates keep the file's 3-decimal precision.
 *
 * Usage: node scripts/fix-wilaya-overlap.mjs [--check]
 *        --check verifies the committed file is already correct and writes nothing.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import polygonClipping from "polygon-clipping";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "..", "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson");

const PARENT = 13; // Tlemcen
const CHILD = 63; // El Aricha, carved out of Tlemcen by the 2026 reform
const DP = 3; // the file's committed coordinate precision

const round = (n) => Number(n.toFixed(DP));
const feature = (fc, code) => fc.features.find((f) => Number(f.properties?.code) === code);

/** MultiPolygon coordinates -> the same shape with coordinates rounded to DP. */
const roundCoords = (multi) =>
  multi.map((poly) => poly.map((ring) => ring.map(([x, y]) => [round(x), round(y)])));

/** Ray-cast point-in-ring; the same test the consumers use. */
function inRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inPolygon = (p, poly) =>
  inRing(p, poly[0]) && !poly.slice(1).some((hole) => inRing(p, hole));
const inGeometry = (p, geom) =>
  (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates).some((poly) => inPolygon(p, poly));

/** Grid-sampled share of `inner`'s area that also falls inside `outer`, in percent. */
function overlapPct(inner, outer, steps = 60) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      x1 = Math.min(x1, c[0]); x2 = Math.max(x2, c[0]);
      y1 = Math.min(y1, c[1]); y2 = Math.max(y2, c[1]);
    } else c.forEach(walk);
  };
  walk(inner.coordinates);
  const step = Math.max((x2 - x1) / steps, (y2 - y1) / steps);
  let hit = 0, both = 0;
  for (let x = x1; x <= x2; x += step) {
    for (let y = y1; y <= y2; y += step) {
      if (!inGeometry([x, y], inner)) continue;
      hit++;
      if (inGeometry([x, y], outer)) both++;
    }
  }
  return hit ? (both / hit) * 100 : 0;
}

const fc = JSON.parse(readFileSync(FILE, "utf-8"));
const parent = feature(fc, PARENT);
const child = feature(fc, CHILD);
if (!parent || !child) throw new Error(`missing wilaya ${PARENT} or ${CHILD} in ${FILE}`);

const before = overlapPct(child.geometry, parent.geometry);
console.log(`El Aricha (${CHILD}) inside Tlemcen (${PARENT}) before: ${before.toFixed(1)}%`);

if (process.argv.includes("--check")) {
  if (before > 1) {
    console.error(`FAIL: the committed file still has ${before.toFixed(1)}% overlap`);
    process.exit(1);
  }
  console.log("OK: no overlap in the committed file");
  process.exit(0);
}

const asMulti = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const diff = polygonClipping.difference(asMulti(parent.geometry), asMulti(child.geometry));
if (!diff.length) throw new Error("difference produced an empty geometry, refusing to write");

// Drop sliver rings the clipper can leave where the two borders touch: anything
// under 1 km2 next to a 9,000 km2 wilaya is noise, not territory. (Degrees2 at
// 34N: 1 deg2 ~ 10,200 km2, so 1 km2 ~ 1e-4 deg2.)
const ringArea = (ring) => {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
};
const MIN_AREA_DEG2 = 1e-4;
const kept = diff.filter((poly) => ringArea(poly[0]) >= MIN_AREA_DEG2);
const dropped = diff.length - kept.length;
if (dropped) console.log(`  dropped ${dropped} sliver polygon(s) under 1 km2`);
if (!kept.length) throw new Error("every result polygon was a sliver, refusing to write");

const rounded = roundCoords(kept);
parent.geometry = rounded.length === 1
  ? { type: "Polygon", coordinates: rounded[0] }
  : { type: "MultiPolygon", coordinates: rounded };

const after = overlapPct(child.geometry, parent.geometry);
console.log(`El Aricha inside Tlemcen after:  ${after.toFixed(1)}%`);
if (after > 1) throw new Error(`difference did not clear the overlap (${after.toFixed(1)}% left)`);

// Match the file's existing formatting exactly: minified, no trailing newline.
writeFileSync(FILE, JSON.stringify(fc));
console.log(
  `Wrote ${FILE}\n  Tlemcen: ${parent.geometry.type}, ` +
    `${(parent.geometry.type === "Polygon" ? [parent.geometry.coordinates] : parent.geometry.coordinates)
      .reduce((n, p) => n + p.reduce((m, r) => m + r.length, 0), 0)} vertices`,
);

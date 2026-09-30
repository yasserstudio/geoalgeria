#!/usr/bin/env node
/**
 * One-time geometry correction: move three communes' territory to the wilaya the
 * 2026 reform puts them in.
 *
 * Found by the 2026-09-27 commune-centre sweep (research/_commune-centres/) and
 * decided by the Owner on 2026-09-29: the commune membership printed in the
 * Official Journal decides the line, and the polygons follow the communes.
 *
 *   El Alia (5513) and El-Hadjira (5507) are communes of Touggourt (55), and the
 *   pair of them is 9,058 km2 the shipped 55 polygon never had. Both centres and
 *   both OSM chef-lieu nodes sat 51 to 53 km outside 55, inside Ouargla (30).
 *   Mansoura (4713) is a commune of Ghardaia (47) and sat inside El Meniaa (58).
 *
 * OSM is the stale source here, not the arbiter. Touggourt was carved out of
 * Ouargla by law 19-12 (2019) and El Meniaa out of Ghardaia by the same law; law
 * 26-06 (JORA n° 25, 5 April 2026) re-states the commune list of those ten
 * wilayas and presidential decree 26-206 (JORA n° 40, 3 June 2026) fixes the
 * names and chef-lieux. The ONS code geographique 2021 in sources/dataset reads
 * 55 for both 5513 and 5507 and 47 for 4713, and so does every commune table
 * this repository ships. What OSM still carries is the pre-2019 numbering: the
 * El Alia relation is tagged `ref:ONS=3020` and El-Hadjira `3014`, Ouargla-era
 * codes, and the admin_level=4 relations were never re-cut. Re-sourcing the
 * wilaya outlines from OSM reproduces the defect, exactly as it does for the
 * El Aricha / Tlemcen overlap that scripts/fix-wilaya-overlap.mjs repaired.
 *
 * WHY A TRANSFER AND NOT A REBUILD OF THE WHOLE POLYGON. Rebuilding 30, 47, 55
 * and 58 from their member communes outright would redraw every border they
 * share with the 65 wilayas this change does not touch, and those neighbours are
 * a different extraction at a different simplification, so each redrawn border
 * would open a gap or an overlap. Transferring only the communes that moved is
 * exact instead. With T the transferred territory,
 *
 *     to'   = to ∪ (T ∩ from)          from' = from \ T
 *
 * gives `to' ∩ from' = ∅` and `to' ∪ from' = to ∪ from`, so no territory is
 * created or lost, the two share one identical arc, and no other polygon moves.
 * Clipping T to `from` is what makes it exact: an OSM commune outline can poke a
 * few hundred metres past the simplified wilaya outline, and unclipped that
 * overhang would be territory taken from a third wilaya that gave nothing up.
 *
 * The result is checked against the rebuild it stands in for: each edited
 * polygon's area is compared with the union of its own member communes' OSM
 * outlines (test/wilaya-membership.test.mjs), and lands within 2%.
 *
 * WHAT THE SET OPERATIONS ALONE DO NOT GIVE, and what the 2026-09-29 review
 * caught: the transferred OSM ring and this file's own simplified ring describe a
 * shared border about 30 m apart, so the boolean result carries a zero-width slit,
 * and quantising that slit to 3 decimals turns it into spikes, duplicate vertices
 * and slivers of about 1 km2 lying across wilayas that gave nothing up. See
 * cleanRing and quantiser below; the script refuses to write unless all 2,346
 * pairs of the 69 measure under MAX_PAIR_OVERLAP_KM2.
 *
 * Commune outlines come from research/_wilaya-boundaries/commune-outlines-2026-09-29.json
 * (OSM admin_level=8, ODbL 1.0, timestamp_osm_base 2026-09-29T13:04:54Z), which
 * is the 2026-09-29 audit's own cache rather than a fresh pull: Overpass mirrors
 * are independently replicated and drift by hours.
 *
 * `prepare-boundaries.mjs` in the app repo builds the superseded GADM version and
 * must never run, so this edits the committed OSM-derived geometry in place.
 * Coordinates keep the file's 3-decimal precision, with the handful of exceptions
 * quantiser explains.
 *
 * Usage: node scripts/fix-wilaya-membership.mjs [--check]
 *        --check verifies the committed file is already correct and writes nothing.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import polygonClipping from "polygon-clipping";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson");
const OUTLINES = join(ROOT, "research", "_wilaya-boundaries", "commune-outlines-2026-09-29.json");

/** The moves. One entry per (from, to) pair; `communes` move together. */
const TRANSFERS = [
  { from: 30, to: 55, communes: [5513, 5507] },
  { from: 58, to: 47, communes: [4713] },
];

const DP = 3; // the file's committed coordinate precision
/** Douglas-Peucker tolerance for the transferred outlines, in degrees.
 *  0.005 deg ~ 550 m, an order above the 3-decimal quantisation the file rounds
 *  to, and it leaves the edited polygons with a median vertex gap of 3.4 to
 *  6.5 km: the same band as the 69 the file already carries (documented p25
 *  2,125 m / median 3,356 m / p75 5,773 m). Finer would ship four polygons an
 *  order more detailed than their neighbours; coarser starts costing area. */
const SIMPLIFY_DEG = 0.005;
/** Offcuts the difference leaves where the transferred outline crosses the old
 *  border at a finer resolution than the border itself was simplified to. They
 *  are not territory: 5 km2 next to a 135,000 km2 wilaya is 0.004%, and at this
 *  border a 550 m tolerance against a 6.5 km vertex gap cannot resolve less. An
 *  offcut dropped here is not lost, it joins the receiving wilaya, because that
 *  one is derived as the complement below. Dropping them is also what keeps the
 *  receiver hole-free: an offcut enclosed by the receiver IS a hole in it. */
const MIN_PART_KM2 = 5;
/** What test/wilaya-boundaries-disjoint.test.mjs allows per pair, enforced here so
 *  the script refuses to write a file that test would reject. */
const MAX_PAIR_OVERLAP_KM2 = 0.01;

const round = (n) => Number(n.toFixed(DP));
const asMulti = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const same = (p, q) => p[0] === q[0] && p[1] === q[1];

/** Douglas-Peucker over an open or closed vertex list, keeping the endpoints. */
function simplifyRing(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const dx = pts[b][0] - ax;
    const dy = pts[b][1] - ay;
    const len = dx * dx + dy * dy;
    let far = -1;
    let farD = 0;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      let t = len === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > farD) {
        farD = d;
        far = i;
      }
    }
    if (farD > tol) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Spherical-excess ring area in km2; the same formula the tests use. */
const R_KM = 6371.0088;
function ringArea(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    s += ((x2 - x1) * Math.PI) / 180 * (2 + Math.sin((y1 * Math.PI) / 180) + Math.sin((y2 * Math.PI) / 180));
  }
  return Math.abs((s * R_KM * R_KM) / 2);
}
const multiArea = (multi) =>
  multi.reduce((a, poly) => a + ringArea(poly[0]) - poly.slice(1).reduce((b, h) => b + ringArea(h), 0), 0);
const geomArea = (g) => multiArea(asMulti(g));

/** Area of an intersection result in km2, on a plane scaled at its own latitude.
 *  multiArea is the formula this repository uses for a wilaya and the wrong one for
 *  a sliver: it treats an edge as linear in (lon, sin lat), so three points exactly
 *  collinear in lon/lat still bound a "triangle", and over 33 km that reads 0.05 km2
 *  where GEOS finds no intersection at all. The edges here are straight in lon/lat,
 *  which an equirectangular plane measures exactly. */
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
  return multi.reduce((a, poly) => a + shoelace(poly[0]) - poly.slice(1).reduce((b, h) => b + shoelace(h), 0), 0);
}

function dropOffcuts(multi, label) {
  const kept = multi.filter((poly) => ringArea(poly[0]) >= MIN_PART_KM2);
  const dropped = multi.filter((poly) => ringArea(poly[0]) < MIN_PART_KM2);
  if (dropped.length) {
    console.log(
      `  ${label}: dropped ${dropped.length} offcut(s) under ${MIN_PART_KM2} km2 ` +
        `(${dropped.map((p) => ringArea(p[0]).toFixed(2)).join(", ")} km2)`,
    );
  }
  if (!kept.length) throw new Error(`${label}: every result polygon was an offcut, refusing to write`);
  return kept;
}

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
const inGeometry = (p, geom) => asMulti(geom).some((poly) => inPolygon(p, poly));

/**
 * WHY THE RESULT NEEDS CLEANING AND GUARDED ROUNDING.
 *
 * The transferred outlines are the communes' own OSM rings. Where a commune's
 * border is also the wilaya border the transfer runs along, the OSM ring and this
 * file's 3-decimal simplified ring describe the same line about 30 m apart, so the
 * two do not cancel: the boolean result carries a ZERO-WIDTH SLIT, the arc
 * traversed once outbound on the file's vertices and once back on the OSM ones.
 * Mansoura's slit doubled 60 km of the w47/w58 border; El Alia's crossing of the
 * w30/w47 edge left a shorter one.
 *
 * Rounding that to 3 decimals is what shipped the three slivers the 2026-09-29
 * review found. It collapses part of a slit into a spike or a duplicate vertex
 * (w58 idx 35-37 became a 14 km spike GEOS reads as a ring self-intersection), and
 * it moves a crossing vertex by up to 55 m in each axis with no regard for which
 * side of an untouched border it lands on: w55's arc endpoint went 3 m past
 * Ghardaia's (4.781,32.495)-(5.025,32.853) edge and opened a 44 km sliver of
 * 0.97 km2, and Mansoura's crossing landed 94 m west of the unchanged w32/w58 arc
 * for another 0.78 km2 plus a spike. Neither is small in the only terms that
 * matter: a neighbour that gave nothing up is drawn twice.
 *
 * So, in order: collapse the slits at full precision, then quantise each vertex
 * against the polygons this transfer does not touch, then collapse whatever the
 * quantiser made exactly degenerate.
 */

/** Two vertices closer than this are the same vertex as far as this file can say:
 *  it is the 3-decimal quantisation step, ~90 m, against a median vertex gap of
 *  3.4 km. Used to collapse the slits, never to move a border. */
const SLIT_DEG = 0.001;
/** A vertex this close to an untouched wilaya's own vertex takes that vertex
 *  exactly, so the arc stays shared rather than nearly shared. */
const SNAP_DEG = 0.001;

const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

/** Squared distance from p to segment ab, in degrees. */
function distToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  let t = len === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/**
 * Remove consecutive duplicates and zero-width spikes (a -> b -> a) from one
 * closed ring, to a fixed point because removing a spike tip exposes the next
 * one. `tol` 0 is exact; SLIT_DEG collapses a doubled arc, keeping the vertex the
 * ring reached first, which is the file's own 3-decimal one.
 * Returns null when the ring has no area left to describe.
 */
function cleanRing(ring, tol = 0) {
  const near = (p, q) => (tol === 0 ? same(p, q) : dist(p, q) <= tol);
  let pts = ring.slice(0, -1);
  for (let pass = 0; pass < ring.length + 2; pass++) {
    let changed = false;
    const dedup = [];
    for (const p of pts) if (!dedup.length || !near(dedup[dedup.length - 1], p)) dedup.push(p);
    while (dedup.length > 1 && near(dedup[0], dedup[dedup.length - 1])) dedup.pop();
    if (dedup.length !== pts.length) changed = true;
    pts = dedup;
    if (pts.length >= 3) {
      for (let i = 0; i < pts.length; i++) {
        if (near(pts[i], pts[(i + 2) % pts.length])) {
          const drop = new Set([(i + 1) % pts.length, (i + 2) % pts.length]);
          pts = pts.filter((_, k) => !drop.has(k));
          changed = true;
          break;
        }
      }
    }
    if (!changed) break;
  }
  return pts.length >= 3 ? [...pts, pts[0]] : null;
}

/** cleanRing over a MultiPolygon, dropping any polygon whose outer ring collapses. */
function cleanRings(multi, label, tol = 0) {
  const out = [];
  for (const poly of multi) {
    const rings = poly.map((r) => cleanRing(r, tol));
    if (!rings[0]) {
      console.log(`  ${label}: an outer ring collapsed to nothing while cleaning, dropped`);
      continue;
    }
    out.push(rings.filter(Boolean));
  }
  if (!out.length) throw new Error(`${label}: every ring collapsed while cleaning, refusing to write`);
  return out;
}

/**
 * Quantise to the file's 3 decimals without stepping onto a wilaya this transfer
 * does not touch. Three outcomes per vertex, in order:
 *
 *   1. an untouched wilaya has its own vertex within SNAP_DEG: take it exactly,
 *      so the two share the vertex instead of missing it by 40 m;
 *   2. the plain 3-decimal rounding is clear of every untouched wilaya: take it;
 *   3. otherwise keep full precision, which is where the set operation put it,
 *      on the untouched neighbour's own edge. A handful of long coordinates costs
 *      a few bytes; rounding them costs a sliver or a hole of about 1 km2.
 *
 * `guards` is every wilaya outside the pair, so both halves of a pair quantise
 * against the same set and their shared arc stays one arc, vertex for vertex.
 */
function quantiser(guards) {
  const parts = guards.flatMap((g) => asMulti(g));
  const boxes = parts.map((poly) => {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const [x, y] of poly[0]) {
      x1 = Math.min(x1, x); x2 = Math.max(x2, x);
      y1 = Math.min(y1, y); y2 = Math.max(y2, y);
    }
    return [x1, y1, x2, y2];
  });
  const guardVertices = parts.flatMap((poly) => poly.flatMap((ring) => ring.slice(0, -1)));

  /** Inside an untouched wilaya, or on its boundary, which rounding must not do. */
  const occupied = (p) =>
    parts.some((poly, i) => {
      const b = boxes[i];
      if (p[0] < b[0] - SLIT_DEG || p[0] > b[2] + SLIT_DEG || p[1] < b[1] - SLIT_DEG || p[1] > b[3] + SLIT_DEG) return false;
      if (inPolygon(p, poly)) return true;
      return poly.some((ring) =>
        ring.some((v, k) => k > 0 && distToSegment(p, ring[k - 1], v) < 1e-9),
      );
    });

  const cache = new Map();
  const snapped = [];
  const kept = [];
  const fix = (v) => {
    const key = v.join(",");
    if (cache.has(key)) return cache.get(key);
    const plain = [round(v[0]), round(v[1])];
    let chosen;
    if (same(plain, v)) {
      chosen = plain; // already one of the file's own vertices
    } else {
      let best = null;
      for (const gv of guardVertices) {
        const d = dist(v, gv);
        if (d <= SNAP_DEG && (!best || d < best[0])) best = [d, gv];
      }
      if (best) {
        chosen = [best[1][0], best[1][1]];
        snapped.push(`[${plain}] -> [${chosen}] (an untouched wilaya's own vertex)`);
      } else if (!occupied(plain)) {
        chosen = plain;
      } else {
        chosen = [v[0], v[1]];
        kept.push(`[${plain}] would sit inside an untouched wilaya, keeping [${chosen}]`);
      }
    }
    cache.set(key, chosen);
    return chosen;
  };

  /** A ring must not gain a vertex it already has at a non-consecutive position:
   *  that is a self-touching ring, which is invalid however small the pinch. */
  const applyRing = (ring) => {
    const out = ring.map(fix);
    for (let i = 0; i < out.length - 1; i++) {
      for (let j = i + 2; j < out.length - 1; j++) {
        if (!same(out[i], out[j])) continue;
        out[j] = [ring[j][0], ring[j][1]];
        kept.push(`[${out[i]}] twice in one ring, keeping [${out[j]}] at full precision`);
      }
    }
    return out;
  };
  const apply = (multi) => multi.map((poly) => poly.map(applyRing));
  return { apply, snapped, kept };
}

const fc = JSON.parse(readFileSync(FILE, "utf-8"));
const feature = (code) => {
  const f = fc.features.find((x) => Number(x.properties?.code) === code);
  if (!f) throw new Error(`missing wilaya ${code} in ${FILE}`);
  return f;
};

const outlines = JSON.parse(readFileSync(OUTLINES, "utf-8"));
const outlineOf = (code) => {
  const row = outlines.communes.find((c) => c.code_commune === code);
  if (!row?.outline) throw new Error(`no OSM outline for commune ${code} in ${OUTLINES}`);
  return row;
};

/** The chef-lieu points the sweep measured, as the acceptance check. */
const CENTRES = {
  5513: { wilaya: 55, point: [5.425556, 32.6999655] },
  5507: { wilaya: 55, point: [5.51259, 32.6130464] },
  4713: { wilaya: 47, point: [3.7459731, 31.979444] },
};

const check = process.argv.includes("--check");
const before = Object.fromEntries(
  TRANSFERS.flatMap((t) => [t.from, t.to]).map((c) => [c, geomArea(feature(c).geometry)]),
);

if (check) {
  const wrong = [];
  for (const [code, { wilaya, point }] of Object.entries(CENTRES)) {
    if (!inGeometry(point, feature(wilaya).geometry)) wrong.push(`commune ${code} centre is outside w${wilaya}`);
  }
  for (const t of TRANSFERS) {
    for (const code of t.communes) {
      const { point } = CENTRES[code];
      if (inGeometry(point, feature(t.from).geometry)) wrong.push(`commune ${code} centre is still inside w${t.from}`);
    }
  }
  if (wrong.length) {
    console.error(`FAIL: the committed file is not corrected\n  ${wrong.join("\n  ")}`);
    process.exit(1);
  }
  console.log("OK: all three communes' centres are inside their declared wilaya and out of the old one");
  process.exit(0);
}

for (const t of TRANSFERS) {
  const rows = t.communes.map(outlineOf);
  console.log(
    `w${t.from} -> w${t.to}: ${rows.map((r) => `${r.name_fr} (${r.code_commune}, OSM relation ${r.osm_relation_id})`).join(", ")}`,
  );

  // The transferred territory, simplified before the set operations so the arc
  // the two wilayas end up sharing is one simplified arc, identical in both.
  // A commune's outer rings are separate polygons; its inner rings are holes, so
  // they are subtracted rather than stitched onto one of them blindly.
  let patch = null;
  for (const row of rows) {
    const simp = (r) => simplifyRing(r, SIMPLIFY_DEG);
    let commune = row.outline.outer.map((r) => [simp(r)]);
    if (row.outline.inner.length) {
      commune = polygonClipping.difference(commune, row.outline.inner.map((r) => [simp(r)]));
    }
    patch = patch ? polygonClipping.union(patch, commune) : commune;
  }

  const fromF = feature(t.from);
  const toF = feature(t.to);

  // The pair's combined territory, which the transfer must reproduce exactly.
  // The two polygons were extracted and simplified together, so they already
  // share their border cleanly: this union is one polygon with no hole and the
  // area is the plain sum. Anything else means the base geometry, not the patch,
  // is the problem, and the transfer would paper over it.
  const pairUnion = polygonClipping.union(asMulti(fromF.geometry), asMulti(toF.geometry));
  const pairBefore = before[t.from] + before[t.to];
  if (Math.abs(multiArea(pairUnion) - pairBefore) > 1) {
    throw new Error(
      `w${t.from} and w${t.to} do not tile: union ${Math.round(multiArea(pairUnion))} km2 vs sum ${Math.round(pairBefore)} km2`,
    );
  }

  const clipped = polygonClipping.intersection(patch, asMulti(fromF.geometry));
  if (!clipped.length) throw new Error(`w${t.from}: the transferred outlines do not intersect it at all`);
  console.log(`  ${Math.round(multiArea(clipped))} km2 moves (${Math.round(multiArea(patch))} km2 of outline, clipped to w${t.from})`);

  // Take the territory off `from` first, then give `to` everything the pair holds
  // and `from` no longer does. Deriving `to` as the complement rather than as a
  // second union is what keeps the two exactly complementary: a sliver the filter
  // drops from `from` lands in `to` instead of becoming a gap, and the shared arc
  // is one arc rather than two boolean results that have to agree.
  const shrunk = dropOffcuts(polygonClipping.difference(asMulti(fromF.geometry), clipped), `w${t.from}`);
  const grown = dropOffcuts(polygonClipping.difference(pairUnion, shrunk), `w${t.to}`);

  // One quantiser for the pair, built from the 67 polygons outside it, so the two
  // halves map their shared arc to the same vertices.
  const guards = fc.features
    .filter((f) => ![t.from, t.to].includes(Number(f.properties?.code)))
    .map((f) => f.geometry);
  const q = quantiser(guards);
  const write = (f, multi, label) => {
    const slitFree = cleanRings(multi, label, SLIT_DEG);
    const r = cleanRings(q.apply(slitFree), label);
    const dropped = multi.reduce((n, p) => n + p[0].length, 0) - r.reduce((n, p) => n + p[0].length, 0);
    if (dropped) console.log(`  ${label}: ${dropped} slit/degenerate vertex/vertices removed`);
    f.geometry = r.length === 1 ? { type: "Polygon", coordinates: r[0] } : { type: "MultiPolygon", coordinates: r };
  };
  write(toF, grown, `w${t.to}`);
  write(fromF, shrunk, `w${t.from}`);
  if (q.snapped.length) console.log(`  snapped to an untouched wilaya's vertex: ${q.snapped.join("; ")}`);
  if (q.kept.length) console.log(`  kept at full precision: ${q.kept.join("; ")}`);

  // to' and from' must be disjoint, and together cover what they covered before.
  const overlap = polygonClipping.intersection(asMulti(toF.geometry), asMulti(fromF.geometry));
  const overlapKm2 = overlap.length ? sliverKm2(overlap) : 0;
  const pairAfter = geomArea(fromF.geometry) + geomArea(toF.geometry);
  console.log(
    `  w${t.to} ${Math.round(before[t.to])} -> ${Math.round(geomArea(toF.geometry))} km2, ` +
      `w${t.from} ${Math.round(before[t.from])} -> ${Math.round(geomArea(fromF.geometry))} km2 ` +
      `(pair ${pairBefore.toFixed(3)} -> ${pairAfter.toFixed(3)}, overlap ${overlapKm2.toFixed(4)} km2)`,
  );
  if (overlapKm2 > MAX_PAIR_OVERLAP_KM2) {
    throw new Error(`w${t.to} and w${t.from} overlap by ${overlapKm2.toFixed(4)} km2`);
  }
  if (Math.abs(pairAfter - pairBefore) > Math.max(5, pairBefore * 0.0005)) {
    throw new Error(`the pair's total area moved by ${Math.round(pairAfter - pairBefore)} km2: territory was created or lost`);
  }
  for (const code of t.communes) {
    const { wilaya, point } = CENTRES[code];
    if (!inGeometry(point, feature(wilaya).geometry)) throw new Error(`commune ${code}'s centre is still not inside w${wilaya}`);
    if (inGeometry(point, feature(t.from).geometry)) throw new Error(`commune ${code}'s centre is still inside w${t.from}`);
  }
}

// Two zero-width spikes predate this correction and fail the ring-validity rule
// the review added: w18 idx 9-11 (5.885,36.83 -> 5.904,36.836 -> 5.885,36.83) and
// w31 idx 2-4 (-0.175,35.8 -> -0.173,35.813 -> -0.175,35.8). A spike encloses no
// area, so dropping the tip is not a border change; it only stops GEOS reading the
// ring as self-intersecting. Nothing else in the 65 untouched polygons moves.
for (const f of fc.features) {
  const before = JSON.stringify(f.geometry.coordinates);
  const cleaned = cleanRings(asMulti(f.geometry), `w${f.properties.code}`);
  const geom = cleaned.length === 1 ? { type: "Polygon", coordinates: cleaned[0] } : { type: "MultiPolygon", coordinates: cleaned };
  if (JSON.stringify(geom.coordinates) !== before) {
    console.log(`  w${f.properties.code}: removed a degenerate vertex pair predating this correction`);
    f.geometry = geom;
  }
}

// Nothing may overlap anything, not just the pairs this script edited: a rounded
// vertex can cross a border the transfer never went near.
const allOverlaps = [];
const codes = fc.features.map((f) => Number(f.properties.code));
for (let i = 0; i < codes.length; i++) {
  for (let j = i + 1; j < codes.length; j++) {
    const a = asMulti(feature(codes[i]).geometry);
    const b = asMulti(feature(codes[j]).geometry);
    const inter = polygonClipping.intersection(a, b);
    const km2 = inter.length ? sliverKm2(inter) : 0;
    if (km2 > MAX_PAIR_OVERLAP_KM2) allOverlaps.push(`w${codes[i]} x w${codes[j]}: ${km2.toFixed(4)} km2`);
  }
}
if (allOverlaps.length) throw new Error(`overlapping polygons, refusing to write:\n  ${allOverlaps.join("\n  ")}`);
console.log(`  all ${(codes.length * (codes.length - 1)) / 2} pairs overlap by at most ${MAX_PAIR_OVERLAP_KM2} km2`);

// Match the file's existing formatting exactly: minified, no trailing newline.
writeFileSync(FILE, JSON.stringify(fc));
console.log(`Wrote ${FILE}`);
for (const code of [...new Set(TRANSFERS.flatMap((t) => [t.to, t.from]))].sort((a, b) => a - b)) {
  const g = feature(code).geometry;
  console.log(`  w${code}: ${g.type}, ${asMulti(g).reduce((n, p) => n + p.reduce((m, r) => m + r.length, 0), 0)} vertices`);
}

// Shared geometry helpers for the commune boundary build and its guard.
//
// Planar degrees throughout: ratios and containment verdicts do not need km2, and
// the one km2 figure (overlap) is converted at the commune's own latitude by the
// caller. Coordinates are [lng, lat].

import polygonClipping from "polygon-clipping";

export const PRECISION_DP = 4;
export const TOLERANCE_DEG = 0.0005;

export const round = (v, dp = PRECISION_DP) => Number(v.toFixed(dp));

/** Signed shoelace area of a closed ring, in deg2. Positive is counter-clockwise. */
export function ringArea(ring) {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return s / 2;
}

/** Area of a polygon (outer ring minus holes) in deg2. */
export const polygonArea = (poly) =>
  Math.abs(ringArea(poly[0])) - poly.slice(1).reduce((a, r) => a + Math.abs(ringArea(r)), 0);

export const multiArea = (mp) => mp.reduce((a, p) => a + polygonArea(p), 0);

/** Polygon list of a GeoJSON Polygon or MultiPolygon geometry. */
export const polygonsOf = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);

export function bboxOf(polys) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of polys)
    for (const [x, y] of p[0]) {
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }
  return b;
}

export function bboxIoU(a, b) {
  const w = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0]));
  const h = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const i = w * h;
  return i / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - i);
}

/** Douglas-Peucker on an open polyline; keeps both ends. */
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let worst = -1;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    let d;
    if (len2 === 0) d = Math.hypot(px - ax, py - ay);
    else {
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    }
    if (d > worst) {
      worst = d;
      at = i;
    }
  }
  if (worst <= tol) return [pts[0], pts[pts.length - 1]];
  return [...dp(pts.slice(0, at + 1), tol).slice(0, -1), ...dp(pts.slice(at), tol)];
}

/** Simplify a closed ring, round it and drop repeated vertices. Returns null if it collapses. */
export function reduceRing(ring, tol = TOLERANCE_DEG, dpPlaces = PRECISION_DP) {
  const open = ring.slice(0, -1);
  // Anchor at the two vertices furthest apart on the x axis so a closed ring is not
  // simplified from an arbitrary start.
  let lo = 0;
  let hi = 0;
  open.forEach((p, i) => {
    if (p[0] < open[lo][0]) lo = i;
    if (p[0] > open[hi][0]) hi = i;
  });
  const rot = [...open.slice(lo), ...open.slice(0, lo)];
  const split = rot.findIndex((p) => p === open[hi]);
  const a = dp(rot.slice(0, split + 1), tol);
  const b = dp([...rot.slice(split), rot[0]], tol);
  const kept = [...a.slice(0, -1), ...b.slice(0, -1)].map(([x, y]) => [round(x, dpPlaces), round(y, dpPlaces)]);
  const clean = kept.filter((p, i) => i === 0 || p[0] !== kept[i - 1][0] || p[1] !== kept[i - 1][1]);
  if (clean.length > 1 && clean[0][0] === clean[clean.length - 1][0] && clean[0][1] === clean[clean.length - 1][1])
    clean.pop();
  if (clean.length < 3) return null;
  clean.push(clean[0]);
  return Math.abs(ringArea(clean)) > 0 ? clean : null;
}

/** Exterior counter-clockwise, holes clockwise (RFC 7946). */
export function orient(poly) {
  return poly.map((r, i) => {
    const ccw = ringArea(r) > 0;
    return (i === 0) === ccw ? r : [...r].reverse();
  });
}

/** Share of `poly` (a polygon list) lying inside `container` (a polygon list), 0 to 1. */
export function shareInside(poly, container) {
  const total = multiArea(poly);
  if (total === 0) return 0;
  const inter = polygonClipping.intersection(poly, container);
  return multiArea(inter) / total;
}

/** Area in km2 of a deg2 figure at a given latitude. */
export const km2At = (deg2, lat) => deg2 * 111.32 * 111.32 * Math.cos((lat * Math.PI) / 180);

/** Fold a name for a corroboration check only: never an identity key. */
export const foldName = (s) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");

export const ringIsSimple = (ring) => findCrossing(ring) === null;

/** First pair of edge indexes [i, j] that cross, touch or spike on a closed ring, or null. */
export function findCrossing(ring) {
  const n = ring.length - 1;
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const sign = (v) => (v > 1e-12 ? 1 : v < -1e-12 ? -1 : 0);
  const within = (a, b, p) =>
    Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
  const touch = (a, b, c, d) => {
    const d1 = sign(cross(c, d, a));
    const d2 = sign(cross(c, d, b));
    const d3 = sign(cross(a, b, c));
    const d4 = sign(cross(a, b, d));
    if (d1 * d2 < 0 && d3 * d4 < 0) return true;
    return (d1 === 0 && within(c, d, a)) || (d2 === 0 && within(c, d, b)) ||
      (d3 === 0 && within(a, b, c)) || (d4 === 0 && within(a, b, d));
  };
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (i, j) => Math.min(ring[i][0], ring[i + 1][0]) - Math.min(ring[j][0], ring[j + 1][0]),
  );
  for (let a = 0; a < n; a++) {
    const i = order[a];
    const maxX = Math.max(ring[i][0], ring[i + 1][0]);
    for (let b = a + 1; b < n; b++) {
      const j = order[b];
      if (Math.min(ring[j][0], ring[j + 1][0]) > maxX) break;
      const adjacent = Math.abs(i - j) === 1 || Math.abs(i - j) === n - 1;
      if (adjacent) {
        // Neighbours share one endpoint by construction; only a spike (both edges
        // leaving the shared vertex the same way along one line) is a fault.
        const e1 = [ring[i], ring[i + 1]];
        const e2 = [ring[j], ring[j + 1]];
        const same = (p, q) => p[0] === q[0] && p[1] === q[1];
        const s = e1.find((p) => e2.some((q) => same(p, q)));
        const u = e1.find((p) => !same(p, s));
        const v = e2.find((p) => !same(p, s));
        if (!s || !u || !v) return [i, j]; // a repeated or doubled-back edge
        const dot = (u[0] - s[0]) * (v[0] - s[0]) + (u[1] - s[1]) * (v[1] - s[1]);
        if (sign(cross(u, s, v)) === 0 && dot > 0) return [i, j];
        continue;
      }
      if (touch(ring[i], ring[i + 1], ring[j], ring[j + 1])) return [i, j];
    }
  }
  return null;
}

/**
 * Make a self-touching ring simple by deleting vertices only, never adding or moving
 * one: at each crossing, drop whichever of the four edge endpoints changes the area
 * least. Returns { ring, removed, areaChange } or null if it cannot be made simple.
 */
export function repairRing(ring, maxRemovals = 40) {
  let cur = ring.slice(0, -1);
  const before = Math.abs(ringArea([...cur, cur[0]]));
  let removed = 0;
  for (;;) {
    const closed = [...cur, cur[0]];
    const hit = findCrossing(closed);
    if (!hit) return { ring: closed, removed, areaChange: Math.abs(Math.abs(ringArea(closed)) - before) / before };
    if (removed >= maxRemovals || cur.length <= 4) return null;
    const n = cur.length;
    const cands = [...new Set(hit.flatMap((e) => [e, (e + 1) % n]))];
    let best = null;
    for (const k of cands) {
      const next = cur.filter((_, idx) => idx !== k);
      const d = Math.abs(Math.abs(ringArea([...next, next[0]])) - before);
      if (!best || d < best.d) best = { k, d };
    }
    cur = cur.filter((_, idx) => idx !== best.k);
    removed++;
  }
}

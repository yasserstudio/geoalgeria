// Pure geometric checks for one bus Direction (ADR 0003).
// `path`: the Direction's drawn path as ordered parts, each an array of [lng, lat].
// `stations`: the Direction's member Stations in Membership order, { id, lat, lng }.
// No I/O; distances in metres on a local equirectangular projection (city scale).

const R = 6371008.8;

export const DEFAULTS = { nearPathM: 50, backtrackM: 100, terminusM: 300, gapM: 200 };

function projector(lat0) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return ([lng, lat]) => [((lng * Math.PI) / 180) * R * k, ((lat * Math.PI) / 180) * R];
}

function pointToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return { distance: Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)), t };
}

// Every segment's nearest point to p: its distance and how far along the path it lies.
function positionsOnPath(p, parts) {
  const positions = [];
  let offset = 0;
  for (const part of parts) {
    for (let i = 1; i < part.length; i++) {
      const a = part[i - 1];
      const b = part[i];
      const { distance, t } = pointToSegment(p, a, b);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      positions.push({ distance, along: offset + t * len });
      offset += len;
    }
  }
  return positions;
}

// Where a Station sits on the path, read in Membership order: the first position
// near the path that does not go back past the previous Station. A path that
// runs twice along one road (out and back) then places each Station on the leg
// it belongs to. With no such position, fall back to the nearest one.
function locate(positions, previousAlong, opts) {
  const nearest = positions.reduce((best, q) => (q.distance < best.distance ? q : best));
  const forward = positions
    .filter((q) => q.distance <= opts.nearPathM && q.along >= previousAlong - opts.backtrackM)
    .sort((x, y) => x.along - y.along)[0];
  return forward ? { ...forward, distance: nearest.distance } : nearest;
}

// Breaks of more than gapM between one part's end and the next part's start.
// Needs no Stations, so it also judges paths of Directions too sparse to order.
export function checkContinuity(path, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const project = projector(path[0][0][1]);
  const parts = path.map((part) => part.map(project));
  const gaps = parts.slice(1).filter((part, i) => {
    const prev = parts[i][parts[i].length - 1];
    return Math.hypot(part[0][0] - prev[0], part[0][1] - prev[1]) > opts.gapM;
  }).length;
  return { rule: "continuity", pass: gaps === 0, gaps };
}

export function checkDirection(path, stations, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const project = projector(path[0][0][1]);
  const parts = path.map((part) => part.map(project));

  // Order is judged only between Stations on the path: one far off it has no
  // trustworthy position, so it neither fails nor anchors the next Station.
  const located = [];
  const backwards = [];
  let previousAlong = -Infinity;
  for (const s of stations) {
    const here = { id: s.id, ...locate(positionsOnPath(project([s.lng, s.lat]), parts), previousAlong, opts) };
    located.push(here);
    if (here.distance > opts.nearPathM) continue;
    if (here.along < previousAlong - opts.backtrackM) backwards.push(s.id);
    previousAlong = here.along;
  }

  const far = located.filter((s) => s.distance > opts.nearPathM).map((s) => s.id);

  const start = parts[0][0];
  const lastPart = parts[parts.length - 1];
  const end = lastPart[lastPart.length - 1];
  const first = stations[0];
  const last = stations[stations.length - 1];
  const offEnd = [
    [first, start],
    [last, end],
  ]
    .filter(([s, p]) => {
      const q = project([s.lng, s.lat]);
      return Math.hypot(q[0] - p[0], q[1] - p[1]) > opts.terminusM;
    })
    .map(([s]) => s.id);

  const checks = [
    { rule: "near_path", pass: far.length === 0, failing: far },
    { rule: "path_order", pass: backwards.length === 0, failing: backwards },
    { rule: "termini", pass: offEnd.length === 0, failing: offEnd },
    checkContinuity(path, opts),
  ];

  return { status: checks.every((c) => c.pass) ? "consistent" : "inconsistent", checks };
}

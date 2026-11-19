// Builds the bus QA report (ADR 0003) from a local OSM pull plus the package
// data. Pure: callers read the files and pass plain objects in.
//
// sources = {
//   osm: { elements },  Overpass elements: the route relations and their ways (with geometry)
//   directions, memberships, stations,  arrays from packages/buses/data
//   stopCounts,  optional { [line_id]: number } from an Operator's own figure
//   options,  optional threshold overrides for checkDirection
// }

import { checkContinuity, checkDirection } from "./check-direction.mjs";

const STATUS = {
  consistent: "osm_member_order_consistent",
  inconsistent: "osm_member_order_inconsistent",
};

const squared = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;

// A way that marks a stop rather than carrying the bus (same test as collect-osm.mjs).
function isStopWay(member, way) {
  const role = member.role?.toLowerCase() ?? "";
  const tags = way?.tags ?? {};
  return role.includes("stop") || role.includes("platform") ||
    tags.highway === "bus_stop" || tags.amenity === "bus_station" ||
    tags.public_transport === "platform" || tags.public_transport === "stop_position";
}

// The relation's ways in member order, each turned to run in the direction of
// travel: a way is reversed when its far end is the one touching the previous way.
// A lone way has no neighbour, so it is turned to start nearer the first Station.
function pathOf(relation, ways, firstStation) {
  const parts = relation.members
    .filter((m) => m.type === "way" && !isStopWay(m, ways.get(m.ref)))
    .map((m) => ways.get(m.ref)?.geometry?.map((p) => [p.lon, p.lat]) ?? [])
    .filter((coords) => coords.length >= 2);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === 0) {
      const next = parts[1];
      if (!next) {
        const p = firstStation && [firstStation.lng, firstStation.lat];
        if (p && squared(part[part.length - 1], p) < squared(part[0], p)) part.reverse();
        continue;
      }
      const touch = (p) => Math.min(squared(p, next[0]), squared(p, next[next.length - 1]));
      if (touch(part[0]) < touch(part[part.length - 1])) part.reverse();
    } else {
      const prevEnd = parts[i - 1][parts[i - 1].length - 1];
      if (squared(part[part.length - 1], prevEnd) < squared(part[0], prevEnd)) part.reverse();
    }
  }
  return parts;
}

// OSM lists a stop as a platform, a stop position, or both; the larger role group
// is the number of stopping points.
function stoppingPoints(members) {
  const count = (word) => members.filter((m) => (m.role ?? "").includes(word)).length;
  return Math.max(count("platform"), count("stop")) || members.length;
}

// Advisory only (ADR 0003: status is geometric): the Operator's figure may be stale.
function stopCountCheck(members, figure, tolerance = 0.1) {
  if (figure == null) return undefined;
  const osm = stoppingPoints(members);
  return { osm, operator: figure, pass: Math.abs(osm - figure) <= figure * tolerance };
}

export function buildReport({ osm, directions, memberships, stations, stopCounts = {}, options = {} }) {
  const relations = new Map();
  const ways = new Map();
  for (const e of osm.elements) {
    if (e.type === "relation") relations.set(e.id, e);
    if (e.type === "way") ways.set(e.id, e);
  }
  const stationById = new Map(stations.map((s) => [s.id, s]));

  const rows = directions.map((direction) => {
    const row = {
      direction_id: direction.id,
      line_id: direction.line_id,
      osm_relation_id: direction.osm_relation_id,
    };
    const unvalidated = (reason) => ({ ...row, status: "osm_member_order_unvalidated", reason });

    const relation = relations.get(direction.osm_relation_id);
    if (!relation) return unvalidated("relation_not_in_pull");
    const members = memberships
      .filter((m) => m.direction_id === direction.id)
      .sort((a, b) => a.osm_member_index - b.osm_member_index);
    const ordered = members.map((m) => stationById.get(m.station_id));
    const path = pathOf(relation, ways, ordered[0]);
    if (!path.length) return unvalidated("no_path_geometry");
    if (ordered.length < 2) return { ...unvalidated("fewer_than_two_stations"), checks: [checkContinuity(path)] };

    const verdict = checkDirection(path, ordered, options);
    const stop_count = stopCountCheck(members, stopCounts[direction.line_id]);
    return { ...row, status: STATUS[verdict.status], checks: verdict.checks, ...(stop_count && { stop_count }) };
  });

  return { directions: rows };
}

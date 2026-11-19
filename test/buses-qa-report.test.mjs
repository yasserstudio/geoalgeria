import test from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "../research/buses/qa/build-report.mjs";

// Three points 1 km apart along latitude 36.75 (Algiers).
const A = { lat: 36.75, lon: 3.0 };
const B = { lat: 36.75, lon: 3.011 };
const C = { lat: 36.75, lon: 3.022 };

const way = (id, ...points) => ({ type: "way", id, geometry: points, tags: { highway: "primary" } });
const relation = (id, members) => ({ type: "relation", id, members, tags: { route: "bus" } });
const station = (id, p) => ({ id, lat: p.lat, lng: p.lon });
const membership = (direction_id, station_id, osm_member_index) => ({ direction_id, station_id, osm_member_index });

function fixture(ways) {
  return {
    osm: {
      elements: [
        relation(10, [
          { type: "node", ref: 1, role: "platform" },
          { type: "node", ref: 2, role: "platform" },
          { type: "node", ref: 3, role: "platform" },
          ...ways.map((w) => ({ type: "way", ref: w.id, role: "" })),
        ]),
        ...ways,
      ],
    },
    directions: [{ id: "osm-relation-10", line_id: "x-1", osm_relation_id: 10 }],
    stations: [station("s-a", A), station("s-b", B), station("s-c", C)],
    memberships: [
      membership("osm-relation-10", "s-a", 0),
      membership("osm-relation-10", "s-b", 1),
      membership("osm-relation-10", "s-c", 2),
    ],
  };
}

test("ways stored against the direction of travel are turned round before checking", () => {
  const report = buildReport(fixture([way(100, A, B), way(101, C, B)])); // second way drawn C->B
  const [direction] = report.directions;
  assert.equal(direction.direction_id, "osm-relation-10");
  assert.equal(direction.status, "osm_member_order_consistent");
});

test("a Direction that cannot be checked stays unvalidated and says why", () => {
  const missing = fixture([way(100, A, B), way(101, B, C)]);
  missing.directions.push({ id: "osm-relation-99", line_id: "x-2", osm_relation_id: 99 });
  const noPath = fixture([]);
  const oneStation = fixture([way(100, A, B), way(101, B, C)]);
  oneStation.memberships = oneStation.memberships.slice(0, 1);

  const byId = (report, id) => report.directions.find((d) => d.direction_id === id);
  assert.deepEqual(
    [byId(buildReport(missing), "osm-relation-99"), byId(buildReport(noPath), "osm-relation-10"), byId(buildReport(oneStation), "osm-relation-10")]
      .map((d) => [d.status, d.reason]),
    [
      ["osm_member_order_unvalidated", "relation_not_in_pull"],
      ["osm_member_order_unvalidated", "no_path_geometry"],
      ["osm_member_order_unvalidated", "fewer_than_two_stations"],
    ],
  );
});

test("stop count is compared with the Operator's figure within 10 %, as advice that leaves the status alone", () => {
  const sources = fixture([way(100, A, B), way(101, B, C)]);
  // OSM lists a stop as a platform, a stop position, or both: count the larger role group.
  sources.memberships = sources.memberships.flatMap((m) => [
    { ...m, role: "platform" },
    { ...m, role: "stop", osm_member_index: m.osm_member_index + 0.5 },
  ]);
  const stopCount = (figure) =>
    buildReport({ ...sources, stopCounts: { "x-1": figure } }).directions[0];

  const close = stopCount(3);
  assert.deepEqual(close.stop_count, { osm: 3, operator: 3, pass: true });
  const far = stopCount(5);
  assert.deepEqual(far.stop_count, { osm: 3, operator: 5, pass: false });
  assert.equal(far.status, "osm_member_order_consistent"); // ADR 0003: status is geometric only
  assert.equal(buildReport(sources).directions[0].stop_count, undefined); // no figure, no check
});

test("a relation of one way drawn against travel is turned round by its Stations", () => {
  const report = buildReport(fixture([way(100, C, A)]));
  assert.equal(report.directions[0].status, "osm_member_order_consistent");
});

test("a Direction with too few Stations still gets its path's continuity judged", () => {
  const sources = fixture([way(100, A, { lat: 36.75, lon: 3.005 }), way(101, B, C)]); // ~550 m hole
  sources.memberships = sources.memberships.slice(0, 1);
  const [row] = buildReport(sources).directions;
  assert.equal(row.status, "osm_member_order_unvalidated");
  assert.deepEqual(row.checks, [{ rule: "continuity", pass: false, gaps: 1 }]);
});

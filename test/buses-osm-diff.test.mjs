import test from "node:test";
import assert from "node:assert/strict";
import { diffPulls } from "../research/buses/qa/diff-pulls.mjs";

const A = { lat: 36.75, lon: 3.0 };
const B = { lat: 36.75, lon: 3.011 };
const C = { lat: 36.75, lon: 3.022 };

const way = (id, ...points) => ({ type: "way", id, geometry: points, tags: { highway: "primary" } });
const relation = (id, wayIds, tags = {}) => ({
  type: "relation",
  id,
  members: wayIds.map((ref) => ({ type: "way", ref, role: "" })),
  tags: { route: "bus", ref: String(id), ...tags },
});
const pull = (...elements) => ({ elements });

test("relations are sorted into added, removed, changed and unchanged", () => {
  const previous = pull(relation(1, [100]), relation(2, [100]), relation(3, [100]), way(100, A, B));
  const current = pull(relation(1, [100]), relation(3, [100, 101]), relation(4, [101]), way(100, A, B), way(101, B, C));
  const diff = diffPulls(previous, current);
  assert.deepEqual(diff.added, [4]);
  assert.deepEqual(diff.removed, [2]);
  assert.deepEqual(diff.changed.map((c) => c.id), [3]);
  assert.equal(diff.unchanged, 1);
});

test("a change says whether members, path geometry or tags moved", () => {
  const previous = pull(relation(1, [100]), relation(2, [100]), relation(3, [100]), way(100, A, B));
  const current = pull(
    relation(1, [100, 101]), // member added
    relation(2, [100], { name: "renamed" }), // tag only
    relation(3, [100]),
    way(100, A, C), // way 100 redrawn: touches 1, 2 and 3
    way(101, B, C),
  );
  const byId = Object.fromEntries(diffPulls(previous, current).changed.map((c) => [c.id, c]));
  assert.deepEqual(byId[1], { id: 1, members: true, geometry: true, tags: false });
  assert.deepEqual(byId[2], { id: 2, members: false, geometry: true, tags: true });
  assert.deepEqual(byId[3], { id: 3, members: false, geometry: true, tags: false });
});

test("shipped Directions are told what happened to their relation", () => {
  const previous = pull(relation(1, [100]), relation(2, [100]), relation(3, [100]), way(100, A, B));
  const current = pull(relation(1, [100]), relation(3, [100], { name: "x" }), way(100, A, B));
  const shipped = [
    { id: "osm-relation-1", osm_relation_id: 1 },
    { id: "osm-relation-2", osm_relation_id: 2 },
    { id: "osm-relation-3", osm_relation_id: 3 },
    { id: "operator-list-x", osm_relation_id: null },
  ];
  assert.deepEqual(diffPulls(previous, current, shipped).shipped, [
    { direction_id: "osm-relation-1", osm_relation_id: 1, change: "unchanged" },
    { direction_id: "osm-relation-2", osm_relation_id: 2, change: "removed" },
    { direction_id: "osm-relation-3", osm_relation_id: 3, change: "changed" },
  ]);
});

test("splitting a way without moving it is a member change, not a geometry change", () => {
  const previous = pull(relation(1, [100]), way(100, A, B, C));
  const current = pull(relation(1, [101, 102]), way(101, A, B), way(102, B, C));
  assert.deepEqual(diffPulls(previous, current).changed, [{ id: 1, members: true, geometry: false, tags: false }]);
});

test("a relation that newly appears keeps its shipped Direction marked added", () => {
  const shipped = [{ id: "osm-relation-5", osm_relation_id: 5 }];
  const diff = diffPulls(pull(), pull(relation(5, [100]), way(100, A, B)), shipped);
  assert.deepEqual(diff.shipped, [{ direction_id: "osm-relation-5", osm_relation_id: 5, change: "added" }]);
});

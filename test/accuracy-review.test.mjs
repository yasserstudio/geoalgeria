import assert from "node:assert/strict";
import test from "node:test";
import { loadBoundaries, wilayaNeighbours } from "../packages/schema/index.js";
import { buildAccuracyReview, isGeospatialEntity } from "../scripts/lib/accuracy-review.mjs";

const feature = (code, left) => ({
  type: "Feature",
  properties: { code },
  geometry: { type: "Polygon", coordinates: [[[left, 0], [left + 1, 0], [left + 1, 1], [left, 1], [left, 0]]] },
});
const fc = { type: "FeatureCollection", features: [feature("01", 0), feature("02", 1), feature("03", 2)] };
const boundaries = loadBoundaries(fc);
const neighbours = wilayaNeighbours(fc);
const record = (id, overrides = {}) => ({
  id, name: `Establishment ${id}`, lat: 0.5, lng: 0.5,
  wilaya_code: "01", geo_precision: "exact", source: "official+osm",
  refs: { osm: `node/${id}` }, ...overrides,
});
const build = (records) => buildAccuracyReview({ dataset: "test", entity: "records.json", records, boundaries, neighbours });

test("geospatial detection retains all-null entities and excludes relationships and aggregates", () => {
  assert.equal(isGeospatialEntity([{ id: "1", lat: null, lng: null }]), true);
  assert.equal(isGeospatialEntity([{ from: "1", to: "2" }]), false);
  assert.equal(isGeospatialEntity({ count: 10 }), false);
  assert.equal(isGeospatialEntity([]), false);
});

test("colocated records remain distinct review candidates with intact source snapshots", () => {
  const records = [record("b", { name: "ATM" }), record("a", { name: "Office" })];
  const original = structuredClone(records);
  const review = build(records);
  assert.equal(review.candidates.length, 2);
  assert.equal(review.summary.total_records, 2);
  assert.deepEqual(review.coordinate_groups[0].record_ids, ["a", "b"]);
  for (const candidate of review.candidates) {
    assert.deepEqual(candidate.reasons, ["shared_coordinate"]);
    assert.equal("review_status" in candidate, false);
    assert.deepEqual(candidate.record, original.find((row) => row.id === candidate.record.id));
  }
  assert.deepEqual(records, original);
  records[0].refs.osm = "changed";
  assert.equal(review.candidates[1].record.refs.osm, "node/b");
});

test("null coordinates never become colocated points or boundary failures", () => {
  const review = build([record("a", { lat: null, lng: null, geo_precision: null }), record("b", { lat: null, lng: null, geo_precision: null })]);
  assert.deepEqual(review.coordinate_groups, []);
  assert.deepEqual(review.candidates.map((candidate) => candidate.reasons), [["missing_coordinate"], ["missing_coordinate"]]);
  assert.equal("boundary" in review.candidates[0], false);
  assert.deepEqual(build([record("c", { lat: null })]).candidates[0].reasons, ["invalid_coordinate", "invalid_geo_precision"]);
  assert.deepEqual(build([record("d", { lat: null, lng: null, geo_precision: null, wilaya_code: "99" })]).candidates[0].reasons,
    ["missing_coordinate", "missing_or_unknown_wilaya"]);
});

test("precision and coordinate type are audited without converting strings or fabricating precision", () => {
  assert.equal(build([record("a")]).candidates.length, 0);
  assert.deepEqual(build([record("a", { geo_precision: "approximate" })]).candidates[0].reasons, ["approximate_coordinate"]);
  for (const geo_precision of [null, undefined, "verified"]) {
    assert.deepEqual(build([record("a", { geo_precision })]).candidates[0].reasons, ["invalid_geo_precision"]);
  }
  assert.ok(build([record("a", { lat: "0.5" })]).candidates[0].reasons.includes("invalid_coordinate"));
  assert.ok(build([record("a", { lat: 91 })]).candidates[0].reasons.includes("invalid_coordinate"));
});

test("boundaries distinguish adjacent, nonadjacent, outside-all and unknown declared wilaya", () => {
  const cases = [
    [1.5, "01", ["inside_adjacent_wilaya", "outside_declared_wilaya"], ["02"]],
    [2.5, "01", ["inside_nonadjacent_wilaya", "outside_declared_wilaya"], ["03"]],
    [4, "01", ["outside_all_wilaya_boundaries", "outside_declared_wilaya"], []],
    [0.5, "99", ["missing_or_unknown_wilaya"], ["01"]],
  ];
  for (const [lng, wilaya_code, reasons, containing] of cases) {
    const candidate = build([record("a", { lng, wilaya_code })]).candidates[0];
    assert.deepEqual(candidate.reasons, reasons);
    assert.deepEqual(candidate.boundary.containing_wilayas, containing);
  }
});

test("snapshots and candidate IDs are deterministic across input ordering", () => {
  const records = [record("b"), record("a"), record("c", { lng: 2.5 })];
  assert.equal(JSON.stringify(build(records)), JSON.stringify(build([...records].reverse())));
  assert.deepEqual(build(records).candidates.map((candidate) => candidate.id), ["test/records.json/a", "test/records.json/b", "test/records.json/c"]);
  assert.throws(() => build([record("a"), record("a")]), /duplicate record id/);
  assert.throws(() => buildAccuracyReview({ records, boundaries: new Map() }), /Boundaries are required/);
});

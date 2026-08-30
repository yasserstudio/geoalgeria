import assert from "node:assert/strict";
import test from "node:test";
import { buildProtectionCivileReview } from "../scripts/lib/protection-civile-review.mjs";

const square = (west, south, east, north) => ({
  type: "Polygon",
  coordinates: [[
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ]],
});

const boundaries = new Map([
  ["01", square(0, 30, 2, 32)],
  ["02", square(2, 30, 4, 32)],
]);

const record = (overrides = {}) => ({
  id: "01-001",
  name_ar: "وحدة الحماية المدنية",
  statut: "UNITE PRINCIPALE",
  wilaya_code: "01",
  commune_code: "0101",
  commune: "Example",
  lat: 31,
  lng: 1,
  geo_precision: "exact",
  geo_method: "dgpc_map",
  refs: { dgpc: "10", dgpc_wilaya: "01" },
  ...overrides,
});

const rawFeature = (overrides = {}) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [1, 31] },
  properties: {
    objectid: 10,
    cod_wilaya: "01",
    nom_ar: "وحدة الحماية المدنية",
    statut: "UNITE PRINCIPALE",
    commune_1: "مثال",
    adresse: "EXAMPLE",
    x: 1,
    y: 31,
    ...overrides,
  },
});

function build(records, features = [rawFeature()]) {
  return buildProtectionCivileReview({
    records,
    rawFeatureCollection: { type: "FeatureCollection", features },
    boundaries,
    checkedAt: "2026-08-30",
    sourceSha256: "a".repeat(64),
    sourceRetrieved: "2026-08-30",
  });
}

test("exact DGPC points inside their declared wilaya stay out of the queue", () => {
  const review = build([record()]);
  assert.equal(review.summary.candidates, 0);
  assert.deepEqual(review.candidates, []);
});

test("approximate shared points and boundary mismatches retain every reason", () => {
  const records = [
    record({ geo_precision: "approximate" }),
    record({ id: "01-002", refs: { dgpc: "11", dgpc_wilaya: "01" }, geo_precision: "approximate" }),
    record({ id: "01-003", refs: { dgpc: "12", dgpc_wilaya: "01" }, lng: 3 }),
  ];
  const features = [rawFeature(), rawFeature({ objectid: 11 }), rawFeature({ objectid: 12, x: 3 })];
  const review = build(records, features);

  assert.equal(review.summary.candidates, 3);
  assert.deepEqual(review.candidates[0].reasons, ["approximate_coordinate", "shared_coordinate"]);
  assert.deepEqual(review.candidates[2].reasons, ["outside_declared_wilaya"]);
  assert.deepEqual(review.candidates[2].boundary.containing_wilayas, ["02"]);
});

test("reviewed coordinate changes remain auditable instead of looking like source drift", () => {
  const review = build([
    record({
      lat: 31.0001,
      lng: 1.0001,
      review_status: "corrected",
      reviewed_at: "2026-08-30",
      reviewed_by: "GeoAlgeria",
      review_evidence: ["https://www.openstreetmap.org/node/1"],
    }),
  ]);

  assert.deepEqual(review.candidates[0].reasons, ["reviewed_coordinate_override"]);
  assert.equal(review.summary.reviewed_candidates, 1);
});

test("the DGPC's known transposed property pair is normalized like the publisher", () => {
  const review = build(
    [record({ lat: 31, lng: 1 })],
    [rawFeature({ x: 31, y: 1 })],
  );

  assert.equal(review.summary.candidates, 0);
});

test("missing source links are explicit and output order is stable", () => {
  const review = build([
    record({ id: "01-002", refs: { dgpc: "404", dgpc_wilaya: "01" } }),
    record({ id: "01-001", refs: { dgpc: "405", dgpc_wilaya: "01" } }),
  ], []);

  assert.deepEqual(review.candidates.map((candidate) => candidate.record.id), ["01-001", "01-002"]);
  assert.deepEqual(review.candidates[0].reasons, ["missing_dgpc_source_record", "shared_coordinate"]);
});

test("the review receipt comes from the verified source-store capture", () => {
  const review = build([record({ geo_precision: "approximate" })]);

  assert.deepEqual(review.source_snapshot, {
    url: "https://dgpc.dz/dgpc2/unite.geojson",
    retrieved: "2026-08-30",
    feature_count: 1,
    sha256: "a".repeat(64),
  });
});

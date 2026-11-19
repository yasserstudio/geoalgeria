import test from "node:test";
import assert from "node:assert/strict";
import { geometryGaps, lineIdentity, matchRelations, promotableLines } from "../research/buses/qa/line-identity.mjs";

test("a Line identity ignores case, spacing and leading zeros of the number", () => {
  assert.equal(lineIdentity("etusa", " 02 "), lineIdentity("etusa", "2"));
  assert.equal(lineIdentity("etus-c", "L02"), lineIdentity("etus-c", "L2"));
  assert.equal(lineIdentity("etus-setif", "06B"), lineIdentity("etus-setif", "6b"));
  assert.equal(lineIdentity("x", "00"), lineIdentity("x", "0"));
  assert.notEqual(lineIdentity("x", "0A"), lineIdentity("x", "A"));
  assert.notEqual(lineIdentity("etusa", "2"), lineIdentity("etusto", "2"));
});

const lines = [
  { id: "etusa-2", operator_id: "etusa", line: "02", shape_id: "s1" },
  { id: "etus-c-L5", operator_id: "etus-c", line: "L05", shape_id: null },
];
const candidates = [
  { id: "c1", operator_id: "etusa", ref: "2", relation_ids: [10], map_readiness: "geometry_candidate" },
  { id: "c2", operator_id: "etusa", ref: "999", relation_ids: [11], map_readiness: "geometry_candidate" },
  { id: "c3", operator_id: null, ref: null, relation_ids: [12], map_readiness: "needs_identity" },
  { id: "c4", operator_id: "etus-c", ref: "L5", relation_ids: [13], map_readiness: "geometry_candidate" },
];

test("each relation is matched to one Line, or says why it is unmatched", () => {
  assert.deepEqual(matchRelations([10, 11, 12, 99], { lines, candidates }), [
    { osm_relation_id: 10, operator_id: "etusa", line_id: "etusa-2", match: "line" },
    { osm_relation_id: 11, operator_id: "etusa", line_id: null, match: "unmatched_line" },
    { osm_relation_id: 12, operator_id: null, line_id: null, match: "unmatched_operator" },
    { osm_relation_id: 99, operator_id: null, line_id: null, match: "unmatched_operator" },
  ]);
});

test("only Lines without a shape and with an unshipped geometry candidate are promotable", () => {
  assert.deepEqual(promotableLines({ lines, candidates, shippedRelations: new Set() }), [
    { candidate: "c4", line_id: "etus-c-L5", relation_ids: [13] },
  ]);
  assert.deepEqual(promotableLines({ lines, candidates, shippedRelations: new Set([13]) }), []);
});

test("a relation a Line already lists wins; a lettered Line matches its bare number when unique", () => {
  const lines = [
    { id: "etuad-AD-2", operator_id: "etuad", line: "AD-2", osm_relation_ids: [] },
    { id: "etus-x-7", operator_id: "etus-x", line: "7", osm_relation_ids: [21] },
    { id: "etus-x-A7", operator_id: "etus-x", line: "A7", osm_relation_ids: [] },
    { id: "etus-x-B7", operator_id: "etus-x", line: "B7", osm_relation_ids: [] },
  ];
  const candidates = [
    { id: "c1", operator_id: "etuad", ref: "2", relation_ids: [20] },
    { id: "c2", operator_id: "etus-x", ref: "A7", relation_ids: [21] },
    { id: "c3", operator_id: "etus-x", ref: "C7", relation_ids: [22] },
  ];
  assert.deepEqual(
    matchRelations([20, 21, 22], { lines, candidates }).map((m) => [m.osm_relation_id, m.line_id]),
    [[20, "etuad-AD-2"], [21, "etus-x-7"], [22, null]],
  );
});

// Owner 2026-11-19: the release bar is every Line accounted for. A Line with no
// Direction has no geometry yet, and the QA report says why, from data only.
test("every Line without a Direction gets a reason derived from the OSM and Operator data", () => {
  const lines = [
    { id: "etusa-1", operator_id: "etusa", line: "1", osm_relation_ids: [1] },
    { id: "etusa-33", operator_id: "etusa", line: "33", osm_relation_ids: [] },
    { id: "etusa-5", operator_id: "etusa", line: "5", osm_relation_ids: [] },
    { id: "etus-skikda-01", operator_id: "etus-skikda", line: "01", osm_relation_ids: [] },
  ];
  const directions = [{ id: "osm-relation-1", line_id: "etusa-1", osm_relation_id: 1 }];
  const candidates = [
    { id: "c1", operator_id: "etusa", ref: "1", relation_ids: [1], map_readiness: "geometry_candidate" },
    { id: "c33", operator_id: "etusa", ref: "033", relation_ids: [33, 34], map_readiness: "needs_identity" },
    { id: "c63", operator_id: "etusa", ref: "63", relation_ids: [63], map_readiness: "needs_identity" },
    { id: "cx", operator_id: null, ref: "9", relation_ids: [90], map_readiness: "review_only" },
  ];
  const added = [
    { osm_relation_id: 70, operator_id: "etus-skikda", line_id: null, match: "unmatched_line", name: "Ligne 7" },
    { osm_relation_id: 63, operator_id: "etusa", line_id: null, match: "unmatched_line", name: "63" }, // also a candidate
  ];
  assert.deepEqual(geometryGaps({ lines, directions, candidates, added, listedStopLineIds: new Set(["etus-skikda-01"]) }), {
    lines: [
      { line_id: "etusa-33", reason: "osm_relation_not_approved", osm_relation_ids: [33, 34] },
      { line_id: "etusa-5", reason: "no_osm_relation", osm_relation_ids: [] },
      { line_id: "etus-skikda-01", reason: "operator_list_only", osm_relation_ids: [] },
    ],
    unmatched_relations: [
      { osm_relation_id: 63, operator_id: "etusa" },
      { osm_relation_id: 70, operator_id: "etus-skikda" },
    ],
  });
});

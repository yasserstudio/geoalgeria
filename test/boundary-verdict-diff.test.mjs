// What the monthly boundary refresh calls a change worth a pull request.
//
// The workflow in .github/workflows/refresh-commune-boundary-cache.yml re-pulls
// OpenStreetMap and rebuilds the cache, and the geometry always moves: mappers
// refine a shoreline and 3.7 MB of reduced rings change without one commune centre
// changing side. Only a verdict that moved is a row a human has to decide, so only
// that opens a pull request. These are the four shapes that counts as.

import { test } from "node:test";
import assert from "node:assert/strict";

import { diffVerdicts, renderVerdictDiff } from "../scripts/lib/boundary-verdict-diff.mjs";

const doc = ({ base = "2026-09-29T13:04:54Z", outside = [], undecidable = [], nearEdge = [] }) => ({
  cache: {
    generated: base.slice(0, 10),
    timestamp_osm_base: base,
    tolerance_deg: 0.0005,
    count: 1541,
    relation_count: 1537,
    sha256: "f".repeat(64),
  },
  counts: { outside: outside.length, undecidable: undecidable.length, near_edge: nearEdge.length },
  outside,
  undecidable,
  near_edge: nearEdge,
});

const bethioua = {
  code_commune: 3109,
  wilaya_code: 31,
  name_fr: "Bethioua",
  osm_relation_id: 2800000,
  metres_outside: 412,
  reason: "the relation's admin_centre node is outside the commune too",
};
const tigzirt = { code_commune: 1538, wilaya_code: 15, name_fr: "Tigzirt", reason: "0 open outer ring(s), 0 closed" };

test("a refreshed pull that moves no verdict is not a change", () => {
  const before = doc({ outside: [bethioua] });
  const after = doc({ base: "2026-10-31T06:00:00Z", outside: [bethioua] });
  const diff = diffVerdicts(before, after);
  assert.equal(diff.changed, false);
  assert.equal(diff.osm_base_moved, true);
  const body = renderVerdictDiff(diff);
  assert.match(body, /\*\*No verdict changed\.\*\*/);
  assert.match(body, /2026-10-31T06:00:00Z/);
});

test("a centre that crossed its own boundary either way is a change", () => {
  const appeared = diffVerdicts(doc({}), doc({ base: "2026-10-31T06:00:00Z", outside: [bethioua] }));
  assert.equal(appeared.changed, true);
  assert.deepEqual(appeared.now_outside.map((r) => r.code_commune), [3109]);
  assert.deepEqual(appeared.now_inside, []);
  assert.match(renderVerdictDiff(appeared), /Now outside its own commune \(1\)/);
  assert.match(renderVerdictDiff(appeared), /Bethioua \(3109, w31\): 412 m/);

  const cleared = diffVerdicts(doc({ outside: [bethioua] }), doc({ base: "2026-10-31T06:00:00Z" }));
  assert.equal(cleared.changed, true);
  assert.deepEqual(cleared.now_inside.map((r) => r.code_commune), [3109]);
  assert.match(renderVerdictDiff(cleared), /Now inside its own commune \(1\)/);
});

test("a commune losing or regaining usable geometry is a change", () => {
  const lost = diffVerdicts(doc({}), doc({ base: "2026-10-31T06:00:00Z", undecidable: [tigzirt] }));
  assert.equal(lost.changed, true);
  assert.deepEqual(lost.lost_boundary.map((r) => r.name_fr), ["Tigzirt"]);
  assert.match(renderVerdictDiff(lost), /No usable OpenStreetMap boundary any more \(1\)/);

  const regained = diffVerdicts(doc({ undecidable: [tigzirt] }), doc({ base: "2026-10-31T06:00:00Z" }));
  assert.equal(regained.changed, true);
  assert.deepEqual(regained.gained_boundary.map((r) => r.name_fr), ["Tigzirt"]);
  assert.match(renderVerdictDiff(regained), /Decidable again \(1\)/);
});

test("a verdict that moves against an unchanged OSM base is reported as our bug", () => {
  // Overpass mirrors drift by hours, so the base is the only thing that says the
  // planet moved. The same base with a different verdict means the rebuild
  // disagreed with itself, and the body has to say so before anyone merges it.
  const diff = diffVerdicts(doc({}), doc({ outside: [bethioua] }));
  assert.equal(diff.changed, true);
  assert.equal(diff.osm_base_moved, false);
  assert.match(renderVerdictDiff(diff), /\*\*The OSM base did not move\.\*\*/);
});

test("near-edge rows are reported but do not open a pull request on their own", () => {
  // A centre inside its own commune by 5 m is where the reduction is close to doing
  // the deciding. Worth printing, not a verdict: nothing crossed.
  const diff = diffVerdicts(
    doc({}),
    doc({ base: "2026-10-31T06:00:00Z", nearEdge: [{ code_commune: 1538, wilaya_code: 15, name_fr: "Tigzirt", margin_m: 5 }] }),
  );
  assert.equal(diff.changed, false);
  assert.match(renderVerdictDiff(diff), /within the reduction tolerance \| 0 \| 1 \|/);
});

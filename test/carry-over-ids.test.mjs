// carryOverIds is the shared id-stability contract for every generator with a
// stable upstream key: regenerating must reproduce the SAME public ids, pinning
// each record back to what it shipped as and persisting retired ids across runs.
//
// The bug this guards (empirically: a live ecoles regen minted 20 duplicate-id
// pairs): the sequential assignIds() pass runs BEFORE carry-over and cannot know
// which {wilaya}-{seq} slots carry-over will pin back, so a new record can be
// handed the very slot a carried record returns to. carryOverIds must (a) never
// churn a carried id, (b) never let a new record reuse a reserved (pinned OR
// retired) committed id, (c) keep the final id set unique, and (d) fail loud on a
// duplicated committed carry key. Design target: upstream grows / shrinks / reorders.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  carryOverIds,
  readRetiredIds,
  writeRetiredIds,
} from "../scripts/lib/v2-transforms.mjs";

// A committed record + the same {wilaya}-{seq} id scheme the join packages use.
const rec = (id, key) => ({ id, refs: { osm: key } });
const keyOf = (r) => (r.refs?.osm ? `osm:${r.refs.osm}` : null);
const ids = (rows) => rows.map((r) => r.id);
const uniqueIds = (rows) => new Set(ids(rows)).size === rows.length;

// assignIds emits {wilaya}-{seq}, seq = position in the key-sorted order (1-based,
// width 5) — exactly the shape ecoles/mosquees derive before carry-over.
function assignIds(rows) {
  const byW = new Map();
  for (const r of rows) {
    const w = r.wilaya;
    (byW.get(w) || byW.set(w, []).get(w)).push(r);
  }
  for (const [w, list] of byW) {
    list.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
    list.forEach((r, i) => (r.id = `${w}-${String(i + 1).padStart(5, "0")}`));
  }
  return rows;
}

test("carryOverIds: reorder alone churns nothing", () => {
  const committed = [rec("06-00001", "A"), rec("06-00002", "B"), rec("06-00003", "C")];
  // upstream returns the same three keys in a shuffled order
  const rows = assignIds([
    { wilaya: "06", refs: { osm: "C" } },
    { wilaya: "06", refs: { osm: "A" } },
    { wilaya: "06", refs: { osm: "B" } },
  ]);
  carryOverIds(rows, committed, keyOf, "t", new Set());
  const byKey = Object.fromEntries(rows.map((r) => [r.refs.osm, r.id]));
  assert.deepEqual(byKey, { A: "06-00001", B: "06-00002", C: "06-00003" });
  assert.ok(uniqueIds(rows));
});

test("carryOverIds: growth — a new record inserted mid-sequence never steals a carried slot", () => {
  const committed = [rec("06-00001", "A"), rec("06-00002", "B"), rec("06-00003", "C")];
  // "A0" sorts first, so assignIds re-sequences everyone: A0=1,A=2,B=3,C=4
  const rows = assignIds([
    { wilaya: "06", refs: { osm: "A0" } }, // NEW
    { wilaya: "06", refs: { osm: "A" } },
    { wilaya: "06", refs: { osm: "B" } },
    { wilaya: "06", refs: { osm: "C" } },
  ]);
  // pre-condition: assignIds handed the new row a slot a carried row will reclaim
  const a0Derived = rows.find((r) => r.refs.osm === "A0").id;
  assert.ok(
    ["06-00001", "06-00002", "06-00003"].includes(a0Derived),
    `expected A0 to derive onto a committed slot, got ${a0Derived}`,
  );

  carryOverIds(rows, committed, keyOf, "t", new Set());
  const byKey = Object.fromEntries(rows.map((r) => [r.refs.osm, r.id]));
  // carried ids unchanged
  assert.equal(byKey.A, "06-00001");
  assert.equal(byKey.B, "06-00002");
  assert.equal(byKey.C, "06-00003");
  // the new record was re-homed past every reserved slot
  assert.equal(byKey.A0, "06-00004");
  assert.ok(uniqueIds(rows));
});

test("carryOverIds: shrink — a dropped record's id retires and a new record cannot reuse it", () => {
  const committed = [rec("06-00001", "A"), rec("06-00002", "B"), rec("06-00003", "C")];
  // B dropped upstream; new record D added. assignIds: A=1, C=2, D=3
  const rows = assignIds([
    { wilaya: "06", refs: { osm: "A" } },
    { wilaya: "06", refs: { osm: "C" } },
    { wilaya: "06", refs: { osm: "D" } }, // NEW
  ]);
  carryOverIds(rows, committed, keyOf, "t", new Set());
  const byKey = Object.fromEntries(rows.map((r) => [r.refs.osm, r.id]));
  assert.equal(byKey.A, "06-00001"); // carried, unchanged
  assert.equal(byKey.C, "06-00003"); // carried, unchanged (NOT re-sequenced to 02)
  // D must NOT inherit B's retired id 06-00002, and must not collide
  assert.notEqual(byKey.D, "06-00002");
  assert.equal(byKey.D, "06-00004");
  assert.ok(uniqueIds(rows));
  // a missing committed key is expected — it must not throw
});

test("carryOverIds: a persisted run N retirement stays reserved in run N+1", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "geoalgeria-retired-ids-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const retired = new Set();
  const committedN = [rec("06-00001", "A"), rec("06-00002", "B"), rec("06-00003", "C")];
  const rowsN = assignIds([
    { wilaya: "06", refs: { osm: "A" } },
    { wilaya: "06", refs: { osm: "C" } },
  ]);
  carryOverIds(rowsN, committedN, keyOf, "t", retired);
  assert.deepEqual([...retired], ["06-00002"]);
  writeRetiredIds(dir, retired);

  // A real N+1 generator starts in a fresh process and must reload the ledger.
  const reloaded = readRetiredIds(dir);
  assert.notEqual(reloaded, retired);
  const committedN1 = structuredClone(rowsN);
  const rowsN1 = assignIds([
    { wilaya: "06", refs: { osm: "A" } },
    { wilaya: "06", refs: { osm: "C" } },
    { wilaya: "06", refs: { osm: "D" } },
  ]);
  carryOverIds(rowsN1, committedN1, keyOf, "t", reloaded);
  const byKey = Object.fromEntries(rowsN1.map((row) => [row.refs.osm, row.id]));
  assert.equal(byKey.D, "06-00004");
  assert.ok(!ids(rowsN1).includes("06-00002"));
});

test("carryOverIds: genuinely-new wilaya keeps its freshly derived ids", () => {
  const committed = [rec("06-00001", "A")];
  const rows = assignIds([
    { wilaya: "06", refs: { osm: "A" } },
    { wilaya: "31", refs: { osm: "Z" } }, // NEW wilaya, no committed ids
  ]);
  carryOverIds(rows, committed, keyOf, "t", new Set());
  const byKey = Object.fromEntries(rows.map((r) => [r.refs.osm, r.id]));
  assert.equal(byKey.A, "06-00001");
  assert.equal(byKey.Z, "31-00001");
  assert.ok(uniqueIds(rows));
});

test("carryOverIds: growth + duplicated committed carry key throws loud", () => {
  // committed shipped two records under the SAME osm key — the key can't pin an id
  const committed = [rec("06-00001", "A"), rec("06-00002", "A"), rec("06-00003", "C")];
  const rows = assignIds([
    { wilaya: "06", refs: { osm: "A" } },
    { wilaya: "06", refs: { osm: "C" } },
    { wilaya: "06", refs: { osm: "NEW" } },
  ]);
  assert.throws(
    () => carryOverIds(rows, committed, keyOf, "dup-pkg", new Set()),
    /dup-pkg.*duplicate carry key/s,
  );
});

test("carryOverIds: two current records under one key surface as a duplicate-id throw", () => {
  const committed = [rec("06-00001", "A")];
  const rows = [
    { id: "06-00001", wilaya: "06", refs: { osm: "A" } },
    { id: "06-00002", wilaya: "06", refs: { osm: "A" } }, // same key → both pin to 06-00001
  ];
  assert.throws(
    () => carryOverIds(rows, committed, keyOf, "t", new Set()),
    /duplicated after carry-over/,
  );
});

test("carryOverIds: refuses an ephemeral missing ledger", () => {
  assert.throws(
    () => carryOverIds([], [], keyOf, "t"),
    /persistent retiredIds Set is required/,
  );
});

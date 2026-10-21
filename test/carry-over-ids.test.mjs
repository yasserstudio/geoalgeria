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
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MIGRATIONS,
  carryOverIds,
  readRetiredIds,
  writePackageV2,
  writeRetiredIds,
} from "../scripts/lib/v2-transforms.mjs";

// A committed record + the same {wilaya}-{seq} id scheme the join packages use.
const rec = (id, key) => ({ id, refs: { osm: key } });
const keyOf = (r) => (r.refs?.osm ? `osm:${r.refs.osm}` : null);
const ids = (rows) => rows.map((r) => r.id);
const uniqueIds = (rows) => new Set(ids(rows)).size === rows.length;

// assignIds emits {wilaya}-{seq}, seq = position in the key-sorted order (1-based,
// width 5), exactly the shape ecoles/mosquees derive before carry-over.
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

test("carryOverIds: growth, a new record inserted mid-sequence never steals a carried slot", () => {
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

test("carryOverIds: shrink, a dropped record's id retires and a new record cannot reuse it", () => {
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
  // a missing committed key is expected: it must not throw
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
  // committed shipped two records under the SAME osm key: the key can't pin an id
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

// `prefixOf` is the opt-in clause for a package whose id prefix is a claim about
// the record rather than an opaque string: `{wilaya_code}-{seq}`. Pinning alone
// made that claim go stale, because a record the commune join moves to another
// wilaya came back to the id it was minted under, prefix and all (empirically: 17
// of 3,807 pharmacies, private tracker #255). With the clause the stale id retires
// and forwards, so the prefix is always readable and the old join key still
// resolves in one hop.
test("carryOverIds: prefixOf re-issues a carried id whose prefix went stale", () => {
  const committed = [rec("06-00001", "A"), rec("06-00002", "B")];
  // B moved to wilaya 31; A did not move.
  const rows = assignIds([
    { wilaya: "06", refs: { osm: "A" } },
    { wilaya: "31", refs: { osm: "B" } },
  ]);
  const retired = new Set();
  const migrations = {};
  carryOverIds(rows, committed, keyOf, "t", retired, {
    prefixOf: (r) => r.wilaya,
    migrations,
    note: "Re-issued.",
  });
  const byKey = Object.fromEntries(rows.map((r) => [r.refs.osm, r.id]));
  assert.equal(byKey.A, "06-00001"); // unmoved, still pinned
  assert.equal(byKey.B, "31-00001"); // re-issued into its own wilaya's id space
  assert.deepEqual([...retired], ["06-00002"]);
  assert.deepEqual(migrations, { "06-00002": { merged_into: "31-00001", note: "Re-issued." } });
  assert.ok(uniqueIds(rows));
});

test("carryOverIds: a re-issued record never lands on a reserved id", () => {
  // 31-00001 is already taken by a carried record and 31-00002 is retired, so the
  // re-issued record has to be re-homed past both.
  const committed = [rec("31-00001", "A"), rec("06-00009", "B")];
  const rows = assignIds([
    { wilaya: "31", refs: { osm: "A" } },
    { wilaya: "31", refs: { osm: "B" } },
  ]);
  const retired = new Set(["31-00002"]);
  const migrations = {};
  carryOverIds(rows, committed, keyOf, "t", retired, { prefixOf: (r) => r.wilaya, migrations });
  const byKey = Object.fromEntries(rows.map((r) => [r.refs.osm, r.id]));
  assert.equal(byKey.A, "31-00001");
  assert.equal(byKey.B, "31-00003");
  assert.deepEqual([...retired].sort(), ["06-00009", "31-00002"]);
  assert.equal(migrations["06-00009"].merged_into, "31-00003");
  assert.ok(uniqueIds(rows));
});

test("carryOverIds: a second move re-points the first forward instead of chaining", () => {
  // Run N retired 06-00002 -> 31-00001. Run N+1 moves the same record again: the
  // older entry must forward straight to the new id, so one hop still resolves.
  const committed = [rec("31-00001", "B")];
  const rows = assignIds([{ wilaya: "44", refs: { osm: "B" } }]);
  const retired = new Set(["06-00002"]);
  const migrations = { "06-00002": { merged_into: "31-00001", note: "Re-issued." } };
  carryOverIds(rows, committed, keyOf, "t", retired, {
    prefixOf: (r) => r.wilaya,
    migrations,
    note: "Re-issued again.",
  });
  assert.equal(rows[0].id, "44-00001");
  assert.deepEqual([...retired].sort(), ["06-00002", "31-00001"]);
  assert.equal(migrations["06-00002"].merged_into, "44-00001");
  assert.equal(migrations["06-00002"].note, "Re-issued."); // the old note is kept
  assert.equal(migrations["31-00001"].merged_into, "44-00001");
});

test("carryOverIds: without prefixOf a stale prefix is still pinned, unchanged", () => {
  const committed = [rec("06-00002", "B")];
  const rows = assignIds([{ wilaya: "31", refs: { osm: "B" } }]);
  const retired = new Set();
  carryOverIds(rows, committed, keyOf, "t", retired);
  assert.equal(rows[0].id, "06-00002");
  assert.deepEqual([...retired], []);
});

// A re-issue retires a published join key, and the forward is the only thing that
// keeps it followable. Re-issuing with nowhere to write one would retire the key
// silently, so it is a build error rather than a quiet loss.
test("carryOverIds: prefixOf without a migrations map is refused", () => {
  const committed = [rec("06-00002", "B")];
  const rows = assignIds([{ wilaya: "31", refs: { osm: "B" } }]);
  assert.throws(
    () => carryOverIds(rows, committed, keyOf, "t", new Set(), { prefixOf: (r) => r.wilaya }),
    /prefixOf re-issues ids, so a migrations map is required/,
  );
  // The rows are left alone, so a caller that catches it has not half-applied one.
  assert.equal(rows[0].id, "31-00001");
});

test("carryOverIds: extraOf puts the upstream ids on a re-issue's forward", () => {
  const committed = [rec("06-00002", "B")];
  const rows = assignIds([{ wilaya: "31", refs: { osm: "B" } }]);
  const migrations = {};
  carryOverIds(rows, committed, keyOf, "t", new Set(), {
    prefixOf: (r) => r.wilaya,
    migrations,
    note: "Re-issued.",
    extraOf: (r) => ({ osm: [r.refs.osm] }),
  });
  assert.deepEqual(migrations["06-00002"], {
    merged_into: "31-00001",
    osm: ["B"],
    note: "Re-issued.",
  });
  // merged_into comes first and note last, whatever the extra fields are.
  assert.deepEqual(Object.keys(migrations["06-00002"]), ["merged_into", "osm", "note"]);
});

test("carryOverIds: refuses an ephemeral missing ledger", () => {
  assert.throws(
    () => carryOverIds([], [], keyOf, "t"),
    /persistent retiredIds Set is required/,
  );
});

// An empty ledger is not a fact about the data, and every file under a package's
// data/ enters its npm tarball, so a package that has never retired an id must
// ship no retired-ids.json at all.
test("writeRetiredIds: an empty ledger is not written", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "geoalgeria-empty-ledger-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeRetiredIds(dir, new Set());
  assert.equal(existsSync(join(dir, "retired-ids.json")), false);
  assert.deepEqual([...readRetiredIds(dir)], []);
});

// A forwarding table is a public contract, and a build that writes a broken one has
// already shipped it by the time validate-packages reports it. So the writer checks
// it by the same rule and refuses.
test("writeRetiredIds: a broken migrations map is refused rather than written", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "geoalgeria-ledger-guard-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ids = new Set(["06-00002", "06-00003"]);
  // merged_into points at an id that is itself retired: a chain, not a forward.
  assert.throws(
    () => writeRetiredIds(dir, ids, { "06-00002": { merged_into: "06-00003", note: "x" } }),
    /is itself retired/,
  );
  // A forward for an id the ledger does not reserve.
  assert.throws(
    () => writeRetiredIds(dir, ids, { "06-09999": { merged_into: "06-00001", note: "x" } }),
    /is not one of the retired ids/,
  );
  // Nothing was written, so the broken table never reached disk.
  assert.equal(existsSync(join(dir, "retired-ids.json")), false);
  // And a sound one still writes.
  writeRetiredIds(dir, ids, { "06-00002": { merged_into: "06-00001", note: "x" } });
  assert.deepEqual([...readRetiredIds(dir)], ["06-00002", "06-00003"]);
});

test("writeRetiredIds: an empty ledger already on disk is removed", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "geoalgeria-empty-ledger-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeRetiredIds(dir, new Set(["06-00002"]));
  assert.deepEqual([...readRetiredIds(dir)], ["06-00002"]);
  writeRetiredIds(dir, new Set());
  assert.equal(existsSync(join(dir, "retired-ids.json")), false);
});

// mosquees, not sante: writePackageV2 loads quality/overrides/<pkg>.json by the
// package name, and sante has a reviewed-correction ledger whose records this
// one-row fixture does not contain.
test("writePackageV2: a package with no retirement ships no ledger", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "geoalgeria-writer-ledger-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const ROW = {
    id: "16-0001",
    name: "Mosquée X",
    name_fr: "Mosquée X",
    name_ar: "مسجد س",
    wilaya_code: "16",
    commune_code: "1601",
    commune: "Alger Centre",
    lat: 36.752345,
    lng: 3.061234,
    geo_precision: "exact",
    geo_method: "osm_node",
    source: "osm",
    refs: { osm: "node/1" },
  };
  const write = (retiredIds) =>
    writePackageV2({
      pkg: "mosquees",
      dir,
      files: [{ file: "mosquees.json", rows: [ROW] }],
      meta: MIGRATIONS.mosquees.meta,
      updated: "2026-09-30",
      retrieved: "2026-09-30",
      retiredIds,
    });
  write(new Set());
  assert.equal(existsSync(join(dir, "retired-ids.json")), false);
  write(new Set(["16-0009"]));
  assert.deepEqual([...readRetiredIds(dir)], ["16-0009"]);
  write(new Set());
  assert.equal(existsSync(join(dir, "retired-ids.json")), false);
});

// @geoalgeria/sports assigned its public ids by sorted position
// (`facilities.forEach((f, i) => { f.id = i + 1; })`), so every facility after an
// insertion took its neighbour's id.
//
// The bug this guards (empirically, #306): the October MJS pull adds 90 facilities
// and removes none, most of them Touggourt-area pitches that sort into the middle.
// A positional rebuild moved 5,030 of the 5,141 published ids onto a different
// place, some hundreds of kilometres away: id 01663 went from (35.2515, 2.4818) to
// (35.5507, 1.9675). Ids follow places, so a record keeps the id it shipped under,
// a genuinely new facility takes a fresh number, and a removed facility's number is
// never handed out again.
//
// assignStableIds is the whole id pipeline (park the new rows above the published
// range, then carry every shipped id back), so these tests exercise what the
// fetcher runs rather than a reimplementation of it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { assignStableIds, placeKeyOf } from "../packages/sports/scripts/fetch.mjs";
import { MIGRATIONS } from "../scripts/lib/v2-transforms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf-8"));

/** A v2 sports record, with only the fields the id pipeline reads. */
const facility = (id, name, wilaya_code, lat, lng, extra = {}) => ({
  id,
  name,
  wilaya_code,
  commune: name ? name.toUpperCase() : null,
  lat,
  lng,
  type: "TSP",
  address: null,
  ...extra,
});

// Three published facilities, ids in the package's flat 5-digit space.
const published = () => [
  facility("00001", "Adrar", "01", 27.8806, -0.2857),
  facility("00002", "Chlef", "02", 36.1654, 1.3345),
  facility("00003", "Laghouat", "03", 33.8, 2.865),
];

test("a facility inserted mid-order does not renumber the ids after it", () => {
  const committed = published();
  // The new facility sorts between Adrar and Chlef, exactly where the October
  // pull puts its additions.
  const rows = [
    facility("00001", "Adrar", "01", 27.8806, -0.2857),
    facility("00002", "Beni Abbes", "08", 30.1316, -2.1664),
    facility("00003", "Chlef", "02", 36.1654, 1.3345),
    facility("00004", "Laghouat", "03", 33.8, 2.865),
  ];
  const retiredIds = new Set();
  const stats = assignStableIds(rows, committed, retiredIds);

  const byName = new Map(rows.map((r) => [r.name, r.id]));
  assert.equal(byName.get("Adrar"), "00001");
  assert.equal(byName.get("Chlef"), "00002", "Chlef kept the id it shipped under");
  assert.equal(byName.get("Laghouat"), "00003", "Laghouat kept the id it shipped under");
  assert.equal(byName.get("Beni Abbes"), "00004", "the new facility took a fresh number");
  assert.deepEqual(stats, { carried: 3, minted: 1, retired: 0 });
  assert.equal(retiredIds.size, 0, "nothing was removed, so nothing retires");
});

test("every published id still points at the place it pointed at", () => {
  const committed = published();
  const rows = [
    facility("00001", "Adrar", "01", 27.8806, -0.2857),
    facility("00002", "Beni Abbes", "08", 30.1316, -2.1664),
    facility("00003", "Chlef", "02", 36.1654, 1.3345),
  ];
  assignStableIds(rows, committed, new Set());
  const where = (r) => `${r.lat},${r.lng}`;
  const before = new Map(committed.map((r) => [r.id, where(r)]));
  for (const r of rows) {
    if (!before.has(r.id)) continue;
    assert.equal(where(r), before.get(r.id), `id ${r.id} moved to another place`);
  }
});

test("a removed facility's id retires and no new facility reuses it", () => {
  const committed = published();
  const rows = [
    facility("00001", "Adrar", "01", 27.8806, -0.2857),
    // Chlef is gone from the source; a new facility arrives in its place in the order.
    facility("00002", "Beni Abbes", "08", 30.1316, -2.1664),
    facility("00003", "Laghouat", "03", 33.8, 2.865),
  ];
  const retiredIds = new Set();
  const stats = assignStableIds(rows, committed, retiredIds);
  assert.deepEqual([...retiredIds], ["00002"]);
  assert.equal(stats.retired, 1);
  assert.equal(rows.find((r) => r.name === "Beni Abbes").id, "00004");
  assert.equal(rows.find((r) => r.name === "Laghouat").id, "00003");
});

test("a run-N retirement stays reserved in run N+1", () => {
  const retiredIds = new Set(["00002"]);
  const committed = [
    facility("00001", "Adrar", "01", 27.8806, -0.2857),
    facility("00003", "Laghouat", "03", 33.8, 2.865),
  ];
  const rows = [
    facility("00001", "Adrar", "01", 27.8806, -0.2857),
    facility("00002", "Timimoun", "01", 29.2639, 0.2308),
    facility("00003", "Laghouat", "03", 33.8, 2.865),
  ];
  assignStableIds(rows, committed, retiredIds);
  assert.equal(rows.find((r) => r.name === "Timimoun").id, "00004", "00002 is spent");
});

test("the place key tells two facilities apart and holds one facility still", () => {
  const a = facility("00001", "Adrar", "01", 27.8806, -0.2857);
  assert.equal(placeKeyOf({ ...a, id: "09999" }), placeKeyOf(a), "the id is not part of the key");
  assert.equal(
    placeKeyOf({ ...a, capacity: 200, year: 2015, operational: false }),
    placeKeyOf(a),
    "an attribute the ministry revises is not part of the key",
  );
  assert.notEqual(placeKeyOf({ ...a, name: "Adrar 2" }), placeKeyOf(a));
  assert.notEqual(placeKeyOf({ ...a, lat: 27.9 }), placeKeyOf(a));
  assert.notEqual(placeKeyOf({ ...a, type: "AJF" }), placeKeyOf(a));
});

test("field-identical twins keep their two ids instead of colliding", () => {
  // The MJS ships 4 groups of records whose every place field is identical; the
  // key cannot tell them apart, so the pipeline pins them by their order.
  const twin = (id) => facility(id, "El Merdja", "38", 35.6103, 1.8039);
  const committed = [twin("00001"), twin("00002"), facility("00003", "Laghouat", "03", 33.8, 2.865)];
  const rows = [twin("00001"), twin("00002"), facility("00003", "Laghouat", "03", 33.8, 2.865)];
  const stats = assignStableIds(rows, committed, new Set());
  assert.deepEqual(rows.map((r) => r.id), ["00001", "00002", "00003"]);
  assert.deepEqual(stats, { carried: 3, minted: 0, retired: 0 });
});

// The carry key is read in the fetcher, BEFORE writePackageV2 patches
// wilaya_code/commune_code from quality/overrides/sports.json and folds every
// name-keyed string through foldNameDashes. A key that reads a field the writer
// owns compares a generator value against a published one, so a rebuild that
// changed nothing retires an id (empirically: wilaya_code cost 27 ids, 13 of them
// the reviewed corrections themselves, and the build then aborted at "review
// overrides: unknown record 02725"). These two guard the whole class.

test("a reviewed wilaya correction does not retire the id it corrected", () => {
  // What the review ledger does to 01663: the generator reconciles it to wilaya
  // 14, the ledger patches the published record to 64. The place is the same.
  const committed = [{ ...facility("01663", "Ain Ouessara", "64", 35.2515, 2.4818), commune_code: "1439" }];
  const rows = [facility("00001", "Ain Ouessara", "14", 35.2515, 2.4818)];
  const retiredIds = new Set();
  const stats = assignStableIds(rows, committed, retiredIds);
  assert.equal(rows[0].id, "01663");
  assert.deepEqual(stats, { carried: 1, minted: 0, retired: 0 });
  assert.equal(retiredIds.size, 0);
});

test("a dash separator in the name does not retire the id", () => {
  // writePackageV2 folds an em dash or an en dash in a name to " - ", so the
  // published name and the name the generator read differ by the separator.
  const commune = { commune: "ALGER CENTRE" };
  const committed = [facility("00001", "Stade Ali - Ammar", "16", 36.75, 3.06, commune)];
  // Built from codepoints: the repo's own gate forbids a literal dash of either
  // shape in hand-written source (test/no-em-dash.test.mjs).
  const em = String.fromCodePoint(0x2014);
  const en = String.fromCodePoint(0x2013);
  for (const raw of [`Stade Ali ${em} Ammar`, `Stade Ali ${en} Ammar`, "Stade Ali - Ammar"]) {
    const rows = [facility("09999", raw, "16", 36.75, 3.06, commune)];
    const stats = assignStableIds(rows, committed, new Set());
    assert.equal(rows[0].id, "00001", `"${raw}" did not fold to the published name`);
    assert.deepEqual(stats, { carried: 1, minted: 0, retired: 0 });
  }
});

test("a no-change rebuild of the published data keeps all 5,141 ids", () => {
  // Generator-side values, not committed ones: the published wilaya_code is
  // whatever reconcileCurrentWilayaByCommune or the review ledger decided, so the
  // replay hands the ministry's own wilaya back (source_wilaya_code where the
  // reconcile moved the record, the ledger's `expect` where a review patched it)
  // and lets MIGRATIONS.sports.map re-decide, exactly as a live rebuild does.
  const committed = read("packages/sports/data/facilities.json");
  const expectById = new Map(
    read("quality/overrides/sports.json").decisions.map((d) => [d.record_id, d.expect ?? {}]),
  );
  const rows = committed
    .map((r) => ({
      ...r,
      type_code: r.type,
      type_fr: r.type_label_fr,
      wilaya_code: r.source_wilaya_code ?? expectById.get(r.id)?.wilaya_code ?? r.wilaya_code,
      source_wilaya_code: undefined,
      commune_code: expectById.get(r.id)?.commune_code ?? null,
    }))
    .map(MIGRATIONS.sports.map);
  // The ids the generator derives before carry-over: positions in the sort order.
  rows.forEach((r, i) => { r.id = String(i + 1).padStart(5, "0"); });

  const retiredIds = new Set();
  const stats = assignStableIds(rows, committed, retiredIds);
  assert.deepEqual(stats, { carried: committed.length, minted: 0, retired: 0 });
  assert.deepEqual([...retiredIds], []);

  const published = new Map(committed.map((r) => [r.id, placeKeyOf(r)]));
  for (const r of rows) {
    assert.ok(published.has(r.id), `id ${r.id} is not a published id`);
    assert.equal(placeKeyOf(r), published.get(r.id), `id ${r.id} moved to another place`);
  }
  assert.equal(new Set(rows.map((r) => r.id)).size, committed.length);
});

test("the first build of a package with nothing committed keeps its derived ids", () => {
  const rows = published();
  const stats = assignStableIds(rows, [], new Set());
  assert.deepEqual(rows.map((r) => r.id), ["00001", "00002", "00003"]);
  assert.deepEqual(stats, { carried: 0, minted: 3, retired: 0 });
});

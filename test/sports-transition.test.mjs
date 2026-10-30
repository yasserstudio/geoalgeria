// @geoalgeria/sports moved its ids from a place key to the SIG's own per-record
// UUID (`refs.mjs`) with the 2026-10-27 refresh, through a one-time transition
// matcher for the records published before the UUID was (#306). These pin each
// tier on fixtures; the decisions on the real data are research/sports/id-transition.json.

import { test } from "node:test";
import assert from "node:assert/strict";
import { asGenerated, assignStableIds } from "../packages/sports/scripts/fetch.mjs";

const NO_LEDGER = { ledger: null };

/** A v2 sports record, with the fields the id pipeline reads. */
const facility = (id, extra = {}) => ({
  id,
  name: "Bassin de Natation",
  commune: "SENDJAS",
  type: "BN",
  address: "Stade communal Centre Ville",
  lat: 36.0748,
  lng: 1.3906,
  capacity: 100,
  year: 2004,
  surface_built_m2: 200,
  surface_land_m2: 300,
  operational: true,
  pmr: null,
  daira: "OUED FODDA",
  ...extra,
});
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const live = (n, extra = {}) => facility("00001", { refs: { mjs: uuid(n) }, ...extra });

test("a record carrying refs.mjs keeps its id however the ministry edits it", () => {
  const committed = [facility("00007", { refs: { mjs: uuid(1) } })];
  const rows = [live(1, { name: "Piscine Al chahid X", address: null, lat: 35.9, lng: 1.2, type: "P25", commune: "CHLEF" })];
  const retired = new Set();
  const stats = assignStableIds(rows, committed, retired, NO_LEDGER);
  assert.equal(rows[0].id, "00007");
  assert.deepEqual(stats, { carried: 1, minted: 0, retired: 0 });
});

test("a UUID gone from the source retires its id even where a new row shares the place", () => {
  const committed = [facility("00007", { refs: { mjs: uuid(1) } })];
  const rows = [live(2)];
  const retired = new Set();
  const stats = assignStableIds(rows, committed, retired, NO_LEDGER);
  assert.deepEqual([...retired], ["00007"]);
  assert.equal(rows[0].id, "00008");
  assert.deepEqual(stats, { carried: 0, minted: 1, retired: 1 });
});

test("a repeated UUID fails the build on either side", () => {
  assert.throws(() => assignStableIds([live(1), live(1, { lat: 36 })], [], new Set(), NO_LEDGER), /repeats properties.id/);
  const committed = [facility("00001", { refs: { mjs: uuid(1) } }), facility("00002", { refs: { mjs: uuid(1) } })];
  assert.throws(() => assignStableIds([live(3)], committed, new Set(), NO_LEDGER), /carried by two records/);
});

test("strict: an Inclus dans le prefix at the same point keeps the id", () => {
  const committed = [facility("00098")];
  const rows = [live(1, { address: "Inclus dans le Stade communal Centre Ville" })];
  const log = {};
  assignStableIds(rows, committed, new Set(), { ...NO_LEDGER, log });
  assert.equal(rows[0].id, "00098");
  assert.equal(log.byTier.strict, 1);
  assert.equal(log.transition.pairs[0].s, 0);
});

test("strict: a point re-saved at 4 decimals keeps the id", () => {
  const committed = [facility("00086", { lat: 36.12452, lng: 1.506971 })];
  const rows = [live(1, { lat: 36.1245, lng: 1.507 })];
  const log = {};
  assignStableIds(rows, committed, new Set(), { ...NO_LEDGER, log });
  assert.equal(rows[0].id, "00086");
  assert.equal(log.transition.pairs[0].s, 1);
});

test("strict: a real move keeps the id only on a distinctive address", () => {
  const moved = { lat: 36.0758, lng: 1.3906 }; // about 111 m north
  const one = assignStableIds([live(1, moved)], [facility("00010")], new Set(), NO_LEDGER);
  assert.deepEqual(one, { carried: 1, minted: 0, retired: 0 });

  // Two published records share the tuple: distance alone would have to choose.
  const committed = [facility("00010"), facility("00011", { lat: 36.0738 })];
  const rows = [live(1, moved)];
  const log = {};
  const stats = assignStableIds(rows, committed, new Set(), { ...NO_LEDGER, log });
  assert.deepEqual(stats, { carried: 0, minted: 1, retired: 2 });
  assert.ok(log.transition.refused.every((r) => r.reason === "address-not-distinctive"));
  assert.equal(log.transition.refused.length, 2);
});

test("relabel: a respelled commune at an unmoved point keeps the id", () => {
  const rows = [live(1, { commune: "SENDJASS" })];
  const log = {};
  assignStableIds(rows, [facility("00020")], new Set(), { ...NO_LEDGER, log });
  assert.equal(rows[0].id, "00020");
  assert.equal(log.byTier.relabel, 1);
});

test("rename: a new name at an unmoved point keeps the id when the attributes agree", () => {
  const rows = [live(1, { name: "Bassin de Natation \"HADDAD Mohamed\"" })];
  const log = {};
  assignStableIds(rows, [facility("00030")], new Set(), { ...NO_LEDGER, log });
  assert.equal(rows[0].id, "00030");
  assert.equal(log.byTier.rename, 1);

  // Renamed AND three attributes revised: below the 5 of 7 the tier asks for.
  const revised = [live(1, { name: "Autre", capacity: 9, year: 2020, surface_built_m2: 1 })];
  const stats = assignStableIds(revised, [facility("00030")], new Set(), NO_LEDGER);
  assert.deepEqual(stats, { carried: 0, minted: 1, retired: 1 });
});

test("a type change is never forgiven", () => {
  const stats = assignStableIds([live(1, { type: "P25" })], [facility("00040")], new Set(), NO_LEDGER);
  assert.deepEqual(stats, { carried: 0, minted: 1, retired: 1 });
});

test("an exact tie is refused rather than decided", () => {
  // Two published records at one point, neither address the one the source kept.
  const committed = [facility("00050", { address: "A" }), facility("00051", { address: "B" })];
  const rows = [live(1, { address: "C" })];
  const log = {};
  const stats = assignStableIds(rows, committed, new Set(), { ...NO_LEDGER, log });
  assert.deepEqual(stats, { carried: 0, minted: 1, retired: 2 });
  assert.equal(log.transition.ties.length, 1);
  assert.equal(log.transition.repeatPosts.length, 0, "a live row stands at their point");
});

test("a Repeat post retires with a forward to the record that stays", () => {
  // The source held the facility twice, at one point; it now holds it once.
  const committed = [facility("00060", { address: "hay 20 logts" }), facility("00061", { address: "HAY 20 LOGT SOCIALE" })];
  const rows = [live(1, { address: "hay 20 logts" })];
  const migrations = {};
  const retired = new Set();
  const log = {};
  const stats = assignStableIds(rows, committed, retired, { ...NO_LEDGER, migrations, retrieved: "2026-10-27", log });
  assert.equal(rows[0].id, "00060");
  assert.deepEqual(stats, { carried: 1, minted: 0, retired: 1 });
  assert.deepEqual(Object.keys(migrations), ["00061"]);
  assert.equal(migrations["00061"].merged_into, "00060");
  assert.match(migrations["00061"].note, /^Repeat post: /);
});

test("a review decision the committed record does not carry yet is not undone", () => {
  // Added in the same run that first applies it (01115, 2026-10-28): the committed
  // record still holds what the source said before, so there is no patch to undo.
  const ledger = {
    decisions: [{
      file: "facilities.json",
      record_id: "00080",
      publish_action: "patch",
      expect: { commune: "OULED DJELLAL", wilaya_code: "51" },
      patch: { commune: "OUED EL ALLEUG", wilaya_code: "09" },
    }],
  };
  const before = facility("00080", { commune: "OUED EL ALLEUG", wilaya_code: "09" });
  assert.deepEqual(asGenerated([before], ledger, "facilities.json"), [before]);
  const applied = { ...before, review_status: "corrected" };
  assert.equal(asGenerated([applied], ledger, "facilities.json")[0].commune, "OULED DJELLAL");
});

test("the transition never runs once every committed record carries refs.mjs", () => {
  const committed = [facility("00070", { refs: { mjs: uuid(1) } })];
  const log = {};
  assignStableIds([live(1)], committed, new Set(), { ...NO_LEDGER, log });
  assert.equal(log.transition, null);
  assert.equal(log.byTier.uuid, 1);
});

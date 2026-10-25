// The @geoalgeria/formation-professionnelle ids are a flat 5-digit space derived
// from sort position, so nothing in a record's own id tells the generator which
// id it shipped under: the carry key is the only thing holding a public join key
// to its establishment.
//
// The bug this guards (empirically, #306): the key used to be code|type|name,
// and the MFEP rewrote 1,788 Arabic names between the June and October 2026
// captures. A name is presentation, and the portal revises its spacing, its
// separators, its typos and its branding freely, so a key that reads one takes
// every revision for a different place. The key is now the ministry's own
// accreditation code plus the establishment type, which survives all of that.
//
// code|type repeats on two pairs, so a positional tie-break tells those apart,
// the mechanism packages/sports/scripts/fetch.mjs uses for its field-identical
// twins. Unlike sports' twins these are different establishments, so the
// generator also checks that the pairing it made stands on the same ground, and
// assignStableIds parks a genuinely new establishment above every id the package
// has ever used rather than letting carryOverIds re-home it into a suffixed one.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accreditationKeyOf,
  assignStableIds,
  formationCarryKey,
} from "../packages/formation-professionnelle/scripts/fetch.mjs";

// The real pair from the capture diff: code 0100, the Adrar directorate. June ran
// two words together where October spaces them and doubles the space before the
// wilaya.
const JUNE = "مديرية التكوينو التعليم المهنيينأدرار";
const OCTOBER = "مديرية التكوين و التعليم المهنيين  أدرار";
// Code PQ4DG, a private school the portal relisted under its brand instead of
// its owner's name, at the same coordinate, phone and address. Nothing a
// name-based key could have followed.
const OWNER_NAME = "بن غرابي سعيد";
const BRAND_NAME = "سيبل إكول";

const row = (fields) => ({ lat: null, lng: null, ...fields });

test("the key is the accreditation code and the type, not the name", () => {
  assert.equal(
    accreditationKeyOf(row({ code: "0100", type: "dfep", name: OCTOBER })),
    accreditationKeyOf(row({ code: "0100", type: "dfep", name: JUNE })),
  );
  assert.equal(
    accreditationKeyOf(row({ code: "PQ4DG", type: "prive", name: BRAND_NAME })),
    accreditationKeyOf(row({ code: "PQ4DG", type: "prive", name: OWNER_NAME })),
  );
  // It still tells a different code or a different type apart.
  const base = accreditationKeyOf(row({ code: "0100", type: "dfep" }));
  assert.notEqual(accreditationKeyOf(row({ code: "0101", type: "dfep" })), base);
  assert.notEqual(accreditationKeyOf(row({ code: "0100", type: "cfpa" })), base);
  // A null code cannot read as the string "null" on another record.
  assert.notEqual(
    accreditationKeyOf(row({ code: null, type: "prive" })),
    accreditationKeyOf(row({ code: "null", type: "prive" })),
  );
});

test("a renamed establishment keeps the id it shipped under", () => {
  const committed = [row({ id: "00001", code: "0100", type: "dfep", name: JUNE })];
  const rows = [row({ id: "00001", code: "0100", type: "dfep", name: OCTOBER })];
  const counts = assignStableIds(rows, committed, new Set());
  assert.equal(rows[0].id, "00001");
  assert.equal(rows[0].name, OCTOBER, "the published name keeps the corrected spelling");
  assert.deepEqual(counts, { carried: 1, minted: 0, retired: 0 });
});

test("two establishments sharing a code and type keep their own ids", () => {
  // The real 0303|cfpa pair: two CFPAs in wilaya 59, 40 km apart.
  const committed = [
    row({ id: "00061", code: "0303", type: "cfpa", name: "a", lat: 34.11784, lng: 2.10571 }),
    row({ id: "00076", code: "0303", type: "cfpa", name: "b", lat: 33.907821, lng: 1.78689 }),
  ];
  const rows = [
    row({ id: "00061", code: "0303", type: "cfpa", name: "a respelt", lat: 34.11784, lng: 2.10571 }),
    row({ id: "00076", code: "0303", type: "cfpa", name: "b respelt", lat: 33.907821, lng: 1.78689 }),
  ];
  assignStableIds(rows, committed, new Set());
  assert.deepEqual(rows.map((r) => r.id), ["00061", "00076"]);
});

test("a tie-break that pairs two far-apart records fails the build", () => {
  // The tie-break is positional, so a group whose members the source reorders
  // would hand each the other's id. These are not sports' field-identical twins:
  // they are different establishments, and a silent swap would repoint two
  // public join keys at each other.
  const committed = [
    row({ id: "00061", code: "0303", type: "cfpa", name: "a", lat: 34.11784, lng: 2.10571 }),
    row({ id: "00076", code: "0303", type: "cfpa", name: "b", lat: 33.907821, lng: 1.78689 }),
  ];
  const rows = [
    row({ id: "00061", code: "0303", type: "cfpa", name: "b", lat: 33.907821, lng: 1.78689 }),
    row({ id: "00076", code: "0303", type: "cfpa", name: "a", lat: 34.11784, lng: 2.10571 }),
  ];
  assert.throws(() => assignStableIds(rows, committed, new Set()), /reordered/);
});

test("a new establishment is minted above every id ever used", () => {
  const committed = [
    row({ id: "00001", code: "0100", type: "dfep" }),
    row({ id: "01932", code: "9999", type: "cfpa" }),
  ];
  const retiredIds = new Set(["01933", "01934"]);
  const rows = [
    row({ id: "00001", code: "0100", type: "dfep" }),
    row({ id: "00002", code: "0101", type: "cfpa" }),
    row({ id: "01932", code: "9999", type: "cfpa" }),
  ];
  const counts = assignStableIds(rows, committed, retiredIds);
  // Above the published high-water mark (01932) AND the retired one (01934), and
  // a flat zero-padded 5-digit id, as types/index.d.ts documents.
  assert.equal(rows[1].id, "01935");
  assert.deepEqual(counts, { carried: 2, minted: 1, retired: 0 });
  for (const r of rows) assert.match(r.id, /^\d{5}$/);
});

test("an establishment the source drops retires its id, and nothing reuses it", () => {
  const committed = [
    row({ id: "00001", code: "0100", type: "dfep" }),
    row({ id: "00002", code: "0101", type: "cfpa" }),
  ];
  const retiredIds = new Set();
  const rows = [
    row({ id: "00001", code: "0100", type: "dfep" }),
    row({ id: "00002", code: "0102", type: "cfpa" }),
  ];
  const counts = assignStableIds(rows, committed, retiredIds);
  assert.deepEqual([...retiredIds], ["00002"]);
  assert.equal(rows[1].id, "00003", "the new code is minted above the high-water mark");
  assert.deepEqual(counts, { carried: 1, minted: 1, retired: 1 });
});

test("formationCarryKey keys both sides from one pass", () => {
  const committed = [row({ id: "00061", code: "0303", type: "cfpa" })];
  const rows = [row({ id: "00061", code: "0303", type: "cfpa" })];
  const keyOf = formationCarryKey(committed, rows);
  assert.equal(keyOf(rows[0]), keyOf(committed[0]));
  // A record from neither side still keys, so the function is total.
  assert.equal(typeof keyOf(row({ code: "0303", type: "cfpa" })), "string");
});

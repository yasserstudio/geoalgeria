// Guards the @geoalgeria/livraison retired-id ledger.
//
// A stop-desk id is a public join key, and a carded id is minted from the card's own
// title, so the same title coming back years later would mint the id a different desk
// used to hold. data/retired-ids.json is the list of ids no stop-desk may ever hold
// again (Owner decision, 2026-10-25), seeded with the two this release removed.
//
// Retirement waits one refresh: an id missing from a single run is parked in the
// ledger's `pending` map and retires only on the second consecutive miss (Owner
// decision, 2026-10-25), because a card retitled in the same run its Maps link fails
// would otherwise lose its id over one failed request.
//
// The properties, one test each: a retired id is never re-issued, a first miss only
// parks an id, a second miss retires it, a pending id is reserved against every other
// mint but can still be handed back to its own desk, and the ledger stays sorted and
// deduped on disk.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  carryRenamedIds,
  dedupeMintedIds,
  setRetiredIds,
  settleRetirements,
} from "../packages/livraison/scripts/fetch.mjs";

/** A committed stop-desk, in the shape the ledger functions read. */
const desk = (id, extra = {}) => ({
  id,
  operator: "noest",
  wilaya_code: "19",
  lat: 36.1636853,
  lng: 5.671028,
  ...extra,
});

const LEDGER = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "livraison",
  "data",
  "retired-ids.json",
);
const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));

test("the committed ledger is sorted, deduped and reserves this release's two removals", () => {
  assert.deepEqual(ledger.ids, [...ledger.ids].sort());
  assert.equal(new Set(ledger.ids).size, ledger.ids.length);
  assert.ok(ledger.ids.includes("470201"));
  assert.ok(ledger.ids.includes("anderson-33-in-amenas"));
  assert.ok(ledger.note);
});

test("the ledger reserves no id the package still ships", () => {
  const live = new Set(
    JSON.parse(readFileSync(join(dirname(LEDGER), "stopdesks.json"), "utf8")).map((r) => r.id),
  );
  assert.deepEqual(ledger.ids.filter((id) => live.has(id)), []);
});

test("a retired id is never re-issued: a card re-minting it gets the next suffix", () => {
  const recs = [{ id: "anderson-33-in-amenas" }, { id: "anderson-16-zeralda" }];
  dedupeMintedIds(recs, new Set(["anderson-33-in-amenas"]));
  assert.deepEqual(recs.map((r) => r.id), ["anderson-33-in-amenas-2", "anderson-16-zeralda"]);
});

test("a retired id is never re-issued: the suffix keeps climbing past a second collision", () => {
  const recs = [{ id: "470201" }, { id: "470201" }];
  dedupeMintedIds(recs, new Set(["470201"]));
  assert.deepEqual(recs.map((r) => r.id), ["470201-2", "470201-3"]);
});

test("a retired id is never handed back through a card rename", () => {
  // The renamed card lands 0 m from the desk the retired id named: without the ledger
  // carryRenamedIds would reclaim it, which is exactly the resurrection to prevent.
  const committed = new Map([
    ["anderson-33-in-amenas", {
      id: "anderson-33-in-amenas",
      operator: "anderson",
      wilaya_code: "33",
      lat: 28.05,
      lng: 9.64,
    }],
  ]);
  const recs = [{ id: "anderson-33-in-amenas-centre", name: "In Amenas Centre", cardWilaya: 33, lat: 28.05, lng: 9.64 }];
  const renamed = carryRenamedIds(recs, committed, "anderson", new Set(["anderson-33-in-amenas"]));
  assert.deepEqual(renamed, []);
  assert.equal(recs[0].id, "anderson-33-in-amenas-centre");
});

test("a rename still reclaims an id the ledger does not reserve", () => {
  const committed = new Map([
    ["anderson-16-sidi-abdellah", {
      id: "anderson-16-sidi-abdellah",
      operator: "anderson",
      wilaya_code: "16",
      lat: 36.7102,
      lng: 2.8438,
    }],
  ]);
  const recs = [{ id: "anderson-16-sidi-abdellah-zeralda", name: "Sidi Abdellah - Zeralda", cardWilaya: 16, lat: 36.7104, lng: 2.8439 }];
  carryRenamedIds(recs, committed, "anderson", new Set());
  assert.equal(recs[0].id, "anderson-16-sidi-abdellah");
});

test("a disappearing id is parked, not retired, on its first missing refresh", () => {
  const retired = new Set(["470201"]);
  const pending = new Map();
  const settled = settleRetirements(
    retired,
    pending,
    [desk("470201"), desk("anderson-33-in-amenas"), desk("noest-26b")],
    new Set(["noest-26b"]),
    new Set(),
    "2026-10-25",
  );
  assert.deepEqual(settled.pending, ["anderson-33-in-amenas"]);
  assert.deepEqual(settled.retired, []);
  assert.deepEqual([...retired], ["470201"]);
  assert.equal(pending.get("anderson-33-in-amenas").first_missing, "2026-10-25");
  // Replaying the same refresh (an offline --cache rebuild) changes nothing: two runs on
  // one date are one refresh, so the ledger reproduces instead of retiring what it parked.
  const replay = settleRetirements(
    retired,
    pending,
    [desk("470201"), desk("anderson-33-in-amenas"), desk("noest-26b")],
    new Set(["noest-26b"]),
    new Set(),
    "2026-10-25",
  );
  assert.deepEqual(replay, { retired: [], pending: [], recovered: [] });
  assert.deepEqual([...retired], ["470201"]);
});

test("a second consecutive miss retires the id, and only once", () => {
  const retired = new Set();
  const pending = new Map([["anderson-33-in-amenas", { first_missing: "2026-10-25", operator: "anderson", wilaya_code: "33", lat: 28.05, lng: 9.64 }]]);
  // The record is already gone from the committed data: the run that first missed it did
  // not emit it. The ledger alone has to carry the retirement through.
  const settled = settleRetirements(retired, pending, [], new Set(), new Set(), "2026-11-01");
  assert.deepEqual(settled.retired, ["anderson-33-in-amenas"]);
  assert.deepEqual([...retired], ["anderson-33-in-amenas"]);
  assert.equal(pending.size, 0);
  // Append-only: a later refresh neither re-parks it nor appends it twice.
  const again = settleRetirements(retired, pending, [desk("anderson-33-in-amenas")], new Set(), new Set(), "2026-11-08");
  assert.deepEqual(again, { retired: [], pending: [], recovered: [] });
  assert.deepEqual([...retired], ["anderson-33-in-amenas"]);
});

test("an id published again leaves its grace period", () => {
  const retired = new Set();
  const pending = new Map([["noest-19b", { first_missing: "2026-10-25", operator: "noest", wilaya_code: "19", lat: 36.1636853, lng: 5.671028 }]]);
  const settled = settleRetirements(retired, pending, [], new Set(["noest-19b"]), new Set(), "2026-11-01");
  assert.deepEqual(settled.recovered, ["noest-19b"]);
  assert.deepEqual([...retired], []);
  assert.equal(pending.size, 0);
});

test("a desk dropped for a bad pin is held: neither retired nor parked", () => {
  // The carrier still lists it; only its link is wrong this run. Retiring it would mean a
  // fixed link brings the desk back under a new id, which breaks ids-follow-places.
  const retired = new Set();
  const pending = new Map();
  const settled = settleRetirements(
    retired,
    pending,
    [desk("noest-26a"), desk("anderson-33-in-amenas")],
    new Set(),
    new Set(["noest-26a"]),
    "2026-10-25",
  );
  assert.deepEqual(settled.pending, ["anderson-33-in-amenas"]);
  assert.equal(retired.has("noest-26a"), false);
  assert.equal(pending.has("noest-26a"), false);
  // A held id already in its grace period keeps its clock paused rather than retiring.
  const held = new Map([["noest-26a", { first_missing: "2026-10-25", operator: "noest", wilaya_code: "26", lat: 36.26, lng: 2.75 }]]);
  settleRetirements(new Set(), held, [], new Set(), new Set(["noest-26a"]), "2026-11-01");
  assert.equal(held.get("noest-26a").first_missing, "2026-10-25");
});

test("a pending id is never minted for another desk", () => {
  setRetiredIds([], new Map([["noest-19b", { first_missing: "2026-10-25", operator: "noest", wilaya_code: "19", lat: 36.1636853, lng: 5.671028 }]]));
  const recs = [{ id: "noest-19b" }];
  dedupeMintedIds(recs);
  assert.deepEqual(recs.map((r) => r.id), ["noest-19b-2"]);
  setRetiredIds([]);
});

test("a retitled card whose link was dead recovers its id on the next refresh", () => {
  // Refresh 1: Noest retitles 19B and its Maps link does not resolve that minute, so the
  // card is skipped, the committed record is not re-emitted and the old id goes pending.
  const retired = new Set();
  const pending = new Map();
  settleRetirements(retired, pending, [desk("noest-19b")], new Set(), new Set(), "2026-10-25");
  assert.deepEqual([...pending.keys()], ["noest-19b"]);
  assert.deepEqual([...retired], []);

  // Refresh 2: the link resolves, the retitled card mints a new id 18 m away, and the
  // grace period hands the published id back. The committed data no longer holds the
  // record, so the match is made against the ledger's own entry.
  const ledger = setRetiredIds(retired, pending).pending;
  const recs = [{ id: "noest-19b-el-eulma-centre", name: "Noest El Eulma Centre", cardWilaya: 19, lat: 36.16384, lng: 5.671028 }];
  const renamed = carryRenamedIds(recs, new Map(), "noest");
  assert.equal(recs[0].id, "noest-19b");
  assert.equal(renamed.length, 1);
  assert.match(renamed[0], /grace period/);
  assert.equal(ledger.has("noest-19b"), false);
  // And with the id back, nothing suffixes it as a collision with its own reservation.
  dedupeMintedIds(recs);
  assert.equal(recs[0].id, "noest-19b");
  setRetiredIds([]);
});

test("setRetiredIds is what the carded builds reserve against by default", () => {
  setRetiredIds(["470201"]);
  const recs = [{ id: "470201" }];
  dedupeMintedIds(recs);
  assert.equal(recs[0].id, "470201-2");
  setRetiredIds([]);
});

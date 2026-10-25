// Guards the @geoalgeria/livraison retired-id ledger.
//
// A stop-desk id is a public join key, and a carded id is minted from the card's own
// title, so the same title coming back years later would mint the id a different desk
// used to hold. data/retired-ids.json is the list of ids no stop-desk may ever hold
// again (Owner decision, 2026-10-25), seeded with the two this release removed.
//
// Three properties, one test each: a retired id is never re-issued, an id that
// disappears is appended, and the ledger stays sorted and deduped on disk.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  appendRetiredIds,
  carryRenamedIds,
  dedupeMintedIds,
  setRetiredIds,
} from "../packages/livraison/scripts/fetch.mjs";

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

test("a disappearing id is appended, and only once", () => {
  const retired = new Set(["470201"]);
  const added = appendRetiredIds(retired, ["470201", "anderson-33-in-amenas", "noest-26b"], new Set(["noest-26b"]));
  assert.deepEqual(added, ["anderson-33-in-amenas"]);
  assert.deepEqual([...retired].sort(), ["470201", "anderson-33-in-amenas"]);
  // A second run over the same input adds nothing: the ledger is append-only, not a diff.
  assert.deepEqual(appendRetiredIds(retired, ["470201", "anderson-33-in-amenas"], new Set()), []);
});

test("setRetiredIds is what the carded builds reserve against by default", () => {
  setRetiredIds(["470201"]);
  const recs = [{ id: "470201" }];
  dedupeMintedIds(recs);
  assert.equal(recs[0].id, "470201-2");
  setRetiredIds([]);
});

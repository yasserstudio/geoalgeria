// @geoalgeria/jeunesse ids are a flat 5-digit space assigned from sort position, so
// the carry key is the only thing holding a published join key to its establishment.
//
// The bug this guards (batch 2026-15): a positional rebuild of the 2026-10-27 SIG
// capture repointed 213 published ids for a source that had not changed. From that
// refresh every record publishes the SIG's own UUID as refs.mjs and ids carry on it;
// the content key served the one transition before that.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { carryKeyFor, jeunesseContentKey, mjsRefOf } from "../packages/jeunesse/scripts/fetch.mjs";

const published = JSON.parse(readFileSync(new URL("../packages/jeunesse/data/institutions.json", import.meta.url), "utf8"));

test("every published jeunesse record carries a unique SIG UUID", () => {
  const refs = published.map(mjsRefOf);
  assert.ok(refs.every((r) => typeof r === "string" && r.length > 0), "a record has no refs.mjs");
  assert.equal(new Set(refs).size, published.length, "two records share a refs.mjs");
});

test("once the published records carry refs.mjs, ids carry on it", () => {
  assert.equal(carryKeyFor(published), mjsRefOf);
  assert.equal(carryKeyFor([{ id: "00001" }]), jeunesseContentKey, "a record without refs.mjs falls back to the content key");
});

test("the content key reads names and addresses as the writer publishes them", () => {
  const raw = { type: "MJ", lat: 36.7, lng: 3.05, name: "Maison A — B", name_ar: null, address: "Rue X – Cite Y" };
  const published = { ...raw, name: "Maison A - B", address: "Rue X - Cite Y" };
  assert.equal(jeunesseContentKey(raw), jeunesseContentKey(published));
});

test("an edited establishment keeps its id on the UUID, not on its content", () => {
  const before = { type: "MJ", lat: 36.7, lng: 3.05, name: "Maison A", name_ar: null, address: "Rue X", refs: { mjs: "u-1" } };
  const after = { ...before, name: "Maison A (renamed)", address: "Rue Y", lat: 36.7001 };
  const keyOf = carryKeyFor([before]);
  assert.equal(keyOf(before), keyOf(after));
});

// `@geoalgeria/pharmacies` documents its id as `{wilaya_code}-{seq}`, which invites
// a consumer to read the wilaya off the prefix. That only holds if the prefix and
// `wilaya_code` can never disagree, and on data main (2 Oct 2026) 17 of 3,807
// records disagreed: carryOverIds pinned each record back to the id it shipped
// under even after the commune join moved it to another wilaya, so the prefix kept
// the minting wilaya for good (private tracker #255).
//
// This is the contract test over the shipped file. The generator-side guarantee is
// the `prefixOf` clause of carryOverIds (test/carry-over-ids.test.mjs), which
// re-issues such an id instead of pinning it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "pharmacies", "data");
const read = (file) => JSON.parse(readFileSync(join(DATA, file), "utf-8"));

test("every pharmacy id prefix is its own wilaya_code", () => {
  const disagree = read("pharmacies.json")
    .filter((r) => r.id.slice(0, r.id.indexOf("-")) !== r.wilaya_code)
    .map((r) => `${r.id} is in wilaya ${r.wilaya_code}`);
  assert.deepEqual(disagree, []);
});

test("a re-issued id is retired and forwards to exactly one live id, with no chain", () => {
  const records = read("pharmacies.json");
  const ledger = read("retired-ids.json");
  const reserved = new Set(ledger.ids);
  const live = new Set(records.map((r) => r.id));

  // A forward that lands on a retired id is a chain a consumer cannot follow in
  // one hop, and one that lands nowhere is a dead end.
  for (const [retired, entry] of Object.entries(ledger.migrations ?? {})) {
    assert.ok(reserved.has(retired), `${retired} carries a migration but is not retired`);
    assert.ok(live.has(entry.merged_into), `${retired} forwards to ${entry.merged_into}, which is not live`);
    assert.ok(!reserved.has(entry.merged_into), `${retired} forwards to ${entry.merged_into}, itself retired`);
  }
  // The ledger reserves ids for good, so no live record may hold one.
  assert.deepEqual([...reserved].filter((id) => live.has(id)), []);
});

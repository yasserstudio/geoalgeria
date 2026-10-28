// How the sports fetcher reads the MJS SIG's referential values.
//
// The GIS prefixes a referential value with its own UUID ("<uuid>:fonctionnel"),
// and the 2026-10-27 capture also writes 506 reception years as "2013:undefined".
// The old test for a prefix ("hex digits before a colon") took the year for a
// UUID, since every digit is a hex digit, and blanked 168 published years.

import { test } from "node:test";
import assert from "node:assert/strict";
import { stripUUID } from "../packages/sports/scripts/fetch.mjs";

test("a real UUID prefix is stripped", () => {
  assert.equal(stripUUID("364f58e0-0389-48a5-992a-38581a1b07f0:fonctionnel"), "fonctionnel");
  assert.equal(stripUUID("cc0fe5c2-f0b0-4e9d-97a1-f49cd7f16e29:TEMACINE"), "TEMACINE");
});

test("a year before a colon is not a UUID", () => {
  assert.equal(stripUUID("2013:undefined"), "2013:undefined");
  assert.equal(stripUUID("2013"), "2013");
  assert.equal(stripUUID(":undefined"), ":undefined");
  assert.equal(stripUUID(null), null);
  assert.equal(stripUUID("   "), null);
});

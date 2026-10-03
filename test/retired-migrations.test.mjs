// The `migrations` map in a retired-ids.json ledger is a public forwarding
// table. Its shape is checked by one function, shared by the generator (which
// throws) and validate-packages (which reports every fault), so the two read
// the same contract.

import { test } from "node:test";
import assert from "node:assert/strict";
import { migrationErrors } from "../scripts/lib/v2-transforms.mjs";

const reserved = new Set(["16-ehs-13", "16-ehs-14"]);
const entry = { merged_into: "16-ehs-03", msp_posts: ["4660", "4661"], note: "Merged." };

test("migrationErrors: a well-formed map, or none at all, has no faults", () => {
  assert.deepEqual(migrationErrors({ "16-ehs-13": entry }, reserved), []);
  assert.deepEqual(migrationErrors(undefined, reserved), []);
});

test("migrationErrors: every way a forward can dead-end is named", () => {
  const faults = (map) => migrationErrors(map, reserved);
  assert.match(faults([])[0], /must be an object/);
  assert.match(faults({ "01-eph-99": entry })[0], /is not one of the retired ids/);
  assert.match(faults({ "16-ehs-13": null })[0], /must be an object/);
  assert.match(faults({ "16-ehs-13": { ...entry, merged_into: "" } })[0], /merged_into must be a non-empty string/);
  assert.match(faults({ "16-ehs-13": { ...entry, merged_into: "16-ehs-13" } })[0], /points at itself/);
  assert.match(faults({ "16-ehs-13": { ...entry, merged_into: "16-ehs-14" } })[0], /is itself retired/);
  assert.match(faults({ "16-ehs-13": { ...entry, note: "" } })[0], /note must be a non-empty string/);
  assert.match(faults({ "16-ehs-13": { ...entry, msp_posts: [] } })[0], /msp_posts must be a non-empty array/);
  // all faults are reported, not only the first
  assert.equal(faults({ "16-ehs-13": { ...entry, note: "", msp_posts: [1] } }).length, 2);
});

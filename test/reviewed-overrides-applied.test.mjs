// The reviewed-correction ledgers under quality/overrides/ are the only place a
// human-verified value survives a generator replay: writePackageV2 loads
// quality/overrides/<package>.json and patches the records before it validates
// and emits them (quality/overrides/README.md).
//
// The gap this closes: nothing in `pnpm validate` runs a generator, so a ledger
// and the file it is supposed to have patched can drift apart silently. A ledger
// entry that was never applied, or that a later rebuild overwrote, reads as a
// correction on paper while the package ships the wrong value. So every ledger is
// validated against its contract here, and every `patch` decision is asserted
// against the committed data, field by field, in the same session that validates
// the data itself.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateReviewLedger } from "../packages/schema/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OVERRIDES = join(ROOT, "quality", "overrides");
const read = (path) => JSON.parse(readFileSync(path, "utf-8"));

const ledgers = readdirSync(OVERRIDES)
  .filter((file) => file.endsWith(".json"))
  .map((file) => ({ file, ledger: read(join(OVERRIDES, file)) }));

test("quality/overrides: every ledger holds to its contract", () => {
  assert.ok(ledgers.length > 0, "no override ledger found");
  for (const { file, ledger } of ledgers) {
    const { errors } = validateReviewLedger(ledger);
    assert.deepEqual(errors, [], `${file}: ${errors.join("; ")}`);
    assert.equal(ledger.dataset, file.replace(/\.json$/, ""), `${file}: dataset must name the package`);
  }
});

test("quality/overrides: every patched value is the value the package ships", () => {
  let checked = 0;
  for (const { file, ledger } of ledgers) {
    const dataDir = join(ROOT, "packages", ledger.dataset, "data");
    for (const decision of ledger.decisions) {
      if (decision.publish_action !== "patch") continue;
      const path = join(dataDir, decision.file);
      assert.ok(existsSync(path), `${file}/${decision.record_id}: ${decision.file} is missing`);
      const record = read(path).find((r) => String(r.id) === decision.record_id);
      assert.ok(record, `${file}: ${decision.record_id} is not in ${decision.file}`);
      const where = `${file}/${decision.record_id}`;

      // the patch landed
      for (const [field, value] of Object.entries(decision.patch ?? {})) {
        assert.deepEqual(record[field], value, `${where}: ${field} is not the reviewed value`);
      }
      // and the fields the decision did not patch still read what it expected, so
      // a decision cannot go stale unnoticed against upstream data that moved
      for (const [field, value] of Object.entries(decision.expect)) {
        if (Object.prototype.hasOwnProperty.call(decision.patch ?? {}, field)) continue;
        assert.deepEqual(record[field], value, `${where}: ${field} no longer matches expect`);
      }
      // the provenance the reviewer's own decision promises
      assert.equal(record.review_status, "corrected", `${where}: review_status`);
      assert.equal(record.reviewed_at, decision.reviewed_at ?? ledger.reviewed_at, `${where}: reviewed_at`);
      assert.equal(record.reviewed_by, decision.reviewer ?? ledger.reviewer, `${where}: reviewed_by`);
      assert.deepEqual(
        record.review_evidence,
        decision.evidence.map((item) => item.url),
        `${where}: review_evidence`,
      );
      checked++;
    }
  }
  assert.ok(checked > 0, "no patch decision was checked");
});

// A `keep` decision patches nothing, so the loop above never looks at it, and a ruling
// that a candidate is NOT a correction would go stale unnoticed against data that moved
// under it: the row would still read as a closed candidate while the package ships a
// different coordinate. The build does check it (applyReviewedOverrides refuses a stale
// `expect` whatever the action), but only a generator run reaches that, and nothing in
// `pnpm validate` runs one.
test("quality/overrides: every kept record still reads what the reviewer saw", () => {
  for (const { file, ledger } of ledgers) {
    const dataDir = join(ROOT, "packages", ledger.dataset, "data");
    for (const decision of ledger.decisions) {
      if (decision.publish_action !== "keep") continue;
      const path = join(dataDir, decision.file);
      assert.ok(existsSync(path), `${file}/${decision.record_id}: ${decision.file} is missing`);
      const record = read(path).find((r) => String(r.id) === decision.record_id);
      assert.ok(record, `${file}: ${decision.record_id} is not in ${decision.file}`);
      const where = `${file}/${decision.record_id}`;
      for (const [field, value] of Object.entries(decision.expect)) {
        assert.deepEqual(record[field], value, `${where}: ${field} no longer matches expect`);
      }
      // `keep` is the no-op action: it must not have stamped review provenance onto the
      // record, because nothing about the published value was reviewed into it.
      assert.equal(record.review_status, undefined, `${where}: keep must not stamp review_status`);
    }
  }
});

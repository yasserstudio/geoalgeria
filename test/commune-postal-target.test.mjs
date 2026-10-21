// scripts/fix-commune-postal-codes.mjs writes its --target and nothing else, and
// refuses a value it has no mapping for.
//
// WHY THIS FILE EXISTS. That script writes eight carriers now instead of four, and
// the fixer next to it shipped exactly this defect: scripts/fix-jo-corrections.mjs
// ran its CSV and SQL writers against packages/dataset/data whatever --target said,
// so a --write run from the test suite reverted two tracked carriers while the
// suite passed (private tracker #247). The scoping is cheap to hold and expensive
// to lose, so it is held here rather than left to review.
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { filledFromNull } from "../scripts/lib/commune-postal-drift.mjs";
import { assertRepoUnchanged, repoStatus } from "./lib/repo-clean.mjs";

const REPO = join(import.meta.dirname, "..");
const SCRIPT = join(REPO, "scripts/fix-commune-postal-codes.mjs");
const TABLE = join(REPO, "packages/dataset/data/algeria.json");

let tracked;
before(() => {
  tracked = repoStatus();
});
after(() => assertRepoUnchanged(tracked));

/** A throwaway copy of the flagship table, which is a shape --target accepts. */
function copyOfTable() {
  const dir = mkdtempSync(join(tmpdir(), "postal-target-"));
  const path = join(dir, "algeria.json");
  cpSync(TABLE, path);
  return path;
}

const run = (path) =>
  execFileSync(process.execPath, [SCRIPT, "--write", "--target", path], { stdio: "pipe", encoding: "utf8" });

test("a --target run writes the target and leaves this repository alone", () => {
  // Drifted first, or the assertion passes on a run that did nothing: an unchanged
  // copy of a repaired table is byte-identical whether or not a writer ever ran. El
  // Amiria is a ledger row, so this covers accept-and-replace as well as the
  // scoping: the mirrors published Meskiana's 04004 for it, and its own OULED
  // NACEUR office is 04038.
  const path = copyOfTable();
  const doc = JSON.parse(readFileSync(path, "utf8"));
  const at = (parsed, code) => parsed.flatMap((wilaya) => wilaya.communes).find((commune) => commune.code_commune === code);
  assert.equal(at(doc, 405).postal_code, "04038", "El Amiria carries its own office's code to begin with");
  at(doc, 405).postal_code = "04004";
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);

  run(path);

  assert.equal(
    at(JSON.parse(readFileSync(path, "utf8")), 405).postal_code,
    "04038",
    "a superseded value in a target is replaced by the derived code",
  );
  assert.equal(readFileSync(path, "utf8"), readFileSync(TABLE, "utf8"), "and nothing else in the target moves");
});

test("a target value the mapping does not account for stops the run", () => {
  const path = copyOfTable();
  const doc = JSON.parse(readFileSync(path, "utf8"));
  doc[0].communes[0].postal_code = "99999";
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);

  assert.throws(
    () => run(path),
    (error) => /Adrar \(101\) holds "99999"/.test(error.stderr) && /nothing written/.test(error.stderr),
  );
  assert.equal(JSON.parse(readFileSync(path, "utf8"))[0].communes[0].postal_code, "99999", "no carrier is half-written");
});

test("a fork that has not had this release yet takes the codes it fills", () => {
  // The web app keeps its own copy of the table, so until it is relinked it holds
  // null for every commune this release gives a first code to. Those nulls are the
  // state --target exists to repair, and the from/to contract used to refuse all
  // 135 of them: once the table is repaired the `from` and the `to` are the same
  // value, which null is neither of.
  const path = copyOfTable();
  const doc = JSON.parse(readFileSync(path, "utf8"));
  const blank = filledFromNull();
  let blanked = 0;
  for (const wilaya of doc) {
    for (const commune of wilaya.communes) {
      if (!blank.has(commune.code_commune)) continue;
      commune.postal_code = null;
      blanked++;
    }
  }
  assert.equal(blanked, blank.size, "every commune this release fills is in the fork copy");
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);

  run(path);
  assert.equal(readFileSync(path, "utf8"), readFileSync(TABLE, "utf8"), "the fork takes every code this release fills");
});

test("a target that no longer carries every commune stops the run", () => {
  // The coverage check used to sit inside the no-targets branch, so a target could
  // drop rows and still read clean. A carrier that stopped carrying a commune is
  // exactly how one file keeps a stale code while the report says nothing.
  const path = copyOfTable();
  const doc = JSON.parse(readFileSync(path, "utf8"));
  doc[0].communes.splice(0, 1);
  writeFileSync(path, `${JSON.stringify(doc, null, 2)}\n`);

  assert.throws(
    () => run(path),
    (error) => /algeria\.json matched 1540 of 1541 communes/.test(error.stderr) && /nothing written/.test(error.stderr),
  );
});

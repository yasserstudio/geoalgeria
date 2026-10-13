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
  const path = copyOfTable();
  run(path);
  assert.equal(readFileSync(path, "utf8"), readFileSync(TABLE, "utf8"), "the target keeps the codes the repo carries");
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

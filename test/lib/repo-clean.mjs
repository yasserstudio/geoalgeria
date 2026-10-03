// A test must never mutate tracked files. Any test that runs a repo script can
// bracket itself with these two helpers: read `repoStatus()` in a `before`
// hook, assert it again in `after`. The mistake they catch is a script run with
// `--write` against the repository's real carriers instead of a copy, which
// reverts whatever edit was in progress without failing anything.
//
// The comparison is on `git status --porcelain`, so it covers tracked edits and
// stray new files alike.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Paths the suite legitimately writes while it runs. `test/source-store.test.mjs`
// captures into `sources/test-tmp-<pid>/` and removes it again; the files are
// untracked and cleaned up, but a test file running in parallel can see them
// mid-run, so they are not evidence that anything was mutated. Nothing else in
// the suite regenerates a repository file: every other script run is `--check`.
const TRANSIENT = [/^sources\/test-tmp-/];

/** `git status --porcelain`, minus the transient paths, as a stable string. */
export function repoStatus() {
  const lines = execFileSync("git", ["status", "--porcelain"], { cwd: REPO, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((line) => !TRANSIENT.some((pattern) => pattern.test(line.slice(3))));
  return lines.sort().join("\n");
}

/** Fail if the working tree moved since `before` was taken. */
export function assertRepoUnchanged(before) {
  assert.equal(
    repoStatus(),
    before,
    "a test mutated tracked files: run scripts against a copy (--root/--target) or with --check",
  );
}

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseVerdict, VERDICT_KINDS } from "../scripts/lib/release-guard.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const pkg = (version) => JSON.stringify({ name: "geoalgeria", version });

const changelog = (version) =>
  [
    `## ${version}`,
    "",
    "Correct 2 wilaya and 178 commune names against the Official Journal.",
    "",
    "### Added",
    "",
    "- data/name-history.json",
    "",
    "## 2.0.2",
    "",
    "- an older release",
    "",
  ].join("\n");

test("the guard releases a version that is committed with a CHANGELOG section", () => {
  const verdict = releaseVerdict({
    tag: "geoalgeria@2.1.0",
    version: "2.1.0",
    packageJson: pkg("2.1.0"),
    changelog: changelog("2.1.0"),
  });
  assert.equal(verdict.releasable, true);
  assert.equal(verdict.kind, "release");
});

test("the guard declines the bumped working tree of a pending Version PR", () => {
  // The 2026-09-26 incident: changesets/action had already run `changeset
  // version` in the workspace, so the tree said 2.1.0 while main still said
  // 2.0.2. Both files are bumped together, so the version check is what catches it.
  const verdict = releaseVerdict({
    tag: "geoalgeria@2.1.0",
    version: "2.1.0",
    packageJson: pkg("2.0.2"),
    changelog: changelog("2.0.2"),
    ref: "commit 6db9667",
  });
  assert.equal(verdict.releasable, false);
  assert.match(verdict.reason, /carries 2\.0\.2, not 2\.1\.0/);
  assert.match(verdict.reason, /Version PR has not merged/);
  // Routine: npm published nothing either, so nothing is missing.
  assert.equal(verdict.kind, "pending-version-pr");
});

test("the guard declines a committed version whose CHANGELOG section is missing or empty", () => {
  const missing = releaseVerdict({
    tag: "geoalgeria@2.1.0",
    version: "2.1.0",
    packageJson: pkg("2.1.0"),
    changelog: changelog("2.0.2"),
  });
  assert.equal(missing.releasable, false);
  assert.match(missing.reason, /no section for 2\.1\.0/);
  // NOT routine: 2.1.0 is committed, so it stages and npm serves it, but no
  // GitHub Release, data bundle or announcement is cut for it.
  assert.equal(missing.kind, "missing-changelog");
  assert.match(missing.reason, /IS committed/);
  assert.match(missing.reason, /goes live on npm/);

  const empty = releaseVerdict({
    tag: "geoalgeria@2.1.0",
    version: "2.1.0",
    packageJson: pkg("2.1.0"),
    changelog: "## 2.1.0\n\n## 2.0.2\n\n- an older release\n",
  });
  assert.equal(empty.releasable, false);
  assert.match(empty.reason, /no section for 2\.1\.0/);
  assert.equal(empty.kind, "missing-changelog");
});

test("the guard fails closed on anything it cannot read", () => {
  const cases = [
    [{ packageJson: null, changelog: changelog("2.1.0") }, /package\.json is not in/],
    [{ packageJson: "{ not json", changelog: changelog("2.1.0") }, /not valid JSON/],
    [{ packageJson: pkg("2.1.0"), changelog: null }, /CHANGELOG\.md is not in/],
    [{ packageJson: "{}", changelog: changelog("2.1.0") }, /carries no version/],
  ];
  for (const [input, expected] of cases) {
    const verdict = releaseVerdict({ tag: "geoalgeria@2.1.0", version: "2.1.0", ...input });
    assert.equal(verdict.releasable, false);
    assert.match(verdict.reason, expected);
    // A tree the guard cannot read is not the routine pending-Version-PR case.
    assert.equal(verdict.kind, "unreadable");
  }

  const noVersion = releaseVerdict({
    tag: "geoalgeria@",
    version: "",
    packageJson: pkg("2.1.0"),
    changelog: changelog("2.1.0"),
  });
  assert.equal(noVersion.releasable, false);
  assert.match(noVersion.reason, /no version given/);
  assert.equal(noVersion.kind, "unreadable");
});

test("every verdict kind is one of the declared ones", () => {
  const verdicts = [
    releaseVerdict({ tag: "t@1.0.0", version: "1.0.0", packageJson: pkg("1.0.0"), changelog: changelog("1.0.0") }),
    releaseVerdict({ tag: "t@1.0.0", version: "1.0.0", packageJson: pkg("0.9.0"), changelog: changelog("0.9.0") }),
    releaseVerdict({ tag: "t@1.0.0", version: "1.0.0", packageJson: pkg("1.0.0"), changelog: "## 0.9.0\n\n- old\n" }),
    releaseVerdict({ tag: "t@1.0.0", version: "1.0.0", packageJson: null, changelog: null }),
  ];
  assert.deepEqual(
    verdicts.map((v) => v.kind),
    ["release", "pending-version-pr", "missing-changelog", "unreadable"],
  );
  for (const v of verdicts) assert.ok(VERDICT_KINDS.includes(v.kind));
});

/**
 * The CLI's exit code is what release.yml branches on, so pin it end to end in a
 * throwaway git repo: 3 is a silent skip, 4 is the one the workflow annotates.
 */
function guardExit({ committedVersion, changelog, version }) {
  const dir = mkdtempSync(join(tmpdir(), "release-guard-"));
  const run = (...args) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  run("init", "-q");
  run("config", "user.email", "t@example.com");
  run("config", "user.name", "t");
  mkdirSync(join(dir, "packages/thing"), { recursive: true });
  writeFileSync(join(dir, "packages/thing/package.json"), JSON.stringify({ name: "thing", version: committedVersion }));
  writeFileSync(join(dir, "packages/thing/CHANGELOG.md"), changelog);
  run("add", "-A");
  run("commit", "-q", "-m", "c");
  try {
    const stdout = execFileSync(
      process.execPath,
      [join(ROOT, "scripts/release-guard.mjs"), "packages/thing", version, `thing@${version}`, "HEAD"],
      { cwd: dir, encoding: "utf8" },
    );
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status, stdout: String(err.stdout ?? "") };
  }
}

test("the CLI exits 0 for a releasable version", () => {
  const { code, stdout } = guardExit({ committedVersion: "1.0.0", changelog: "## 1.0.0\n\n- a headline\n", version: "1.0.0" });
  assert.equal(code, 0);
  assert.match(stdout, /release guard ok/);
});

test("the CLI exits 3 when the version is not on main yet", () => {
  const { code, stdout } = guardExit({ committedVersion: "1.0.0", changelog: "## 1.0.0\n\n- a headline\n", version: "1.1.0" });
  assert.equal(code, 3);
  assert.match(stdout, /pending-version-pr/);
});

test("the CLI exits 4 when a committed version has no CHANGELOG section", () => {
  const { code, stdout } = guardExit({ committedVersion: "1.1.0", changelog: "## 1.0.0\n\n- a headline\n", version: "1.1.0" });
  assert.equal(code, 4);
  assert.match(stdout, /missing-changelog/);
  assert.match(stdout, /goes live on npm/);
});

test("the guard accepts a keep-a-changelog heading and does not match a wider version", () => {
  const dated = releaseVerdict({
    tag: "@geoalgeria/buses@2.1.0",
    version: "2.1.0",
    packageJson: JSON.stringify({ name: "@geoalgeria/buses", version: "2.1.0" }),
    changelog: "## [2.1.0] - 2026-09-13\n\n- the observed network\n",
  });
  assert.equal(dated.releasable, true);

  const wider = releaseVerdict({
    tag: "@geoalgeria/buses@1.1.0",
    version: "1.1.0",
    packageJson: JSON.stringify({ name: "@geoalgeria/buses", version: "1.1.0" }),
    changelog: "## 11.1.0\n\n- a different version\n",
  });
  assert.equal(wider.releasable, false);
});

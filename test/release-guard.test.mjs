import test from "node:test";
import assert from "node:assert/strict";
import { releaseVerdict } from "../scripts/lib/release-guard.mjs";

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

  const empty = releaseVerdict({
    tag: "geoalgeria@2.1.0",
    version: "2.1.0",
    packageJson: pkg("2.1.0"),
    changelog: "## 2.1.0\n\n## 2.0.2\n\n- an older release\n",
  });
  assert.equal(empty.releasable, false);
  assert.match(empty.reason, /no section for 2\.1\.0/);
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
  }

  const noVersion = releaseVerdict({
    tag: "geoalgeria@",
    version: "",
    packageJson: pkg("2.1.0"),
    changelog: changelog("2.1.0"),
  });
  assert.equal(noVersion.releasable, false);
  assert.match(noVersion.reason, /no version given/);
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

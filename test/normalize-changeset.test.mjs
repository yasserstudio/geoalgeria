// The major-changeset guard over @geoalgeria/normalize's key path.
//
// Keys are baked into every published catalog and an installed catalog is never
// migrated record by record, so a key change rebuilds and re-downloads every
// catalog on every device. That makes a key change closer to a schema change than
// to a bug fix, and the only cheap moment to insist on the major is the pull
// request. These tests pin the decision: which paths arm the guard, what counts as
// a major changeset, and the one exception the pre-publish chain needs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { GUARDED_PATHS, guardedFiles, majorChangesetError } from "../scripts/lib/normalize-changeset.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MAJOR = '---\n"@geoalgeria/normalize": major\n---\n\nA key changed.\n';
const PUBLISHED = { status: "published", version: "1.0.0" };
const UNPUBLISHED = { status: "unpublished" };
const UNKNOWN = { status: "unknown", reason: "network timeout" };
const PATCH = '---\n"geoalgeria": patch\n---\n\nA documentation fix.\n';

const KEY_CHANGE = ["packages/normalize/src/keys.js"];
const one = (input) => {
  const errors = majorChangesetError(input);
  assert.equal(errors.length, 1, `expected exactly one message, got ${JSON.stringify(errors)}`);
  return errors[0];
};

test("a diff that touches no guarded path is not the guard's business", () => {
  assert.deepEqual(
    majorChangesetError({
      changedFiles: ["packages/normalize/README.md", "packages/poste/data/offices.json", "CONTRIBUTING.md"],
      changesets: [],
      registry: PUBLISHED,
    }),
    [],
  );
});

test("a key-path change with a major changeset passes", () => {
  assert.deepEqual(majorChangesetError({ changedFiles: KEY_CHANGE, changesets: [MAJOR], registry: PUBLISHED }), []);
});

test("a key-path change with no changeset at all fails", () => {
  const message = one({ changedFiles: KEY_CHANGE, changesets: [], registry: PUBLISHED });
  assert.match(message, /packages\/normalize\/src\/keys\.js/);
  assert.match(message, /major/);
});

test("a key-path change carrying only somebody else's changeset fails", () => {
  const message = one({ changedFiles: KEY_CHANGE, changesets: [PATCH], registry: PUBLISHED });
  assert.match(message, /major/);
});

test("a patch or minor bump of the package itself is not enough", () => {
  for (const bump of ["patch", "minor"]) {
    const changeset = `---\n"@geoalgeria/normalize": ${bump}\n---\n\nNot a major.\n`;
    assert.equal(majorChangesetError({ changedFiles: KEY_CHANGE, changesets: [changeset], registry: PUBLISHED }).length, 1);
  }
});

test("the major may arrive in any one of several changesets", () => {
  assert.deepEqual(
    majorChangesetError({ changedFiles: KEY_CHANGE, changesets: [PATCH, MAJOR], registry: PUBLISHED }),
    [],
  );
});

// Changesets are hand-written markdown, so the frontmatter is read the way a
// human writes it rather than the one way a generator would.
test("the package name is recognised however the frontmatter quotes it", () => {
  for (const line of ['"@geoalgeria/normalize": major', "'@geoalgeria/normalize': major", "@geoalgeria/normalize: major"]) {
    const changeset = `---\n${line}\n---\n\nA key changed.\n`;
    assert.deepEqual(majorChangesetError({ changedFiles: KEY_CHANGE, changesets: [changeset], registry: PUBLISHED }), []);
  }
});

// A bump named in the prose rather than the frontmatter is not a bump: changesets
// only read the block above the first pair of dashes.
test("the word major in the body is not a major changeset", () => {
  const changeset = '---\n"geoalgeria": patch\n---\n\nThis is a major change to "@geoalgeria/normalize": major.\n';
  assert.equal(majorChangesetError({ changedFiles: KEY_CHANGE, changesets: [changeset], registry: PUBLISHED }).length, 1);
});

// The exception, and its expiry. Until the first version is on npm there is no
// published catalog to invalidate, and the release entry is a patch on the
// flagship rather than a major on a package nobody can install yet.
test("an unpublished package passes without a major changeset", () => {
  assert.deepEqual(majorChangesetError({ changedFiles: KEY_CHANGE, changesets: [PATCH], registry: UNPUBLISHED }), []);
});

test("once the package is published only the major path remains", () => {
  const message = one({ changedFiles: KEY_CHANGE, changesets: [PATCH], registry: PUBLISHED });
  assert.match(message, /1\.0\.0/, "the message names the published version, so the reason the exception lapsed is legible");
});

// Only a 404 is the unpublished answer. A registry that could not be reached is a
// third answer, and the guard fails closed on it: an unnecessary major costs one
// version number, a missed one costs every installed catalog on every device, so a
// timeout must never be allowed to read as "the package does not exist".
test("an unreachable registry fails closed rather than passing as unpublished", () => {
  const message = one({ changedFiles: KEY_CHANGE, changesets: [PATCH], registry: UNKNOWN });
  assert.match(message, /fails closed/);
  assert.match(message, /network timeout/, "the message names why the registry could not be asked");
});

test("an unreachable registry still passes a diff that carries the major", () => {
  assert.deepEqual(majorChangesetError({ changedFiles: KEY_CHANGE, changesets: [MAJOR], registry: UNKNOWN }), []);
});

test("an unreachable registry is not the guard's business off the key path", () => {
  assert.deepEqual(
    majorChangesetError({ changedFiles: ["packages/normalize/README.md"], changesets: [], registry: UNKNOWN }),
    [],
  );
});

test("the guarded paths are the key path, the rule table and the corpus", () => {
  assert.deepEqual([...GUARDED_PATHS], [
    "packages/normalize/src/",
    "packages/normalize/fixtures/corpus.js",
    "packages/normalize/index.js",
  ]);
  assert.deepEqual(
    guardedFiles([
      "packages/normalize/src/keys.js",
      "packages/normalize/src/tables.js",
      "packages/normalize/fixtures/corpus.js",
      "packages/normalize/index.js",
      "packages/normalize/fixtures/match-cases.js",
      "packages/normalize/types/index.d.ts",
      "packages/normalize/test/rules.test.mjs",
      "packages/normalize/README.md",
      "packages/normalize/package.json",
    ]),
    [
      "packages/normalize/src/keys.js",
      "packages/normalize/src/tables.js",
      "packages/normalize/fixtures/corpus.js",
      "packages/normalize/index.js",
    ],
  );
});

// The guard is deliberately blunt: it reads paths, not diffs. A comment fix in the
// key path is still a major, and the contributing guide says so, because the
// alternative is a check that has to understand what a change means.
test("a documentation-only edit to a guarded file is still a major", () => {
  assert.equal(
    majorChangesetError({
      changedFiles: ["packages/normalize/src/rules.js"],
      changesets: [PATCH],
      registry: PUBLISHED,
    }).length,
    1,
  );
});

// The decision function is only a guard if the workflow runs it and lets it fail
// the build. The tests above call it directly, so this one holds the wiring.
test("the workflow runs the check on pull requests and feeds it the diff", () => {
  const workflow = readFileSync(join(ROOT, ".github", "workflows", "ci.yml"), "utf-8");
  assert.match(workflow, /git diff --name-only/);
  assert.match(workflow, /node scripts\/check-normalize-changeset\.mjs/);
  assert.match(workflow, /if: github\.event_name == 'pull_request'/);
});

test("the runner reads the diff from its input and exits non-zero on a problem", () => {
  const runner = readFileSync(join(ROOT, "scripts", "check-normalize-changeset.mjs"), "utf-8");
  assert.match(runner, /majorChangesetError/);
  assert.match(runner, /process\.exitCode = 1/);
  // The registry answer the pre-publish exception rests on is a 404 specifically,
  // so the runner must tell a 404 apart from every other npm failure rather than
  // catching them all into one "unpublished".
  assert.match(runner, /E404/, "the runner must recognise a 404 rather than treating any npm failure as unpublished");
  assert.match(runner, /status: "unknown"/, "every other npm failure is the third answer, which fails closed");
});

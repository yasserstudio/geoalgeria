import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseGaps, gapAnnotations, mentionsDir, DELIBERATELY_UNPUBLISHED } from "../scripts/lib/release-gap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = readFileSync(join(ROOT, ".github/workflows/release.yml"), "utf8");

const pkg = (over) => ({
  dir: "packages/poste",
  name: "@geoalgeria/poste",
  version: "2.0.4",
  registryVersion: "2.0.4",
  umbrella: false,
  ...over,
});

test("a package whose version is already on npm and is in the workflow is not a gap", () => {
  assert.deepEqual(releaseGaps([pkg()], WORKFLOW), []);
});

test("a normal package the staged path will stage is not a gap", () => {
  const gaps = releaseGaps([pkg({ version: "2.1.0", registryVersion: "2.0.4" })], WORKFLOW);
  assert.deepEqual(gaps, []);
});

test("an umbrella ahead of npm is reported as a manual publish", () => {
  // @geoalgeria/pharma: repo 2.0.1, npm 2.0.0, skipped by stage-publish.js.
  const gaps = releaseGaps(
    [pkg({ dir: "packages/pharma", name: "@geoalgeria/pharma", version: "2.0.1", registryVersion: "2.0.0", umbrella: true })],
    WORKFLOW,
  );
  const manual = gaps.find((g) => g.kind === "manual");
  assert.ok(manual, "expected a manual gap");
  assert.match(manual.message, /repo carries 2\.0\.1, npm serves 2\.0\.0/);
  assert.match(manual.message, /will NOT go live on its own/);
});

test("a package npm has never seen names the one-time bootstrap", () => {
  // @geoalgeria/normalize 1.0.0 has never been on npm.
  const gaps = releaseGaps(
    [pkg({ dir: "packages/normalize", name: "@geoalgeria/normalize", version: "1.0.0", registryVersion: null })],
    WORKFLOW,
  );
  const unpublished = gaps.find((g) => g.kind === "unpublished");
  assert.ok(unpublished, "expected an unpublished gap");
  assert.match(unpublished.message, /npm publish --access public/);
  assert.match(unpublished.message, /packages\/normalize/);
});

test("an unpublished package is reported once, not also as a manual one", () => {
  const gaps = releaseGaps(
    [pkg({ dir: "packages/normalize", name: "@geoalgeria/normalize", version: "1.0.0", registryVersion: null, umbrella: true })],
    WORKFLOW,
  );
  assert.deepEqual(
    gaps.filter((g) => g.kind !== "not-in-workflow").map((g) => g.kind),
    ["unpublished"],
  );
});

test("a package dir the workflow's lists never mention is a gap on its own", () => {
  const gaps = releaseGaps([pkg({ dir: "packages/ghost", name: "@geoalgeria/ghost" })], "for pkg in packages/poste; do\n");
  assert.deepEqual(gaps.map((g) => g.kind), ["not-in-workflow"]);
  assert.match(gaps[0].message, /no publish dry run/);
});

test("a dir is matched whole, not as a prefix of a longer one", () => {
  // packages/pharma is a prefix of packages/pharmacies: a substring test would
  // read the pharma umbrella as present because pharmacies is listed.
  assert.equal(mentionsDir("for pkg in packages/pharmacies packages/poste; do", "packages/pharma"), false);
  assert.equal(mentionsDir("for pkg in packages/pharma packages/poste; do", "packages/pharma"), true);
});

test("the annotations are GitHub Actions warnings", () => {
  const lines = gapAnnotations(releaseGaps([pkg({ dir: "packages/ghost" })], "nothing"));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^::warning title=Release gap \(not-in-workflow\)::/);
});

test("a recorded exclusion is a notice, not a warning", () => {
  const gaps = releaseGaps(
    [pkg({ dir: "packages/schema", name: "@geoalgeria/schema", version: "1.1.1", registryVersion: null })],
    "nothing",
  );
  assert.deepEqual(gaps.map((g) => g.kind), ["excluded"]);
  assert.match(gapAnnotations(gaps)[0], /^::notice title=Release exclusion::/);
  // The contract package is the only recorded exclusion; a new one is a decision.
  assert.deepEqual([...DELIBERATELY_UNPUBLISHED.keys()], ["@geoalgeria/schema"]);
});

test("the umbrellas are the only workspace packages release.yml's lists leave out", () => {
  // The live gap this check exists for: transport and pharma are absent from both
  // loops. If a new package lands outside them, this test names it.
  const missing = readdirSync(join(ROOT, "packages"))
    .map((d) => `packages/${d}`)
    .filter((dir) => existsSync(join(ROOT, dir, "package.json")))
    .filter((dir) => !JSON.parse(readFileSync(join(ROOT, dir, "package.json"), "utf8")).private)
    .filter((dir) => !mentionsDir(WORKFLOW, dir));
  assert.deepEqual(missing.sort(), ["packages/pharma", "packages/schema", "packages/transport"]);
});

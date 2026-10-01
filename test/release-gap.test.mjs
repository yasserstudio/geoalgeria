import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  releaseGaps,
  gapAnnotations,
  mentionsDir,
  packageLoops,
  DELIBERATELY_UNPUBLISHED,
} from "../scripts/lib/release-gap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = readFileSync(join(ROOT, ".github/workflows/release.yml"), "utf8");

const pkg = (over) => ({
  dir: "packages/poste",
  name: "@geoalgeria/poste",
  version: "2.0.4",
  registryVersion: "2.0.4",
  ...over,
});

test("a package whose version is already on npm and is in the workflow is not a gap", () => {
  assert.deepEqual(releaseGaps([pkg()], WORKFLOW), []);
});

test("a normal package the staged path will stage is not a gap", () => {
  const gaps = releaseGaps([pkg({ version: "2.1.0", registryVersion: "2.0.4" })], WORKFLOW);
  assert.deepEqual(gaps, []);
});

test("an umbrella ahead of npm is no longer a gap, the release stages it", () => {
  // Was the live case for the "manual" gap: @geoalgeria/pharma repo 2.0.1 vs npm
  // 2.0.0, because stage-publish.js refused anything with workspace: runtime
  // deps. Both umbrellas are on the staged path since 2026-09-30, so an umbrella
  // ahead of npm is an ordinary pending publish and the report must stay quiet
  // about it.
  for (const dir of ["packages/transport", "packages/pharma"]) {
    const name = `@geoalgeria/${dir.slice("packages/".length)}`;
    const gaps = releaseGaps([pkg({ dir, name, version: "2.0.6", registryVersion: "2.0.5" })], WORKFLOW);
    assert.deepEqual(gaps, [], `${name} must not be reported`);
  }
});

test("an umbrella npm has never seen is still the one-time bootstrap", () => {
  // Staging cannot claim a name npm has never seen, umbrella or not.
  const gaps = releaseGaps(
    [pkg({ dir: "packages/transport", name: "@geoalgeria/transport", version: "2.0.6", registryVersion: null })],
    WORKFLOW,
  );
  assert.deepEqual(gaps.map((g) => g.kind), ["unpublished"]);
});

test("a package npm has never seen names the one-time bootstrap", () => {
  // The shape @geoalgeria/normalize 1.0.0 had before its 2026-09-29 bootstrap.
  const gaps = releaseGaps(
    [pkg({ dir: "packages/normalize", name: "@geoalgeria/normalize", version: "1.0.0", registryVersion: null })],
    WORKFLOW,
  );
  const unpublished = gaps.find((g) => g.kind === "unpublished");
  assert.ok(unpublished, "expected an unpublished gap");
  assert.match(unpublished.message, /npm publish --access public/);
  assert.match(unpublished.message, /packages\/normalize/);
});

test("an unpublished package is reported exactly once", () => {
  const gaps = releaseGaps(
    [pkg({ dir: "packages/normalize", name: "@geoalgeria/normalize", version: "1.0.0", registryVersion: null })],
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

test("a dir in only one of release.yml's two loops is still a gap", () => {
  // release.yml lists its packages twice by hand: the dry-run loop and the
  // GitHub Releases loop. A dir in the first but not the second stages and goes
  // live on npm with no GitHub Release and no data bundle, which is exactly the
  // silence this check exists to break. One mention anywhere used to satisfy it.
  const oneLoopOnly = [
    "      - name: Dry-run publish",
    "        run: |",
    "          for pkg in packages/poste packages/ghost; do",
    "            echo dry-run",
    "          done",
    "      - name: GitHub Releases + data bundles",
    "        run: |",
    "          for pkg in packages/poste; do",
    "            echo release",
    "          done",
  ].join("\n");

  assert.equal(mentionsDir(oneLoopOnly, "packages/ghost"), false, "in the dry-run loop only");
  assert.equal(mentionsDir(oneLoopOnly, "packages/poste"), true, "in both loops");

  const gaps = releaseGaps([pkg({ dir: "packages/ghost", name: "@geoalgeria/ghost" })], oneLoopOnly);
  assert.deepEqual(
    gaps.map((g) => g.kind),
    ["not-in-workflow"],
  );
  assert.match(gaps[0].message, /Add it to both loops/);
  assert.deepEqual(releaseGaps([pkg()], oneLoopOnly), [], "a dir in both loops is not a gap");
});

test("release.yml really does carry two package loops", () => {
  // mentionsDir proves a dir is in EVERY loop, so it is only as strong as the
  // number of loops it finds. If the file is restructured so the lists stop
  // matching `for pkg in`, this test says so rather than the check going quiet.
  assert.equal(packageLoops(WORKFLOW).length, 2);
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

test("the contract package is the only workspace package release.yml's lists leave out", () => {
  // transport and pharma used to be missing from both loops, which was the live
  // gap this check exists for. They are in both since 2026-09-30, leaving only
  // the private @geoalgeria/schema. If a new package lands outside the loops,
  // this test names it.
  const missing = readdirSync(join(ROOT, "packages"))
    .map((d) => `packages/${d}`)
    .filter((dir) => existsSync(join(ROOT, dir, "package.json")))
    .filter((dir) => !JSON.parse(readFileSync(join(ROOT, dir, "package.json"), "utf8")).private)
    .filter((dir) => !mentionsDir(WORKFLOW, dir));
  assert.deepEqual(missing.sort(), ["packages/schema"]);
});

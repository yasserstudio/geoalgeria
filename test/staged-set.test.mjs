import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isUmbrella, stagedSet } from "../scripts/lib/staged-set.mjs";
import { mentionsDir } from "../scripts/lib/release-gap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = readFileSync(join(ROOT, ".github/workflows/release.yml"), "utf8");

/** The real workspace: every package dir with its manifest, in dir-name order. */
const workspacePackages = () =>
  readdirSync(join(ROOT, "packages"))
    .map((d) => `packages/${d}`)
    .filter((dir) => existsSync(join(ROOT, dir, "package.json")))
    .sort()
    .map((dir) => ({ dir, manifest: JSON.parse(readFileSync(join(ROOT, dir, "package.json"), "utf8")) }));

test("a runtime workspace: dep is the umbrella shape; a dev one is not", () => {
  assert.equal(isUmbrella({ dependencies: { "@geoalgeria/buses": "workspace:^" } }), true);
  // Half the workspace carries the contract package in devDependencies and none
  // of those is an umbrella.
  assert.equal(isUmbrella({ devDependencies: { "@geoalgeria/schema": "workspace:^" } }), false);
  assert.equal(isUmbrella({ dependencies: { "@geoalgeria/buses": "^2.2.0" } }), false);
  assert.equal(isUmbrella({}), false);
});

test("both umbrellas are in the staged set", () => {
  // The change this pins: transport and pharma used to be refused by
  // stage-publish.js for carrying workspace: runtime deps, so every bump was a
  // hand pnpm publish and npm drifted behind the repo.
  const staged = stagedSet(workspacePackages());
  assert.ok(staged.includes("packages/transport"), "packages/transport must stage");
  assert.ok(staged.includes("packages/pharma"), "packages/pharma must stage");
});

test("the staged set is every non-private package and nothing else", () => {
  const packages = workspacePackages();
  const staged = stagedSet(packages);
  assert.deepEqual(
    staged.slice().sort(),
    packages
      .filter(({ manifest }) => !manifest.private)
      .map(({ dir }) => dir)
      .sort(),
  );
});

test("the umbrellas stage last, after the packages they re-export", () => {
  // An umbrella stages with its members resolved to real semver (^2.2.0), so
  // those versions have to be on npm, or staged in the same run, first. Dir-name
  // order does not give that: packages/pharma sorts before both of its members.
  const packages = workspacePackages();
  const staged = stagedSet(packages);
  const umbrellas = ["packages/transport", "packages/pharma"];
  const firstUmbrella = Math.min(...umbrellas.map((dir) => staged.indexOf(dir)));
  assert.equal(staged.length - firstUmbrella, umbrellas.length, "nothing stages after the umbrellas");

  for (const dir of umbrellas) {
    const { manifest } = packages.find((p) => p.dir === dir);
    for (const member of Object.keys(manifest.dependencies)) {
      const memberDir = packages.find((p) => p.manifest.name === member).dir;
      assert.ok(
        staged.indexOf(memberDir) < staged.indexOf(dir),
        `${memberDir} must stage before ${dir}`,
      );
    }
  }
});

test("a newly added package joins the staged set without being named anywhere", () => {
  const staged = stagedSet([
    { dir: "packages/ghost", manifest: { name: "@geoalgeria/ghost", version: "1.0.0" } },
    { dir: "packages/secret", manifest: { name: "@geoalgeria/secret", private: true } },
  ]);
  assert.deepEqual(staged, ["packages/ghost"]);
});

test("release.yml's package loops list both umbrellas", () => {
  // release.yml names its packages by hand, twice: the dry-run loop and the
  // GitHub Releases loop. mentionsDir requires EVERY loop.
  assert.equal(mentionsDir(WORKFLOW, "packages/transport"), true);
  assert.equal(mentionsDir(WORKFLOW, "packages/pharma"), true);
});

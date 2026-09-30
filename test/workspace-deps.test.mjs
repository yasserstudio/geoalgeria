import test from "node:test";
import assert from "node:assert/strict";
import { DEPENDENCY_FIELDS, findWorkspaceSpecs, rewriteWorkspaceSpecs } from "../scripts/lib/workspace-deps.mjs";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

test("every dependency field is inspected, not just dependencies", () => {
  assert.deepEqual(DEPENDENCY_FIELDS, [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]);
});

test("a workspace: spec is found in any dependency field", () => {
  // The leak: @geoalgeria/telecom 3.0.0, @geoalgeria/pharmacies 2.2.1 and
  // @geoalgeria/protection-civile 1.0.3 all went live on npm with a literal
  // "workspace:^" in devDependencies, because the old check read dependencies only.
  const found = findWorkspaceSpecs({
    name: "@geoalgeria/telecom",
    dependencies: { "some-real-dep": "^1.0.0" },
    devDependencies: { "@geoalgeria/schema": "workspace:^" },
    peerDependencies: { "@geoalgeria/normalize": "workspace:*" },
    optionalDependencies: { "@geoalgeria/poste": "workspace:~" },
  });
  assert.deepEqual(found, [
    { field: "devDependencies", name: "@geoalgeria/schema", spec: "workspace:^" },
    { field: "peerDependencies", name: "@geoalgeria/normalize", spec: "workspace:*" },
    { field: "optionalDependencies", name: "@geoalgeria/poste", spec: "workspace:~" },
  ]);
});

test("a manifest with no workspace: spec is left exactly as it is", () => {
  const manifest = { name: "x", dependencies: { a: "^1.0.0" }, devDependencies: { b: "~2.0.0" } };
  assert.deepEqual(findWorkspaceSpecs(manifest), []);
  const result = rewriteWorkspaceSpecs(manifest, new Map());
  assert.deepEqual(result.rewritten, []);
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.changed, false);
  assert.deepEqual(result.manifest, manifest);
});

test("the alias specs rewrite the way pnpm rewrites them", () => {
  const versions = new Map([
    ["@geoalgeria/schema", "1.1.1"],
    ["@geoalgeria/aviation", "2.5.2"],
    ["@geoalgeria/buses", "2.2.0"],
    ["@geoalgeria/poste", "2.0.4"],
  ]);
  const { manifest, rewritten, unresolved, changed } = rewriteWorkspaceSpecs(
    {
      name: "@geoalgeria/transport",
      dependencies: { "@geoalgeria/aviation": "workspace:^", "@geoalgeria/buses": "workspace:*" },
      devDependencies: { "@geoalgeria/schema": "workspace:~" },
      optionalDependencies: { "@geoalgeria/poste": "workspace:^2.0.0" },
    },
    versions,
  );
  assert.equal(changed, true);
  assert.deepEqual(unresolved, []);
  assert.equal(manifest.dependencies["@geoalgeria/aviation"], "^2.5.2");
  assert.equal(manifest.dependencies["@geoalgeria/buses"], "2.2.0");
  assert.equal(manifest.devDependencies["@geoalgeria/schema"], "~1.1.1");
  // An explicit range after the protocol keeps that range; only the protocol goes.
  assert.equal(manifest.optionalDependencies["@geoalgeria/poste"], "^2.0.0");
  assert.equal(rewritten.length, 4);
  assert.deepEqual(rewritten[0], {
    field: "dependencies",
    name: "@geoalgeria/aviation",
    from: "workspace:^",
    to: "^2.5.2",
  });
});

test("the input manifest is not mutated", () => {
  const manifest = { name: "x", devDependencies: { "@geoalgeria/schema": "workspace:^" } };
  rewriteWorkspaceSpecs(manifest, new Map([["@geoalgeria/schema", "1.1.1"]]));
  assert.equal(manifest.devDependencies["@geoalgeria/schema"], "workspace:^");
});

test("a workspace: spec that cannot be resolved is rejected, never published as-is", () => {
  const { unresolved, manifest, changed } = rewriteWorkspaceSpecs(
    { name: "x", devDependencies: { "@geoalgeria/ghost": "workspace:^" } },
    new Map([["@geoalgeria/schema", "1.1.1"]]),
  );
  assert.equal(changed, false);
  assert.deepEqual(unresolved, [
    { field: "devDependencies", name: "@geoalgeria/ghost", spec: "workspace:^", reason: "no workspace package named @geoalgeria/ghost" },
  ]);
  // Left untouched, so the caller must refuse rather than ship a half-rewritten manifest.
  assert.equal(manifest.devDependencies["@geoalgeria/ghost"], "workspace:^");
});

test("an explicit range after the protocol is kept, in every shape npm understands", () => {
  const versions = new Map([["@geoalgeria/poste", "2.0.4"]]);
  const keeps = ["^2.0.0", "~2.0", ">=2.0.0 <3", "2.x", "1.2.3 - 2.0.0", "^1.0.0 || ^2.0.0", "2.0.4", "1.0.0-beta.1"];
  for (const range of keeps) {
    const { manifest, unresolved } = rewriteWorkspaceSpecs(
      { name: "x", dependencies: { "@geoalgeria/poste": `workspace:${range}` } },
      versions,
    );
    assert.deepEqual(unresolved, [], `workspace:${range} should resolve`);
    assert.equal(manifest.dependencies["@geoalgeria/poste"], range);
  }
});

test("an alias or malformed spec is unresolved, never stripped and published", () => {
  // The leak: anything that was not *, ^ or ~ had the protocol stripped and the
  // remainder shipped verbatim. pnpm's alias form `workspace:<name>@<range>`
  // became `geoalgeria@*`, which no resolver can install, and a bare
  // `workspace:` became "", which npm reads as `*` and so silently widens the
  // dependency to any version. Both looked resolved to the fail-closed guard.
  const versions = new Map([
    ["@geoalgeria/poste", "2.0.4"],
    ["geoalgeria", "2.2.0"],
  ]);
  const refuses = [
    "workspace:geoalgeria@*",
    "workspace:",
    "workspace:@geoalgeria/poste@^2.0.0",
    "workspace:latest",
    "workspace:file:../poste",
  ];
  for (const spec of refuses) {
    const { unresolved, manifest, changed } = rewriteWorkspaceSpecs(
      { name: "x", dependencies: { "@geoalgeria/poste": spec } },
      versions,
    );
    assert.equal(changed, false, `${spec} must not rewrite`);
    assert.equal(unresolved.length, 1, `${spec} must be reported`);
    assert.match(unresolved[0].reason, /neither workspace:\* \/ \^ \/ ~ nor workspace:<semver range>/);
    // Untouched, so stage-publish.js refuses the package instead of shipping it.
    assert.equal(manifest.dependencies["@geoalgeria/poste"], spec);
  }
});

test("one unsupported spec fails the whole manifest closed, alongside resolvable ones", () => {
  const { unresolved, changed, manifest } = rewriteWorkspaceSpecs(
    {
      name: "@geoalgeria/transport",
      dependencies: { "@geoalgeria/buses": "workspace:^", "@geoalgeria/poste": "workspace:geoalgeria@*" },
    },
    new Map([
      ["@geoalgeria/buses", "2.2.0"],
      ["@geoalgeria/poste", "2.0.4"],
    ]),
  );
  assert.equal(changed, false);
  assert.equal(unresolved.length, 1);
  assert.equal(manifest.dependencies["@geoalgeria/buses"], "workspace:^", "nothing is half-rewritten");
});

test("a workspace package with no version of its own is rejected", () => {
  const { unresolved } = rewriteWorkspaceSpecs(
    { name: "x", dependencies: { "@geoalgeria/schema": "workspace:^" } },
    new Map([["@geoalgeria/schema", undefined]]),
  );
  assert.equal(unresolved.length, 1);
  assert.match(unresolved[0].reason, /carries no version/);
});

test("staging an umbrella resolves every workspace: spec it carries", () => {
  // @geoalgeria/transport's real manifest shape: every runtime dependency is a
  // workspace: alias, nothing else. This is what used to make stage-publish.js
  // refuse it, so each of the four has to come out as real semver or the staged
  // tarball is uninstallable (EUNSUPPORTEDPROTOCOL).
  const transport = {
    name: "@geoalgeria/transport",
    version: "2.0.6",
    dependencies: {
      "@geoalgeria/aviation": "workspace:^",
      "@geoalgeria/ferroviaire": "workspace:^",
      "@geoalgeria/gares-routieres": "workspace:^",
      "@geoalgeria/buses": "workspace:^",
    },
  };
  const versions = new Map([
    ["@geoalgeria/aviation", "2.5.2"],
    ["@geoalgeria/ferroviaire", "2.1.1"],
    ["@geoalgeria/gares-routieres", "2.2.2"],
    ["@geoalgeria/buses", "2.2.0"],
  ]);

  const { manifest, rewritten, unresolved, changed } = rewriteWorkspaceSpecs(transport, versions);
  assert.deepEqual(unresolved, []);
  assert.equal(changed, true);
  assert.equal(rewritten.length, 4, "all four runtime deps rewrite");
  assert.deepEqual(findWorkspaceSpecs(manifest), [], "no workspace: spec survives");
  assert.deepEqual(manifest.dependencies, {
    "@geoalgeria/aviation": "^2.5.2",
    "@geoalgeria/ferroviaire": "^2.1.1",
    "@geoalgeria/gares-routieres": "^2.2.2",
    "@geoalgeria/buses": "^2.2.0",
  });
});

test("the real umbrella manifests resolve against the real workspace", () => {
  // The fixture above pins the shape; this pins the live files, so a member
  // renamed or dropped from the workspace fails here rather than on a release.
  const dirs = readdirSync(join(ROOT, "packages")).filter((d) =>
    existsSync(join(ROOT, "packages", d, "package.json")),
  );
  const manifests = dirs.map((d) => JSON.parse(readFileSync(join(ROOT, "packages", d, "package.json"), "utf8")));
  const versions = new Map(manifests.map((m) => [m.name, m.version]));

  for (const name of ["@geoalgeria/transport", "@geoalgeria/pharma"]) {
    const manifest = manifests.find((m) => m.name === name);
    assert.ok(manifest, `${name} must exist in the workspace`);
    const specs = findWorkspaceSpecs(manifest);
    assert.ok(specs.length > 0, `${name} is expected to carry workspace: runtime deps`);
    const { manifest: rewrittenManifest, unresolved } = rewriteWorkspaceSpecs(manifest, versions);
    assert.deepEqual(unresolved, [], `${name}: unresolved workspace: spec`);
    for (const [dep, spec] of Object.entries(rewrittenManifest.dependencies)) {
      assert.match(spec, /^[\^~]?\d+\.\d+\.\d+/, `${name} -> ${dep} must be real semver, got ${spec}`);
    }
  }
});

test("no publishable package would ship a literal workspace: spec after the rewrite", () => {
  // The regression test for the live leak: walk the real workspace and prove the
  // rewrite resolves every workspace: spec any publishable package carries.
  const dirs = readdirSync(join(ROOT, "packages")).filter((d) =>
    existsSync(join(ROOT, "packages", d, "package.json")),
  );
  const manifests = dirs.map((d) => JSON.parse(readFileSync(join(ROOT, "packages", d, "package.json"), "utf8")));
  const versions = new Map(manifests.map((m) => [m.name, m.version]));

  for (const manifest of manifests) {
    if (manifest.private) continue;
    const { manifest: rewrittenManifest, unresolved } = rewriteWorkspaceSpecs(manifest, versions);
    assert.deepEqual(unresolved, [], `${manifest.name}: unresolved workspace: spec`);
    assert.deepEqual(
      findWorkspaceSpecs(rewrittenManifest),
      [],
      `${manifest.name}: a workspace: spec survived the rewrite`,
    );
  }
});

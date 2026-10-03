// What the package promises about itself: the surface it exports, the version
// that surface is numbered with, the dependencies it does not have, and the
// runtime features the key path refuses to use.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { NORMALIZE_VERSION, searchKeys } from "../index.js";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(PKG, "package.json"), "utf-8"));

// A snapshot, not a subset check: an export nobody reviewed must not become a
// public commitment by slipping in beside the ones that were.
test("the root export surface is exactly what was reviewed", async () => {
  const module = await import("../index.js");
  assert.deepEqual(Object.keys(module).sort(), [
    "NORMALIZE_VERSION",
    "conservativeKey",
    "explain",
    "looseKey",
    "rules",
    "searchKeys",
    "tokenize",
  ]);
  assert.equal(typeof module.conservativeKey, "function");
  assert.equal(typeof module.looseKey, "function");
  assert.equal(typeof module.tokenize, "function");
  assert.equal(typeof module.searchKeys, "function");
  assert.equal(typeof module.explain, "function");
  assert.ok(Array.isArray(module.rules));
  assert.equal(typeof module.NORMALIZE_VERSION, "number");
});

test("the fixtures export surface is exactly what was reviewed", async () => {
  const module = await import("../fixtures/index.js");
  assert.deepEqual(Object.keys(module).sort(), ["corpus", "matchCases"]);
  assert.ok(Array.isArray(module.corpus));
  assert.ok(Array.isArray(module.matchCases));
  for (const kase of module.corpus) {
    assert.deepEqual(Object.keys(kase).sort(), ["conservative", "input", "loose", "note", "proves", "tokens"]);
    assert.equal(typeof kase.input, "string");
    assert.equal(typeof kase.conservative, "string");
    assert.equal(typeof kase.loose, "string");
    assert.ok(Array.isArray(kase.tokens));
    assert.ok(Array.isArray(kase.proves));
    assert.ok(kase.note.length > 0, "every case says what it proves");
  }
});

// Three statements of the same thing that can disagree silently: the subpaths the
// exports map promises, the paths the files array ships, and what is on disk. A
// subpath that resolves from the source tree but was never listed in files
// resolves from a checkout and fails from a tarball, which is exactly the failure
// a consumer installing from npm hits and nobody working in the repository does.
const SHIPPED_ANYWAY = new Set(["package.json", "README.md", "README.fr.md", "README.ar.md", "LICENSE"]);

/** The paths the files array covers: an entry ending in "/" is a directory. */
const shipped = (path) =>
  manifest.files.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry));

/** Every file in the package, as package-relative paths, tests and tooling included. */
const onDisk = (dir = PKG, prefix = "") =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? entry.name === "node_modules"
        ? []
        : onDisk(join(dir, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );

test("the exports map, the files array and the files on disk agree", () => {
  const targets = Object.values(manifest.exports).flatMap((conditions) => Object.values(conditions));
  assert.deepEqual(targets.sort(), [
    "./fixtures/index.js",
    "./index.js",
    "./types/fixtures.d.ts",
    "./types/index.d.ts",
  ]);

  // Every subpath the map promises exists, and ships.
  for (const target of [...targets, `./${manifest.main}`, `./${manifest.types}`]) {
    const path = target.replace(/^\.\//, "");
    assert.ok(existsSync(join(PKG, path)), `the exports map names ${target}, which is not on disk`);
    assert.ok(shipped(path), `the exports map names ${target}, which the files array does not ship`);
  }

  // Every files entry is something that exists, so a renamed directory is caught
  // here rather than by an empty tarball.
  for (const entry of manifest.files) {
    assert.ok(existsSync(join(PKG, entry)), `the files array ships ${entry}, which is not on disk`);
  }

  // And the other direction: nothing on disk is left out by accident. The only
  // files that may be unlisted are the ones npm ships regardless, and the tests,
  // which are deliberately not published.
  for (const path of onDisk()) {
    if (shipped(path) || SHIPPED_ANYWAY.has(path)) continue;
    assert.ok(
      path.startsWith("test/"),
      `${path} is neither shipped by the files array nor a test, so it is missing from the published package`,
    );
  }

  // Tests are not a published surface: a consumer importing them would pin the
  // package's own internals, and shipping them doubles the install for nothing.
  assert.ok(!manifest.files.some((entry) => entry.startsWith("test")), "the files array must not ship the tests");
});

// The one-pass call the release generator makes. Its shape is as public as the
// function names are, so it is snapshotted the same way.
test("the searchKeys result shape is exactly what was reviewed", () => {
  const keys = searchKeys("Béjaïa");
  assert.deepEqual(Object.keys(keys).sort(), ["conservative", "loose", "looseDiffers", "tokens"]);
  assert.equal(typeof keys.conservative, "string");
  assert.equal(typeof keys.loose, "string");
  assert.equal(typeof keys.looseDiffers, "boolean");
  assert.ok(Array.isArray(keys.tokens));
});

// One number, so there is nothing to keep in step by hand. A change to what the
// key returns for any input is a major, which is what makes "this rebuilds every
// catalog" visible in the version before anyone merges it.
test("NORMALIZE_VERSION is the manifest's semver major", () => {
  assert.equal(NORMALIZE_VERSION, Number(manifest.version.split(".")[0]));
});

test("the package has no runtime dependencies", () => {
  assert.deepEqual(manifest.dependencies ?? {}, {});
  assert.deepEqual(manifest.peerDependencies ?? {}, {});
  assert.deepEqual(manifest.optionalDependencies ?? {}, {});
});

// The runtime floor. The key path owns its own codepoint tables so that a Node,
// V8 or Hermes upgrade cannot change a published catalog's keys, and so that the
// package needs nothing React Native might not have. The check is a literal scan
// over the shipped source, which means the key path's own comments must not name
// the forbidden APIs either.
const FORBIDDEN = [
  ["node:", "a Node built-in import"],
  ["require(", "a CommonJS require"],
  ["Intl", "the internationalisation API"],
  ["\\p{", "a Unicode property escape"],
  ["\\P{", "a Unicode property escape"],
  [".normalize(", "the host's own Unicode normalisation"],
  ["toLocaleLowerCase", "a locale-aware case operation"],
  ["toLocaleUpperCase", "a locale-aware case operation"],
];

const keyPath = ["index.js", ...readdirSync(join(PKG, "src")).map((f) => join("src", f))];

test("the key path files are the ones this scan expects", () => {
  assert.deepEqual([...keyPath].sort(), [
    "index.js",
    join("src", "keys.js"),
    join("src", "rules.js"),
    join("src", "tables.js"),
  ]);
});

for (const file of keyPath) {
  test(`${file} stays inside the runtime floor`, () => {
    const source = readFileSync(join(PKG, file), "utf-8");
    for (const [needle, what] of FORBIDDEN) {
      assert.ok(!source.includes(needle), `${file} uses ${what} (${JSON.stringify(needle)})`);
    }
  });
}

// What the package promises about itself: the surface it exports, the version
// that surface is numbered with, the dependencies it does not have, and the
// runtime features the key path refuses to use.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { NORMALIZE_VERSION } from "../index.js";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(PKG, "package.json"), "utf-8"));

// A snapshot, not a subset check: an export nobody reviewed must not become a
// public commitment by slipping in beside the ones that were.
test("the root export surface is exactly what was reviewed", async () => {
  const module = await import("../index.js");
  assert.deepEqual(Object.keys(module).sort(), ["NORMALIZE_VERSION", "conservativeKey"]);
  assert.equal(typeof module.conservativeKey, "function");
  assert.equal(typeof module.NORMALIZE_VERSION, "number");
});

test("the fixtures export surface is exactly what was reviewed", async () => {
  const module = await import("../fixtures/corpus.js");
  assert.deepEqual(Object.keys(module).sort(), ["corpus"]);
  assert.ok(Array.isArray(module.corpus));
  for (const kase of module.corpus) {
    assert.deepEqual(Object.keys(kase).sort(), ["conservative", "input", "note"]);
    assert.equal(typeof kase.input, "string");
    assert.equal(typeof kase.conservative, "string");
    assert.ok(kase.note.length > 0, "every case says what it proves");
  }
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
  assert.deepEqual([...keyPath].sort(), ["index.js", join("src", "conservative.js"), join("src", "tables.js")]);
});

for (const file of keyPath) {
  test(`${file} stays inside the runtime floor`, () => {
    const source = readFileSync(join(PKG, file), "utf-8");
    for (const [needle, what] of FORBIDDEN) {
      assert.ok(!source.includes(needle), `${file} uses ${what} (${JSON.stringify(needle)})`);
    }
  });
}

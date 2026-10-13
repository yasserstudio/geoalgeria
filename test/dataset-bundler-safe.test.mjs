// `geoalgeria` must stay loadable by a bundler, not just by Node. Two faults in
// the umbrella made it unusable in a bundled app: an exports map with no ESM
// path, and JSON read at runtime from a `__dirname` path a bundler rewrites.
// `scripts/check-bundlers.mjs` holds the one full account of issue #276, which
// bundlers each shape works under included; this file does not repeat it.
//
// What it does is guard the umbrella cheaply, with no bundler: the exports map
// resolves for an ESM consumer as well as a CommonJS one, every data file is
// reached by a static `require` a bundler can see, and the public API still
// answers with the same values, lazily. The script proves the same end to end
// with a real bundler.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "packages", "dataset");
const manifest = JSON.parse(readFileSync(join(DATASET, "package.json"), "utf-8"));
const source = readFileSync(join(DATASET, "index.js"), "utf-8");
// The shape assertions below are about code, so drop the comment lines: they
// name the very patterns the code must not contain.
const code = source
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .join("\n");

/** Walk a package.json exports value the way Node and bundlers do: first key
 *  whose condition is active wins, `default` always matches. */
function resolveExport(value, conditions) {
  if (typeof value === "string" || value === null) return value;
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const hit = resolveExport(candidate, conditions);
      if (hit != null) return hit;
    }
    return null;
  }
  for (const [condition, nested] of Object.entries(value)) {
    if (condition === "default" || conditions.includes(condition)) {
      const hit = resolveExport(nested, conditions);
      if (hit != null) return hit;
    }
  }
  return null;
}

test("geoalgeria resolves for an ESM consumer as well as a CommonJS one", () => {
  const root = manifest.exports["."];

  assert.equal(
    resolveExport(root, ["node", "import"]),
    "./index.js",
    "`import geo from \"geoalgeria\"` does not resolve: exports['.'] has no import or default condition"
  );
  assert.equal(
    resolveExport(root, ["node", "require"]),
    "./index.js",
    "`require(\"geoalgeria\")` does not resolve"
  );

  // `types` stays first so both consumers get the declarations.
  assert.equal(Object.keys(root)[0], "types", "the types condition must come first");
  for (const kind of ["import", "require"]) {
    assert.equal(
      resolveExport(root, ["types", kind]),
      "./types/index.d.ts",
      `types do not resolve for a ${kind} consumer`
    );
  }

  assert.ok(existsSync(join(DATASET, "index.js")));
  assert.ok(existsSync(join(DATASET, "types", "index.d.ts")));
});

test("every data file is loaded by a static require a bundler can trace", () => {
  assert.doesNotMatch(
    code,
    /__dirname/,
    "index.js still builds a runtime path from __dirname; a bundler rewrites it and the read fails with ENOENT"
  );
  assert.doesNotMatch(
    code,
    /readFileSync/,
    "index.js still reads its data at runtime; use static require(\"./data/<file>.json\") instead"
  );

  const required = [...code.matchAll(/require\("(\.\/data\/[^"]+)"\)/g)].map((m) => m[1]);
  // The ten files the getters answer with: algeria, the three commune shards,
  // dairas, the ecommerce view, the two poste mirrors, name history and phone
  // code provenance.
  assert.equal(required.length, 10, `expected 10 static data requires, found ${required.length}`);
  for (const specifier of required) {
    assert.ok(
      existsSync(join(DATASET, specifier)),
      `index.js requires ${specifier}, which is not in the package`
    );
  }
  assert.ok(
    manifest.files.includes("data/**/*.json"),
    "files[] no longer ships the JSON the requires point at"
  );
});

test("the public API keeps its values and its lazy getters", () => {
  const geo = createRequire(import.meta.url)(join(DATASET, "index.js"));

  // Laziness: the data keys are accessors, so nothing is parsed on require.
  const lazy = [
    "wilayas",
    "communes",
    "dairas",
    "ecommerce",
    "all",
    "postOffices",
    "atms",
    "nameHistory",
    "phoneCodeProvenance",
  ];
  for (const key of lazy) {
    const descriptor = Object.getOwnPropertyDescriptor(geo, key);
    assert.equal(typeof descriptor?.get, "function", `${key} is no longer a lazy getter`);
  }

  assert.equal(geo.wilayas.length, 69);
  assert.equal(geo.communes.length, 1541);
  assert.equal(geo.all.length, 69);
  assert.ok(geo.dairas.length > 0);
  assert.ok(geo.ecommerce.length > 0);
  assert.ok(geo.postOffices.length > 0);
  assert.ok(geo.atms.length > 0);
  assert.ok(geo.nameHistory.communes.length > 0);
  assert.ok(geo.phoneCodeProvenance.wilayas.length > 0);

  // A wilaya record carries no commune list; `all` is the nested view.
  assert.equal(geo.wilayas[0].communes, undefined);
  assert.ok(Array.isArray(geo.all[0].communes));

  assert.equal(geo.getWilaya("16").name_fr, geo.getWilaya(16).name_fr);
  assert.ok(geo.getCommunesByWilaya(16).length > 0);
  assert.ok(geo.getDairasByWilaya(16).length > 0);
  assert.ok(geo.findCommune("Alger").length > 0);
  assert.ok(geo.findByPostalCode(geo.communes[0].postal_code).length > 0);
  assert.ok(geo.getPostOfficesByCommune(geo.postOffices[0].commune_code).length > 0);
  assert.deepEqual(geo.getPostOfficesByCommune(null), []);
});

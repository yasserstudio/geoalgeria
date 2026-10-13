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

/** `index.js` with its comments removed, because the shape assertions below are
 *  about code and the comments name the very patterns the code must not hold.
 *  A character walk, not a line filter: a trailing `// ...` and a block comment
 *  have to go too. It tracks quotes so a comment marker inside a string is
 *  kept; `index.js` carries no regex literal, which is the one case this would
 *  read wrong. */
function stripComments(src) {
  let out = "";
  let quote = null;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      if (c === "\\") {
        out += c + (next ?? "");
        i += 1;
      } else {
        if (c === quote) quote = null;
        out += c;
      }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += c;
      continue;
    }
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
      out += "\n";
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 1;
      continue;
    }
    out += c;
  }
  return out;
}

const code = stripComments(source);

/** The lazy getters of `index.js`, name to body, read out of the file rather
 *  than listed here, so a getter added tomorrow is checked tomorrow. */
function gettersOf(src) {
  const found = new Map();
  for (const [, name, body] of src.matchAll(/\n {2}get (\w+)\(\) \{\n([\s\S]*?)\n {2}\},/g)) {
    found.set(name, body);
  }
  return found;
}

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

test("every getter reaches its data by a static require, none builds a runtime path", () => {
  const bodies = gettersOf(code);
  const geo = createRequire(import.meta.url)(join(DATASET, "index.js"));
  const accessors = Object.keys(geo).filter(
    (key) => typeof Object.getOwnPropertyDescriptor(geo, key)?.get === "function"
  );

  // Read out of the file, so no count here can go stale against the module.
  assert.deepEqual(
    [...bodies.keys()].sort(),
    [...accessors].sort(),
    "the getters this test can read are not the getters the module exposes; check the formatting it is matched on"
  );

  for (const [name, body] of bodies) {
    assert.doesNotMatch(
      body,
      /__dirname|import\.meta\.url|readFileSync/,
      `${name} builds a path at runtime; a bundler rewrites it and the read fails with ENOENT`
    );

    const args = [...body.matchAll(/require\(([^)]*)\)/g)].map((m) => m[1]);
    for (const arg of args) {
      assert.match(
        arg,
        /^"\.\/data\/[-\w/.]+\.json"$/,
        `${name} calls require(${arg}); a bundler can only trace a string literal under ./data`
      );
      const file = arg.slice(1, -1);
      assert.ok(
        existsSync(join(DATASET, file)),
        `${name} requires ${file}, which is not in the package`
      );
    }

    // `wilayas` is derived from `all`; every other getter answers with a file.
    if (name !== "wilayas") {
      assert.ok(args.length > 0, `${name} loads no data file`);
    }
  }

  // The helpers and the module body, not just the getters.
  assert.doesNotMatch(
    code,
    /__dirname|readFileSync/,
    "index.js still reads its data at runtime; use a static require(\"./data/<file>.json\")"
  );
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

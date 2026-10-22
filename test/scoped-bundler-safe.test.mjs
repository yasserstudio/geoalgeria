// Every scoped sector package must stay loadable by a bundler, not just by
// Node. They each read their JSON at run time from a path joined off
// `import.meta.url`, which esbuild and Vite inline without relocating, so a
// bundled app built fine and then threw ENOENT on the first call.
// `scripts/check-bundlers.mjs` holds the one full account of issues #276 and
// #290, and proves the fix end to end with two real bundlers; this file does
// not repeat it.
//
// What it does is guard the 26 packages cheaply, with no bundler: no index
// builds a data path at run time, every `load("<file>")` call site has a
// generated loader behind it, every loader requires a literal path that exists,
// each `loaders.cjs` is the one the generator would write today, the tarball
// ships it, and the public API still answers lazily with the same values.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loaderPackages, dataFilesFor, render } from "../scripts/generate-loaders.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

/** The packages under test, read off disk so one added tomorrow is covered. */
const packages = loaderPackages().map((dir) => {
  const root = join(ROOT, "packages", dir);
  return {
    dir,
    root,
    manifest: JSON.parse(readFileSync(join(root, "package.json"), "utf-8")),
    index: readFileSync(join(root, "index.js"), "utf-8"),
    loaders: existsSync(join(root, "loaders.cjs"))
      ? readFileSync(join(root, "loaders.cjs"), "utf-8")
      : null,
  };
});

test("the sector packages are all here", () => {
  // A floor, not a fixed count: a new dataset package raises it, and a scan
  // that silently matched nothing would otherwise pass every test below.
  assert.ok(packages.length >= 26, `only ${packages.length} sector packages found`);
});

test("no index builds a data path at run time", () => {
  for (const { dir, index } of packages) {
    const code = index
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");
    assert.doesNotMatch(
      code,
      /readFileSync|import\.meta\.url|__dirname/,
      `${dir}/index.js reads its data at run time; a bundler rewrites the path and the read fails with ENOENT`,
    );
    assert.match(
      code,
      /import load from "\.\/loaders\.cjs";/,
      `${dir}/index.js does not load through the generated loaders`,
    );
  }
});

test("every loader requires a literal path to a file that ships", () => {
  for (const { dir, root, loaders } of packages) {
    assert.ok(loaders, `${dir}/loaders.cjs is missing`);
    const args = [...loaders.matchAll(/require\(([^)]*)\)/g)].map((m) => m[1]);
    assert.ok(args.length > 0, `${dir}/loaders.cjs loads no data file`);
    for (const arg of args) {
      assert.match(
        arg,
        /^"\.\/data\/[-\w/.]+\.json"$/,
        `${dir}/loaders.cjs calls require(${arg}); a bundler can only trace a string literal under ./data`,
      );
      const file = arg.slice(1, -1);
      assert.ok(existsSync(join(root, file)), `${dir}/loaders.cjs requires ${file}, not in the package`);
    }
  }
});

test("every file the index asks for by name has a loader", () => {
  for (const { dir, index, loaders } of packages) {
    const asked = [...index.matchAll(/\bload\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]);
    for (const file of asked) {
      assert.match(
        loaders,
        new RegExp(`"${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}": \\(\\) => require\\(`),
        `${dir}/index.js loads ${file} and loaders.cjs has no loader for it`,
      );
    }
  }
});

test("each loaders.cjs is the file the generator would write today", () => {
  for (const { dir, manifest, loaders } of packages) {
    assert.equal(
      loaders,
      render(manifest.name, dir, dataFilesFor(dir)),
      `${dir}/loaders.cjs is stale; run node scripts/generate-loaders.mjs`,
    );
  }
});

test("the npm tarball ships the loader and the JSON it points at", () => {
  for (const { dir, manifest } of packages) {
    assert.ok(
      manifest.files.includes("loaders.cjs"),
      `${dir} does not ship loaders.cjs; the published package would fail on import`,
    );
    assert.ok(
      manifest.files.includes("data/**/*.json"),
      `${dir} no longer ships the JSON its loaders require`,
    );
  }
});

test("a loader refuses a file this package does not have", () => {
  for (const { dir, root, manifest } of packages) {
    const load = require(join(root, "loaders.cjs"));
    assert.throws(
      () => load("no-such-file.json"),
      new RegExp(`${manifest.name.replace("/", "\\/")}: no data file`),
      `${dir}/loaders.cjs answers for a file it does not carry`,
    );
  }
});

test("the public API keeps its lazy functions and its values", async () => {
  for (const { dir, root } of packages) {
    const mod = await import(join(root, "index.js"));
    const api = mod.default;
    assert.equal(typeof api, "object", `${dir} has no default export`);

    const loaders = Object.entries(api).filter(([, v]) => typeof v === "function" && v.length === 0);
    assert.ok(loaders.length > 0, `${dir} exposes no zero-argument loader`);

    // Laziness: the exports are functions, so importing the module parses no
    // JSON; calling one answers with the data.
    let records = 0;
    for (const [, fn] of loaders) {
      const answer = fn();
      if (Array.isArray(answer)) records += answer.length;
    }
    assert.ok(records > 0, `${dir} served no records`);

    const metadata = api.metadata();
    assert.equal(
      metadata.record_count,
      JSON.parse(readFileSync(join(root, "data", "metadata.json"), "utf-8")).record_count,
      `${dir} metadata() does not answer with its own metadata.json`,
    );
  }
});

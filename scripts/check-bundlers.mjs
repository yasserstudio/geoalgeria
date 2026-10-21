#!/usr/bin/env node
/**
 * Prove the `geoalgeria` umbrella survives a bundler, not just Node.
 *
 * This is the canonical account of issue #276; `packages/dataset/index.js` and
 * `test/dataset-bundler-safe.test.mjs` point here rather than repeat it.
 *
 * The umbrella shipped two faults that only a bundler sees, both reproduced in
 * a Vercel Sandbox on 2026-10-13 (Next.js 16.4, Turbopack, geoalgeria 2.3.0):
 *
 *   1. `exports["."]` offered a `require` path and nothing else, so
 *      `import geo from "geoalgeria"` did not resolve at all ("Module not
 *      found"), even with the package in `serverExternalPackages`.
 *   2. The JSON was read through `fs.readFileSync(path.join(__dirname, "data",
 *      file))` with the file name in a variable. A bundler rewrites `__dirname`
 *      and cannot trace a computed path, so the build passed and every request
 *      failed with ENOENT on `/ROOT/node_modules/geoalgeria/data/algeria.json`.
 *
 * Node alone noticed neither one, hence this check: it packs the real tarball
 * (`npm pack`, the shipped `files[]` and nothing else), unpacks it into a
 * throwaway node_modules, bundles an entry that imports it, and runs the
 * bundle from an unrelated directory, where a runtime read could not find the
 * data even by accident. Both module formats are covered, and they take
 * different branches of the exports map: it declares no `import` condition, so
 * an ESM bundle falls through to `default`, while a CommonJS one takes
 * `require`.
 *
 * Only the umbrella. The scoped packages were verified WORKING in that same
 * sandbox (`import { branches } from "@geoalgeria/banques"` served all 1,704),
 * because they are ESM that join their data path at runtime from
 * `import.meta.url`, which Turbopack and webpack trace and relocate. esbuild
 * and Vite do not relocate it, so a scoped package does break under those two;
 * that is a real gap, tracked in its own ticket, and not something an esbuild
 * leg here can usefully assert: it would either fail for a reason this fix is
 * not about, or pass only because the bundle was emitted next to the `data/`
 * directory it reads, which proves nothing.
 *
 * Usage: node scripts/check-bundlers.mjs
 *
 * esbuild stands in for every bundler here because it is cheap and
 * deterministic in CI. Turbopack's own resolver is not run: that check needs a
 * Next.js app and belongs in a Vercel Sandbox, not on a laptop.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as esbuild from "esbuild";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ENTRY = `
import geo from "geoalgeria";

console.log(JSON.stringify({
  wilayas: geo.wilayas.length,
  communes: geo.communes.length,
  dairas: geo.dairas.length,
  postOffices: geo.postOffices.length,
  atms: geo.atms.length,
  ecommerce: geo.ecommerce.length,
  alger: geo.getWilaya(16).name_fr,
  communesOfAlger: geo.getCommunesByWilaya(16).length,
}));
`;

/** Bundle the entry, run it, and hand back what it printed. */
function bundleAndRun({ label, source, outfile, format, cwd }) {
  const entry = `${outfile}.entry.mjs`;
  writeFileSync(entry, source);
  esbuild.buildSync({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    target: "node22",
    format,
    outfile,
    logLevel: "warning",
  });
  const stdout = execFileSync(process.execPath, [outfile], { cwd, encoding: "utf8" });
  const report = JSON.parse(stdout.trim().split("\n").at(-1));
  console.log(`${label}: ${JSON.stringify(report)}`);
  return report;
}

/** Fail loudly, naming the format that produced the wrong number. */
function expect(label, report, exact, positive) {
  for (const [key, value] of Object.entries(exact)) {
    if (report[key] !== value) {
      throw new Error(`${label} reported ${key} = ${report[key]}, expected ${value}`);
    }
  }
  for (const key of positive) {
    if (!(report[key] > 0)) throw new Error(`${label} reported no ${key}`);
  }
}

const work = mkdtempSync(join(tmpdir(), "geoalgeria-bundlers-"));

try {
  const tarball = execFileSync("npm", ["pack", "--silent", "--pack-destination", work], {
    cwd: join(ROOT, "packages", "dataset"),
    encoding: "utf8",
  }).trim();
  mkdirSync(join(work, "node_modules", "geoalgeria"), { recursive: true });
  execFileSync("tar", [
    "-xzf",
    join(work, tarball),
    "-C",
    join(work, "node_modules", "geoalgeria"),
    "--strip-components=1",
  ]);
  console.log(`packed geoalgeria (${tarball})`);

  for (const format of ["esm", "cjs"]) {
    const label = `geoalgeria ${format} bundle`;
    const report = bundleAndRun({
      label,
      source: ENTRY,
      outfile: join(work, `geoalgeria.${format === "esm" ? "mjs" : "cjs"}`),
      format,
      cwd: tmpdir(),
    });
    expect(label, report, { wilayas: 69, communes: 1541, alger: "Alger" }, [
      "dairas",
      "postOffices",
      "atms",
      "ecommerce",
      "communesOfAlger",
    ]);
  }

  console.log("check-bundlers: ok");
} finally {
  rmSync(work, { recursive: true, force: true });
}

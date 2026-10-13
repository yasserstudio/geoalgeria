#!/usr/bin/env node
/**
 * Prove the published packages survive a bundler, not just Node.
 *
 * `geoalgeria` shipped two faults that only a bundler sees (issue #276): an
 * `exports` map with no `import` path, so `import geo from "geoalgeria"` did
 * not resolve at all, and JSON read through a path built from `__dirname` at
 * runtime, which a bundler rewrites, so the build passed and every request
 * failed with ENOENT. Node alone never noticed either one.
 *
 * So this packs the real tarballs (`npm pack`, the shipped `files[]` and
 * nothing else), unpacks them into a throwaway node_modules, bundles entries
 * that import them, and runs the bundles.
 *
 * Two shapes, checked differently on purpose:
 *
 *   - `geoalgeria` inlines its JSON through static `require`s, so its bundle is
 *     self-contained: it is run from an unrelated directory, where a runtime
 *     read could not find the data even by accident. Both module formats are
 *     covered, since an ESM bundle takes the `import` condition of the exports
 *     map and a CommonJS one takes `require`.
 *   - the scoped packages are ESM and read their data relative to
 *     `import.meta.url`, which bundlers with asset tracing (Turbopack, webpack)
 *     relocate and esbuild does not. Their bundle is therefore emitted inside
 *     the installed package, next to the `data/` directory it points at, which
 *     is where asset tracing would put it anyway.
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

/** [package directory, the name it installs as] */
const PACKAGES = [
  ["packages/dataset", "geoalgeria"],
  ["packages/aviation", "@geoalgeria/aviation"],
];

const UMBRELLA_ENTRY = `
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

const SECTOR_ENTRY = `
import { airports, airportsByWilaya, metadata } from "@geoalgeria/aviation";

console.log(JSON.stringify({
  airports: airports().length,
  airportsOfAlger: airportsByWilaya("16").length,
  wilayasCovered: metadata().wilayas_covered,
}));
`;

/** Bundle one entry, run it, and hand back what it printed. */
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

/** Fail loudly, with the format that produced the wrong number. */
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
  const installed = {};
  for (const [dir, name] of PACKAGES) {
    const tarball = execFileSync("npm", ["pack", "--silent", "--pack-destination", work], {
      cwd: join(ROOT, dir),
      encoding: "utf8",
    }).trim();
    const target = join(work, "node_modules", name);
    mkdirSync(target, { recursive: true });
    execFileSync("tar", ["-xzf", join(work, tarball), "-C", target, "--strip-components=1"]);
    installed[name] = target;
    console.log(`packed ${name} (${tarball})`);
  }

  // The umbrella, in both module formats, run away from its own data.
  for (const format of ["esm", "cjs"]) {
    const report = bundleAndRun({
      label: `geoalgeria ${format} bundle`,
      source: UMBRELLA_ENTRY,
      outfile: join(work, `geoalgeria.${format === "esm" ? "mjs" : "cjs"}`),
      format,
      cwd: tmpdir(),
    });
    expect(`geoalgeria ${format} bundle`, report, { wilayas: 69, communes: 1541, alger: "Alger" }, [
      "dairas",
      "postOffices",
      "atms",
      "ecommerce",
      "communesOfAlger",
    ]);
  }

  // One scoped package, to catch an exports map or an entry that stops
  // resolving. Its bundle sits beside the data it reads; see the header.
  const sector = bundleAndRun({
    label: "@geoalgeria/aviation esm bundle",
    source: SECTOR_ENTRY,
    outfile: join(installed["@geoalgeria/aviation"], "bundle.mjs"),
    format: "esm",
    cwd: tmpdir(),
  });
  expect("@geoalgeria/aviation esm bundle", sector, {}, [
    "airports",
    "airportsOfAlger",
    "wilayasCovered",
  ]);

  console.log("check-bundlers: ok");
} finally {
  rmSync(work, { recursive: true, force: true });
}

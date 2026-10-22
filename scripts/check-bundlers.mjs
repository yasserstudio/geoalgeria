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
 * The scoped packages were verified WORKING in that same sandbox (`import
 * { branches } from "@geoalgeria/banques"` served all 1,704), because they are
 * ESM that join their data path at runtime from `import.meta.url`, which
 * Turbopack and webpack trace and relocate. esbuild and Vite do not relocate
 * it, so every scoped package broke under those two with the same ENOENT. That
 * is issue #290, and the second leg below is its proof: it packs every sector
 * tarball, runs the same probe three ways (plain Node, an esbuild bundle, a
 * Vite SSR bundle) and demands the three agree, so a bundler that cannot reach
 * the data fails here instead of in a consumer's app.
 *
 * The probe is run from a directory that holds no `data/` of its own, and the
 * bundles are emitted into `out/<bundler>/`, never beside the unpacked
 * tarball: a bundle emitted next to the `data/` directory it reads would pass
 * by accident and prove nothing. The Node leg is the baseline rather than a
 * table of expected counts, so nothing here can go stale against the data.
 *
 * Usage: node scripts/check-bundlers.mjs [--only=poste,telecom]
 *
 * Turbopack's own resolver is still not run: it needs a Next.js app and a
 * `next build`, which belongs in a Vercel Sandbox and not on a laptop or in
 * this repo's CI. It is also the one bundler these packages already worked
 * under, so a Turbopack leg would pass before the fix as well as after it and
 * assert nothing. esbuild and Vite are the two that broke, and they cover the
 * esbuild / Rollup resolvers between them.
 */

import { execFile as execFileCb, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as esbuild from "esbuild";
import { build as viteBuild } from "vite";

const execFile = promisify(execFileCb);

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

/** Pack a workspace package and unpack the tarball into `work/node_modules/<name>`. */
async function packInto(work, dir, name) {
  const { stdout } = await execFile("npm", ["pack", "--silent", "--pack-destination", work], {
    cwd: join(ROOT, dir),
    encoding: "utf8",
  });
  const tarball = stdout.trim().split("\n").at(-1);
  const target = join(work, "node_modules", name);
  mkdirSync(target, { recursive: true });
  await execFile("tar", ["-xzf", join(work, tarball), "-C", target, "--strip-components=1"]);
  return tarball;
}

/** Run `fn` over `items`, at most `limit` at a time, keeping the input order. */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

// --- leg 1: the `geoalgeria` umbrella (issue #276) --------------------------

async function umbrellaLeg(work) {
  const tarball = await packInto(work, join("packages", "dataset"), "geoalgeria");
  console.log(`packed geoalgeria (${tarball})`);

  for (const format of ["esm", "cjs"]) {
    const label = `geoalgeria ${format} bundle`;
    const report = bundleAndRun({
      label,
      source: ENTRY,
      outfile: join(work, "out", "esbuild", `geoalgeria.${format === "esm" ? "mjs" : "cjs"}`),
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
}

// --- leg 2: every scoped sector package (issue #290) ------------------------

/** The sector packages: the ones that ship a `data/metadata.json` and load it.
 *  Read off disk, so a package added tomorrow is covered tomorrow. */
function sectorPackages(only) {
  return readdirSync(join(ROOT, "packages"))
    .filter((dir) => existsSync(join(ROOT, "packages", dir, "data", "metadata.json")))
    .filter((dir) => existsSync(join(ROOT, "packages", dir, "index.js")))
    .filter((dir) => !only || only.includes(dir))
    .sort()
    .map((dir) => ({
      dir: join("packages", dir),
      name: JSON.parse(readFileSync(join(ROOT, "packages", dir, "package.json"), "utf-8")).name,
    }));
}

/**
 * The probe. Every zero-argument export is called and its answer summarised, so
 * the shape is read off the module instead of being listed here: a loader added
 * to a package is probed without touching this file. An export that throws is
 * reported rather than crashing the run, because the three ways of running this
 * are compared with each other and a one-sided throw is the finding.
 */
const probeSource = (name) => `
import pkg from ${JSON.stringify(name)};

const report = {};
for (const key of Object.keys(pkg).sort()) {
  const value = pkg[key];
  if (typeof value !== "function" || value.length > 0) continue;
  try {
    const answer = value();
    report[key] = Array.isArray(answer)
      ? { array: answer.length }
      : answer && typeof answer === "object"
        ? { keys: Object.keys(answer).length }
        : { value: answer };
  } catch (error) {
    report[key] = { error: String(error && error.message ? error.message : error) };
  }
}

// The one value checked against the repo rather than against the other runs: a
// bundle that resolved SOME data but not this package's would still agree with
// itself.
let recordCount = null;
try {
  recordCount = pkg.metadata().record_count ?? null;
} catch {}

console.log(JSON.stringify({ report, recordCount }));
`;

/** Run a built (or plain) ESM file from outside the work tree and parse its line. */
async function runProbe(file) {
  const { stdout } = await execFile(process.execPath, [file], {
    cwd: tmpdir(),
    encoding: "utf8",
    maxBuffer: 1 << 24,
  });
  return JSON.parse(stdout.trim().split("\n").at(-1));
}

async function sectorLeg(work, only) {
  const packages = sectorPackages(only);
  if (!packages.length) return;
  await mapLimit(packages, 4, ({ dir, name }) => packInto(work, dir, name));
  console.log(`packed ${packages.length} sector packages`);

  // `work` itself holds no `data/`, and the bundles land in `out/<bundler>/`,
  // so a runtime read cannot find the data by sitting next to it.
  writeFileSync(join(work, "package.json"), '{"type":"module","private":true}\n');
  mkdirSync(join(work, "probes"), { recursive: true });
  mkdirSync(join(work, "out", "esbuild"), { recursive: true });
  for (const { name } of packages) {
    writeFileSync(join(work, "probes", `${slug(name)}.mjs`), probeSource(name));
  }

  const failures = [];
  for (const { dir, name } of packages) {
    const probe = join(work, "probes", `${slug(name)}.mjs`);
    const reports = { node: await runProbe(probe) };

    const outfile = join(work, "out", "esbuild", `${slug(name)}.mjs`);
    esbuild.buildSync({
      entryPoints: [probe],
      bundle: true,
      platform: "node",
      target: "node22",
      format: "esm",
      outfile,
      logLevel: "silent",
      absWorkingDir: work,
    });
    reports.esbuild = await runProbe(outfile);
    reports.vite = await runProbe(await viteBundle(work, probe, slug(name)));

    const recordCount = JSON.parse(
      readFileSync(join(ROOT, dir, "data", "metadata.json"), "utf-8"),
    ).record_count;
    const problems = describe(reports, recordCount);
    if (problems.length) failures.push(...problems.map((problem) => `${name} ${problem}`));
    console.log(
      `${name}: ${problems.length ? "FAILED" : "ok"} (${Object.keys(reports.node.report).length} loaders, ${recordCount} records)`,
    );
    if (problems.length) for (const problem of problems) console.log(`    ${problem}`);
  }

  if (failures.length) {
    throw new Error(
      `${failures.length} sector-package bundler failure(s):\n  ` + failures.join("\n  "),
    );
  }
}

/** Build the probe with Vite's SSR pipeline (Rollup) and hand back the bundle. */
async function viteBundle(work, probe, name) {
  const outDir = join(work, "out", "vite", name);
  await viteBuild({
    configFile: false,
    root: work,
    logLevel: "silent",
    build: {
      ssr: probe,
      outDir,
      emptyOutDir: true,
      minify: false,
      target: "node22",
      rollupOptions: { output: { entryFileNames: "bundle.mjs", format: "es" } },
    },
    ssr: { target: "node", noExternal: true },
  });
  return join(outDir, "bundle.mjs");
}

/**
 * Compare the three runs. The plain-Node run is the baseline (these packages
 * have always worked there), so a bundler disagreeing with it is the bug, and
 * no expected count is written down anywhere.
 */
function describe(reports, recordCount) {
  const problems = [];
  const baseline = reports.node.report;

  for (const [key, answer] of Object.entries(baseline)) {
    if (answer.error) problems.push(`node: ${key}() threw: ${answer.error}`);
  }
  const arrays = Object.values(baseline).filter((a) => typeof a.array === "number");
  if (!arrays.some((a) => a.array > 0)) problems.push("node: no loader answered with records");

  for (const bundler of ["node", "esbuild", "vite"]) {
    const { report, recordCount: seen } = reports[bundler];
    if (seen !== recordCount) {
      problems.push(
        `${bundler}: metadata().record_count is ${seen}, the package's metadata.json says ${recordCount}`,
      );
    }
    if (bundler === "node") continue;

    for (const [key, answer] of Object.entries(report)) {
      if (answer.error) problems.push(`${bundler}: ${key}() threw: ${answer.error}`);
    }
    for (const key of Object.keys(baseline)) {
      if (!(key in report)) {
        problems.push(`${bundler}: ${key}() is missing from the bundle`);
        continue;
      }
      const [a, b] = [JSON.stringify(baseline[key]), JSON.stringify(report[key])];
      if (a !== b && !report[key].error) {
        problems.push(`${bundler}: ${key}() answered ${b}, Node answered ${a}`);
      }
    }
  }
  return problems;
}

const slug = (name) => name.replace("@geoalgeria/", "").replace(/[^\w.-]/g, "-");

const work = mkdtempSync(join(tmpdir(), "geoalgeria-bundlers-"));

try {
  mkdirSync(join(work, "out", "esbuild"), { recursive: true });
  // `--only=poste,telecom` narrows the run while working on one package;
  // `--only=dataset` runs the umbrella leg alone. No flag runs everything.
  const flag = process.argv.find((arg) => arg.startsWith("--only="));
  const only = flag ? flag.slice("--only=".length).split(",").filter(Boolean) : null;
  if (!only || only.includes("dataset")) await umbrellaLeg(work);
  await sectorLeg(work, only);
  console.log("check-bundlers: ok");
} finally {
  rmSync(work, { recursive: true, force: true });
}

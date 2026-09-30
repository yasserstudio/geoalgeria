#!/usr/bin/env node
/**
 * Report every publishable package whose repo version will NOT reach npm on this
 * release, as GitHub Actions `::warning::` annotations. See
 * scripts/lib/release-gap.mjs for the two ways that happens and the live cases
 * that motivated it (@geoalgeria/normalize never published; transport and pharma
 * absent from release.yml's lists, and skipped by the staged path, until both
 * joined it on 2026-09-30).
 *
 * Usage: node scripts/release-gap.mjs [ref]
 *
 * `ref` defaults to HEAD. Pass $GITHUB_SHA in the workflow: `changesets/action`
 * leaves the runner's working tree BUMPED whenever it builds the Version PR, and
 * reading that tree would report every package as ahead of npm on a push that
 * released nothing. Versions come from the ref; the dir list and release.yml come
 * from the checkout, neither of which `changeset version` touches.
 *
 * Always exits 0: this reports, it does not gate.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseGaps, gapAnnotations } from "./lib/release-gap.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ref = process.argv[2] || "HEAD";

/** A file's contents as committed at <ref>, falling back to the checkout. */
const readAtRef = (path) => {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      cwd: ROOT,
    });
  } catch {
    return null;
  }
};

const registryVersion = (name) => {
  try {
    return execFileSync("npm", ["view", name, "version"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    // npm answers non-zero for a name it has never seen, and for a network
    // failure. Either way we cannot prove the version is live.
    return null;
  }
};

const dirs = readdirSync(join(ROOT, "packages"))
  .map((d) => `packages/${d}`)
  .filter((dir) => existsSync(join(ROOT, dir, "package.json")))
  .sort();

const packages = [];
for (const dir of dirs) {
  const raw = readAtRef(`${dir}/package.json`) ?? readFileSync(join(ROOT, dir, "package.json"), "utf8");
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    console.log(`::warning title=Release gap (unreadable)::${dir}/package.json is not valid JSON at ${ref}`);
    continue;
  }
  if (manifest.private) continue;
  packages.push({
    dir,
    name: manifest.name,
    version: manifest.version,
    registryVersion: registryVersion(manifest.name),
  });
}

const workflow = readFileSync(join(ROOT, ".github/workflows/release.yml"), "utf8");
const gaps = releaseGaps(packages, workflow);

console.log(`release gap check at ${ref}: ${packages.length} publishable packages, ${gaps.length} gap(s)`);
for (const line of gapAnnotations(gaps)) console.log(line);
if (gaps.length === 0) console.log("every publishable package's version is on npm or will be staged.");

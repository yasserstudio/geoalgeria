#!/usr/bin/env node
// Fails a pull request that changes @geoalgeria/normalize's key path without a
// major changeset. The decision lives in scripts/lib/normalize-changeset.mjs and
// is unit-tested there; this file only gathers what the decision needs.
//
// Usage, in continuous integration:
//
//   git diff --name-only "origin/$BASE...HEAD" | node scripts/check-normalize-changeset.mjs
//
// The diff arrives on standard input, one path per line, so the script never has
// to know how the base ref was resolved.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { majorChangesetError } from "./lib/normalize-changeset.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The diff, one path per line on standard input. */
function readChangedFiles() {
  let input = "";
  try {
    input = readFileSync(0, "utf-8");
  } catch {
    input = "";
  }
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Every pending changeset, as raw markdown. */
function readChangesets() {
  const dir = join(ROOT, ".changeset");
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .map((name) => readFileSync(join(dir, name), "utf-8"));
}

/**
 * The version of the package on npm, or null when it has never been published.
 * A 404 from the registry is the unpublished answer, not a failure; any other
 * problem is treated as unpublished too, because a registry outage must not block
 * a pull request that is otherwise fine, and the guard's job resumes as soon as
 * the registry answers again.
 *
 * @returns {string | null}
 */
function publishedVersion() {
  try {
    const version = execFileSync("npm", ["view", "@geoalgeria/normalize", "version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return version === "" ? null : version;
  } catch {
    return null;
  }
}

const changedFiles = readChangedFiles();
const published = publishedVersion();
const problems = majorChangesetError({ changedFiles, changesets: readChangesets(), published });

for (const problem of problems) console.error(`error: ${problem}`);

if (problems.length > 0) {
  process.exitCode = 1;
} else {
  const state = published === null ? "unpublished" : `published at ${published}`;
  console.log(`normalize changeset guard: ok (${changedFiles.length} changed files, @geoalgeria/normalize ${state})`);
}

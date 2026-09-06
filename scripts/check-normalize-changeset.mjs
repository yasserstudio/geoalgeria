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
 * What the registry says about the package. Three answers, not two: only a 404 is
 * the unpublished answer that the pre-publish exception rests on. Every other
 * failure, a timeout, an auth error, a missing npm, is `unknown`, and the guard
 * fails closed on it, because a registry that could not be reached must not be
 * allowed to read as a registry that said the package does not exist.
 *
 * @returns {{ status: "published" | "unpublished" | "unknown", version?: string, reason?: string }}
 */
function askRegistry() {
  try {
    const version = execFileSync("npm", ["view", "@geoalgeria/normalize", "version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return version === ""
      ? { status: "unknown", reason: "npm view printed no version" }
      : { status: "published", version };
  } catch (error) {
    const output = `${error?.stdout ?? ""}${error?.stderr ?? ""}`;
    if (/\bE404\b|404 Not Found/.test(output)) return { status: "unpublished" };
    const reason = output.trim().split("\n").filter(Boolean).at(-1) ?? error?.message ?? "npm view failed";
    return { status: "unknown", reason };
  }
}

const changedFiles = readChangedFiles();
const registry = askRegistry();
const problems = majorChangesetError({ changedFiles, changesets: readChangesets(), registry });

for (const problem of problems) console.error(`error: ${problem}`);

if (problems.length > 0) {
  process.exitCode = 1;
} else {
  const state =
    registry.status === "published" ? `published at ${registry.version}` : registry.status;
  console.log(`normalize changeset guard: ok (${changedFiles.length} changed files, @geoalgeria/normalize ${state})`);
}

#!/usr/bin/env node
/**
 * Gate one package's GitHub Release on what `main` carries at the released
 * commit, rather than on the runner's working tree (which `changesets/action`
 * leaves bumped while it builds the Version PR). See scripts/lib/release-guard.mjs
 * for the incident this closes.
 *
 * Usage: node scripts/release-guard.mjs <pkgDir> <version> <tag> [ref]
 *
 * Exit codes, so the workflow can tell a routine skip from one worth shouting
 * about. The two used to be one code, which hid the second case entirely:
 *   0  release it: the version is committed at <ref> and has a CHANGELOG section
 *   3  routine skip: the version is not on main yet, so npm published nothing
 *      either and the Release is cut on the push that merges the Version PR
 *   4  skip, but WARN: the version IS committed at <ref>, so it stages and goes
 *      live on npm, yet no Release can be cut (missing/empty CHANGELOG section, or
 *      a tree the guard cannot read). A published version with no Release behind
 *      it. The workflow turns this into a ::warning::.
 *   2  usage error
 */

import { execFileSync } from "node:child_process";
import { releaseVerdict } from "./lib/release-guard.mjs";

const [, , pkgDir, version, tag, ref = "HEAD"] = process.argv;
if (!pkgDir || !version || !tag) {
  console.error("usage: release-guard.mjs <pkgDir> <version> <tag> [ref]");
  process.exit(2);
}

/** A file's contents as committed at <ref>, or null when it is not there. */
const showAtRef = (path) => {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
};

const { releasable, kind, reason } = releaseVerdict({
  tag,
  version,
  packageJson: showAtRef(`${pkgDir}/package.json`),
  changelog: showAtRef(`${pkgDir}/CHANGELOG.md`),
  ref: ref === "HEAD" ? "HEAD" : `commit ${ref.slice(0, 7)}`,
});

if (releasable) {
  console.log(`release guard ok: ${reason}`);
  process.exit(0);
}

console.log(`release guard skip (${kind}): ${reason}`);
process.exit(kind === "pending-version-pr" ? 3 : 4);

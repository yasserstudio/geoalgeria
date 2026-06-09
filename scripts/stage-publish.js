#!/usr/bin/env node
/**
 * Staged publish: submits changed packages to npm's staging area instead of
 * publishing directly. A maintainer must approve each staged package (with 2FA)
 * on npmjs.com before it goes live.
 *
 * Replaces `changeset publish` in the release workflow.
 * Requires npm >= 11.15.0 and a Trusted Publisher configured on npmjs.com
 * (no NPM_TOKEN needed — auth is via the workflow's OIDC id-token).
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES = ["packages/dataset", "packages/poste"];

// Versions already staged (awaiting maintainer approval). Re-running the
// release on a later push must NOT try to stage them again — npm rejects
// staging a version that's already staged, which would fail the run.
function stagedVersions() {
  try {
    const out = execFileSync("npm", ["stage", "list"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const set = new Set();
    let name = null;
    for (const line of out.split("\n")) {
      const n = line.match(/^\s*package name:\s*(\S+)/);
      if (n) {
        name = n[1];
        continue;
      }
      const v = line.match(/^\s*version:\s*(\S+)/);
      if (v && name) {
        set.add(`${name}@${v[1]}`);
        name = null;
      }
    }
    return set;
  } catch {
    return new Set();
  }
}

const alreadyStaged = stagedVersions();
let staged = 0;
let skipped = 0;

for (const pkg of PACKAGES) {
  const pkgJson = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8"));
  const { name, version } = pkgJson;

  let registryVersion;
  try {
    registryVersion = execFileSync("npm", ["view", name, "version"], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    registryVersion = null;
  }

  if (registryVersion === version) {
    console.log(`skip: ${name}@${version} (already published)`);
    skipped++;
    continue;
  }

  if (alreadyStaged.has(`${name}@${version}`)) {
    console.log(`skip: ${name}@${version} (already staged, awaiting approval)`);
    skipped++;
    continue;
  }

  console.log(`staging: ${name}@${version} (registry: ${registryVersion ?? "unpublished"})`);
  try {
    execFileSync("npm", ["stage", "publish", "--ignore-scripts"], { cwd: pkg, stdio: "inherit" });
    staged++;
  } catch {
    console.error(`FAILED to stage ${name}@${version}`);
    process.exit(1);
  }
}

console.log(`\nDone: ${staged} staged, ${skipped} skipped`);
if (staged > 0) {
  console.log("Approve staged packages on npmjs.com → Account → Staged packages");
  console.log("Or run locally: npm stage list && npm stage approve <stage-id>");
}

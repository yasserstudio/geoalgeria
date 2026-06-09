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

  console.log(`staging: ${name}@${version} (registry: ${registryVersion ?? "unpublished"})`);
  try {
    const out = execFileSync("npm", ["stage", "publish", "--ignore-scripts"], {
      cwd: pkg,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (out) process.stdout.write(out);
    staged++;
  } catch (err) {
    // Re-running the release during the approval window: npm rejects staging a
    // version that's already staged with a 409 ("Cannot stage previously
    // published version"). Treat that as a skip so re-pushes don't fail the run.
    const log = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    if (/E409|Cannot stage previously published|409 Conflict/i.test(log)) {
      console.log(`skip: ${name}@${version} (already staged, awaiting approval)`);
      skipped++;
      continue;
    }
    console.error(`FAILED to stage ${name}@${version}`);
    if (log) console.error(log);
    process.exit(1);
  }
}

console.log(`\nDone: ${staged} staged, ${skipped} skipped`);
if (staged > 0) {
  console.log("Approve staged packages on npmjs.com → Account → Staged packages");
  console.log("Or run locally: npm stage list && npm stage approve <stage-id>");
}

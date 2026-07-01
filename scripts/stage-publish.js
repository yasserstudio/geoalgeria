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
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Derive the publishable packages from the workspace so a newly added package is
// never silently skipped (it would otherwise never stage on release). Every
// non-private package dir under packages/ is a staging candidate.
const PACKAGES = readdirSync(join(ROOT, "packages"))
  .map((d) => `packages/${d}`)
  .filter((p) => existsSync(join(ROOT, p, "package.json")) && !JSON.parse(readFileSync(join(ROOT, p, "package.json"), "utf8")).private)
  .sort();

let staged = 0;
let skipped = 0;
const failed = [];

for (const pkg of PACKAGES) {
  const pkgJson = JSON.parse(readFileSync(join(ROOT, pkg, "package.json"), "utf8"));
  const { name, version } = pkgJson;

  // Packages with workspace: deps (e.g. the transport umbrella) must NOT be
  // published with npm — it ships the literal "workspace:^" spec and breaks
  // installs. Only pnpm/changeset converts it. Skip here; release via `pnpm release`.
  const hasWorkspaceDeps = Object.values(pkgJson.dependencies ?? {}).some((v) => String(v).startsWith("workspace:"));
  if (hasWorkspaceDeps) {
    console.log(`skip: ${name}@${version} (workspace: deps — publish via 'pnpm publish' / changeset, not npm; see RELEASING.md)`);
    skipped++;
    continue;
  }

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

  // A package npm has never seen can't be staged — Trusted Publishing's OIDC
  // grant attaches to an existing package, so `npm stage publish` would 404/401
  // and fail the whole run. New packages are bootstrapped by a one-time manual
  // `npm publish` (see RELEASING.md); skip until that's done.
  if (registryVersion === null) {
    console.log(`skip: ${name}@${version} (not yet on npm — publish once by hand first; see RELEASING.md)`);
    skipped++;
    continue;
  }

  console.log(`staging: ${name}@${version} (registry: ${registryVersion ?? "unpublished"})`);
  try {
    const out = execFileSync("npm", ["stage", "publish", "--ignore-scripts"], {
      cwd: join(ROOT, pkg),
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
    // Keep going so one package's missing Trusted Publisher (or other error)
    // doesn't block staging the rest; surface all failures at the end.
    console.error(`FAILED to stage ${name}@${version}`);
    if (log) console.error(log);
    failed.push(name);
  }
}

console.log(`\nDone: ${staged} staged, ${skipped} skipped, ${failed.length} failed`);
if (failed.length) {
  console.error(`Failed to stage: ${failed.join(", ")}`);
  console.error("Likely a missing Trusted Publisher on npmjs.com for the package(s). See RELEASING.md.");
  process.exit(1);
}
if (staged > 0) {
  console.log("Approve staged packages on npmjs.com → Account → Staged packages");
  console.log("Or run locally: npm stage list && npm stage approve <stage-id>");
}

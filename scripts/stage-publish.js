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
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rewriteWorkspaceSpecs } from "./lib/workspace-deps.mjs";
import { stagedSet } from "./lib/staged-set.mjs";
import { createManifestRestore, guardWithProcessSignals } from "./lib/manifest-restore.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Every manifest this run rewrote for the upload, put back on the way out. The
// per-package `finally` below covers a throw and a normal return; it does NOT
// run on a signal, and Ctrl-C during `npm stage publish` (the slow step, so the
// likely moment) used to leave the resolved `"@geoalgeria/schema": "^1.1.1"` on
// disk. Restores are idempotent, so the two paths cannot fight.
const restores = createManifestRestore();
guardWithProcessSignals(restores);

const ALL_PACKAGE_DIRS = readdirSync(join(ROOT, "packages"))
  .map((d) => `packages/${d}`)
  .filter((p) => existsSync(join(ROOT, p, "package.json")))
  .sort();

const manifestOf = (pkg) => JSON.parse(readFileSync(join(ROOT, pkg, "package.json"), "utf8"));

// Every workspace package's own version, including the private ones: a
// `workspace:` spec can point at any of them and must resolve to real semver
// before npm sees the manifest.
const WORKSPACE_VERSIONS = new Map(ALL_PACKAGE_DIRS.map((p) => manifestOf(p)).map((m) => [m.name, m.version]));

// Derive the publishable packages from the workspace so a newly added package is
// never silently skipped (it would otherwise never stage on release). Every
// non-private package dir under packages/ is a staging candidate, the umbrellas
// included, and they come last so they stage after the packages they re-export.
// See scripts/lib/staged-set.mjs.
const PACKAGES = stagedSet(ALL_PACKAGE_DIRS.map((dir) => ({ dir, manifest: manifestOf(dir) })));

let staged = 0;
let skipped = 0;
const failed = [];

for (const pkg of PACKAGES) {
  const pkgJson = manifestOf(pkg);
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

  // A package npm has never seen can't be staged — Trusted Publishing's OIDC
  // grant attaches to an existing package, so `npm stage publish` would 404/401
  // and fail the whole run. New packages are bootstrapped by a one-time manual
  // `npm publish` (see RELEASING.md); skip until that's done.
  if (registryVersion === null) {
    console.log(`skip: ${name}@${version} (not yet on npm — publish once by hand first; see RELEASING.md)`);
    skipped++;
    continue;
  }

  // npm uploads the manifest verbatim, so any surviving `workspace:` spec ships
  // as the literal string and a consumer's resolver answers EUNSUPPORTEDPROTOCOL.
  // Resolve them all to real semver first, the way pnpm would, and refuse the
  // package outright if one cannot be resolved. This covers devDependencies,
  // peerDependencies and optionalDependencies, not only `dependencies`: telecom,
  // pharmacies and protection-civile each went live with
  // `"@geoalgeria/schema": "workspace:^"` in devDependencies while the old check
  // read `dependencies` alone. It is also what puts the transport and pharma
  // umbrellas on this path at all: their whole manifest is `workspace:` runtime
  // deps, and resolving them here replaced the hand pnpm publish.
  const manifestPath = join(ROOT, pkg, "package.json");
  const originalManifest = readFileSync(manifestPath, "utf8");
  const { manifest: publishManifest, rewritten, unresolved } = rewriteWorkspaceSpecs(pkgJson, WORKSPACE_VERSIONS);
  if (unresolved.length > 0) {
    console.error(`FAILED to stage ${name}@${version}: unresolvable workspace: spec, refusing to publish it verbatim`);
    for (const u of unresolved) console.error(`  ${u.field}.${u.name} = ${u.spec} (${u.reason})`);
    failed.push(name);
    continue;
  }
  if (rewritten.length > 0) {
    for (const r of rewritten) {
      console.log(`  rewrite: ${name} ${r.field}.${r.name} ${r.from} -> ${r.to}`);
    }
    // Registered BEFORE the write, so a signal landing between the two still
    // finds the original.
    restores.remember(manifestPath, originalManifest);
    // Trailing newline: keep the file's shape so a restore is byte-identical in
    // spirit and a stray failure leaves a normal package.json behind.
    writeFileSync(manifestPath, `${JSON.stringify(publishManifest, null, 2)}\n`);
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
  } finally {
    // The rewrite exists only for the upload. Put the workspace: specs back so
    // the runner's tree, and a local `pnpm release-staged`, stay installable.
    restores.restore(manifestPath);
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

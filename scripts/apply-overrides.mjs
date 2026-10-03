#!/usr/bin/env node
// Re-emit a package from its own committed data so the reviewed corrections in
// quality/overrides/<package>.json are applied, validated and mirrored.
//
// WHY THIS EXISTS. `writePackageV2` loads a package's override ledger on every emit
// (quality/overrides/README.md), so landing a ledger entry means re-running the
// package's writer. Not every package has one to run offline. `banques` does:
// `npm run build` re-emits from committed records. `tourisme` has no generator at all
// (its package.json scripts are `test` alone), so this runner is the ONLY way to apply
// a ledger there. `emploi`, `jeunesse`, `sports` and `poste` have only `npm run fetch`,
// which needs the live upstream (the ANEM portal's JavaScript bundle, the MJS SIG,
// BaridiMap), so applying a ledger entry would otherwise mean a network pull nobody can
// reproduce. Hand-editing the emitted JSON instead is what CONTRIBUTING.md forbids.
//
// This runner is the remaining option, and the only thing it does is call the writer
// with the records the package already ships. It makes no decision of its own: every
// correction is a ledger entry, the ledger's `expect` block stops the emit if the
// upstream value it reviewed has moved, and a second run is a no-op because
// `patchAlreadyApplied` recognises its own output. Where a package does have a
// generator, running that generator applies the same ledger, so this is an alternative
// to it and never a step after it.
//
// It names its packages explicitly, and has no "every ledger" mode: a package can
// legitimately have a second generator whose files this writer does not own (aviation's
// routes come from a reviewed research dataset, not from the ANAC pull), and re-emitting
// it from MIGRATIONS alone would drop those files from the manifest.
//
// USAGE
//   node scripts/apply-overrides.mjs emploi sports

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MIGRATIONS, writePackageV2 } from "./lib/v2-transforms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OVERRIDES = join(ROOT, "quality", "overrides");

/** Packages whose emit also writes a generated copy elsewhere in the repo. The poste
 *  mirror is the same path packages/poste/scripts/fetch.mjs writes; both have to know
 *  it, because either one can be the writer that produced the published tree. */
const MIRRORS = { poste: [join("packages", "dataset", "data", "poste")] };

const packages = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (!packages.length) {
  const withLedger = readdirSync(OVERRIDES)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.replace(/\.json$/, ""));
  throw new Error(`name the package(s) to re-emit. Packages with a ledger: ${withLedger.join(", ")}`);
}

for (const pkg of packages) {
  if (!existsSync(join(OVERRIDES, `${pkg}.json`)))
    throw new Error(`${pkg}: no ledger at quality/overrides/${pkg}.json`);
  const config = MIGRATIONS[pkg];
  if (!config) throw new Error(`${pkg}: not in MIGRATIONS, so there is no writer to re-run`);
  const dir = join(ROOT, "packages", pkg, "data");
  const oldMeta = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf8"));
  // Every file the writer owns, in the order MIGRATIONS declares, so re-emitting one
  // package's correction cannot drop its other files from the manifest.
  const files = (config.files ?? [{ file: config.file }]).map(({ file }) => ({
    file,
    rows: JSON.parse(readFileSync(join(dir, file), "utf8")),
  }));
  // A package dates its capture by its first declared source, as its own writer does.
  const retrieved = oldMeta.sources?.[0]?.retrieved;
  for (const where of [dir, ...(MIRRORS[pkg] ?? []).map((mirror) => join(ROOT, mirror))]) {
    writePackageV2({
      pkg,
      dir: where,
      files: files.map((file) => ({ ...file, rows: structuredClone(file.rows) })),
      meta: config.meta,
      updated: oldMeta.updated,
      retrieved,
      oldMeta,
    });
  }
  console.log(`${pkg}: re-emitted with its reviewed corrections applied`);
}

#!/usr/bin/env node
// One-time v2 cutover: transform a package's committed data into the canonical
// @geoalgeria/schema v2 shape, regenerating data JSON + CSV + GeoJSON + metadata.
// This is the historical source-of-truth transform; each generator
// (scripts/fetch.mjs) now emits v2 directly during the P3 refresher rework by
// importing the SAME per-package map + writer from scripts/lib/v2-transforms.mjs
// (see packages/schema/MIGRATING.md). The exemplar @geoalgeria/pharmacies was
// migrated at the generator level and is NOT handled here.
//
// Guarded against double-runs: the transform is ONE-WAY (buses reads source_url out
// of the pre-v2 `source`, so a second pass would overwrite the URL with the key
// "wikipedia" and still exit 0), so a package is skipped when its metadata says v2
// OR when its records already carry v2 geo fields — metadata alone can desync.
// Usage: node scripts/migrate-to-v2.mjs [pkg ...]   (no arg = all configured)

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  MIGRATIONS,
  writePackageV2,
  isV2Shaped,
  CUTOVER_DATE,
} from "./lib/v2-transforms.mjs";

// Re-exported so test/migrate-v2-replay.test.mjs can replay each map against the v1
// fixture without importing the writer's fs side effects. Importing this module
// must not rewrite data — the runner below only runs as a CLI.
export { MIGRATIONS };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- runner -----------------------------------------------------------------
function migrate(pkg) {
  const cfg = MIGRATIONS[pkg];
  if (!cfg) { console.error(`  no migration config for ${pkg}`); return false; }
  const dir = join(ROOT, "packages", pkg, "data");

  const oldMeta = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf-8"));
  const specs = cfg.files || [{ file: cfg.file, map: cfg.map, geojson: cfg.geojson }];

  // Read every source file before touching anything on disk, so the double-run
  // guard can veto the whole package rather than half-rewriting it.
  const sources = specs.map((s) => ({
    spec: s,
    input: JSON.parse(readFileSync(join(dir, s.file), "utf-8")),
  }));
  if (oldMeta.schema_version === "2.0.0" || sources.some(({ input }) => isV2Shaped(input))) {
    console.log(`  ${pkg}: already v2 — skipped`);
    return true;
  }

  const files = sources.map(({ spec: s, input }) => ({
    file: s.file,
    geojson: s.geojson,
    rows: input.map(s.map),
  }));
  const { records, metadata } = writePackageV2({
    pkg,
    dir,
    files,
    meta: cfg.meta,
    updated: CUTOVER_DATE,
    retrieved: CUTOVER_DATE,
    oldMeta,
  });
  console.log(
    `  ${pkg}: ${records.length} records → v2 (${metadata.geocoded_pct}% geocoded, ` +
      `${metadata.wilayas_covered} wilayas${files.length > 1 ? `, ${files.length} files` : ""})`,
  );
  return true;
}

// Refuse to run once the cutover has already been applied. The transform stamps
// `updated`/`retrieved` from CUTOVER_DATE (below), so a second pass would silently
// reset every package's honest, later-refreshed dates back to the 2026-07-18
// constant. The per-package skip inside migrate() is a belt; this is the braces —
// a loud pre-flight abort before anything on disk is touched.
function refuseIfAlreadyCutover(targets) {
  const applied = targets.filter((pkg) => {
    const metaPath = join(ROOT, "packages", pkg, "data", "metadata.json");
    if (!existsSync(metaPath)) return false;
    try {
      return JSON.parse(readFileSync(metaPath, "utf-8")).schema_version === "2.0.0";
    } catch {
      return false;
    }
  });
  if (applied.length) {
    console.error(
      `refusing to run: cutover already applied to ${applied.join(", ")} — re-running ` +
        `would re-stamp honest dates back to the cutover constant (${CUTOVER_DATE}). ` +
        `This script is historical; regenerate via each package's v2 generator instead.`,
    );
    process.exit(1);
  }
}

// Run only as a CLI. MIGRATIONS is exported so test/migrate-v2-replay.test.mjs can
// replay each map against the v1 fixture; importing the module must not rewrite data.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(MIGRATIONS);
  refuseIfAlreadyCutover(targets);
  let ok = true;
  for (const p of targets) ok = migrate(p) && ok;
  process.exit(ok ? 0 : 1);
}

#!/usr/bin/env node
/**
 * Purge jsDelivr's cache for the versionless (@latest) CDN paths the README and
 * docs advertise. jsDelivr serves npm packages automatically, but its edge cache
 * holds @latest paths for up to ~24h — so a fresh release isn't visible on the
 * CDN until the cache expires or is purged.
 *
 * Run this AFTER the staged npm packages are approved and actually live
 * (`npm stage approve`), not before — purging while npm still serves the old
 * version just re-caches the old version. See RELEASING.md.
 *
 *   node scripts/purge-cdn.js              # purge the default advertised paths
 *   node scripts/purge-cdn.js npm/foo/bar  # plus extra paths
 *
 * No dependencies — uses global fetch (Node >= 18).
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PKGS = join(dirname(fileURLToPath(import.meta.url)), "..", "packages");

// Derive the package roots from the workspace so a new package is never silently
// skipped — every published (non-private) package's versionless path tracks its npm
// "latest" tag, exactly what users hit. Plus the specific deep paths the docs advertise.
const pkgPaths = readdirSync(PKGS)
  .map((d) => join(PKGS, d, "package.json"))
  .filter((f) => existsSync(f))
  .map((f) => JSON.parse(readFileSync(f, "utf8")))
  .filter((p) => p.name && !p.private)
  .map((p) => `npm/${p.name}`)
  .sort();
const EXTRA_PATHS = ["npm/geoalgeria/data/ecommerce/communes.json"]; // advertised in the README

const paths = [...pkgPaths, ...EXTRA_PATHS, ...process.argv.slice(2)];

let failed = 0;
for (const p of paths) {
  const url = `https://purge.jsdelivr.net/${p}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (res.ok) {
      console.log(`purged: ${p}`);
    } else {
      console.warn(`WARN  ${res.status} ${res.statusText}: ${p}`);
      failed++;
    }
  } catch (err) {
    console.warn(`WARN  request failed: ${p} (${err.message})`);
    failed++;
  }
}

console.log(`\nDone: ${paths.length - failed}/${paths.length} purged`);
// Best-effort: a stale CDN edge is not worth failing a release over.
process.exit(0);

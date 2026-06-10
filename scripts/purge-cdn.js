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

// Versionless paths track the npm "latest" tag — exactly what users hit.
const DEFAULT_PATHS = [
  "npm/geoalgeria", // package root + metadata
  "npm/geoalgeria/data/ecommerce/communes.json", // advertised in the README
  "npm/@geoalgeria/poste",
  "npm/@geoalgeria/emploi",
];

const paths = [...DEFAULT_PATHS, ...process.argv.slice(2)];

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

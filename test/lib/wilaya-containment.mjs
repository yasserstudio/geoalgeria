// Which published files carry a located record, how to read one, and what counts as
// a record outside its declared wilaya.
//
// Shared because the guard (test/record-in-declared-wilaya.test.mjs) and the
// generator of its exceptions list (scripts/build-wilaya-containment-exceptions.mjs)
// must enumerate exactly the same files and apply exactly the same rule. A guard
// that checks a file the list does not know about, or the reverse, reports a clean
// run over data nobody looked at.

import { globSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Every record file of every package, by pattern rather than by name, so a new
// package is covered the day it ships instead of the day someone remembers it.
// `packages/dataset` is excluded on purpose: its commune centres are held by
// test/commune-in-boundary.test.mjs and test/commune-centre-in-commune.test.mjs,
// which carry their own exceptions, and two guards over one row can only disagree.
const SKIP = /\/(dataset|schema|normalize)\/|(metadata|retired-ids)\.json$/;

/** Sorted, repo-relative paths of the package data files a guard should read. */
export function RECORD_FILES(root) {
  return globSync("packages/*/data/*.json", { cwd: root })
    .filter((f) => !SKIP.test(`/${f}`))
    .sort();
}

/** The located rows of one file: `{id, wilaya_code, lat, lng}`, or [] when the file
 *  is not an array of records or carries no wilaya at all (a lookup table, a set of
 *  line shapes). Both coordinate spellings this repository ships are read. */
export function recordsOf(root, file) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(join(root, file), "utf-8"));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out = [];
  for (const r of parsed) {
    if (!r || typeof r !== "object") continue;
    const lat = r.lat ?? r.latitude;
    const lng = r.lng ?? r.longitude;
    if (r.wilaya_code == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({ id: r.id ?? r.name ?? null, wilaya_code: String(r.wilaya_code).padStart(2, "0"), lat, lng });
  }
  return out;
}

/**
 * The rows whose coordinate is inside a DIFFERENT wilaya's polygon than the one they
 * declare.
 *
 * A row whose coordinate is inside NO wilaya polygon is not a violation. The 69
 * outlines this repository ships are display-grade (mapshaper `dp 2% keep-shapes`,
 * a 3.4 km median vertex gap) and cut inside the real shoreline, so a coastal or
 * border record sits outside every one of them as a simplification artefact. Failing
 * those would be failing the outlines, which are #171.
 */
export function violationsIn(rows, containingWilayaCode) {
  const out = [];
  for (const r of rows) {
    const inside = containingWilayaCode(r.lat, r.lng);
    if (inside == null || inside === r.wilaya_code) continue;
    out.push({ id: r.id, declared_wilaya: r.wilaya_code, containing_wilaya: inside, lng: r.lng, lat: r.lat });
  }
  return out;
}

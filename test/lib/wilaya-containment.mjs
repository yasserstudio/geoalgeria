// Which published files carry a located record, how to read one, and what counts as a
// record its own geometry contradicts.
//
// Shared because the guard (test/record-in-declared-wilaya.test.mjs) and the generator
// of its exceptions list (scripts/build-wilaya-containment-exceptions.mjs) must
// enumerate exactly the same files and apply exactly the same rule. A guard that checks
// a file the list does not know about, or the reverse, reports a clean run over data
// nobody looked at.
//
// THE COMMUNE OUTLINE IS CHECKED FIRST, and the wilaya polygon only where there is no
// commune outline to check. The first version of this guard tested the wilaya polygon
// alone, which made it blind to exactly the defect it was added for: the shipped
// wilaya 55 polygon is about 50 km short of the decree boundary
// (yasserstudio/geoalgeria.com#171), so records wrongly moved into N'goussa (3003,
// wilaya 30) passed a guard that asked only whether they were inside the wilaya 30
// polygon, which they are. Inside its own commune's OpenStreetMap outline is the finer
// question, and it is the one that fails those rows.

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

/** The located rows of one file: `{id, wilaya_code, commune_code, lat, lng, row}`, or
 *  [] when the file is not an array of records or carries no wilaya at all (a lookup
 *  table, a set of line shapes). Both coordinate spellings this repository ships are
 *  read. */
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
    out.push({
      id: r.id ?? r.name ?? null,
      wilaya_code: String(r.wilaya_code).padStart(2, "0"),
      commune_code: r.commune_code ?? null,
      lat,
      lng,
      row: r,
    });
  }
  return out;
}

/**
 * The rows their own geometry contradicts, and which claim it contradicts.
 *
 * `outside_own_commune_outline`   the row names a commune OpenStreetMap ships an outline for and the
 *                    coordinate is outside it. This is the strong finding: a commune
 *                    outline is OSM geometry reduced under a proved-lossless
 *                    containment check, and it does not depend on the shipped wilaya
 *                    polygons at all.
 * `outside_declared_wilaya_polygon`  the row names no commune, or one with no outline, and the
 *                    coordinate is inside a DIFFERENT wilaya's shipped polygon.
 *
 * A row whose commune has no outline and whose coordinate is inside NO wilaya polygon
 * is not a violation. The 69 outlines this repository ships are display-grade
 * (mapshaper `dp 2% keep-shapes`, a 3.4 km median vertex gap) and cut inside the real
 * shoreline, so a coastal or border record sits outside every one of them as a
 * simplification artefact. Failing those would be failing the outlines, which are #171.
 *
 * `rule` is the clause of resolveCommune() that decides the row today, so the reason a
 * row is listed is derived rather than asserted: `kept_low_precision` and
 * `kept_no_outline` are rows the join deliberately refuses to move.
 */
export function containmentViolations(rows, resolver) {
  const out = [];
  for (const r of rows) {
    const insideOwn = r.commune_code == null ? null : resolver.insideOwnOutline(r.lat, r.lng, r.commune_code);
    const base = {
      id: r.id,
      declared_wilaya: r.wilaya_code,
      declared_commune: r.commune_code ?? null,
      lng: r.lng,
      lat: r.lat,
      rule: resolver.resolve(r.lat, r.lng, r.row ?? r).rule,
    };
    if (insideOwn === false) {
      const hit = resolver.containingCommunes(r.lat, r.lng)[0] ?? null;
      out.push({
        ...base,
        kind: "outside_own_commune_outline",
        containing_commune: hit?.code_commune ?? null,
        containing_wilaya: resolver.containingWilayaCode(r.lat, r.lng),
      });
      continue;
    }
    if (insideOwn === true) continue;
    const inside = resolver.containingWilayaCode(r.lat, r.lng);
    if (inside == null || inside === r.wilaya_code) continue;
    out.push({ ...base, kind: "outside_declared_wilaya_polygon", containing_commune: null, containing_wilaya: inside });
  }
  return out;
}

// Guards against the **rounded placeholder** (CONTEXT.md, ADR 0001 L0) that
// `MIN_EXACT_DECIMALS` cannot see: the whole-arcminute grid.
//
// The decimals rule catches a coordinate rounded in DECIMAL degrees (35, 8 or
// 36.35, 6.6 carry 0 to 2 fraction digits and cannot be a per-facility point). It
// is blind to the same placeholder written in DEGREES AND MINUTES with no seconds,
// because dividing minutes by 60 produces a long decimal tail: AGB's Laghouat
// branch shipped 33.58333, 2.66667, which is 33°35'N 2°40'E to five decimals, a
// cell about 1.5 km across, 30.9 km from the branch's own address, and
// `geo_precision: "exact"` on it passed every check in the repository (private
// tracker #285, public yasserstudio/geoalgeria#267).
//
// A measured point lands on a whole arcminute on both axes about once in 27,800;
// a DMS-without-seconds conversion lands there every time. So a record that claims
// `exact` on such a point is making a claim the number itself disproves, exactly as
// the decimals rule does.
//
// The allow-list below is PRE-EXISTING debt in packages outside this fix's scope.
// It is a ratchet: an entry that no longer trips is a failure too, so fixing a
// record means deleting its line rather than leaving a stale exemption behind.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { onArcminuteGrid } from "../packages/schema/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = join(ROOT, "packages");

/** `<package>/<file>:<record id>` → why it is still allowed to claim `exact`.
 *  Each of these is a DMS-sourced point in a package this fix does not touch;
 *  they need their own sourcing pass (see the PR for #285). The four written to
 *  four decimals rather than five or seven are the ones ARCMINUTE_TOLERANCE was
 *  widened to 0.003' to reach, so they arrived with the rule, not before it. */
const ALLOWED = new Map([
  ["formation-professionnelle/establishments.json:01392", "takwin DMS point, 4 decimals"],
  ["mosquees/mosquees.json:10-0439", "Wikidata DMS point, mosquees sourcing pass owed"],
  ["mosquees/mosquees.json:68-0238", "Wikidata DMS point, 4-decimal grid value"],
  ["ooredoo/stores.json:16-059", "operator API DMS point, ooredoo sourcing pass owed"],
  ["ooredoo/stores.json:44-003", "operator API DMS point, 4 decimals"],
  ["tourisme/attractions.json:attraction-846", "DMS point from the tourism source"],
  ["tourisme/attractions.json:attraction-848", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-91", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-144", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-487", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-746", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-837", "DMS point from the tourism source"],
  ["tourisme/parks.json:park-25", "DMS point from the tourism source"],
  ["tourisme/parks.json:park-29", "DMS point from the tourism source, 4 decimals"],
  ["tourisme/parks.json:park-31", "DMS point from the tourism source"],
]);

/** Every published record collection in the repository, as `{ key, record }`. */
function* publishedRecords() {
  for (const pkg of readdirSync(PACKAGES).sort()) {
    let files;
    try {
      files = readdirSync(join(PACKAGES, pkg, "data")).filter((f) => f.endsWith(".json"));
    } catch {
      continue; // no data/ directory: schema, normalize, the umbrellas
    }
    for (const file of files.sort()) {
      let rows;
      try {
        rows = JSON.parse(readFileSync(join(PACKAGES, pkg, "data", file), "utf-8"));
      } catch {
        continue;
      }
      if (!Array.isArray(rows)) continue; // metadata.json and friends
      for (const record of rows)
        if (record && typeof record === "object")
          yield { key: `${pkg}/${file}:${record.id}`, record };
    }
  }
}

/** The keys that trip the rule today, over every published record. */
function tripping() {
  const hits = new Set();
  for (const { key, record } of publishedRecords())
    if (record.geo_precision === "exact" && onArcminuteGrid(record.lat, record.lng)) hits.add(key);
  return hits;
}

test("no published record claims `exact` on a rounded placeholder", () => {
  const offenders = [...tripping()].filter((key) => !ALLOWED.has(key)).sort();
  assert.deepEqual(
    offenders,
    [],
    "a degrees-and-minutes placeholder cannot carry a per-facility claim; " +
      "re-place the record from a citable source or mark it approximate",
  );
});

test("every allow-listed record still trips the rule", () => {
  const hits = tripping();
  const stale = [...ALLOWED.keys()].filter((key) => !hits.has(key)).sort();
  assert.deepEqual(stale, [], "fixed or removed: delete these lines from ALLOWED");
});

test("no banques branch is allow-listed: #285 re-placed all of them", () => {
  // The four that failed this file when it was written, named so a regression in
  // the override ledger cannot quietly return under a new allow-list entry.
  assert.deepEqual(
    [...ALLOWED.keys()].filter((key) => key.startsWith("banques/")),
    [],
  );
  const hits = tripping();
  for (const id of ["agb-laghouat", "badr-412", "badr-413", "badr-772"])
    assert.ok(!hits.has(`banques/branches.json:${id}`), `${id} is back on the grid as exact`);
});

test("the rule is answering: both axes are required, and a real point passes", () => {
  assert.equal(onArcminuteGrid(33.58333, 2.66667), true); // 33°35'N 2°40'E, 5 decimals
  assert.equal(onArcminuteGrid(36.6166667, 6.8833333), true); // 7 decimals
  assert.equal(onArcminuteGrid(35, 8), true); // whole degrees are whole arcminutes
  assert.equal(onArcminuteGrid(33.58333, 2.875), false); // only one axis on the grid
  assert.equal(onArcminuteGrid(36.7483061, 3.0269546), false); // a surveyed branch
  assert.equal(onArcminuteGrid(null, 2.66667), false); // ungeocoded is never a hit
});

test("a 4-decimal conversion is caught, which a 0.002' tolerance let through", () => {
  // THE BOUNDARY CASE. 33°35'N 2°40'E written to four decimals is 33.5833, 2.6667,
  // which sits 0.002' off the grid: `< 0.002` missed it, and floating point put one
  // axis a hair under that cut and the other a hair over it. It also carries four
  // fraction digits, so MIN_EXACT_DECIMALS (3) passes it, and nothing else in the
  // contract would catch it. That is what sets the tolerance at 0.003'.
  assert.equal(onArcminuteGrid(33.5833, 2.6667), true);
  assert.ok(Math.abs(33.5833 * 60 - 2015) > 0.00199, "the case is the 0.002' boundary");
  assert.ok(Math.abs(2.6667 * 60 - 160) > 0.00199, "on both axes");
  // The cut is still tight: a point a full arcsecond off the grid is not a hit.
  assert.equal(onArcminuteGrid(33.5836, 2.6669), false);
});

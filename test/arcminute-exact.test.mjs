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
// NO ALLOW-LIST. This file shipped with 15 exemptions, one per record in a package
// #285 did not touch, because the demotion lived in one generator's ingest
// (`geoAtMeasured`) and the rest had not been swept. Private tracker #288 swept them
// and moved the rule into `writePackageV2`, beside the shared-point demotion every
// package already went through, so a rounded placeholder cannot leave the writer
// claiming `exact` whichever generator produced it. An exemption would now mean a
// record that bypassed the writer, which is the thing to find rather than to allow.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { onArcminuteGrid } from "../packages/schema/index.js";
import { demoteRoundedPlaceholders } from "../scripts/lib/v2-transforms.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = join(ROOT, "packages");

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
  const offenders = [...tripping()].sort();
  assert.deepEqual(
    offenders,
    [],
    "a degrees-and-minutes placeholder cannot carry a per-facility claim; " +
      "re-place the record from a citable source or mark it approximate",
  );
});

test("the writer, not this file, is what keeps that true", () => {
  // The assertion above is a GUARD: it says the shipped tree is clean. This one says
  // why it cannot stop being clean, because `writePackageV2` calls
  // `demoteRoundedPlaceholders` on every file of every package before it validates
  // or writes. A generator that stamps `exact` on a grid point therefore cannot
  // publish it, and the 15 records private tracker #288 swept are not an exemption
  // list this file has to carry.
  const rows = [
    { id: "on-the-grid", lat: 33.58333, lng: 2.66667, geo_precision: "exact" },
    { id: "four-decimals", lat: 33.5833, lng: 2.6667, geo_precision: "exact" },
    { id: "measured", lat: 36.7483061, lng: 3.0269546, geo_precision: "exact" },
    { id: "one-axis-only", lat: 33.58333, lng: 2.875, geo_precision: "exact" },
    { id: "already-honest", lat: 35, lng: 8, geo_precision: "approximate" },
    { id: "ungeocoded", lat: null, lng: null, geo_precision: null },
  ];
  assert.equal(demoteRoundedPlaceholders(rows), 2);
  assert.deepEqual(
    rows.map((r) => r.geo_precision),
    ["approximate", "approximate", "exact", "exact", "approximate", null],
  );
});

test("the records #285 and #288 re-placed or demoted stay off the grid as `exact`", () => {
  // Named so a regression in a ledger or a generator cannot quietly bring one back
  // under a precision the coordinate contradicts.
  const hits = tripping();
  const named = [
    ["banques/branches.json", ["agb-laghouat", "badr-412", "badr-413", "badr-772"]],
    ["formation-professionnelle/establishments.json", ["01392"]],
    ["mosquees/mosquees.json", ["10-0439", "68-0238"]],
    ["ooredoo/stores.json", ["16-059", "44-003"]],
    ["tourisme/attractions.json", ["attraction-846", "attraction-848"]],
    ["tourisme/historic.json", ["historic-91", "historic-144", "historic-487", "historic-746", "historic-837"]],
    ["tourisme/parks.json", ["park-25", "park-29", "park-31"]],
  ];
  for (const [file, ids] of named)
    for (const id of ids) assert.ok(!hits.has(`${file}:${id}`), `${file}:${id} is back on the grid as exact`);
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

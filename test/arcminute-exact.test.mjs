// Guards against the other way a coordinate can be a placeholder: the
// whole-arcminute grid.
//
// MIN_EXACT_DECIMALS catches a coordinate that was rounded in DECIMAL degrees
// (35, 8 or 36.35, 6.6 carry 0 to 2 fraction digits and cannot be a per-facility
// point). It is blind to the same placeholder written in DEGREES AND MINUTES with
// no seconds, because dividing minutes by 60 produces a long decimal tail:
// AGB's Laghouat branch shipped 33.58333, 2.66667, which is 33°35'N 2°40'E to five
// decimals, a cell about 1.5 km across, 30 km from the branch's own address, and
// `geo_precision: "exact"` on it passed every check in the repository (private
// tracker #285, public yasserstudio/geoalgeria#267).
//
// A real surveyed point lands on a whole arcminute on both axes about once in
// 60,000 times; a DMS-without-seconds conversion lands there every time. So a
// record that claims `exact` on such a point is making a claim the number itself
// disproves, exactly as the decimals rule does.
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
 *  they need their own sourcing pass (see the PR for #285). */
const ALLOWED = new Map([
  ["mosquees/mosquees.json:10-0439", "Wikidata DMS point, mosquees sourcing pass owed"],
  ["ooredoo/stores.json:16-059", "operator API DMS point, ooredoo sourcing pass owed"],
  ["tourisme/attractions.json:attraction-846", "DMS point from the tourism source"],
  ["tourisme/attractions.json:attraction-848", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-91", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-144", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-487", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-746", "DMS point from the tourism source"],
  ["tourisme/historic.json:historic-837", "DMS point from the tourism source"],
  ["tourisme/parks.json:park-25", "DMS point from the tourism source"],
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

test("no published record claims `exact` on a whole-arcminute point", () => {
  const offenders = [];
  for (const { key, record } of publishedRecords()) {
    if (record.geo_precision !== "exact") continue;
    if (!onArcminuteGrid(record.lat, record.lng)) continue;
    if (ALLOWED.has(key)) continue;
    offenders.push(`${key} (${record.lat}, ${record.lng})`);
  }
  assert.deepEqual(
    offenders,
    [],
    "degrees-and-minutes placeholders cannot carry a per-facility claim; " +
      "re-place the record from a citable source or mark it approximate",
  );
});

test("every allow-listed record still trips the rule", () => {
  const tripping = new Set();
  for (const { key, record } of publishedRecords())
    if (record.geo_precision === "exact" && onArcminuteGrid(record.lat, record.lng))
      tripping.add(key);
  const stale = [...ALLOWED.keys()].filter((key) => !tripping.has(key));
  assert.deepEqual(stale, [], "fixed or removed: delete these lines from ALLOWED");
});

test("the rule is answering: both axes are required, and a real point passes", () => {
  assert.equal(onArcminuteGrid(33.58333, 2.66667), true); // 33°35'N 2°40'E
  assert.equal(onArcminuteGrid(35, 8), true); // whole degrees are whole arcminutes
  assert.equal(onArcminuteGrid(33.58333, 2.875), false); // only one axis on the grid
  assert.equal(onArcminuteGrid(36.7483061, 3.0269546), false); // a surveyed branch
  assert.equal(onArcminuteGrid(null, 2.66667), false); // ungeocoded is never a hit
});

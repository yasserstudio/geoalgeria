// The four wilaya capital commune centres of tracker #236, held to geometry this
// repository did not derive them from.
//
// WHY A SEPARATE FILE. test/commune-centre-in-commune.test.mjs is containment, and
// containment cannot see this class: all four stored centres were inside their own
// commune, 3 to 6 km from the town, exactly Bethioua's class
// (research/_commune-centres/README.md, "the guard's honest limit"). The seat delta
// cannot see it either, because over all 1,537 rows the median disagreement with the
// OpenStreetMap `admin_centre` node is 402 m and a delta alone says the two sources
// disagree, not which one is wrong (the Owner's 2026-09-29 decision, #170). So 107
// non-capital centres are still more than 3 km from their seat by that documented
// decision and are not defects.
//
// WHAT MAKES THESE FOUR DIFFERENT, and what this file asserts, is a second and a
// third claim about the same town that the correction does not come from:
//
//   1. the geometric median of the `geo_precision: exact` records that other
//      packages place inside the commune's own OpenStreetMap outline. Those are
//      pharmacies, schools, mosques, post offices, bank branches: hundreds of
//      independently surveyed buildings, selected here by point-in-polygon rather
//      than by the `commune` they name, so the selection cannot depend on the
//      commune centre under test.
//   2. the wilaya's own published point, which comes from its `admin_level=4`
//      relation, a different OpenStreetMap object from the commune's
//      `admin_level=8` `admin_centre` node the correction is taken from.
//
// Both are absolute ceilings in metres, and both are asserted in both directions:
// the shipped value is inside the ceiling and the repudiated value is outside it. A
// test that only checked the new value would pass just as well on the old one for
// three of the four, and "closer than before" is not a fact about one claim.
//
// THE FOUR ARE WILAYA CAPITALS (chefs-lieux), per décret 84-79 for Biskra (7),
// El Bayadh (32) and Constantine (25) and décret présidentiel 26-206 for El Kantara
// (61). The capital is not a field on a wilaya yet; it arrives with #228, whose
// capital-point check this correction is a prerequisite for.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { haversine, inCommuneOutline } from "../scripts/lib/commune-resolver.mjs";
import { COPIES } from "./lib/commune-carriers.mjs";
import { RECORD_FILES, recordsOf } from "./lib/wilaya-containment.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf-8"));

const LEDGER_FILE = "corrections-2026-10-01.json";
const ledger = readJson("research", "_commune-centres", LEDGER_FILE);
const boundaries = readJson("research", "_commune-centres", "commune-boundaries.json");
const wilayas = readJson("packages", "dataset", "data", "algeria.json");

/** Absolute ceiling, metres. Both independent claims put all four corrected centres
 *  inside it (the widest is Constantine, 1.5 km from its facility median and 1.7 km
 *  from the wilaya point) and all four repudiated centres outside it (the narrowest is
 *  Constantine again, 2.5 km and 4.2 km). It is a ceiling on agreement between two
 *  hand-placed claims about one town centre, not a tolerance on an error. */
const CEILING_M = 2000;

/** A facility median built from fewer buildings than this is not an independent claim
 *  about where the town is. The thinnest of the four is El Kantara, a town of about
 *  7,000, with 40. */
const MIN_FACILITY_RECORDS = 10;

/** The four, with the wilaya each is the capital of. Pinned so the ledger and this
 *  file cannot drift apart: a fifth row in the ledger, or a different commune, fails
 *  here rather than riding along unchecked. */
const CAPITALS = [
  { code_commune: 701, wilaya_code: 7, name_fr: "Biskra" },
  { code_commune: 717, wilaya_code: 61, name_fr: "El Kantara" },
  { code_commune: 2501, wilaya_code: 25, name_fr: "Constantine" },
  { code_commune: 3201, wilaya_code: 32, name_fr: "El Bayadh" },
];

const BOUNDARIES = new Map(boundaries.communes.map((c) => [c.code_commune, c]));
const WILAYA_POINT = new Map(wilayas.map((w) => [Number(w.code), [w.longitude, w.latitude]]));
const ROWS = new Map(ledger.corrections.map((r) => [r.code_commune, r]));

/**
 * Weiszfeld's algorithm for the geometric median, the point minimising the sum of
 * distances to every input. The mean is not usable here: a single facility a commune
 * away drags it, and these communes are large (El Kantara's outline is 40 km across).
 * Longitude is cosLat-scaled so the iteration minimises metres rather than degrees.
 */
function geometricMedian(points) {
  let [x, y] = points
    .reduce(([sx, sy], [px, py]) => [sx + px, sy + py], [0, 0])
    .map((s) => s / points.length);
  const cosLat = Math.cos((y * Math.PI) / 180);
  for (let iter = 0; iter < 256; iter++) {
    let nx = 0;
    let ny = 0;
    let weight = 0;
    for (const [px, py] of points) {
      const d = Math.hypot((px - x) * cosLat, py - y);
      if (d < 1e-12) continue; // the median sits on an input point
      nx += px / d;
      ny += py / d;
      weight += 1 / d;
    }
    if (weight === 0) break;
    const [sx, sy] = [nx / weight, ny / weight];
    const moved = Math.hypot(sx - x, sy - y);
    x = sx;
    y = sy;
    if (moved < 1e-9) break;
  }
  return [x, y];
}

/** Every `geo_precision: exact` published record inside one commune's OpenStreetMap
 *  outline, over every package's record files, with the files it came from. The
 *  selection is point-in-polygon, never the `commune` the record names, so it is
 *  independent of the centre under test. */
function exactRecordsInside(boundary) {
  const points = [];
  const files = new Set();
  for (const file of RECORD_FILES(ROOT)) {
    for (const r of recordsOf(ROOT, file)) {
      if (r.row.geo_precision !== "exact") continue;
      if (!inCommuneOutline(r.lng, r.lat, boundary)) continue;
      points.push([r.lng, r.lat]);
      files.add(file);
    }
  }
  return { points, files: [...files].sort() };
}

test(`${LEDGER_FILE} carries exactly the four wilaya capital communes of tracker #236`, () => {
  assert.equal(ledger.applied, true, "a ledger scripts/lib/commune-corrections.mjs reads must be applied");
  assert.equal(ledger.count, ledger.corrections.length, "the ledger's own count disagrees with its rows");
  assert.deepEqual(
    ledger.corrections.map((r) => ({ code_commune: r.code_commune, wilaya_code: r.wilaya_code, name_fr: r.name_fr })),
    CAPITALS,
    "the ledger's rows are not the four capital communes this file checks",
  );
  assert.ok(ledger.timestamp_osm_base, "the ledger must record the Overpass timestamp_osm_base its values come from");
  for (const row of ledger.corrections) {
    assert.ok(row.osm?.relation, `${row.name_fr}: no OpenStreetMap relation id`);
    assert.ok(row.osm?.admin_centre_node, `${row.name_fr}: no admin_centre node id, which is where the value comes from`);
    assert.ok(row.evidence, `${row.name_fr}: no evidence block`);
  }
});

for (const { code_commune, wilaya_code, name_fr } of CAPITALS) {
  const row = ROWS.get(code_commune);
  const boundary = BOUNDARIES.get(code_commune);

  test(`${name_fr} (${code_commune}): every carrier ships the corrected centre`, () => {
    assert.ok(row, `${name_fr} is not in ${LEDGER_FILE}`);
    for (const [label, load] of COPIES) {
      const found = load().filter((c) => Number(c.w) === wilaya_code && c.name === name_fr);
      assert.equal(found.length, 1, `${label}: ${name_fr} appears ${found.length} time(s)`);
      assert.ok(
        Math.abs(found[0].lng - row.to[0]) < 5e-7 && Math.abs(found[0].lat - row.to[1]) < 5e-7,
        `${label}: ${name_fr} ships [${found[0].lng}, ${found[0].lat}], the ledger's value is [${row.to}]`,
      );
    }
  });

  test(`${name_fr} (${code_commune}): the corrected centre is inside its own commune`, () => {
    assert.ok(boundary?.usable, `${name_fr}: no usable OpenStreetMap outline`);
    assert.ok(
      inCommuneOutline(row.to[0], row.to[1], boundary),
      `${name_fr}: the corrected centre is outside its own commune's OpenStreetMap outline`,
    );
  });

  test(`${name_fr} (${code_commune}): the corrected centre agrees with the facilities, the repudiated one does not`, () => {
    const { points, files } = exactRecordsInside(boundary);
    assert.ok(
      points.length >= MIN_FACILITY_RECORDS,
      `${name_fr}: only ${points.length} exact record(s) inside the commune, too few to place the town`,
    );
    assert.ok(files.length >= 3, `${name_fr}: the facility median rests on ${files.length} package file(s)`);

    const [mLng, mLat] = geometricMedian(points);
    const toMedian = haversine(mLat, mLng, row.to[1], row.to[0]);
    const fromMedian = haversine(mLat, mLng, row.from[1], row.from[0]);
    assert.ok(
      toMedian < CEILING_M,
      `${name_fr}: the corrected centre is ${Math.round(toMedian)} m from the median of ${points.length} exact facilities`,
    );
    assert.ok(
      fromMedian > CEILING_M,
      `${name_fr}: the repudiated centre is only ${Math.round(fromMedian)} m from that median, so this correction is not evidenced here`,
    );
  });

  test(`${name_fr} (${code_commune}): the corrected centre agrees with the wilaya's own point, the repudiated one does not`, () => {
    const point = WILAYA_POINT.get(wilaya_code);
    assert.ok(point, `wilaya ${wilaya_code} carries no point`);
    const toWilaya = haversine(point[1], point[0], row.to[1], row.to[0]);
    const fromWilaya = haversine(point[1], point[0], row.from[1], row.from[0]);
    assert.ok(
      toWilaya < CEILING_M,
      `${name_fr}: the corrected centre is ${Math.round(toWilaya)} m from the point of wilaya ${wilaya_code}, whose capital it is`,
    );
    assert.ok(
      fromWilaya > CEILING_M,
      `${name_fr}: the repudiated centre is only ${Math.round(fromWilaya)} m from that point, so this correction is not evidenced here`,
    );
  });
}

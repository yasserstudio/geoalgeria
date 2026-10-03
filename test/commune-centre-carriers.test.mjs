// A corrected commune centre is ONE value repeated across seven files, and every one of
// them has to hold it.
//
// WHY THIS FILE EXISTS. packages/dataset/NOTICE makes that claim as a licence statement:
// "A commune centre is one value repeated across representations, so the ODbL covers these
// 323 coordinates wherever they appear: data/algeria.json, data/communes_w*.json,
// data/csv/communes.csv, data/geojson/communes.geojson and data/sql/full.sql". Nothing
// checked it. On 2026-10-01 El Euch (3427) sat on its superseded 2.1.0 relation centroid in
// data/csv/communes.csv and data/sql/full.sql while the other five carriers held the
// coordinate review's value, 9.7 km away, and the whole suite passed: the licence guard
// (test/osm-derived-centre-count.test.mjs) reads only the three communes_w* files, and the
// containment guard asks whether a point is inside its commune, which both values are.
//
// The cause was scripts/fix-jo-corrections.mjs writing the CSV and the SQL unconditionally,
// including under --target, so running the test suite reverted two carriers. That is fixed
// there. This file is the standing check, and it is a different question from containment:
// it asks whether all seven carriers agree with the ledger, which is the only claim that
// makes "one value" true.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadCorrections } from "../scripts/lib/commune-corrections.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
const read = (...p) => readFileSync(join(DATA, ...p), "utf-8");
const json = (...p) => JSON.parse(read(...p));

/** 6 decimals is this repository's coordinate resolution; compare below half of it. */
const same = (a, b) => Math.abs(Number(a) - Number(b)) < 5e-7;

/** code_commune -> [lng, lat], per carrier, each read in that carrier's own shape. */
const CARRIERS = {
  "communes_w1_w23.json": () => new Map(json("communes_w1_w23.json").map((c) => [c.code_commune, [c.longitude, c.latitude]])),
  "communes_w24_w48.json": () => new Map(json("communes_w24_w48.json").map((c) => [c.code_commune, [c.longitude, c.latitude]])),
  "communes_w49_w69.json": () => new Map(json("communes_w49_w69.json").map((c) => [c.code_commune, [c.longitude, c.latitude]])),
  "algeria.json": () =>
    new Map(json("algeria.json").flatMap((w) => w.communes.map((c) => [c.code_commune, [c.longitude, c.latitude]]))),
  // The GeoJSON carries no commune code, so it is keyed on (wilaya, name_fr) exactly as
  // scripts/fix-commune-centres.mjs keys it; that pair is unique over all 1,541 rows.
  "geojson/communes.geojson": () =>
    new Map(
      json("geojson", "communes.geojson").features.map((f) => [
        `${Number(f.properties.wilaya_code)}|${f.properties.name_fr}`,
        f.geometry.coordinates,
      ]),
    ),
  // name_fr,name_ar,wilaya_code,daira,postal_code,latitude,longitude,code_commune
  "csv/communes.csv": () => {
    const rows = read("csv", "communes.csv").split(/\r?\n/).slice(1);
    const out = new Map();
    for (const line of rows) {
      const cells = line.split(",");
      if (cells.length !== 8) continue;
      out.set(Number(cells[7]), [Number(cells[6]), Number(cells[5])]);
    }
    return out;
  },
  // (id, 'name_fr', 'name_ar', wilaya, 'daira', 'postal'|NULL, lat, lng, code)
  "sql/full.sql": () => {
    const re =
      /^ {2}\(\d+, '(?:[^']|'')*', '(?:[^']|'')*', \d+, '(?:[^']|'')*', (?:'\d+'|NULL), (-?[\d.]+|NULL), (-?[\d.]+|NULL), (\d+)\)[,;]$/;
    const out = new Map();
    for (const line of read("sql", "full.sql").split("\n")) {
      const m = line.match(re);
      if (m) out.set(Number(m[3]), [Number(m[2]), Number(m[1])]);
    }
    return out;
  },
};

test("every corrected commune centre is the ledger's value in all seven carriers", () => {
  const { corrections, count } = loadCorrections();
  assert.ok(count > 300, `read ${count} corrections, which is fewer than the applied history`);

  // The three split files hold one wilaya range each, so a correction is in exactly one of
  // them and in every other carrier. That is asserted rather than assumed: a split file
  // that stopped carrying its range would otherwise read as a clean pass.
  const splits = ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"];
  const loaded = Object.fromEntries(Object.entries(CARRIERS).map(([name, load]) => [name, load()]));
  const problems = [];
  let inASplit = 0;

  for (const row of corrections) {
    let splitHits = 0;
    for (const [name, byCode] of Object.entries(loaded)) {
      const point = byCode.get(name === "geojson/communes.geojson" ? `${row.wilaya_code}|${row.name_fr}` : row.code_commune);
      if (!point) {
        if (splits.includes(name)) continue;
        problems.push(`${name}: ${row.name_fr} (${row.code_commune}) is missing`);
        continue;
      }
      if (splits.includes(name)) splitHits++;
      if (!same(point[0], row.to[0]) || !same(point[1], row.to[1]))
        problems.push(
          `${name}: ${row.name_fr} (${row.code_commune}) holds [${point[0]}, ${point[1]}], the ${row.batch} ledger says [${row.to[0]}, ${row.to[1]}]`,
        );
    }
    if (splitHits !== 1) problems.push(`${row.name_fr} (${row.code_commune}) is in ${splitHits} split file(s), not 1`);
    else inASplit++;
  }

  assert.deepEqual(problems, [], `${problems.length} carrier(s) disagree with the correction ledgers`);
  assert.equal(inASplit, count);
});

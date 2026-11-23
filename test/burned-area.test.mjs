// The Burned area build at its command boundary: a tiny grid of burned cells, two
// square wilayas, and a reference table, through scripts/build-burned-area.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "build-burned-area.mjs");

// Tile h18v05, row 0 is latitude 40 N. Row 1200 is 35 N (minus half a cell) and the
// column of a longitude there is lon x cos(lat) x 240. Columns 400 and 420 fall near
// 2.03 and 2.13 E (wilaya 1), column 1000 near 5.09 E (wilaya 2), 2000 in neither.
const square = (code, west, east) => ({
  type: "Feature",
  properties: { code },
  geometry: { type: "Polygon", coordinates: [[[west, 34], [east, 34], [east, 36], [west, 36], [west, 34]]] },
});
const WILAYAS = { type: "FeatureCollection", features: [square(1, 1, 4), square(2, 4, 7)] };
// One 463.3127 m MODIS cell: 463.3127165^2 / 10,000 = 21.4659 ha.
const CELL_HA = 21.4659;

const CELLS = {
  land_cover: { 2002: 2002 },
  tiles: ["h18v05"],
  months: {
    "2002-07": { h18v05: [[1200, 400, 10], [1200, 420, 10], [1200, 1000, 5], [1200, 2000, 5]] },
    "2002-08": { h18v05: [[1200, 1000, 12]] },
    "2002-09": { h18v05: [] },
  },
};
const reference = (hectares) => ({ rows: [{ year: "2002", forest: String(hectares / 2), other: String(hectares / 2) }] });

function run({ cells = CELLS, ref = reference(4 * CELL_HA), args = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "burned-area-"));
  const put = (name, value) => {
    writeFileSync(join(dir, name), JSON.stringify(value));
    return join(dir, name);
  };
  const out = join(dir, "burned-area.json");
  const r = spawnSync(
    process.execPath,
    [
      SCRIPT,
      ...["--cells", put("cells.json", cells), "--boundaries", put("b.geojson", WILAYAS)],
      ...["--reference", put("ref.json", ref), "--out", out, "--retrieved", "2026-11-23", "--gate-years", "2002-2002"],
      ...args,
    ],
    { encoding: "utf-8" },
  );
  const data = existsSync(out) ? JSON.parse(readFileSync(out, "utf-8")) : null;
  return { ...r, data, out };
}

test("a wilaya's hectares are its burned cells times the cell area", () => {
  const { data, status, stderr } = run();
  assert.equal(status, 0, stderr);
  assert.deepEqual(data.wilayas, [
    { code: 1, months: { "2002-07": 42.93 } },
    { code: 2, months: { "2002-07": 21.47, "2002-08": 21.47 } },
  ]);
});

test("barren, snow and water cells are left out, and the count says so", () => {
  const cells = structuredClone(CELLS);
  for (const land of [15, 16, 17]) cells.months["2002-07"].h18v05.push([1200, 410 + land, land]);
  const { data, status, stderr } = run({ cells });
  assert.equal(status, 0, stderr);
  assert.deepEqual(data.wilayas, run().data.wilayas);
  assert.equal(data.excluded.cells, 3);
  assert.deepEqual(data.excluded.land_classes, [15, 16, 17]);
});

test("a cell with no land class fails the build", () => {
  const cells = structuredClone(CELLS);
  cells.months["2002-08"].h18v05 = [[1200, 1000]];
  const { status, stderr, out } = run({ cells });
  assert.equal(status, 1);
  assert.match(stderr, /land class/);
  assert.equal(existsSync(out), false);
});

test("the latest month is recorded, with the source", () => {
  const { data } = run();
  assert.equal(data.first_month, "2002-07");
  assert.equal(data.latest_month, "2002-09");
  assert.equal(data.sources[0].doi, "10.5067/MODIS/MCD64A1.061");
  assert.match(data.notes.join(" "), /ends at 2002-09/);
  assert.equal(data.check.credit, "EU JRC GWIS, CC BY 4.0, used as a check");
});

test("a month missing a tile is named and does not count as the latest", () => {
  const cells = structuredClone(CELLS);
  cells.months["2002-10"] = {};
  cells.months["2002-06"] = {};
  const { data } = run({ cells });
  assert.equal(data.latest_month, "2002-09");
  assert.deepEqual(data.incomplete_months, []);
  delete cells.months["2002-08"].h18v05;
  const gap = run({ cells, ref: reference(3 * CELL_HA) }).data;
  assert.deepEqual(gap.incomplete_months, ["2002-08"]);
});

test("a year more than 10% off the reference fails, names the year and writes nothing", () => {
  const { status, stderr, out } = run({ ref: reference(5 * CELL_HA) });
  assert.equal(status, 1);
  assert.match(stderr, /2002/);
  assert.match(stderr, /-20\.0%/);
  assert.equal(existsSync(out), false);
});

test("a gate year missing from the reference fails", () => {
  const { status, stderr } = run({ ref: { rows: [] } });
  assert.equal(status, 1);
  assert.match(stderr, /2002/);
});

test("--check fails when the file on disk differs from the build", () => {
  const first = run();
  assert.equal(first.status, 0);
  const { status, stderr } = run({ args: ["--check"] });
  assert.equal(status, 1);
  assert.match(stderr, /stale/);
});

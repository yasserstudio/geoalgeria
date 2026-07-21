// Guards the geo-in-boundary check itself — that it is switched ON and answering,
// not merely present.
//
// The bug this exists for is not a bad coordinate, it is a check that passes
// everything. @geoalgeria/schema has shipped point-in-wilaya since P1 and
// validateRecords has accepted opts.boundaries since P1, but no caller ever passed
// them, so for 24 packages the check ran zero times. It also could not be switched
// on: the only wilaya geometry in the repo was dataset/geojson/wilayas.geojson, 69
// *Point* features, over which the old loadBoundaries indexed nothing and returned
// an empty Map — and pointInWilaya answers "inside" for a code it has no polygon
// for. Wiring that would have printed a clean run over data nothing looked at.
//
// So the assertions here are deliberately end-to-end against the SHIPPED polygons
// and SHIPPED records: a real coordinate stamped with the wrong wilaya_code must
// come back reported, and the same coordinate with its own code must not.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  loadBoundaries,
  pointInWilaya,
  validateRecords,
  WILAYA_CODES,
} from "../packages/schema/index.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf-8"));

const boundaryFc = read("packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson");
const boundaries = loadBoundaries(boundaryFc);

test("the shipped boundaries cover all 69 wilayas as polygons", () => {
  assert.equal(boundaryFc.features.length, 69);
  assert.equal(boundaries.size, 69);
  for (const code of WILAYA_CODES) assert.ok(boundaries.has(code), `no polygon for wilaya ${code}`);
  const types = boundaryFc.features.map((f) => f.geometry.type);
  assert.equal(types.filter((t) => t === "Polygon").length, 68);
  assert.equal(types.filter((t) => t === "MultiPolygon").length, 1);
  // codes join to wilayas.json — the file is useless as an index if they drift
  const wilayaCodes = read("packages", "dataset", "data", "wilayas.json").wilayas.map((w) => w.code);
  assert.deepEqual(
    boundaryFc.features.map((f) => f.properties.code).sort((a, b) => a - b),
    wilayaCodes.sort((a, b) => a - b),
  );
});

test("a real point stamped with the wrong wilaya_code is reported", () => {
  // A shipped record, not a fixture: pick the first geocoded post office in Alger.
  const rec = read("packages", "poste", "data", "postoffices.json").find(
    (r) => r.wilaya_code === "16" && Number.isFinite(r.lat) && Number.isFinite(r.lng),
  );
  assert.ok(rec, "no geocoded Alger post office to test with");

  // truth: it is where it says it is, and validateRecords is quiet about it
  assert.equal(pointInWilaya(rec.lng, rec.lat, "16", boundaries), true);
  assert.deepEqual(validateRecords([rec], { boundaries }), { errors: [], warnings: [] });

  // injection: same coordinate, wrong wilaya (01 Adrar, ~1,200 km away)
  const mislinked = { ...rec, wilaya_code: "01", commune_code: null };
  assert.equal(pointInWilaya(mislinked.lng, mislinked.lat, "01", boundaries), false);
  const res = validateRecords([mislinked], { boundaries });
  assert.equal(res.errors.length, 0, "boundary mismatch is a warning, not an error (P1 decision)");
  assert.equal(res.warnings.length, 1);
  assert.match(res.warnings[0], /outside the wilaya 01 boundary/);

  // and the check must be OFF when no boundaries are passed — proving the warning
  // above came from the boundary test and not from some other rule
  assert.deepEqual(validateRecords([mislinked]), { errors: [], warnings: [] });
});

test("the Point-features file can no longer be mistaken for boundaries", () => {
  // dataset/geojson/wilayas.geojson is 69 capital Points. Indexing it used to yield
  // an empty Map, which passes every record in the repo. It must now be impossible.
  const points = read("packages", "dataset", "data", "geojson", "wilayas.geojson");
  assert.equal(points.features.length, 69);
  assert.ok(points.features.every((f) => f.geometry.type === "Point"));
  assert.throws(() => loadBoundaries(points), /indexed 0 wilayas/);
});

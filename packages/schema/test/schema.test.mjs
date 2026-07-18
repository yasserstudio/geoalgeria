import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateRecords,
  validateMetadata,
  buildMetadata,
  buildManifest,
  buildDcat,
  loadBoundaries,
  pointInWilaya,
  pointInGeometry,
  wcode,
  round6,
  bbox,
  toCSV,
  toGeoJSON,
  SCHEMA_VERSION,
  WILAYA_CODES,
  LIFECYCLE,
  EVIDENCE_TYPE,
} from "../index.js";

/** A minimal, contract-valid record. */
const rec = (over = {}) => ({
  id: "sante:16-00001",
  name: "CHU Mustapha",
  wilaya_code: "16",
  commune_code: "1601",
  commune: "Sidi M'Hamed",
  lat: 36.75,
  lng: 3.06,
  geo_precision: "exact",
  ...over,
});

test("constants", () => {
  assert.equal(SCHEMA_VERSION, "2.0.0");
  assert.equal(WILAYA_CODES.length, 69);
  assert.equal(WILAYA_CODES[0], "01");
  assert.equal(WILAYA_CODES[68], "69");
});

test("helpers: wcode / round6 / bbox", () => {
  assert.equal(wcode(1), "01");
  assert.equal(wcode("16"), "16");
  assert.equal(wcode(null), null);
  assert.equal(round6(3.0600001), 3.06);
  assert.equal(round6(""), null);
  assert.deepEqual(bbox([rec(), rec({ lat: 35, lng: 1 })]), [1, 35, 3.06, 36.75]);
  assert.equal(bbox([rec({ lat: null, lng: null })]), null);
});

test("valid records pass", () => {
  const { errors, warnings } = validateRecords([rec(), rec({ id: "sante:16-00002" })]);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("wilaya_code must be a zero-padded string", () => {
  assert.equal(validateRecords([rec({ wilaya_code: 16 })]).errors.length, 1); // integer rejected
  assert.equal(validateRecords([rec({ wilaya_code: "16" })]).errors.length, 0);
  assert.equal(validateRecords([rec({ wilaya_code: "70" })]).errors.length, 1); // out of range
  assert.equal(validateRecords([rec({ wilaya_code: "1" })]).errors.length, 1); // not padded
});

test("duplicate id is an error", () => {
  const { errors } = validateRecords([rec(), rec()]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /duplicate id/);
});

test("commune_code must be a numeric string; prefix mismatch warns", () => {
  assert.equal(validateRecords([rec({ commune_code: 1601 })]).errors.length, 1); // integer rejected
  assert.equal(validateRecords([rec({ commune_code: null })]).errors.length, 0); // null ok
  const { errors, warnings } = validateRecords([rec({ commune_code: "3101" })]); // wilaya 16
  assert.equal(errors.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /does not start with wilaya_code/);
});

test("coordinate sanity guard catches lat/lng swap and sign flip (no polygons needed)", () => {
  assert.match(validateRecords([rec({ lat: 3.06, lng: 36.75 })]).errors[0], /outside Algeria/); // swapped
  assert.match(validateRecords([rec({ lat: -36.75 })]).errors[0], /outside Algeria/); // sign flip
  assert.equal(validateRecords([rec({ lat: null, lng: null, geo_precision: "approximate" })]).errors.length, 0); // ungeocoded ok
  assert.equal(validateRecords([rec({ lat: 36.75, lng: null })]).errors.length, 1); // half-set
});

test("geo_precision must be from the vocabulary", () => {
  assert.equal(validateRecords([rec({ geo_precision: "osm_node" })]).errors.length, 1);
  assert.equal(validateRecords([rec({ geo_precision: "approximate" })]).errors.length, 0);
});

test("lifecycle is optional but validated against the vocabulary when present", () => {
  assert.deepEqual(LIFECYCLE, ["operating", "planned", "closed", "unknown"]);
  assert.equal(validateRecords([rec()]).errors.length, 0); // absent — fine
  assert.equal(validateRecords([rec({ lifecycle: "operating" })]).errors.length, 0);
  assert.equal(validateRecords([rec({ lifecycle: null })]).errors.length, 0); // null — fine
  const { errors } = validateRecords([rec({ lifecycle: "demolished" })]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /lifecycle must be one of/);
});

test("requireName option", () => {
  assert.equal(validateRecords([rec({ name: null })], { requireName: true }).errors.length, 1);
  assert.equal(validateRecords([rec({ name: null, name_ar: "مستشفى" })], { requireName: true }).errors.length, 0);
});

test("point-in-wilaya boundary check", () => {
  // unit square around (lng 3, lat 36) tagged wilaya 16
  const fc = {
    features: [
      {
        properties: { code: 16 },
        geometry: { type: "Polygon", coordinates: [[[2, 35], [4, 35], [4, 37], [2, 37], [2, 35]]] },
      },
    ],
  };
  const boundaries = loadBoundaries(fc);
  assert.equal(pointInWilaya(3, 36, "16", boundaries), true);
  assert.equal(pointInWilaya(10, 36, "16", boundaries), false);
  assert.equal(pointInWilaya(3, 36, "31", boundaries), true); // unknown boundary → not flagged

  // a point inside Algeria but outside its declared wilaya polygon → advisory warning
  // (boundaries are simplified, so a hard error would false-fail border-adjacent points)
  const outOfWilaya = validateRecords([rec({ lat: 36, lng: 10 })], { boundaries });
  assert.equal(outOfWilaya.errors.length, 0);
  assert.equal(outOfWilaya.warnings.length, 1);
  assert.match(outOfWilaya.warnings[0], /outside the wilaya 16 boundary/);
});

test("point-in-geometry: MultiPolygon and polygon-with-hole", () => {
  const multi = {
    type: "MultiPolygon",
    coordinates: [
      [[[2, 35], [4, 35], [4, 37], [2, 37], [2, 35]]], // box A around (3,36)
      [[[6, 35], [8, 35], [8, 37], [6, 37], [6, 35]]], // box B around (7,36)
    ],
  };
  assert.equal(pointInGeometry(3, 36, multi), true);
  assert.equal(pointInGeometry(7, 36, multi), true);
  assert.equal(pointInGeometry(5, 36, multi), false); // gap between the two boxes

  const holed = {
    type: "Polygon",
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], // outer
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]], // hole
    ],
  };
  assert.equal(pointInGeometry(1, 1, holed), true); // in outer, outside hole
  assert.equal(pointInGeometry(5, 5, holed), false); // inside the hole
});

test("malformed geometry never throws (validator fails gracefully)", () => {
  for (const g of [
    null,
    { type: "Polygon", coordinates: null },
    { type: "Polygon", coordinates: [null] },
    { type: "MultiPolygon", coordinates: [[[[1, 1]]]] }, // ring too short
    { type: "Point", coordinates: [3, 36] },
  ]) {
    assert.doesNotThrow(() => pointInGeometry(3, 36, g));
    assert.equal(pointInGeometry(3, 36, g), false);
  }
  // a malformed boundary is skipped by loadBoundaries → its wilaya isn't checked
  const boundaries = loadBoundaries({
    features: [{ properties: { code: 16 }, geometry: { type: "Polygon", coordinates: null } }],
  });
  assert.equal(boundaries.size, 0);
  assert.equal(pointInWilaya(3, 36, "16", boundaries), true);
});

test("coordinates present but non-numeric are rejected", () => {
  assert.match(validateRecords([rec({ lat: "36.75", lng: "3.06" })]).errors[0], /finite numbers/);
  assert.match(validateRecords([rec({ lat: 36.75, lng: NaN })]).errors[0], /finite numbers/);
});

test("CSV formula-injection guard covers leading-whitespace bypass", () => {
  assert.match(toCSV([{ a: " =1+1" }], ["a"]), /'\s?=1\+1/); // space + formula → prefixed
  assert.match(toCSV([{ a: "\t=cmd" }], ["a"]), /'/); // tab + formula → prefixed
  assert.doesNotMatch(toCSV([{ a: " hello" }], ["a"]), /'/); // benign leading space → untouched
});

test("buildMetadata computes counts, precision, coverage, bbox", () => {
  const records = [
    rec(),
    rec({ id: "sante:16-00002", geo_precision: "approximate" }),
    rec({ id: "sante:31-00001", wilaya_code: "31", commune_code: "3101", lat: null, lng: null, geo_precision: "approximate" }),
  ];
  const meta = buildMetadata({
    package: "@geoalgeria/sante",
    records,
    sources: [{ key: "msp", name: "Ministry of Health", license: "official" }],
    license: "MIT",
    updated: "2026-07-18",
    estimatedUniverse: 6,
    titles: { en: "Health establishments" },
  });
  assert.equal(meta.schema_version, "2.0.0");
  assert.equal(meta.record_count, 3);
  assert.equal(meta.geocoded_count, 2);
  assert.equal(meta.geocoded_pct, 66.7);
  assert.deepEqual(meta.precision, { exact: 1, approximate: 1 });
  assert.equal(meta.wilayas_covered, 2);
  assert.equal(meta.estimated_universe, 6);
  assert.equal(meta.coverage_pct, 50);
  assert.deepEqual(meta.bbox, [3.06, 36.75, 3.06, 36.75]);
  assert.equal(meta.lifecycle, undefined); // no record declared one → field omitted
  assert.deepEqual(validateMetadata(meta).errors, []);
});

test("buildMetadata emits a lifecycle rollup only when records declare one", () => {
  const meta = buildMetadata({
    package: "@geoalgeria/sports",
    records: [
      rec({ id: "sports:16-1", lifecycle: "operating" }),
      rec({ id: "sports:16-2", lifecycle: "operating" }),
      rec({ id: "sports:16-3", lifecycle: "closed" }),
      rec({ id: "sports:16-4" }), // no lifecycle
    ],
    sources: [{ key: "mjs", name: "Ministry of Youth & Sports", license: "official", evidence_type: "official" }],
    license: "MIT",
    updated: "2026-07-18",
  });
  assert.deepEqual(meta.lifecycle, { operating: 2, planned: 0, closed: 1, unknown: 0 });
  assert.deepEqual(validateMetadata(meta).errors, []);
});

test("validateMetadata catches shape problems", () => {
  assert.ok(validateMetadata({}).errors.length > 0);
  assert.match(
    validateMetadata({
      package: "x", schema_version: "2.0.0", record_count: 1, geocoded_count: 2,
      wilayas_covered: 1, license: "MIT", updated: "2026-07-18",
      sources: [{ key: "a", license: "b" }],
    }).errors.join(),
    /geocoded_count exceeds record_count/,
  );
});

test("source evidence_type is optional but validated when present", () => {
  assert.deepEqual(EVIDENCE_TYPE, ["official", "crowdsourced", "derived"]);
  const base = {
    package: "x", schema_version: "2.0.0", record_count: 1, geocoded_count: 1,
    wilayas_covered: 1, license: "MIT", updated: "2026-07-18",
  };
  assert.equal(validateMetadata({ ...base, sources: [{ key: "a", license: "b", evidence_type: "official" }] }).errors.length, 0);
  assert.equal(validateMetadata({ ...base, sources: [{ key: "a", license: "b" }] }).errors.length, 0); // absent — fine
  assert.match(
    validateMetadata({ ...base, sources: [{ key: "a", license: "b", evidence_type: "guessed" }] }).errors.join(),
    /evidence_type must be one of/,
  );
});

test("buildManifest + buildDcat shape", () => {
  const meta = buildMetadata({
    package: "@geoalgeria/sante",
    records: [rec()],
    sources: [{ key: "msp", name: "Ministry of Health", license: "official" }],
    license: "MIT",
    updated: "2026-07-18",
    titles: { en: "Health establishments" },
  });
  const manifest = buildManifest([meta], { generated: "2026-07-18" });
  assert.equal(manifest.schema_version, "2.0.0");
  assert.equal(manifest.datasets[0].package, "@geoalgeria/sante");
  assert.equal(manifest.datasets[0].title, "Health establishments");

  const dcat = buildDcat(meta);
  assert.equal(dcat["@type"], "Dataset");
  assert.equal(dcat.identifier, "@geoalgeria/sante");
  assert.equal(dcat.spatialCoverage.geo["@type"], "GeoShape");
});

test("emit: toCSV injection guard + toGeoJSON", () => {
  const csv = toCSV([{ a: "=cmd", b: 3 }], ["a", "b"]);
  assert.match(csv, /'=cmd/); // formula-injection prefix
  const fc = toGeoJSON([rec(), rec({ id: "x", lat: null, lng: null })]);
  assert.equal(fc.features.length, 1); // ungeocoded dropped
  assert.deepEqual(fc.features[0].geometry.coordinates, [3.06, 36.75]);
});

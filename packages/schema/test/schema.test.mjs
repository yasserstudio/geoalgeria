import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateRecords,
  validateMetadata,
  buildMetadata,
  buildManifest,
  buildDcat,
  evidenceForSourceKey,
  loadBoundaries,
  pointInWilaya,
  pointInGeometry,
  fractionDigits,
  coordDecimals,
  sharedPoints,
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
  lat: 36.7657,
  lng: 3.0587,
  geo_precision: "exact",
  geo_method: "osm_node",
  ...over,
});

// An ungeocoded record: no point, so neither a precision nor a method.
const ungeo = (over = {}) => rec({ lat: null, lng: null, geo_precision: null, geo_method: null, ...over });

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
  assert.deepEqual(bbox([rec(), rec({ lat: 35, lng: 1 })]), [1, 35, 3.0587, 36.7657]);
  assert.equal(bbox([rec({ lat: null, lng: null })]), null);
});

test("valid records pass", () => {
  const { errors, warnings } = validateRecords([rec(), rec({ id: "sante:16-00002", lat: 36.7658 })]);
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
  const { errors } = validateRecords([rec(), rec({ lat: 36.7658 })]);
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
  assert.match(validateRecords([rec({ lat: 3.0587, lng: 36.7657 })]).errors[0], /outside Algeria/); // swapped
  assert.match(validateRecords([rec({ lat: -36.7657 })]).errors[0], /outside Algeria/); // sign flip
  assert.equal(validateRecords([ungeo()]).errors.length, 0); // ungeocoded ok
  assert.equal(validateRecords([rec({ lat: 36.7657, lng: null })]).errors.length, 1); // half-set
});

test("geo_precision must be from the vocabulary", () => {
  assert.equal(validateRecords([rec({ geo_precision: "osm_node" })]).errors.length, 1);
  assert.equal(validateRecords([rec({ geo_precision: "approximate" })]).errors.length, 0);
});

test("fractionDigits / coordDecimals read a coordinate's resolution", () => {
  assert.equal(fractionDigits(35), 0);
  assert.equal(fractionDigits(36.7657), 4);
  assert.equal(fractionDigits(36.73849600000001), 14);
  assert.equal(fractionDigits(1e-7), 7); // exponential form has no literal ".", but is not whole
  assert.equal(fractionDigits(1.5e-7), 8);
  assert.equal(fractionDigits(NaN), 0);
  // a point is only as precise as its coarser axis
  assert.equal(coordDecimals(35.2, -0.641389), 1);
  assert.equal(coordDecimals(36.7657, 3.0587), 4);
});

test("sharedPoints finds the records that are not alone on their coordinate", () => {
  const rows = [rec(), rec({ id: "b" }), rec({ id: "c", lat: 36.7658 }), rec({ id: "d", lat: null, lng: null })];
  assert.deepEqual([...sharedPoints(rows)], [0, 1]); // ungeocoded rows are never members
  assert.equal(sharedPoints([rec()]).size, 0);
});

test("geo_precision 'exact' must survive the resolution and uniqueness tests", () => {
  // Resolution: (35, 4) locates nothing finer than ±55 km, so it cannot be a
  // per-facility point — this is the shape three BADR branches in three different
  // towns shipped under `exact`.
  const coarse = validateRecords([rec({ lat: 35, lng: 4 })]);
  assert.equal(coarse.errors.length, 1);
  assert.match(coarse.errors[0], /rounded to 0 decimal\(s\)/);
  assert.match(validateRecords([rec({ lat: 35.2, lng: -0.641389 })]).errors[0], /rounded to 1 decimal\(s\)/);
  assert.equal(validateRecords([rec({ lat: 36.765, lng: 3.058 })]).errors.length, 0); // 3 dp is the floor

  // …and `approximate` is exactly how a coarse point stays legal.
  assert.equal(validateRecords([rec({ lat: 35, lng: 4, geo_precision: "approximate" })]).errors.length, 0);

  // Uniqueness: one coordinate, two facilities → not a per-facility point, for either.
  const twins = validateRecords([rec(), rec({ id: "sante:16-00002" })]);
  assert.equal(twins.errors.length, 2);
  assert.match(twins.errors[0], /another record in this file also carries/);
  // the demoted record is legal; the one still claiming `exact` is not
  const mixed = validateRecords([rec(), rec({ id: "sante:16-00002", geo_precision: "approximate" })]);
  assert.equal(mixed.errors.length, 1);
  assert.match(mixed.errors[0], /sante:16-00001/);
});

test("geo_precision is null if and only if lat/lng are null", () => {
  // ungeocoded record asserting a precision for a point that does not exist
  const stamped = validateRecords([ungeo({ geo_precision: "approximate" })]);
  assert.equal(stamped.errors.length, 1);
  assert.match(stamped.errors[0], /geo_precision must be null when lat\/lng are null/);
  assert.equal(validateRecords([ungeo({ geo_precision: "exact" })]).errors.length, 1);

  // geocoded record with no precision — provenance thrown away
  const unstamped = validateRecords([rec({ geo_precision: null })]);
  assert.equal(unstamped.errors.length, 1);
  assert.match(unstamped.errors[0], /geo_precision must not be null on a geocoded record/);

  // both legal pairings
  assert.equal(validateRecords([ungeo()]).errors.length, 0);
  assert.equal(validateRecords([rec({ geo_precision: "exact" })]).errors.length, 0);

  // an absent geo_precision is still a vocabulary error, not an implicit null
  assert.match(validateRecords([rec({ geo_precision: undefined })]).errors[0], /must be one of/);
});

test("geo_method is null if and only if lat/lng are null", () => {
  // ungeocoded record naming a method for a point that does not exist — the exact
  // false provenance ("ungeocoded") that was writable and CI-green before this rule
  const claimed = validateRecords([ungeo({ geo_method: "ungeocoded" })]);
  assert.equal(claimed.errors.length, 1);
  assert.match(claimed.errors[0], /geo_method must be null when lat\/lng are null/);
  assert.equal(validateRecords([ungeo({ geo_method: "commune_centroid" })]).errors.length, 1);

  // geocoded record with no method — the point's provenance silently dropped
  const unstamped = validateRecords([rec({ geo_method: null })]);
  assert.equal(unstamped.errors.length, 1);
  assert.match(unstamped.errors[0], /geo_method must name how the point was obtained/);
  // absent and empty are the same claim as null, not an exemption
  assert.equal(validateRecords([rec({ geo_method: undefined })]).errors.length, 1);
  assert.equal(validateRecords([rec({ geo_method: "  " })]).errors.length, 1);

  // both legal pairings
  assert.equal(validateRecords([ungeo()]).errors.length, 0);
  assert.equal(validateRecords([rec({ geo_method: "wikidata_point" })]).errors.length, 0);
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
  const outOfWilaya = validateRecords([rec({ lat: 36.0001, lng: 10.0001 })], { boundaries });
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
  // pointInGeometry stays graceful, but loadBoundaries must NOT: an index built
  // from malformed features would check nothing and report clean. See below.
});

test("loadBoundaries throws instead of handing back an index that checks nothing", () => {
  // empty collection
  assert.throws(() => loadBoundaries({ features: [] }), /indexed 0 wilayas/);
  assert.throws(() => loadBoundaries({}), /indexed 0 wilayas/);

  // the exact false-green this guard exists for: dataset/geojson/wilayas.geojson is
  // 69 *Point* features, so every one is unusable and the old code returned an empty
  // Map that passed every record in the repo.
  assert.throws(
    () => loadBoundaries({ features: [{ properties: { code: 16 }, geometry: { type: "Point", coordinates: [3, 36] } }] }),
    /indexed 0 wilayas/,
  );

  // one bad feature among good ones — its wilaya would go unchecked, silently
  const ok = { properties: { code: 16 }, geometry: { type: "Polygon", coordinates: [[[2, 35], [4, 35], [4, 37], [2, 37], [2, 35]]] } };
  assert.throws(
    () => loadBoundaries({ features: [ok, { properties: { code: 31 }, geometry: { type: "Polygon", coordinates: null } }] }),
    /1 of 2 feature\(s\) are unusable/,
  );
  assert.throws(() => loadBoundaries({ features: [ok, { properties: {}, geometry: ok.geometry }] }), /no wilaya code/);

  // duplicate code — the second polygon would silently replace the first
  assert.throws(() => loadBoundaries({ features: [ok, ok] }), /duplicate wilaya code\(s\) 16/);

  // and a well-formed collection still works
  assert.equal(loadBoundaries({ features: [ok] }).size, 1);
});

test("validator fails safe on hostile input (returns errors, never throws)", () => {
  assert.doesNotThrow(() => validateRecords([null]));
  assert.match(validateRecords([null]).errors.join(), /not an object/);
  assert.doesNotThrow(() => validateRecords([42]));
  assert.match(validateRecords([42]).errors.join(), /not an object/);
  assert.doesNotThrow(() => validateMetadata(null));
  assert.match(validateMetadata(null).errors.join(), /not an object/);
});

test("coordinates present but non-numeric are rejected", () => {
  assert.match(validateRecords([rec({ lat: "36.75", lng: "3.06" })]).errors[0], /finite numbers/);
  assert.match(validateRecords([rec({ lat: 36.7657, lng: NaN })]).errors[0], /finite numbers/);
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
    ungeo({ id: "sante:31-00001", wilaya_code: "31", commune_code: "3101" }),
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
  assert.deepEqual(meta.bbox, [3.0587, 36.7657, 3.0587, 36.7657]);
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

test("evidenceForSourceKey maps keys to canonical evidence types", () => {
  assert.equal(evidenceForSourceKey("osm"), "crowdsourced");
  assert.equal(evidenceForSourceKey("wikidata"), "crowdsourced");
  assert.equal(evidenceForSourceKey("OpenStreetMap"), "crowdsourced");
  assert.equal(evidenceForSourceKey("derived"), "derived");
  assert.equal(evidenceForSourceKey("msp"), "official"); // named registry
  assert.equal(evidenceForSourceKey("mobilis"), "official"); // first-party operator
  assert.ok(EVIDENCE_TYPE.includes(evidenceForSourceKey("anything")));
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
  assert.equal(manifest.datasets[0].schema_version, "2.0.0");
  // no stated universe → no coverage claim at all, rather than a null percentage
  assert.equal("coverage" in manifest.datasets[0], false);
  // packages that predate the contract are listed, and say so
  assert.equal(buildManifest([{ ...meta, schema_version: undefined }]).datasets[0].schema_version, null);

  const dcat = buildDcat(meta);
  assert.equal(dcat["@type"], "Dataset");
  assert.equal(dcat.identifier, "@geoalgeria/sante");
  assert.equal(dcat.spatialCoverage.geo["@type"], "GeoShape");
  // the dataset's own licence, not the first source's — an open SPDX id resolves
  // to its canonical URL, and an open dataset carries no conditionsOfAccess prose.
  assert.equal(dcat.license, "https://opensource.org/licenses/MIT");
  assert.equal("conditionsOfAccess" in dcat, false);
  assert.deepEqual(dcat.citation, ["Ministry of Health — official"]);

  // A non-open prose licence is never fabricated into a URL: the `license` slot
  // is omitted and the prose moves to conditionsOfAccess.
  const prose = buildDcat({ ...meta, license: "Data © SOGRAL; redistributed for reference" });
  assert.equal("license" in prose, false);
  assert.equal(prose.conditionsOfAccess, "Data © SOGRAL; redistributed for reference");
  // A multi-licence open expression resolves to its governing (share-alike) URL.
  assert.equal(
    buildDcat({ ...meta, license: "CC0-1.0 AND ODbL-1.0" }).license,
    "https://opendatacommons.org/licenses/odbl/1-0/",
  );
  assert.equal("conditionsOfAccess" in buildDcat({ ...meta, license: "CC0-1.0 AND ODbL-1.0" }), false);
  // Fail-safe routing: an AND-expression that mixes open SPDX terms with an unknown
  // (prose) term is NOT all-open, so the whole expression is carried as prose — the
  // `license` slot is omitted rather than fabricating a URL from the open terms alone.
  const mixed = buildDcat({ ...meta, license: "ODbL-1.0 AND CC0-1.0 AND factual public listing (ASAL)" });
  assert.equal("license" in mixed, false);
  assert.equal(mixed.conditionsOfAccess, "ODbL-1.0 AND CC0-1.0 AND factual public listing (ASAL)");
  // A falsy licence yields neither slot — no URL, no prose.
  const empty = buildDcat({ ...meta, license: "" });
  assert.equal("license" in empty, false);
  assert.equal("conditionsOfAccess" in empty, false);
});

test("a coverage percentage never travels without the universe it divides by", () => {
  const meta = (over) =>
    buildMetadata({
      package: "@geoalgeria/buses",
      records: [rec()],
      sources: [],
      license: "CC-BY-SA-4.0",
      updated: "2026-07-18",
      titles: { en: "ETUSA urban bus lines (Algiers)" },
      estimatedUniverse: 122,
      ...over,
    });

  // The shipped shape: pct, the universe, and the sentence saying what it is.
  const ok = buildManifest([meta({ coverageNote: "50 of ETUSA's ~122 lines." })]).datasets[0];
  assert.deepEqual(ok.coverage, { pct: 0.8, of: 122, note: "50 of ETUSA's ~122 lines." });

  // A universe with no note is a build error — "Algeria urban bus lines: 41%"
  // is exactly the artifact this rule exists to stop.
  assert.throws(() => buildManifest([meta({})]), /without a coverage_note/);

  // …and the note reaches the discovery descriptor as its description, which is
  // the only text Google Dataset Search and answer engines actually read.
  assert.equal(buildDcat(meta({ coverageNote: "50 of ETUSA's ~122 lines." })).description, "50 of ETUSA's ~122 lines.");
});

test("emit: toCSV injection guard + toGeoJSON", () => {
  const csv = toCSV([{ a: "=cmd", b: 3 }], ["a", "b"]);
  assert.match(csv, /'=cmd/); // formula-injection prefix
  const fc = toGeoJSON([rec(), rec({ id: "x", lat: null, lng: null })]);
  assert.equal(fc.features.length, 1); // ungeocoded dropped
  assert.deepEqual(fc.features[0].geometry.coordinates, [3.0587, 36.7657]);
});

// The schema package declares the contract every other package is type-checked
// against, and nothing type-checks it. Four runtime exports — MIN_EXACT_DECIMALS,
// fractionDigits, coordDecimals, sharedPoints — shipped with no declaration at
// all, so a TypeScript consumer importing them got an error against a symbol that
// exists. This is the cheap half of that gap: names only, no signatures. Signature
// drift (buildManifest's opts, DatasetEntry's fields) still needs a real `tsc
// --noEmit`, which would be the repo's first TypeScript dependency.
test("types/index.d.ts declares every runtime export", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const here = dirname(fileURLToPath(import.meta.url));

  const runtime = Object.keys(await import("../index.js")).sort();
  const dts = readFileSync(join(here, "..", "types", "index.d.ts"), "utf-8");
  const declared = new Set(
    [...dts.matchAll(/^export\s+(?:declare\s+)?(?:function|const|let|var|class|type|interface|enum)\s+(\w+)/gm)].map(
      (m) => m[1],
    ),
  );
  assert.deepEqual(
    runtime.filter((name) => !declared.has(name)),
    [],
    "runtime exports missing from types/index.d.ts",
  );
});

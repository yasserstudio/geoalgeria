import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyReviewedOverrides, loadBoundaries, pointInWilaya } from "../packages/schema/index.js";
import { communeResolver } from "../scripts/lib/build-utils.mjs";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const ledger = read("../quality/overrides/telecom.json");
const mobilisRecords = read("../packages/telecom/data/5g-mobilis.json");
const djezzyRecords = read("../packages/telecom/data/5g-djezzy.json");
const metadata = read("../packages/telecom/data/metadata.json");
const sourceManifest = read("../sources/telecom/manifest.json");
const capture = read("../sources/telecom/mobilis-5g.json");
const boundaries = loadBoundaries(read("../packages/dataset/data/geojson/wilaya-boundaries.geojson"));

// Mobilis decisions come in exactly two shapes, and which one a row gets is the
// review decision itself: correct the wilaya when the operator's own commune and
// its point agree and only its wilaya label is wrong, and withhold the point when
// the operator's own commune and wilaya agree and only its point is wrong.
const mobilisDecisions = ledger.decisions.filter((item) => item.file === "5g-mobilis.json");
const WITHHOLD_PATCH = ["lat", "lng", "geo_precision", "geo_method"];
const isWithhold = (decision) => Object.keys(decision.patch).join() === WITHHOLD_PATCH.join();

test("reviewed Mobilis linkage preserves source coordinates and matches the named wilaya", () => {
  const linkage = mobilisDecisions.filter((decision) => !isWithhold(decision));
  assert.equal(linkage.length, 8);
  for (const decision of linkage) {
    const published = mobilisRecords.find((row) => row.id === decision.record_id);
    assert.deepEqual(Object.keys(decision.patch), ["wilaya_code"]);
    assert.equal(published.lat, decision.expect.lat);
    assert.equal(published.lng, decision.expect.lng);
    assert.equal(published.wilaya_code, decision.patch.wilaya_code);
    assert.ok(pointInWilaya(published.lng, published.lat, published.wilaya_code, boundaries));
    assert.equal(published.review_status, "corrected");
  }
});

test("reviewed Mobilis conflicts retain the coverage record but withhold false coordinates", () => {
  const withheld = mobilisDecisions.filter(isWithhold);
  assert.equal(withheld.length, 6);
  for (const decision of withheld) {
    const published = mobilisRecords.find((row) => row.id === decision.record_id);
    assert.ok(published);
    assert.deepEqual(Object.keys(decision.patch), WITHHOLD_PATCH);
    // The operator's own attribution is what survives; only the point is dropped.
    assert.equal(published.wilaya_code, decision.expect.wilaya_code);
    assert.equal(published.commune, decision.expect.commune);
    assert.equal(published.lat, null);
    assert.equal(published.lng, null);
    assert.equal(published.geo_precision, null);
    assert.equal(published.geo_method, null);
    assert.equal(published.review_status, "corrected");
  }
});

test("reviewed Djezzy conflicts retain the coverage record but withhold false coordinates", () => {
  const decisions = ledger.decisions.filter((item) => item.file === "5g-djezzy.json");
  assert.equal(decisions.length, 18);
  for (const decision of decisions) {
    const published = djezzyRecords.find((row) => row.id === decision.record_id);
    assert.ok(published);
    assert.deepEqual(
      Object.keys(decision.patch),
      ["lat", "lng", "geo_precision", "geo_method"],
    );
    assert.equal(published.wilaya_code, decision.expect.wilaya_code);
    assert.equal(published.name, decision.expect.name);
    assert.equal(published.lat, null);
    assert.equal(published.lng, null);
    assert.equal(published.geo_precision, null);
    assert.equal(published.geo_method, null);
    assert.equal(published.review_status, "corrected");
  }
});

test("review stops when a corrected site's upstream coordinate changes", () => {
  const decisions = ledger.decisions.filter((item) => item.file === "5g-mobilis.json");
  const upstream = mobilisRecords.map((row) => {
    const decision = decisions.find((item) => item.record_id === row.id);
    return decision ? { ...row, ...decision.expect } : row;
  });
  const changed = upstream.find((row) => row.id === decisions[0].record_id);
  changed.lat += 0.01;
  assert.throws(() => applyReviewedOverrides(upstream, ledger, { file: "5g-mobilis.json" }), /stale decision/);
});

test("telecom metadata preserves each cached source retrieval date", () => {
  for (const source of metadata.sources) {
    assert.equal(source.retrieved, sourceManifest[`${source.key}-5g`].retrieved);
  }
});

// The two withholding and correction decisions above say what was concluded. These
// re-derive WHY, from the committed capture and the unsimplified OpenStreetMap commune
// outlines, independently of the ledger's prose: a decision whose evidence stops holding
// fails here even while the ledger still describes it accurately.
const resolver = communeResolver();
const rawCoords = (row) => String(row.coordonnes).split(",").map(Number);

test("the withheld Ras El Ma points are a frozen longitude the commune outline refutes", () => {
  const withheld = ledger.decisions.filter(
    (item) => item.file === "5g-mobilis.json" && isWithhold(item),
  );
  assert.equal(withheld.length, 6);

  // Every withheld point carries the same longitude to the digit, while its latitude
  // varies: a column that stopped moving, not six surveyed sites.
  const longitudes = new Set(withheld.map((item) => item.expect.lng));
  assert.deepEqual([...longitudes], [-1.289]);
  assert.equal(new Set(withheld.map((item) => item.expect.lat)).size, 6);

  // The same capture's other rows for the same commune carry ordinary distinct
  // longitudes, which is what makes the frozen one an outlier rather than the operator's
  // precision for this commune.
  const captured = capture.filter((row) => row.commune === "RAS EL MA");
  const others = captured.filter((row) => rawCoords(row)[1] !== -1.289);
  assert.equal(captured.length, 10);
  assert.equal(others.length, 4);
  assert.equal(new Set(others.map((row) => rawCoords(row)[1])).size, 4);
  for (const row of others) {
    const lng = rawCoords(row)[1];
    assert.ok(lng > -0.84 && lng < -0.77, `sibling longitude ${lng} is outside the real cluster`);
  }

  // And the geometry, asked of the outlines rather than of the wilaya polygons: the
  // frozen point is not in the commune the operator names, and one of the ordinary ones
  // is. 2223 Ras El Ma is the commune both the operator's own label and the registry
  // agree on, which is why the record is kept and only its coordinate is dropped.
  for (const item of withheld) {
    assert.equal(resolver.insideOwnOutline(item.expect.lat, item.expect.lng, 2223), false);
    assert.deepEqual(
      resolver.containingCommunes(item.expect.lat, item.expect.lng).map((c) => c.code_commune),
      [1332],
      "the frozen point is inside El Aricha, which is why it failed the wilaya guard",
    );
  }
  const good = rawCoords(others[0]);
  assert.equal(resolver.insideOwnOutline(good[0], good[1], 2223), true);
});

test("the corrected Boudouaou point is inside the commune it names", () => {
  const decision = ledger.decisions.find((item) => item.record_id === "mobilis-8904ef2ed7");
  assert.equal(decision.expect.wilaya_code, "16");
  assert.equal(decision.patch.wilaya_code, "35");
  const published = mobilisRecords.find((row) => row.id === decision.record_id);

  // Commune 3502 Boudouaou's own outline contains the point, and the registry puts 3502
  // in wilaya 35: two independent claims against the operator's single "16".
  assert.equal(resolver.insideOwnOutline(published.lat, published.lng, 3502), true);
  assert.deepEqual(
    resolver.containingCommunes(published.lat, published.lng).map((c) => c.code_commune),
    [3502],
  );
  assert.equal(published.wilaya_code, "35");
  assert.ok(pointInWilaya(published.lng, published.lat, "35", boundaries));
  assert.ok(!pointInWilaya(published.lng, published.lat, "16", boundaries));

  // The operator is not consistent with itself: every other BOUDOUAOU row in the same
  // capture files the commune under 35.
  const siblings = capture.filter(
    (row) => row.commune === "BOUDOUAOU" && String(row.coordonnes) !== `${published.lat},${published.lng}`,
  );
  assert.equal(siblings.length, 8);
  assert.deepEqual([...new Set(siblings.map((row) => row.wilaya_id))], [35]);
});

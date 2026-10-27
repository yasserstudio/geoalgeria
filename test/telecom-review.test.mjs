import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyReviewedOverrides, loadBoundaries, pointInWilaya } from "../packages/schema/index.js";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const ledger = read("../quality/overrides/telecom.json");
const mobilisRecords = read("../packages/telecom/data/5g-mobilis.json");
const djezzyRecords = read("../packages/telecom/data/5g-djezzy.json");
const metadata = read("../packages/telecom/data/metadata.json");
const sourceManifest = read("../sources/telecom/manifest.json");
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

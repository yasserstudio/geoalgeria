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

test("reviewed Mobilis linkage preserves source coordinates and matches the named wilaya", () => {
  for (const decision of ledger.decisions.filter((item) => item.file === "5g-mobilis.json")) {
    const published = mobilisRecords.find((row) => row.id === decision.record_id);
    assert.deepEqual(Object.keys(decision.patch), ["wilaya_code"]);
    assert.equal(published.lat, decision.expect.lat);
    assert.equal(published.lng, decision.expect.lng);
    assert.equal(published.wilaya_code, decision.patch.wilaya_code);
    assert.ok(pointInWilaya(published.lng, published.lat, published.wilaya_code, boundaries));
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

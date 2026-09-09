import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyReviewedOverrides, loadBoundaries, pointInWilaya } from "../packages/schema/index.js";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
const ledger = read("../quality/overrides/telecom.json");
const records = read("../packages/telecom/data/5g-mobilis.json");
const boundaries = loadBoundaries(read("../packages/dataset/data/geojson/wilaya-boundaries.geojson"));

test("reviewed Mobilis linkage preserves source coordinates and matches the named wilaya", () => {
  for (const decision of ledger.decisions) {
    const published = records.find((row) => row.id === decision.record_id);
    assert.deepEqual(Object.keys(decision.patch), ["wilaya_code"]);
    assert.equal(published.lat, decision.expect.lat);
    assert.equal(published.lng, decision.expect.lng);
    assert.equal(published.wilaya_code, decision.patch.wilaya_code);
    assert.ok(pointInWilaya(published.lng, published.lat, published.wilaya_code, boundaries));
    assert.equal(published.review_status, "corrected");
  }
});

test("review stops when a corrected site's upstream coordinate changes", () => {
  const upstream = records.map((row) => {
    const decision = ledger.decisions.find((item) => item.record_id === row.id);
    return decision ? { ...row, ...decision.expect } : row;
  });
  const changed = upstream.find((row) => row.id === ledger.decisions[0].record_id);
  changed.lat += 0.01;
  assert.throws(() => applyReviewedOverrides(upstream, ledger, { file: "5g-mobilis.json" }), /stale decision/);
});

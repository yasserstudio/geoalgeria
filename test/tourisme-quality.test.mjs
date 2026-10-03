import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ROOT = new URL("../packages/tourisme/data/", import.meta.url);
const LAYERS = [
  ["lodging", "lodging.json"],
  ["attraction", "attractions.json"],
  ["historic", "historic.json"],
  ["thermal_spring", "thermal-springs.json"],
  ["park", "parks.json"],
];

const rows = LAYERS.flatMap(([layer, file]) =>
  JSON.parse(readFileSync(new URL(file, ROOT), "utf8")).map((row) => ({
    ...row,
    layer,
  })),
);

const present = (row, key) => row[key] != null && String(row[key]).trim() !== "";

describe("tourisme data quality floor", () => {
  it("does not regress bilingual naming coverage", () => {
    const bilingual = rows.filter((row) => present(row, "name_fr") && present(row, "name_ar"));
    // The current snapshot is 28.8%. A larger refresh may add records, so pin
    // the rate rather than the raw count; enrichment can only move it upward.
    assert.ok(
      bilingual.length / rows.length >= 0.288,
      `bilingual coverage fell to ${((bilingual.length / rows.length) * 100).toFixed(1)}%`,
    );
  });

  it("keeps geometry confidence explicit for every geocoded record", () => {
    const missing = rows.filter(
      (row) => !present(row, "geo_precision") || !present(row, "geo_method"),
    );
    assert.equal(missing.length, 0, `${missing.length} rows lack geometry confidence`);
    assert.ok(rows.some((row) => row.geo_precision === "approximate"));
  });

  it("does not lose the practical lodging details already sourced", () => {
    const lodging = rows.filter((row) => row.layer === "lodging");
    const floors = { address: 209, phone: 204, website: 84, stars: 60, rooms: 24 };
    for (const [field, minimum] of Object.entries(floors)) {
      const count = lodging.filter((row) => present(row, field)).length;
      assert.ok(count >= minimum, `${field}: ${count} fell below ${minimum}`);
    }
  });

  it("keeps cross-category OSM references bounded and visible", () => {
    const byRef = new Map();
    for (const row of rows) {
      const ref = row.refs?.osm;
      if (!ref) continue;
      const layers = byRef.get(String(ref)) ?? [];
      layers.push(row.layer);
      byRef.set(String(ref), layers);
    }
    const groups = [...byRef.values()].filter(
      (layers) => layers.length > 1 && new Set(layers).size > 1,
    );
    const extraRows = groups.reduce((sum, layers) => sum + layers.length - 1, 0);
    // Current baseline: 98 pairs. Dedupe/enrichment can reduce it; a refresh
    // cannot silently create a larger classification-row inflation.
    assert.ok(groups.length <= 98, `${groups.length} cross-category OSM groups`);
    assert.ok(extraRows <= 98, `${extraRows} extra cross-listed rows`);
  });
});

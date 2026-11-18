// Guards packages/dataset/data/geojson/wilaya-boundaries-detailed.geojson, the wilaya
// outline dissolved from the commune outlines. The simplified
// wilaya-boundaries.geojson is a separate, untouched file; this one must agree with it
// on territory and follow the communes in detail.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import polygonClipping from "polygon-clipping";
import { pointInGeometry } from "../packages/schema/src/geo.js";
import { build, serialise } from "../scripts/build-wilaya-boundaries-detailed.mjs";
import { bboxOf, km2At, multiArea, polygonsOf, ringArea, ringIsSimple } from "../scripts/lib/commune-boundaries.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const G = join(ROOT, "packages", "dataset", "data", "geojson");
const read = (p) => JSON.parse(readFileSync(p, "utf-8"));
const detailed = read(join(G, "wilaya-boundaries-detailed.geojson")).features;
const meta = read(join(G, "wilaya-boundaries-detailed.metadata.json"));
const simplified = new Map(read(join(G, "wilaya-boundaries.geojson")).features.map((f) => [f.properties.code, f.geometry]));
const communes = read(join(G, "commune-boundaries.geojson")).features;
const records = read(join(ROOT, "packages", "dataset", "data", "algeria.json")).flatMap((w) => w.communes);

/** Worst measured pair overlap between two wilayas, from independently simplified commune borders. */
const MAX_PAIR_OVERLAP_KM2 = 5;
/** Territory must agree with the simplified wilaya outline; Algiers is the loosest at 1.5%. */
const MAX_AREA_DIFF = 0.02;

test("69 wilayas, codes 1 to 69, each carrying only its code", () => {
  assert.equal(detailed.length, 69);
  assert.deepEqual(detailed.map((f) => f.properties), Array.from({ length: 69 }, (_, i) => ({ code: i + 1 })));
  assert.equal(meta.feature_count, 69);
});

test("every geometry is valid: closed, simple, counter-clockwise exterior, 4 decimals", () => {
  for (const f of detailed) {
    for (const poly of polygonsOf(f.geometry)) {
      poly.forEach((ring, i) => {
        assert.ok(ring.length >= 4);
        assert.deepEqual(ring[0], ring[ring.length - 1]);
        assert.equal(ringArea(ring) > 0, i === 0, `wilaya ${f.properties.code} winding`);
        assert.ok(ringIsSimple(ring), `wilaya ${f.properties.code} ring ${i} is not simple`);
        for (const [x, y] of ring) assert.ok(Math.abs(x * 1e4 - Math.round(x * 1e4)) < 1e-6 && Math.abs(y * 1e4 - Math.round(y * 1e4)) < 1e-6);
      });
    }
  }
});

test("each wilaya is the union of its own communes: nothing outside, nothing missing", () => {
  for (const f of detailed) {
    const code = f.properties.code;
    const mine = communes.filter((c) => c.properties.wilaya_code === code).flatMap((c) => polygonsOf(c.geometry));
    const area = multiArea(polygonsOf(f.geometry));
    const outside = multiArea(polygonClipping.difference(mine, polygonsOf(f.geometry)));
    const uncovered = multiArea(polygonClipping.difference(polygonsOf(f.geometry), mine));
    assert.ok(outside / area < 1e-4, `wilaya ${code}: communes stick out by ${outside / area}`);
    // only closed slivers and small holes are allowed to be filled
    assert.ok(uncovered / area < 0.005, `wilaya ${code}: ${uncovered / area} of it is not a commune`);
  }
});

test("territory agrees with the simplified wilaya outline", () => {
  for (const f of detailed) {
    const a = multiArea(polygonsOf(f.geometry));
    const b = multiArea(polygonsOf(simplified.get(f.properties.code)));
    assert.ok(Math.abs(a / b - 1) <= MAX_AREA_DIFF, `wilaya ${f.properties.code}: ${a / b}`);
  }
});

test("wilayas overlap only by the slivers left along shared commune borders", () => {
  const boxes = detailed.map((f) => bboxOf(polygonsOf(f.geometry)));
  for (let i = 0; i < detailed.length; i++) {
    for (let j = i + 1; j < detailed.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a[0] > b[2] || b[0] > a[2] || a[1] > b[3] || b[1] > a[3]) continue;
      const km2 = km2At(multiArea(polygonClipping.intersection(polygonsOf(detailed[i].geometry), polygonsOf(detailed[j].geometry))), (a[1] + a[3]) / 2);
      assert.ok(km2 <= MAX_PAIR_OVERLAP_KM2, `wilayas ${detailed[i].properties.code} / ${detailed[j].properties.code} overlap ${km2} km2`);
    }
  }
});

test("every commune point lies in its own wilaya's detailed outline, bar the measured few", () => {
  const by = new Map(detailed.map((f) => [f.properties.code, f.geometry]));
  const outside = records.filter((r) => !pointInGeometry(r.longitude, r.latitude, by.get(r.wilaya_code))).map((r) => r.code_commune);
  assert.deepEqual(outside, EXPECTED_POINTS_OUTSIDE);
});

const EXPECTED_POINTS_OUTSIDE = [];

test("the committed file and sidecar are exactly what the builder produces", () => {
  const out = serialise(build());
  assert.equal(readFileSync(join(G, "wilaya-boundaries-detailed.geojson"), "utf-8"), out.geo);
  assert.equal(readFileSync(join(G, "wilaya-boundaries-detailed.metadata.json"), "utf-8"), out.meta);
});

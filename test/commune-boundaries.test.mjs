// Guards packages/dataset/data/geojson/commune-boundaries.geojson.
//
// Identity and location belong to the commune records: nothing here may change a
// record or a point, and every rule that attaches a polygon to a code is
// re-checked against the records instead of trusted. Geometry checks may reject or
// rebuild a POLYGON, never a commune. The rules are in
// scripts/build-commune-boundaries.mjs (Rules A to D).
//
// The bounds below are measured, not chosen: each says what the committed file
// does today, so a regression fails and an improvement can tighten it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import polygonClipping from "polygon-clipping";
import { pointInGeometry } from "../packages/schema/src/geo.js";
import { build, serialise, shapeIoU, MIN_WILAYA_SHARE, MIN_GAP_IOU } from "../scripts/build-commune-boundaries.mjs";
import {
  bboxOf,
  foldName,
  km2At,
  multiArea,
  polygonsOf,
  ringArea,
  ringIsSimple,
  shareInside,
} from "../scripts/lib/commune-boundaries.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "packages", "dataset", "data");
/** The national file cut by wilaya_code (ADR 0004). */
const PER_WILAYA = join(DATA, "geojson", "commune-boundaries");
const read = (p) => JSON.parse(readFileSync(p, "utf-8"));

const published = read(join(DATA, "geojson", "commune-boundaries.geojson"));
const meta = read(join(DATA, "geojson", "commune-boundaries.metadata.json"));
const records = read(join(DATA, "algeria.json")).flatMap((w) => w.communes);
const points = read(join(DATA, "geojson", "communes.geojson"));
const wilayas = new Map(
  read(join(DATA, "geojson", "wilaya-boundaries.geojson")).features.map((f) => [f.properties.code, f.geometry]),
);
const exceptions = read(join(ROOT, "research", "_commune-centres", "containment-exceptions.json"));
const fillsDoc = read(join(ROOT, "research", "_commune-centres", "commune-boundary-fills.json"));
const features = published.features;
const byCode = new Map(features.map((f) => [f.properties.code_commune, f]));
const exceptionCodes = new Set(exceptions.exceptions.map((e) => e.code_commune));
const missingCodes = new Set(meta.missing_codes.map((m) => m.code_commune));
const derivedCodes = new Set(meta.derived_outlines.map((d) => d.code_commune));
/** Communes whose point may lie outside their own outline: the 16 named exceptions,
 *  plus a derived outline whose sidecar entry says its point is outside. */
const outsideAllowed = new Set([
  ...exceptionCodes,
  ...meta.derived_outlines.filter((d) => !d.point_inside_outline).map((d) => d.code_commune),
]);

/** Measured overlap between two communes that independent simplification leaves
 *  along a shared border. The worst pair is 1.03 km2 (Reggane / Bordj Badji Mokhtar). */
const MAX_PAIR_OVERLAP_KM2 = 1.1;
const MAX_TOTAL_OVERLAP_KM2 = 65;
/** Share of a commune inside its declared wilaya polygon. The wilaya outlines are
 *  3-decimal, 2% simplified, so border and coast communes lose a little; Algiers
 *  (16) is the worst because its wilaya outline is coarse on the coast. */
const WILAYA_SHARE_FLOOR = 0.8;
const MAX_BELOW_98 = 136;
const MAX_BELOW_95 = 7;

// ---------------------------------------------------------------------------
// Identity: codes, properties, completeness. All read-only against the records.
// ---------------------------------------------------------------------------

test("every feature is a commune record, with that record's properties and nothing else", () => {
  const recs = new Map(records.map((r) => [r.code_commune, r]));
  const seen = new Set();
  for (const f of features) {
    const code = f.properties.code_commune;
    assert.ok(Number.isInteger(code), `code_commune is an integer: ${code}`);
    assert.ok(!seen.has(code), `code_commune ${code} appears twice`);
    seen.add(code);
    const r = recs.get(code);
    assert.ok(r, `code_commune ${code} is not a commune record`);
    assert.deepEqual(
      f.properties,
      {
        name_fr: r.name_fr,
        name_ar: r.name_ar,
        wilaya_code: r.wilaya_code,
        wilaya_code_58: r.wilaya_code_58,
        wilaya_code_48: r.wilaya_code_48,
        postal_code: r.postal_code,
        daira: r.daira,
        code_commune: code,
      },
      `properties of ${code} differ from its record`,
    );
  }
});

test("features and missing_codes account for all 1,541 communes, in both directions", () => {
  const all = new Set(records.map((r) => r.code_commune));
  assert.equal(all.size, 1541);
  for (const c of all) assert.ok(byCode.has(c) !== missingCodes.has(c), `${c} must be published xor missing`);
  for (const c of [...byCode.keys(), ...missingCodes]) assert.ok(all.has(c), `${c} is not a commune record`);
  assert.equal(features.length, meta.feature_count);
  for (const m of meta.missing_codes) assert.ok(m.reason, `missing ${m.code_commune} states why`);
});

test("features are sorted by wilaya_code then code_commune", () => {
  const key = (f) => f.properties.wilaya_code * 1e6 + f.properties.code_commune;
  for (let i = 1; i < features.length; i++) assert.ok(key(features[i - 1]) < key(features[i]));
});

test("no commune point or record was touched: the points file still equals the records", () => {
  assert.equal(points.features.length, 1541);
  const rec = new Map(records.map((r) => [`${r.wilaya_code}|${r.name_fr}`, r]));
  for (const p of points.features) {
    const r = rec.get(`${p.properties.wilaya_code}|${p.properties.name_fr}`);
    assert.ok(r, `${p.properties.name_fr} has no record`);
    assert.deepEqual(p.geometry.coordinates, [r.longitude, r.latitude]);
  }
});

// ---------------------------------------------------------------------------
// Provenance: each polygon came in through a rule, and the rule is re-checked.
// ---------------------------------------------------------------------------

test("Rule C: the 16 containment exceptions keep their point and ship only if corroborated", () => {
  assert.equal(exceptionCodes.size, 16);
  assert.deepEqual(
    fillsDoc.rule_c.map((r) => r.code_commune).sort((a, b) => a - b),
    [...exceptionCodes].sort((a, b) => a - b),
  );
  for (const r of fillsDoc.rule_c) {
    assert.equal(r.verdict, "corroborated", `${r.name_fr} is not corroborated`);
    assert.ok(r.bbox_iou >= 0.8);
    assert.ok(byCode.has(r.code_commune), `${r.name_fr} should ship`);
  }
});

test("Rule B: each supplied-file polygon still passes every clause that needs no download", () => {
  const attached = fillsDoc.rule_b.filter((r) => r.verdict === "attached");
  assert.deepEqual(
    attached.map((r) => r.code_commune).sort((a, b) => a - b),
    fillsDoc.fills.map((f) => f.code_commune).sort((a, b) => a - b),
  );
  for (const r of fillsDoc.rule_b) {
    if (r.verdict === "withheld") {
      // withheld by Rule B: either listed as missing, or shipped only through Rule E
      assert.ok(byCode.has(r.code_commune) === derivedCodes.has(r.code_commune), `${r.name_fr} ships outside Rule E`);
      assert.ok(missingCodes.has(r.code_commune) !== byCode.has(r.code_commune), `${r.name_fr} is neither shipped nor listed`);
    }
  }
  for (const r of attached) {
    assert.ok(Object.values(r.clauses).every(Boolean) && Object.keys(r.clauses).length === 5);
    const f = byCode.get(r.code_commune);
    const rec = records.find((x) => x.code_commune === r.code_commune);
    assert.equal(foldName(r.supplied_shapeName), foldName(rec.name_fr), "name must not contradict");
    // exactly this commune's point, and no other commune's, lies in the polygon
    const inside = records.filter((x) => pointInGeometry(x.longitude, x.latitude, f.geometry));
    assert.deepEqual(inside.map((x) => x.code_commune), [r.code_commune]);
    const share = shareInside(polygonsOf(f.geometry), polygonsOf(wilayas.get(rec.wilaya_code)));
    assert.ok(share >= MIN_WILAYA_SHARE, `${r.name_fr}: ${share} of it is inside wilaya ${rec.wilaya_code}`);
  }
});

test("Rule E: a derived outline is the gap its neighbours leave and an independent polygon agrees", () => {
  assert.deepEqual([...derivedCodes], fillsDoc.rule_e.filter((r) => r.verdict === "corroborated").map((r) => r.code_commune));
  for (const d of meta.derived_outlines) {
    const f = byCode.get(d.code_commune);
    const e = fillsDoc.rule_e.find((r) => r.code_commune === d.code_commune);
    assert.equal(e.verdict, "corroborated");
    // it is alone in its wilaya without an outline, so the rest of the wilaya's communes tile around it
    assert.equal(meta.missing_codes.filter((m) => m.wilaya_code === d.wilaya_code).length, 0);
    const iou = shapeIoU(polygonsOf(f.geometry), e.reference);
    assert.ok(iou >= MIN_GAP_IOU, `${d.name_fr}: shape IoU ${iou} with the independent polygon`);
    assert.equal(Number(iou.toFixed(3)), d.shape_iou_with_geoboundaries);
    assert.equal(
      d.point_inside_outline,
      pointInGeometry(records.find((r) => r.code_commune === d.code_commune).longitude, records.find((r) => r.code_commune === d.code_commune).latitude, f.geometry),
      "the sidecar must say truthfully whether the point is inside",
    );
  }
});

test("origin counts in the metadata match the build", () => {
  const b = build();
  assert.deepEqual(meta.origin.counts, b.origin);
  assert.equal(b.origin.A + b.origin.B + b.origin.C + b.origin.E, features.length);
});

test("the committed file and sidecar are exactly what the builder produces", () => {
  const out = serialise(build());
  assert.equal(readFileSync(join(DATA, "geojson", "commune-boundaries.geojson"), "utf-8"), out.geo);
  assert.equal(readFileSync(join(DATA, "geojson", "commune-boundaries.metadata.json"), "utf-8"), out.meta);
  for (const [name, body] of out.perWilaya) {
    assert.equal(readFileSync(join(PER_WILAYA, name), "utf-8"), body, `commune-boundaries/${name}`);
  }
});

// ---------------------------------------------------------------------------
// Geometry and topology.
// ---------------------------------------------------------------------------

test("every geometry is a valid Polygon or MultiPolygon in WGS84 range, 4 decimals, exterior counter-clockwise", () => {
  for (const f of features) {
    const code = f.properties.code_commune;
    assert.ok(["Polygon", "MultiPolygon"].includes(f.geometry.type), `${code} type`);
    for (const poly of polygonsOf(f.geometry)) {
      poly.forEach((ring, i) => {
        assert.ok(ring.length >= 4, `${code} ring too short`);
        assert.deepEqual(ring[0], ring[ring.length - 1], `${code} ring not closed`);
        assert.ok(Math.abs(ringArea(ring)) > 0, `${code} zero-area ring`);
        assert.equal(ringArea(ring) > 0, i === 0, `${code} ring ${i} winding`);
        for (const [x, y] of ring) {
          assert.ok(x > -8.7 && x < 12.1 && y > 18.9 && y < 37.2, `${code} out of range`);
          assert.ok(Math.abs(x * 1e4 - Math.round(x * 1e4)) < 1e-6 && Math.abs(y * 1e4 - Math.round(y * 1e4)) < 1e-6);
        }
        assert.ok(ringIsSimple(ring), `${code} ring ${i} is not simple`);
      });
    }
  }
});

test("the simplicity check does bite: a bowtie and a spike fail", () => {
  assert.equal(ringIsSimple([[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]]), false);
  assert.equal(ringIsSimple([[0, 0], [2, 0], [1, 0], [1, 2], [0, 0]]), false);
  assert.equal(ringIsSimple([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]), true);
});

// ---------------------------------------------------------------------------
// Location: points are read, never moved.
// ---------------------------------------------------------------------------

test("every published polygon holds its own commune's point, except the 16 named exceptions and any derived outline the sidecar flags", () => {
  const outside = new Set();
  for (const r of records) {
    const f = byCode.get(r.code_commune);
    if (f && !pointInGeometry(r.longitude, r.latitude, f.geometry)) outside.add(r.code_commune);
  }
  assert.deepEqual([...outside].sort((a, b) => a - b), [...outsideAllowed].sort((a, b) => a - b));
});

test("no polygon holds the points of two different wilayas, and none holds a foreign commune's point outside the exceptions", () => {
  const boxes = features.map((f) => bboxOf(polygonsOf(f.geometry)));
  features.forEach((f, i) => {
    const b = boxes[i];
    const held = records.filter(
      (r) => r.longitude >= b[0] && r.longitude <= b[2] && r.latitude >= b[1] && r.latitude <= b[3] &&
        pointInGeometry(r.longitude, r.latitude, f.geometry),
    );
    assert.equal(new Set(held.map((r) => r.wilaya_code)).size <= 1, true, `${f.properties.code_commune} spans wilayas`);
    for (const r of held) {
      if (r.code_commune === f.properties.code_commune) continue;
      // a foreign point in this polygon is allowed only for an exception commune, a flagged derived outline or a commune with no polygon
      assert.ok(outsideAllowed.has(r.code_commune) || missingCodes.has(r.code_commune), `${r.code_commune}'s point lies in ${f.properties.code_commune}`);
    }
  });
});

test("each commune lies in its declared wilaya (measured floor, with ratchets)", () => {
  const shares = features.map((f) => ({
    code: f.properties.code_commune,
    share: shareInside(polygonsOf(f.geometry), polygonsOf(wilayas.get(f.properties.wilaya_code))),
  }));
  const worst = Math.min(...shares.map((s) => s.share));
  assert.ok(worst >= WILAYA_SHARE_FLOOR, `worst share ${worst}`);
  assert.ok(shares.filter((s) => s.share < 0.98).length <= MAX_BELOW_98);
  assert.ok(shares.filter((s) => s.share < 0.95).length <= MAX_BELOW_95);
});

test("communes overlap only by the slivers independent simplification leaves", () => {
  const polys = features.map((f) => polygonsOf(f.geometry));
  const boxes = polys.map(bboxOf);
  let total = 0;
  let worst = 0;
  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a[0] > b[2] || b[0] > a[2] || a[1] > b[3] || b[1] > a[3]) continue;
      const km2 = km2At(multiArea(polygonClipping.intersection(polys[i], polys[j])), (a[1] + a[3]) / 2);
      total += km2;
      worst = Math.max(worst, km2);
      assert.ok(km2 <= MAX_PAIR_OVERLAP_KM2, `${features[i].properties.code_commune} / ${features[j].properties.code_commune} overlap ${km2} km2`);
    }
  }
  assert.ok(total <= MAX_TOTAL_OVERLAP_KM2, `total overlap ${total} km2`);
});

test("each wilaya's communes tile it: the union is within 1% of the wilaya (2% for Algiers, 6% where a commune is missing)", () => {
  const holes = new Set(meta.missing_codes.map((m) => m.wilaya_code));
  for (const [code, geom] of wilayas) {
    const mine = features.filter((f) => f.properties.wilaya_code === code).flatMap((f) => polygonsOf(f.geometry));
    const union = polygonClipping.union(mine[0], ...mine.slice(1));
    const ratio = multiArea(union) / multiArea(polygonsOf(geom));
    // Algiers (16) leaves 1.5% on its coast, where the 3-decimal wilaya outline is coarse.
    const allowed = holes.has(code) ? 0.06 : code === 16 ? 0.02 : 0.01;
    assert.ok(Math.abs(1 - ratio) <= allowed, `wilaya ${code}: communes cover ${ratio} of it`);
  }
});

test("the bbox in the sidecar is the file's bbox", () => {
  const b = bboxOf(features.flatMap((f) => polygonsOf(f.geometry)));
  assert.deepEqual(meta.bbox, b.map((v) => Number(v.toFixed(3))));
});

// ---------------------------------------------------------------------------
// Per-wilaya files (ADR 0004): the national file cut by wilaya_code.
// ---------------------------------------------------------------------------

test("the per-wilaya folder holds exactly 1.geojson to 69.geojson", () => {
  const expected = Array.from({ length: 69 }, (_, i) => `${i + 1}.geojson`).sort();
  assert.deepEqual(readdirSync(PER_WILAYA).filter((name) => !name.startsWith(".")).sort(), expected);
});

test("the per-wilaya files hold every national feature exactly once, unchanged, in national order, each in its own wilaya", () => {
  const joined = [];
  for (let code = 1; code <= 69; code++) {
    const doc = read(join(PER_WILAYA, `${code}.geojson`));
    assert.equal(doc.type, "FeatureCollection");
    assert.ok(doc.features.length > 0, `wilaya ${code} has no commune outline`);
    for (const f of doc.features) assert.equal(f.properties.wilaya_code, code, `commune ${f.properties.code_commune} in ${code}.geojson`);
    joined.push(...doc.features);
  }
  assert.deepEqual(joined.map((f) => JSON.stringify(f)), features.map((f) => JSON.stringify(f)));
});

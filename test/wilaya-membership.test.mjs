// The wilaya polygons must agree with the wilaya each commune declares.
//
// Private tracker #171. Three communes' territory sat in the wrong wilaya polygon
// because OpenStreetMap never re-cut the admin_level=4 relations after the 2019
// reform: Touggourt (55) was carved out of Ouargla (30) and El Meniaa (58) out of
// Ghardaia (47), the new relations were added, the parents were never shrunk to
// match, and the outlines this repository ships are derived from them. El Alia
// (5513) and El-Hadjira (5507) are communes of 55 whose OSM relations are still
// tagged with Ouargla-era ONS codes (3020, 3014), and 9,049 km2 of them was drawn
// as Ouargla; Mansoura (4713) is a commune of 47 and was drawn as El Meniaa.
//
// Membership is not an OSM question. The commune list of the ten wilayas the 2019
// reform created is re-stated by law 26-06 (JORA n° 25, 5 April 2026) and decree
// 26-206 (JORA n° 40, 3 June 2026) fixes the names and chef-lieux; the ONS code
// geographique 2021 in sources/dataset/ons-code-geo-2021.json reads wilaya 55 for
// both 5513 and 5507 and 47 for 4713, and so does every commune table here. So
// the polygons follow the communes, which is what these tests check.
//
// Two rules, because the interesting failure is not the same as the obvious one:
//
//   1. Every commune centre is inside the polygon of the wilaya it declares, or
//      within the tolerance test/commune-in-boundary.test.mjs sets for these
//      display-grade outlines. That file owns the sweep; this one pins the three
//      reported cases by name so a regression names them.
//   2. Each corrected polygon still covers the same area as the union of its own
//      member communes' OSM outlines. That is the rebuild the transfer stands in
//      for, and it is the rule that would have caught the defect in the first
//      place: wilaya 55 was drawn at 9,775 km2 against 18,843 km2 of member
//      communes, a 48% shortfall no coordinate check could see.
//
// Rule 2 reads research/_wilaya-boundaries/commune-outlines-2026-09-29.json
// (OSM admin_level=8, ODbL 1.0, timestamp_osm_base 2026-09-29T13:04:54Z), the
// same cache scripts/fix-wilaya-membership.mjs transferred from.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import polygonClipping from "polygon-clipping";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (...p) => JSON.parse(readFileSync(join(ROOT, ...p), "utf-8"));

const fc = readJson("packages", "dataset", "data", "geojson", "wilaya-boundaries.geojson");
const outlines = readJson("research", "_wilaya-boundaries", "commune-outlines-2026-09-29.json");
const communes = [
  ...readJson("packages", "dataset", "data", "communes_w1_w23.json"),
  ...readJson("packages", "dataset", "data", "communes_w24_w48.json"),
  ...readJson("packages", "dataset", "data", "communes_w49_w69.json"),
];

const asMulti = (g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates);
const geometryOf = (code) => {
  const f = fc.features.find((x) => Number(x.properties.code) === code);
  assert.ok(f, `wilaya ${code} is missing from wilaya-boundaries.geojson`);
  return f.geometry;
};

function inRing(p, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const inPolygon = (p, poly) => inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h));
const inGeometry = (p, geom) => asMulti(geom).some((poly) => inPolygon(p, poly));

/** Spherical-excess ring area in km2. */
const R_KM = 6371.0088;
function ringArea(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j];
    const [x2, y2] = ring[i];
    s += (((x2 - x1) * Math.PI) / 180) * (2 + Math.sin((y1 * Math.PI) / 180) + Math.sin((y2 * Math.PI) / 180));
  }
  return Math.abs((s * R_KM * R_KM) / 2);
}
const multiArea = (multi) =>
  multi.reduce((a, poly) => a + ringArea(poly[0]) - poly.slice(1).reduce((b, h) => b + ringArea(h), 0), 0);

/** The three reported communes: centre, the wilaya it declares, and the wilaya
 *  whose polygon used to hold it. */
const REPORTED = [
  { code: 5513, name: "El Alia", declared: 55, wasIn: 30 },
  { code: 5507, name: "El-Hadjira", declared: 55, wasIn: 30 },
  { code: 4713, name: "Mansoura", declared: 47, wasIn: 58 },
];

for (const r of REPORTED) {
  test(`${r.name} (${r.code}) is inside w${r.declared} and out of w${r.wasIn}`, () => {
    const row = communes.find((c) => c.code_commune === r.code);
    assert.ok(row, `commune ${r.code} is missing from the commune table`);
    assert.equal(row.wilaya_code, r.declared, `commune ${r.code} no longer declares w${r.declared}`);
    const p = [row.longitude, row.latitude];
    assert.equal(inGeometry(p, geometryOf(r.declared)), true, `${r.name} is outside w${r.declared}`);
    assert.equal(inGeometry(p, geometryOf(r.wasIn)), false, `${r.name} is still inside w${r.wasIn}`);
  });
}

// A corrected polygon is allowed to differ from the union of its members by this
// much. The two are not the same geometry and cannot be: the wilaya outlines are
// simplified to a median vertex gap of 3.4 km, the commune outlines to 55 m, and
// the transfer simplified the moved part to 550 m before cutting. 2% of the
// wilaya's own area absorbs that; the defect this rule exists to catch was 48%.
const AREA_TOLERANCE_PCT = 2;

// Ghardaia (47) is checked against nine of its ten communes: Dhayet Bendhahoua
// (4703) has no admin_level=8 relation in the 2026-09-29 pull, so its outline is
// null and the union is short by one commune rather than wrong. A 2% band cannot
// hold for a union missing a whole commune, so 47 is excluded from the equality
// rule and gets a one-sided rule instead: it must be at least as large as the
// nine, which is the direction the correction moved it.
const PARTIAL_UNION = new Set([47]);

/** Union of a wilaya's member communes' OSM outlines, in km2, plus what is missing. */
function memberUnion(wilaya) {
  const members = outlines.communes.filter((c) => c.wilaya_code === wilaya);
  assert.ok(members.length, `no member outlines recorded for w${wilaya}`);
  const declared = communes.filter((c) => Number(c.wilaya_code) === wilaya).map((c) => c.code_commune);
  assert.deepEqual(
    members.map((m) => m.code_commune).sort((a, b) => a - b),
    declared.sort((a, b) => a - b),
    `the recorded outlines for w${wilaya} are not its declared communes`,
  );
  let union = null;
  const missing = [];
  for (const m of members) {
    if (!m.outline) {
      missing.push(`${m.name_fr} (${m.code_commune})`);
      continue;
    }
    let commune = m.outline.outer.map((ring) => [ring]);
    if (m.outline.inner.length) {
      commune = polygonClipping.difference(commune, m.outline.inner.map((ring) => [ring]));
    }
    union = union ? polygonClipping.union(union, commune) : commune;
  }
  return { km2: multiArea(union), missing };
}

for (const wilaya of outlines.wilayas) {
  test(`w${wilaya} covers the union of its own member communes`, () => {
    const { km2, missing } = memberUnion(wilaya);
    const shipped = multiArea(asMulti(geometryOf(wilaya)));
    const off = (100 * (shipped - km2)) / km2;
    if (PARTIAL_UNION.has(wilaya)) {
      assert.ok(missing.length, `w${wilaya} is listed as a partial union but every member has an outline`);
      assert.ok(
        shipped >= km2,
        `w${wilaya} is ${Math.round(shipped)} km2, smaller than the ${Math.round(km2)} km2 of the ` +
          `${missing.length} fewer communes it could be measured against (missing ${missing.join(", ")})`,
      );
      return;
    }
    assert.deepEqual(missing, [], `w${wilaya}: a member commune lost its outline, so the union is not comparable`);
    assert.ok(
      Math.abs(off) <= AREA_TOLERANCE_PCT,
      `w${wilaya} is ${Math.round(shipped)} km2 against ${Math.round(km2)} km2 of member communes, ` +
        `${off.toFixed(1)}% off, over the ${AREA_TOLERANCE_PCT}% the two simplifications explain`,
    );
  });
}

test("the transfer neither created nor lost territory", () => {
  // to' ∪ from' must still be to ∪ from and to' ∩ from' must be empty, which is
  // the property that makes the transfer safe for the 65 polygons it does not
  // touch: nothing is taken from or given to a third wilaya.
  const PAIRS = [
    [30, 55, 154271],
    [47, 58, 84571],
  ];
  for (const [a, b, beforeKm2] of PAIRS) {
    const ga = asMulti(geometryOf(a));
    const gb = asMulti(geometryOf(b));
    const sum = multiArea(ga) + multiArea(gb);
    assert.ok(
      Math.abs(sum - beforeKm2) <= 5,
      `w${a} + w${b} is now ${Math.round(sum)} km2, not the ${beforeKm2} km2 the pair covered before the transfer`,
    );
    const overlap = polygonClipping.intersection(ga, gb);
    const overlapKm2 = overlap.length ? multiArea(overlap) : 0;
    assert.ok(overlapKm2 <= 1, `w${a} and w${b} overlap by ${overlapKm2.toFixed(2)} km2`);
    const union = polygonClipping.union(ga, gb);
    assert.ok(
      Math.abs(multiArea(union) - sum) <= 1,
      `w${a} and w${b} leave a gap: union ${Math.round(multiArea(union))} km2 against sum ${Math.round(sum)} km2`,
    );
  }
});

test("the correction is committed, not just reproducible", () => {
  // Same acceptance check scripts/fix-wilaya-membership.mjs --check runs, so the
  // suite fails on a file that was regenerated from OSM and lost the correction.
  assert.equal(outlines.timestamp_osm_base, "2026-09-29T13:04:54Z");
  assert.equal(outlines.licence, "ODbL 1.0, (c) OpenStreetMap contributors");
  const meta = readJson("packages", "dataset", "data", "geojson", "wilaya-boundaries.metadata.json");
  assert.ok(
    meta.provenance_notes.some((n) => n.includes("fix-wilaya-membership.mjs")),
    "wilaya-boundaries.metadata.json must record the membership correction as a departure from upstream OSM",
  );
});

test("wilaya 55 has five dairas and El Alia is in El Hadjira", () => {
  // The linkage half of #171. El Alia was filed under a daira named after the
  // wilaya 55 was carved out of, and it was the only commune holding that name.
  const elAlia = communes.find((c) => c.code_commune === 5513);
  assert.equal(elAlia.daira, "El Hadjira");
  const dairas = readJson("packages", "dataset", "data", "dairas.json").filter((d) => d.wilaya_code === 55);
  assert.deepEqual(
    dairas.map((d) => d.name_fr).sort(),
    ["El Hadjira", "Megarine", "Taibet", "Tamacine", "Touggourt"],
    "wilaya 55's dairas",
  );
  for (const d of dairas) {
    assert.equal(
      d.commune_count,
      communes.filter((c) => Number(c.wilaya_code) === 55 && c.daira === d.name_fr).length,
      `daira ${d.name_fr}: commune_count does not match the commune table`,
    );
  }
  const wilayas = readJson("packages", "dataset", "data", "wilayas.json").wilayas;
  assert.equal(wilayas.find((w) => w.code === 55).dairas_count, dairas.length);
});

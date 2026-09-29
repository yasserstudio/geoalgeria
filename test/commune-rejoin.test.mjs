// resolveCommune(), the one rule every generator joins commune and wilaya with, over
// the real country. The clause-by-clause tests are test/commune-resolver.test.mjs, on
// fixtures; this file holds the rows that actually broke.
//
// WHY IT EXISTS. Moving 245 commune centres moved published records into places they are
// demonstrably not in, because the joins were unrestricted nearest-centroid: a centre
// that moves stops being the nearest for everything around where it was. The first
// replacement then pinned the candidates to the wilaya whose SHIPPED polygon contains
// the point, and the shipped wilaya 55 polygon is about 50 km short of the decree
// boundary (yasserstudio/geoalgeria.com#171), so it moved 70 more records out of wilaya
// 55 into N'goussa in wilaya 30. The commune outline decides first now, and globally.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RESOLVE_RULES,
  containingCommuneCode,
  containingWilayaCode,
  insideOwnCommuneOutline,
  loadCommunes,
  nearestCommune,
  outlineLessCommuneCodes,
  resolveCommune,
} from "../scripts/lib/build-utils.mjs";

const communes = loadCommunes();

test("a commune outline beats a nearer centre in the next wilaya", () => {
  // Mosque 31-0390, Oran. Inside OSM commune 3111 Oued Tlelat (wilaya 31); the
  // unrestricted join gave it Zahana, wilaya 29, whose shipped polygon does not
  // contain the point at all.
  const lat = 35.547628;
  const lng = -0.414678;
  assert.equal(containingWilayaCode(lat, lng), "31");
  assert.equal(containingCommuneCode(lat, lng), 3111);

  const { commune, rule } = resolveCommune(lat, lng, communes, { wilaya_code: "31", commune_code: 3111 });
  assert.equal(rule, "commune_outline");
  assert.equal(commune.code_commune, 3111);
  assert.equal(commune.name_fr, "Oued Tlelat");
  assert.equal(Number(commune.wilaya_code), 31);

  // And the rule it replaced, reproduced, so the regression is stated rather than
  // remembered: the nearest centre over the whole country is in another wilaya.
  const naive = nearestCommune(lat, lng, communes);
  assert.notEqual(Number(naive.wilaya_code), 31);
});

test("the commune outline wins even where the shipped wilaya polygon is wrong (#171)", () => {
  // The four rows the wilaya-first rule moved to N'goussa (3003, wilaya 30): mosque
  // 55-0051, pharmacy 55-00012, library 55-library-02 and mosque 55-0210. Every one is
  // inside El-Hadjira (5507) or El Alia (5513), communes of wilaya 55 whose territory
  // the shipped wilaya 55 polygon does not reach.
  const rows = [
    { id: "55-0051", lat: 32.615544, lng: 5.513943, commune: 5507 },
    { id: "55-00012", lat: 32.613374, lng: 5.51684, commune: 5507 },
    { id: "55-library-02", lat: 32.702481, lng: 5.41333, commune: 5513 },
    { id: "55-0210", lat: 32.647857, lng: 5.516124, commune: 5507 },
  ];
  for (const r of rows) {
    assert.equal(containingWilayaCode(r.lat, r.lng), "30", `${r.id}: the shipped w30 polygon holds it, which is #171`);
    assert.equal(containingCommuneCode(r.lat, r.lng), r.commune, `${r.id}: the OSM outline that holds it`);

    // From the wrong published value, and from no published value at all.
    for (const pub of [{ wilaya_code: "30", commune_code: 3003 }, null]) {
      const got = resolveCommune(r.lat, r.lng, communes, pub);
      assert.equal(got.rule, "commune_outline", r.id);
      assert.equal(got.commune.code_commune, r.commune, r.id);
      assert.equal(Number(got.commune.wilaya_code), 55, `${r.id}: the wilaya comes from the commune registry`);
    }
  }
});

test("a record in a commune OpenStreetMap has no relation for keeps it", () => {
  // Souk Oufella (630), Bir Touta (1634), Collo (2110) and Dhayet Bendhahoua (4703).
  // OSM ships no admin_level=8 relation for any of them, and their territory is still
  // inside the commune they were split out of, so containment says the neighbour and
  // containment is wrong. School 16-01308 is 1.85 km from Bir Touta's centre and 6.14 km
  // from Douira's.
  assert.deepEqual(outlineLessCommuneCodes(), [630, 1634, 2110, 4703]);

  const school = { lat: 36.641506, lng: 2.986567, wilaya_code: "16", commune_code: "1634" };
  assert.equal(insideOwnCommuneOutline(school.lat, school.lng, 1634), null, "no outline to be inside of");
  const got = resolveCommune(school.lat, school.lng, communes, school);
  assert.equal(got.rule, "kept_no_outline");
  assert.equal(got.commune.code_commune, 1634);
  // Nothing published: containment hands it to the neighbour, which is why the published
  // claim is the one kept.
  assert.notEqual(resolveCommune(school.lat, school.lng, communes, null).commune.code_commune, 1634);
});

test("a whole-degree placeholder keeps its published commune", () => {
  // culture 19-bcp-08, Mosquée Sidi Ghanem, shipped at [6, 36] by the patrimoine portal.
  // A join on a whole degree moved it from wilaya 19 to wilaya 43.
  const got = resolveCommune(36, 6, communes, { wilaya_code: "19", commune_code: "1958" });
  assert.equal(got.rule, "kept_low_precision");
  assert.equal(got.commune.code_commune, 1958);
  assert.equal(Number(got.commune.wilaya_code), 19);
  // The same point with nothing published does move, which is the bug reproduced.
  assert.notEqual(Number(resolveCommune(36, 6, communes, null).commune.wilaya_code), 19);
});

test("a point inside no wilaya polygon and no commune outline keeps what it published", () => {
  // Offshore north of Algiers: no wilaya polygon and no commune outline contain it, so
  // the join must not invent either.
  const lat = 37.5003;
  const lng = 3.0003;
  assert.equal(containingWilayaCode(lat, lng), null);
  assert.equal(containingCommuneCode(lat, lng), null);

  const kept = resolveCommune(lat, lng, communes, { wilaya_code: "16", commune_code: "1607" });
  assert.equal(kept.rule, "kept_outside_wilaya_polygons");
  assert.equal(kept.commune.code_commune, 1607);

  // Only a wilaya published: the search is that wilaya's communes and says so. It no
  // longer widens to a national search behind that same label.
  const w = resolveCommune(lat, lng, communes, { wilaya_code: "16" });
  assert.equal(w.rule, "published_wilaya_nearest");
  assert.equal(Number(w.commune.wilaya_code), 16);
  assert.equal(resolveCommune(lat, lng, communes, null).rule, "unresolved");
});

test("over a national grid, every answer is a declared rule and holds its own commune", () => {
  // A grid over the country, so the invariants are asserted over points nobody chose
  // rather than over the ones that failed.
  let outline = 0;
  let nearest = 0;
  for (let lat = 20.0003; lat <= 37; lat += 0.2503) {
    for (let lng = -8.4997; lng <= 12; lng += 0.2503) {
      const w = containingWilayaCode(lat, lng);
      const { commune, rule } = resolveCommune(lat, lng, communes, null);
      assert.ok(RESOLVE_RULES.includes(rule), `undeclared rule ${rule} at ${lng},${lat}`);
      if (rule === "commune_outline") {
        outline++;
        assert.equal(
          insideOwnCommuneOutline(lat, lng, commune.code_commune),
          true,
          `${rule} at ${lng},${lat} named a commune whose outline does not hold the point`,
        );
        continue;
      }
      if (!w) {
        assert.equal(rule, "unresolved", `${rule} at ${lng},${lat}, outside every wilaya polygon`);
        continue;
      }
      assert.ok(commune, `no commune resolved at ${lng},${lat} inside wilaya ${w}`);
      if (rule === "wilaya_nearest") {
        nearest++;
        // The nearest-centre clause stays in the containing wilaya, unless the winner is
        // one of the four communes with no outline, which it may reach from up to 10 km.
        if (insideOwnCommuneOutline(lat, lng, commune.code_commune) !== null) {
          assert.equal(String(commune.wilaya_code).padStart(2, "0"), w, `${rule} at ${lng},${lat} left wilaya ${w}`);
        }
      }
    }
  }
  assert.ok(outline > 2000, `only ${outline} grid points were decided by a commune outline`);
  assert.ok(nearest > 0, "no grid point exercised the nearest-centre clause");
});

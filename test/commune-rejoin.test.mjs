// resolveCommune(), the one rule every generator joins commune and wilaya with.
//
// WHY IT EXISTS. Moving 245 commune centres moved 58 published records into a
// wilaya they are demonstrably not in, because the joins were unrestricted
// nearest-centroid: a centre that moves stops being the nearest for everything
// around where it was and starts being it around where it is, and nothing stopped
// the nearest one being in the next wilaya. The named case is mosque 31-0390.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  containingCommuneCode,
  containingWilayaCode,
  loadCommunes,
  nearestCommune,
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
  assert.equal(containingCommuneCode(lat, lng, "31"), 3111);

  const { commune, rule } = resolveCommune(lat, lng, communes, "31");
  assert.equal(rule, "commune_polygon");
  assert.equal(commune.code_commune, 3111);
  assert.equal(commune.name_fr, "Oued Tlelat");
  assert.equal(Number(commune.wilaya_code), 31);

  // And the rule it replaced, reproduced, so the regression is stated rather than
  // remembered: the nearest centre over the whole country is in another wilaya.
  const naive = nearestCommune(lat, lng, communes);
  assert.notEqual(Number(naive.wilaya_code), 31);
});

test("the resolved commune is always in the wilaya whose polygon holds the point", () => {
  // A grid over the country, so the invariant is asserted over points nobody
  // chose rather than over the one that failed.
  let checked = 0;
  for (let lat = 20; lat <= 37; lat += 0.5) {
    for (let lng = -8.5; lng <= 12; lng += 0.5) {
      const w = containingWilayaCode(lat, lng);
      if (!w) continue;
      const { commune, rule } = resolveCommune(lat, lng, communes, null);
      assert.ok(commune, `no commune resolved at ${lng},${lat} inside wilaya ${w}`);
      assert.equal(
        String(commune.wilaya_code).padStart(2, "0"),
        w,
        `${rule} at ${lng},${lat} left wilaya ${w} for ${commune.wilaya_code}`,
      );
      checked++;
    }
  }
  assert.ok(checked > 300, `only ${checked} grid points landed inside a wilaya`);
});

test("a point inside no wilaya polygon keeps the wilaya it was published in", () => {
  // Offshore north of Algiers: no wilaya polygon contains it, so the join must not
  // invent one. It stays in the wilaya the record already declared, and says so.
  const lat = 37.5;
  const lng = 3.0;
  assert.equal(containingWilayaCode(lat, lng), null);

  const kept = resolveCommune(lat, lng, communes, "16");
  assert.equal(kept.rule, "published_wilaya_nearest");
  assert.equal(Number(kept.commune.wilaya_code), 16);

  // With nothing published either, the search is unrestricted and admits it.
  assert.equal(resolveCommune(lat, lng, communes, null).rule, "unrestricted");
});

test("inside a wilaya but outside every commune outline falls back to distance", () => {
  // The four communes with no usable OSM geometry (Souk Oufella, Bir Touta, Collo,
  // Dhayet Bendhahoua) leave holes in the outline cover, and the reduction leaves
  // hairline gaps at some borders. Those rows must still get a commune, from the
  // right wilaya.
  let fallbacks = 0;
  for (let lat = 20; lat <= 37; lat += 0.25) {
    for (let lng = -8.5; lng <= 12; lng += 0.25) {
      const w = containingWilayaCode(lat, lng);
      if (!w) continue;
      const { commune, rule } = resolveCommune(lat, lng, communes, null);
      if (rule !== "wilaya_nearest") continue;
      fallbacks++;
      assert.equal(String(commune.wilaya_code).padStart(2, "0"), w);
    }
  }
  assert.ok(fallbacks > 0, "no grid point exercised the nearest-centre fallback");
});

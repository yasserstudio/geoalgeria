// The commune join must not cross a wilaya boundary: a near-boundary point used
// to be claimed by whichever commune centroid was planar-nearest, wilaya
// notwithstanding (the 3 ooredoo mislinks, ROADMAP "Generators"). attachCommune
// now resolves the containing wilaya by point-in-polygon first and restricts the
// centroid search to it.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  containingWilayaCode,
  nearestCommune,
  attachCommune,
  loadCommunes,
} from "../scripts/lib/build-utils.mjs";

test("containingWilayaCode resolves interior points and returns null offshore", () => {
  assert.equal(containingWilayaCode(36.7538, 3.0588), "16"); // central Algiers
  assert.equal(containingWilayaCode(35.6971, -0.6308), "31"); // central Oran
  assert.equal(containingWilayaCode(37.5, 3.0), null); // Mediterranean
});

test("nearestCommune with a wilaya restriction ignores a nearer foreign centroid", () => {
  const point = { lat: 36.0, lng: 3.0 };
  const communes = [
    { name_fr: "Foreign-Near", wilaya_code: "35", latitude: 36.001, longitude: 3.001, code_commune: "3501" },
    { name_fr: "Own-Far", wilaya_code: "16", latitude: 36.05, longitude: 3.05, code_commune: "1601" },
  ];
  assert.equal(nearestCommune(point.lat, point.lng, communes).name_fr, "Foreign-Near");
  assert.equal(nearestCommune(point.lat, point.lng, communes, "16").name_fr, "Own-Far");
  // Unmatchable restriction falls back to the unrestricted search, never null.
  assert.equal(nearestCommune(point.lat, point.lng, communes, "99").name_fr, "Foreign-Near");
});

test("attachCommune stamps the containing wilaya on real data", () => {
  const communes = loadCommunes();
  const rows = [
    { lat: 36.7538, lng: 3.0588 }, // Algiers
    { lat: 36.9, lng: 7.7666 }, // Annaba
  ];
  attachCommune(rows, communes);
  assert.equal(rows[0].wilaya_code, "16");
  assert.equal(rows[1].wilaya_code, "23");
  for (const r of rows) {
    assert.ok(r.commune, "commune attached");
    // The attached commune's wilaya agrees with the polygon that contains the point.
    assert.equal(r.wilaya_code, containingWilayaCode(r.lat, r.lng));
  }
});

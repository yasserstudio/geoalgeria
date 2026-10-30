// @geoalgeria/formation-professionnelle places an establishment the portal left
// without a coordinate on the centroid of the commune its own Arabic label names,
// joined on the flagship's Arabic commune names. When the flagship repairs one of
// those names (scripts/lib/commune-name-ar-repairs.mjs), a source still writing
// the spelling the flagship shipped before must keep resolving, or the record
// silently loses its point on the next rebuild.
//
// The bug this guards (PR #309 rehearsal, 28 Oct): the Illizi seat repair moved
// commune 3301 from إيليزي to إليزي, the portal still writes إيليزي, and record
// 01463 rebuilt with lat/lng null. Validate never saw it, because the committed
// data still carried the old point.

import { test } from "node:test";
import assert from "node:assert/strict";
import { NAME_AR_REPAIRS } from "../scripts/lib/commune-name-ar-repairs.mjs";
import { loadGeoReference, resolveCommune } from "../packages/formation-professionnelle/scripts/fetch.mjs";

const ref = loadGeoReference();

for (const r of NAME_AR_REPAIRS) {
  test(`formation join: the pre-repair spelling of ${r.code_commune} ${r.name_fr} still resolves`, () => {
    const repaired = resolveCommune(r.to, r.wilaya_code, ref);
    assert.ok(repaired, `${r.name_fr}: the repaired spelling ${r.to} does not resolve in wilaya ${r.wilaya_code}`);
    const former = resolveCommune(r.from, r.wilaya_code, ref);
    assert.ok(former, `${r.name_fr}: the former spelling ${r.from} no longer resolves`);
    assert.deepEqual([former.lat, former.lng], [repaired.lat, repaired.lng], `${r.name_fr}: the two spellings resolve to different communes`);
  });
}

test("formation join: a repaired spelling never resolves outside its own wilaya", () => {
  const illizi = NAME_AR_REPAIRS.find((r) => r.code_commune === 3301);
  assert.equal(resolveCommune(illizi.from, 34, ref), null);
});

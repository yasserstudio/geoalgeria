// Every Protection Civile unit the DGPC's own commune name does not place is placed
// by the commune OUTLINE that contains it, never by the nearest commune centre.
//
// WHY. The DGPC publishes a commune name (`commune_1`) for each unit, and for 782 of
// the 880 it folds to a commune in the derived wilaya. The other 98 were joined by
// nearest centroid inside that wilaya, and a centre is not a boundary: the 2026-10-25
// replay of the stored capture moved 13 of them, 12 into the commune whose
// OpenStreetMap outline actually contains them and one, 23-017 at [7.60981, 36.8269],
// OUT of El Bouni (2305), whose outline contains it, and into Sidi Amar (2311), whose
// outline does not, because Sidi Amar's centre is nearer. The join now asks the
// outline first (scripts/lib/commune-resolver.mjs, through
// `containingCommuneCode`), so a nearer centre cannot overrule a containing boundary.
//
// This file is the ratchet. test/record-in-declared-wilaya.test.mjs holds the general
// guard and its exceptions ledger; these two are the named cases of this defect, so a
// regression names itself instead of moving a count.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { containingCommuneCode } from "../scripts/lib/build-utils.mjs";

const units = JSON.parse(
  readFileSync(new URL("../packages/protection-civile/data/protection-civile.json", import.meta.url), "utf-8"),
);
const byId = new Map(units.map((u) => [u.id, u]));

// The regression and one of the 12 corrections, by the commune each point is inside.
const CASES = [
  { id: "23-017", commune_code: "2305", commune: "El Bouni", not: "2311" },
  { id: "55-005", commune_code: "5501", commune: "Touggourt", not: "5504" },
];

for (const c of CASES) {
  test(`${c.id} names the commune whose outline contains it (${c.commune})`, () => {
    const unit = byId.get(c.id);
    assert.ok(unit, `${c.id} is missing from the published units`);
    assert.equal(
      Number(containingCommuneCode(unit.lat, unit.lng)),
      Number(c.commune_code),
      `${c.id} at [${unit.lng}, ${unit.lat}] is inside ${c.commune_code}'s outline, so the fixture is the claim being tested`,
    );
    assert.equal(unit.commune_code, c.commune_code, `${c.id} must publish ${c.commune}, not commune ${unit.commune_code}`);
    assert.equal(unit.commune, c.commune);
    assert.notEqual(unit.commune_code, c.not, `${c.id} must not fall back to the nearer centre of ${c.not}`);
  });
}

test("no unit is published in a commune whose outline excludes it while another contains it", () => {
  const wrong = [];
  for (const unit of units) {
    if (unit.geo_precision !== "exact" || unit.commune_code == null) continue;
    const inside = containingCommuneCode(unit.lat, unit.lng);
    if (inside == null || Number(inside) === Number(unit.commune_code)) continue;
    wrong.push(`${unit.id}: publishes ${unit.commune_code}, inside ${inside}`);
  }
  // The DGPC's own `commune_1` still wins over the outline, so the 12 units whose
  // official name and containing outline disagree stay as the DGPC files them and are
  // listed in research/_wilaya-containment/record-exceptions.json for review: deciding
  // those needs the source, not a re-join, because the DGPC names a commune the
  // OpenStreetMap outline next door claims (13-015 Tlemcen/Chetouane, 31-001 and
  // 31-022 around Es Senia, 16-022 and 16-036 in Algiers). Nothing beyond that set may
  // disagree.
  assert.equal(wrong.length, 12, `unexpected outline disagreements:\n${wrong.join("\n")}`);
});

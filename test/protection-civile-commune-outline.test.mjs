// Which commune each published Protection Civile unit names, as decided by the join's
// clauses rather than by whichever commune centre happened to be nearest.
//
// WHY. The DGPC publishes a commune name (`commune_1`) per unit. 782 of the 880 fold
// exactly to a commune of the derived wilaya, 84 more land within two edits of exactly
// one, and the rest were joined by nearest commune centre inside the wilaya. A centre
// is not a boundary: the 2026-10-25 replay of the stored capture moved 13 of them, 12
// into the commune whose OpenStreetMap outline actually contains them and one, 23-017
// at [7.60981, 36.8269], OUT of El Bouni (2305), whose outline contains it, and into
// Sidi Amar (2311), whose outline does not, because Sidi Amar's centre is nearer. The
// join now asks the containing outline instead (scripts/lib/protection-civile-commune
// .mjs, over the shared resolver's own containment query), so a nearer centre cannot
// overrule a containing boundary.
//
// WHY THE TOLERANT NAME MATCH IS HERE TOO. Making the outline beat the centre also made
// it beat the DGPC's own name wherever a one-character spelling difference had demoted
// a unit to geometry. 16-048 publishes "بن عكنون" against the registry's "ابن عكنون"
// and 33-007 "إن أميناس" against "إن أمناس": the source names the commune, we simply
// failed to read it. The name clause now crosses up to two edits when exactly one
// commune of the wilaya is that close, which puts both back where the DGPC files them.
//
// This file is the ratchet on the published rows. test/protection-civile-commune-join
// .test.mjs holds the clauses themselves, on fixtures.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { communeResolver } from "../scripts/lib/build-utils.mjs";
import { nearestNameMatch, normAr } from "../scripts/lib/protection-civile-commune.mjs";

const units = JSON.parse(
  readFileSync(new URL("../packages/protection-civile/data/protection-civile.json", import.meta.url), "utf-8"),
);
const byId = new Map(units.map((u) => [u.id, u]));
const resolver = communeResolver();
const containingCode = (lat, lng) => resolver.containingCommunes(lat, lng)[0]?.code_commune ?? null;

// The commune rows of one wilaya, folded the way the join folds them.
const communesOf = (() => {
  const dir = new URL("../packages/dataset/data/", import.meta.url);
  const rows = [];
  for (const f of ["communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"]) {
    for (const c of JSON.parse(readFileSync(new URL(f, dir), "utf-8"))) {
      rows.push({
        code_commune: c.code_commune,
        name_fr: c.name_fr,
        name_ar_norm: normAr(c.name_ar),
        wilaya_code: String(c.wilaya_code).padStart(2, "0"),
      });
    }
  }
  return (wilaya) => rows.filter((c) => c.wilaya_code === wilaya);
})();

// --- the outline clause: the containing boundary beats the nearer centre --------
const OUTLINE_CASES = [
  { id: "23-017", commune_code: "2305", commune: "El Bouni", not: "2311" },
  { id: "55-005", commune_code: "5501", commune: "Touggourt", not: "5504" },
];

for (const c of OUTLINE_CASES) {
  test(`${c.id} names the commune whose outline contains it (${c.commune})`, () => {
    const unit = byId.get(c.id);
    assert.ok(unit, `${c.id} is missing from the published units`);
    assert.equal(
      Number(containingCode(unit.lat, unit.lng)),
      Number(c.commune_code),
      `${c.id} at [${unit.lng}, ${unit.lat}] is inside ${c.commune_code}'s outline, so the fixture is the claim being tested`,
    );
    assert.equal(unit.commune_code, c.commune_code, `${c.id} must publish ${c.commune}, not commune ${unit.commune_code}`);
    assert.equal(unit.commune, c.commune);
    assert.notEqual(unit.commune_code, c.not, `${c.id} must not fall back to the nearer centre of ${c.not}`);
  });
}

// --- the tolerant name clause: the source's own name, read through a typo -------
// Each case is a unit whose DGPC `commune_1` matches no commune of its wilaya exactly
// but is within two edits of exactly one, and whose containing outline says otherwise.
const NEAR_NAME_CASES = [
  { id: "16-048", commune1: "بن عكنون", commune_code: "1622", commune: "Ben Aknoun", outline: 1628 },
  { id: "33-007", commune1: "إن أميناس", commune_code: "3306", commune: "In Amenas", outline: 3304 },
];

for (const c of NEAR_NAME_CASES) {
  test(`${c.id} publishes the one commune its DGPC name is within two edits of (${c.commune})`, () => {
    const unit = byId.get(c.id);
    assert.ok(unit, `${c.id} is missing from the published units`);
    const list = communesOf(unit.wilaya_code);
    const key = normAr(c.commune1);
    assert.equal(
      list.filter((x) => x.name_ar_norm === key).length,
      0,
      `${c.id}: the premise is that ${c.commune1} matches no commune of wilaya ${unit.wilaya_code} exactly`,
    );
    const near = nearestNameMatch(key, list);
    assert.ok(near, `${c.id}: exactly one commune of the wilaya must be within two edits`);
    assert.equal(String(near.code_commune), c.commune_code);
    assert.equal(
      Number(containingCode(unit.lat, unit.lng)),
      c.outline,
      `${c.id}: the premise is that the containing outline (${c.outline}) disagrees with the source`,
    );
    assert.equal(unit.commune_code, c.commune_code, `${c.id}: the DGPC's own name decides, not the outline`);
    assert.equal(unit.commune, c.commune);
  });
}

// --- the closed set --------------------------------------------------------------
test("no unit is published in a commune whose outline excludes it while another contains it", () => {
  const wrong = [];
  for (const unit of units) {
    if (unit.geo_precision !== "exact" || unit.commune_code == null) continue;
    const inside = containingCode(unit.lat, unit.lng);
    if (inside == null || Number(inside) === Number(unit.commune_code)) continue;
    wrong.push(`${unit.id}: publishes ${unit.commune_code}, inside ${inside}`);
  }
  // 14 units, and only these, where the DGPC's own name and the containing outline name
  // different communes. The source wins and the disagreement goes to review rather than
  // into the data: deciding it needs the DGPC, not a re-join. 12 are exact name matches
  // (13-015, 16-022, 16-036, 19-015, 31-001, 31-022, 31-025, 32-011, 39-010, 47-009,
  // 48-003, 48-011) and 2 are within two edits of one (16-048, 33-007). All 14 are
  // listed in research/_wilaya-containment/record-exceptions.json. Nothing else may
  // disagree, and the count only ever goes down.
  assert.equal(wrong.length, 14, `unexpected outline disagreements:\n${wrong.join("\n")}`);
});

test("23-017 is the case the conservative clause protects, not a disagreement", () => {
  // The DGPC files 23-017 under "وادي العنب", one edit from Oued El Aneb (2306), and its
  // own unit name and address say OUED ANEB too. But the point is 65 m OUTSIDE Oued El
  // Aneb's reduced outline and 86 m inside El Bouni's, where it is published. A match
  // inside the edit window is an inference about what the source meant, and an
  // inference must not dislodge a published commune whose own outline confirms it, so
  // the unit stays in El Bouni and nothing new is published for review.
  const unit = byId.get("23-017");
  const list = communesOf(unit.wilaya_code);
  assert.equal(String(nearestNameMatch(normAr("وادي العنب"), list).code_commune), "2306");
  assert.equal(unit.commune_code, "2305");
  assert.equal(Number(containingCode(unit.lat, unit.lng)), 2305);
});

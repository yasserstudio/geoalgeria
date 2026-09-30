// scripts/lib/seat-evidence.mjs, over the rows that made each rule necessary.
//
// The audit's evidence gate is only as wide as seatNameAgreement(), so a row this
// file does not cover is a row that silently stays an exception; and the coordinate
// anomaly is the one defect class containment cannot see, so it is asserted against
// the value that got past containment (Fenoughil) and against the values that must
// NOT trip it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  ANOMALY_TOLERANCE_M,
  articleFreeArabicKey,
  articleFreeLatinKey,
  coordinateAnomaly,
  seatNameAgreement,
} from "../scripts/lib/seat-evidence.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const audit = JSON.parse(
  readFileSync(join(ROOT, "research", "_commune-centres", "audit-2026-09-29.json"), "utf-8"),
);
const byCode = new Map(audit.all.map((r) => [r.code_commune, r]));
const agreementOf = (code) => {
  const r = byCode.get(code);
  assert.ok(r, `audit-2026-09-29.json carries no row for commune ${code}`);
  return seatNameAgreement({
    nameFr: r.name_fr,
    nameAr: r.name_ar,
    relationTags: { wikidata: r.osm.wikidata },
    seatTags: r.seat_node,
  });
};

test("the folded name is still the first and strongest agreement", () => {
  assert.equal(agreementOf(115), "name"); // Fenoughil: name:fr agrees exactly
  assert.equal(agreementOf(3221), "name"); // Sidi Slimane, the 108.7 km move
});

test("relation and node carrying the same wikidata item is agreement", () => {
  // The 11 rows the strict rule excluded although OSM says outright that the node
  // is this commune's seat. Transliteration is the only thing that differs.
  for (const code of [1006, 1439, 1533, 1546, 1922, 2120, 2907, 2938, 2945, 4316, 5302]) {
    assert.equal(agreementOf(code), "wikidata", `commune ${code} must agree by wikidata item`);
  }
});

test("the definite article alone is not a disagreement", () => {
  assert.equal(agreementOf(426), "article"); // Rahia vs OSM "El Rahia", 57.5 km
  assert.equal(agreementOf(2914), "article"); // المطمور vs مطمور
  assert.equal(agreementOf(215), "article"); // الهرانفة vs هرانفة
  assert.equal(articleFreeLatinKey("El Rahia"), articleFreeLatinKey("Rahia"));
  assert.equal(articleFreeArabicKey("المطمور"), articleFreeArabicKey("مطمور"));
  // A one-word name that IS the article keeps it: dropping it would leave nothing
  // and make every such row agree with every other.
  assert.equal(articleFreeLatinKey("El"), "el");
});

test("a different locality is still a disagreement", () => {
  // Beni Zid (2111) is the exception whose admin_centre is outside the commune, so
  // its name agreeing must not on its own decide anything, and rows with neither a
  // shared item nor a shared name must stay undecided.
  for (const code of [4905, 647, 2826, 638, 1526]) {
    assert.equal(agreementOf(code), false, `commune ${code} must not agree on name`);
  }
});

test("a longitude sign flip is detected where containment is blind", () => {
  // Fenoughil (115): stored [0.3, 27.602777] for a seat at [-0.30211, 27.606097],
  // 59.3 km apart and INSIDE its own commune either way, which is why the standing
  // containment guard never saw it.
  const flip = coordinateAnomaly([0.3, 27.602777], [-0.30211, 27.606097]);
  assert.deepEqual(flip, { form: "longitude_sign", metres: 424 });
  const row = byCode.get(115);
  assert.equal(row.ours_in_own_commune, true, "Fenoughil's repudiated value was inside its own commune");

  // Ouled Ahmed Timmi (121), the same class, already corrected on evidence.
  assert.equal(coordinateAnomaly([0.2863, 27.851111], [-0.281279, 27.851041]).form, "longitude_sign");

  // A lat/lon swap, the other mangling this repository's coordinate columns allow.
  assert.equal(coordinateAnomaly([36.776335, 3.058211], [3.058211, 36.776335]).form, "swapped");
});

test("an ordinary disagreement is never an anomaly", () => {
  // Sidi Slimane's 108.7 km error was a real wrong place, not a mangled ordinate.
  assert.equal(coordinateAnomaly([0.554708, 33.833333], [1.731609, 33.832116]), null);
  // And two claims about the same town are not one either.
  assert.equal(coordinateAnomaly([3.058211, 36.776335], [3.0592, 36.7765]), null);
  assert.ok(ANOMALY_TOLERANCE_M === 1000);
});

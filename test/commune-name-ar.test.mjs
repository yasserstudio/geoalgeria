import assert from "node:assert/strict";
import test from "node:test";

import { NAME_AR_REPAIRS, TATWEEL, repairsByCode } from "../scripts/lib/commune-name-ar-repairs.mjs";
import { NAME_AR_CARRIERS } from "./lib/commune-name-ar-carriers.mjs";

const COMMUNE_COUNT = 1541;

test("the repair set is one reviewed row per commune", () => {
  assert.equal(NAME_AR_REPAIRS.length, 23);
  const codes = NAME_AR_REPAIRS.map((r) => r.code_commune);
  assert.equal(new Set(codes).size, codes.length, "a commune is repaired twice");
  for (const repair of NAME_AR_REPAIRS) {
    assert.notEqual(repair.from, repair.to, `${repair.name_fr}: from equals to`);
    if (repair.repair === "tatweel") {
      assert.equal(
        repair.from.replaceAll(TATWEEL, ""),
        repair.to,
        `${repair.name_fr} is filed as a tatweel repair but changes a letter`,
      );
    }
  }
  // One row is not a tatweel removal: Souk El Tenine's definite article.
  assert.deepEqual(
    NAME_AR_REPAIRS.filter((r) => r.repair !== "tatweel").map((r) => r.code_commune),
    [608],
  );
});

for (const [label, read] of NAME_AR_CARRIERS) {
  test(`${label} carries every repaired name_ar`, () => {
    const rows = read();
    assert.equal(rows.length, COMMUNE_COUNT, `${label} holds ${rows.length} communes`);
    const byCode = repairsByCode();
    const byName = new Map(NAME_AR_REPAIRS.map((r) => [`${r.wilaya_code}|${r.name_fr}`, r]));
    let seen = 0;
    for (const row of rows) {
      const repair = row.code === null ? byName.get(`${row.wilaya_code}|${row.name_fr}`) : byCode.get(row.code);
      if (!repair) continue;
      seen++;
      assert.equal(row.name_ar, repair.to, `${label}: ${repair.name_fr} (${repair.code_commune})`);
    }
    assert.equal(seen, NAME_AR_REPAIRS.length, `${label} matched ${seen} of the repaired communes`);
  });

  test(`${label} carries no tatweel in a commune name_ar`, () => {
    // A kashida is justification typography, never part of a name: it folds away
    // in every search key and renders as broken type in a search snippet. Once
    // the 23 repairs are applied there is none left in this repository's commune
    // names, so the floor is zero rather than "no more than before".
    const hits = read()
      .filter((row) => row.name_ar?.includes(TATWEEL))
      .map((row) => `${row.wilaya_code}|${row.name_fr} (${row.name_ar})`);
    assert.deepEqual(hits, [], `${label} carries tatweel`);
  });
}

test("both communes named Souk El Tenine spell it the same way", () => {
  // 608 (Bejaia) and 1557 (Tizi Ouzou) are the same name. The repair aligns 608
  // with the spelling 1557 has always carried, which is why it needs no external
  // source: this repository is its own witness.
  const rows = NAME_AR_CARRIERS.find(([label]) => label === "data/algeria.json")[1]();
  const bejaia = rows.find((row) => row.code === 608);
  const tiziOuzou = rows.find((row) => row.code === 1557);
  assert.equal(bejaia.name_ar, tiziOuzou.name_ar);
});

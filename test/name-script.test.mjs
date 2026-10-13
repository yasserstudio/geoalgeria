// splitByScript / nameKeys: the fold a generator de-duplicates bilingual
// OpenStreetMap names through. Cases are the real tags behind private tracker
// #256, so a regression here is a regression against observed upstream data.

import { test } from "node:test";
import assert from "node:assert/strict";
import { PHARMACY_WORDS, nameKeys, splitByScript } from "../scripts/lib/name-script.mjs";

test("splitByScript: a single-script name comes back verbatim, with no second half", () => {
  assert.deepEqual(splitByScript("Pharmacie Bouchekouf"), { ar: null, la: "Pharmacie Bouchekouf" });
  assert.deepEqual(splitByScript("بوشقوف"), { ar: "بوشقوف", la: null });
  assert.deepEqual(splitByScript("Béjaïa"), { ar: null, la: "Béjaïa" });
  assert.deepEqual(splitByScript(null), { ar: null, la: null });
  assert.deepEqual(splitByScript("06"), { ar: null, la: null });
  // Nothing is tidied on the way through: there is no split to make here, so a
  // leading number, a quote and a full stop all survive as tagged.
  assert.deepEqual(splitByScript("24 ساعة"), { ar: "24 ساعة", la: null });
  assert.deepEqual(splitByScript('"قايدي"'), { ar: '"قايدي"', la: null });
  assert.deepEqual(splitByScript("ك."), { ar: "ك.", la: null });
});

test("splitByScript: a mixed name cuts at the script boundary and keeps every word", () => {
  assert.deepEqual(splitByScript("Pharmacie bouchekouf صيدلية بوشقوف"), {
    ar: "صيدلية بوشقوف",
    la: "Pharmacie bouchekouf",
  });
  // A digit or an internal dot belongs to the run around it.
  assert.deepEqual(splitByScript("Pharmacie 3806 صيدلية"), { ar: "صيدلية", la: "Pharmacie 3806" });
  assert.deepEqual(splitByScript("H. Bouhassane بوحسان"), { ar: "بوحسان", la: "H. Bouhassane" });
  // The separator standing between the two scripts is dropped, whichever it is.
  assert.deepEqual(splitByScript("Mahria;مهرية"), { ar: "مهرية", la: "Mahria" });
  assert.deepEqual(splitByScript("Plateau, بلاطو"), { ar: "بلاطو", la: "Plateau" });
  assert.deepEqual(splitByScript("Nasri. ناصري"), { ar: "ناصري", la: "Nasri" });
  // Arabic first, and more than one run per script.
  assert.deepEqual(splitByScript("صيدلية الأمل Pharmacie Amel مستغانم"), {
    ar: "صيدلية الأمل مستغانم",
    la: "Pharmacie Amel",
  });
});

test("splitByScript: nothing is transliterated, translated or invented", () => {
  // The Latin half of an Arabic-only name is null, never a romanisation.
  assert.equal(splitByScript("صيدلية بوشقوف").la, null);
  // Every character of each half came from the input.
  const value = "Pharmacie lakhdar Chaouche épouse Berrama صيدلية شاوش زوجة بيراما";
  const { ar, la } = splitByScript(value);
  for (const half of [ar, la]) for (const character of half.replace(/ /g, "")) assert.ok(value.includes(character));
});

test("nameKeys: the Oued Endja pair meets on its Arabic key", () => {
  const a = nameKeys(["Pharmacie bouchekouf صيدلية بوشقوف", "Pharmacie Bouchekouf", "Pharmacie bouchekouf صيدلية بوشقوف"], PHARMACY_WORDS);
  const b = nameKeys(["بوشقوف", "Pharmacie Bouchekouf", "بوشقوف"], PHARMACY_WORDS);
  assert.ok([...a].some((key) => b.has(key)));
  assert.ok(a.has("ar:بوشقوف"));
  assert.ok(b.has("ar:بوشقوف"));
});

test("nameKeys: a name that only says 'pharmacy' keys on nothing", () => {
  assert.equal(nameKeys(["Pharmacie"], PHARMACY_WORDS).size, 0);
  assert.equal(nameKeys(["صيدلية"], PHARMACY_WORDS).size, 0);
  assert.equal(nameKeys(["Pharmacy صيدلية"], PHARMACY_WORDS).size, 0);
  assert.equal(nameKeys([null, null, null], PHARMACY_WORDS).size, 0);
});

test("nameKeys: a key never crosses scripts, so a romanisation is not a match", () => {
  const latin = nameKeys(["Pharmacie Bouchekouf"], PHARMACY_WORDS);
  const arabic = nameKeys(["صيدلية بوشقوف"], PHARMACY_WORDS);
  assert.deepEqual([...latin], ["la:bouchekouf"]);
  assert.deepEqual([...arabic], ["ar:بوشقوف"]);
  assert.equal([...latin].filter((key) => arabic.has(key)).length, 0);
});

test("nameKeys: the Loose key absorbs the spellings one name is written with", () => {
  // taa marbuta / haa and alef maqsura / yaa are the two Loose equivalences.
  assert.deepEqual([...nameKeys(["قسنطينة"])], [...nameKeys(["قسنطينه"])]);
  assert.deepEqual([...nameKeys(["Béjaïa"])], [...nameKeys(["BEJAIA"])]);
});

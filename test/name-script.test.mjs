// splitByScript / looseNameKeys: the fold a generator merges multilingual
// OpenStreetMap names through. Cases are the real tags behind private tracker
// #256, so a regression here is a regression against observed upstream data.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ARABIC_LETTER, LATIN_LETTER, SCRIPTS, TIFINAGH_LETTER, looseNameKeys, splitByScript, stripLeadingMarks } from "../scripts/lib/name-script.mjs";
import { looseKey } from "../packages/normalize/index.js";

// The generator's own ignored-word list, which it owns because which words say
// only "pharmacy" is a fact about this dataset and not about the shared fold
// (scripts/lib/name-script.mjs). Declared here the same way RANK/FILL are, and
// checked against the generator's source by the parity test in
// test/pharmacies-name-script.test.mjs, so the copy cannot drift.
const PHARMACY_WORDS = new Set(
  ["pharmacie", "pharmacy", "pharmacia", "officine", "صيدلية", "الصيدلية", "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ"].map(looseKey),
);


test("splitByScript: a single-script name comes back verbatim, with no other half", () => {
  assert.deepEqual(splitByScript("Pharmacie Bouchekouf"), { ar: null, la: "Pharmacie Bouchekouf", tfng: null });
  assert.deepEqual(splitByScript("بوشقوف"), { ar: "بوشقوف", la: null, tfng: null });
  assert.deepEqual(splitByScript("Béjaïa"), { ar: null, la: "Béjaïa", tfng: null });
  assert.deepEqual(splitByScript(null), { ar: null, la: null, tfng: null });
  assert.deepEqual(splitByScript("06"), { ar: null, la: null, tfng: null });
  // Nothing is tidied on the way through: there is no split to make here, so a
  // leading number, a quote and a full stop all survive as tagged.
  assert.deepEqual(splitByScript("24 ساعة"), { ar: "24 ساعة", la: null, tfng: null });
  assert.deepEqual(splitByScript('"قايدي"'), { ar: '"قايدي"', la: null, tfng: null });
  assert.deepEqual(splitByScript("ك."), { ar: "ك.", la: null, tfng: null });
});

test("splitByScript: a mixed name cuts at the script boundary and keeps every word", () => {
  assert.deepEqual(splitByScript("Pharmacie bouchekouf صيدلية بوشقوف"), {
    ar: "صيدلية بوشقوف",
    la: "Pharmacie bouchekouf",
    tfng: null,
  });
  // A digit or an internal dot belongs to the run around it.
  assert.deepEqual(splitByScript("Pharmacie 3806 صيدلية"), { ar: "صيدلية", la: "Pharmacie 3806", tfng: null });
  assert.deepEqual(splitByScript("H. Bouhassane بوحسان"), { ar: "بوحسان", la: "H. Bouhassane", tfng: null });
  // The separator standing between the two scripts is dropped, whichever it is.
  assert.deepEqual(splitByScript("Mahria;مهرية"), { ar: "مهرية", la: "Mahria", tfng: null });
  assert.deepEqual(splitByScript("Plateau, بلاطو"), { ar: "بلاطو", la: "Plateau", tfng: null });
  assert.deepEqual(splitByScript("Nasri. ناصري"), { ar: "ناصري", la: "Nasri", tfng: null });
  // Arabic first, and more than one run per script.
  assert.deepEqual(splitByScript("صيدلية الأمل Pharmacie Amel مستغانم"), {
    ar: "صيدلية الأمل مستغانم",
    la: "Pharmacie Amel",
    tfng: null,
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

test("looseNameKeys: the Oued Endja pair meets on its Arabic key", () => {
  const a = looseNameKeys(["Pharmacie bouchekouf صيدلية بوشقوف", "Pharmacie Bouchekouf", "Pharmacie bouchekouf صيدلية بوشقوف"], PHARMACY_WORDS);
  const b = looseNameKeys(["بوشقوف", "Pharmacie Bouchekouf", "بوشقوف"], PHARMACY_WORDS);
  assert.ok([...a].some((key) => b.has(key)));
  assert.ok(a.has("ar:بوشقوف"));
  assert.ok(b.has("ar:بوشقوف"));
});

test("looseNameKeys: a name that only says 'pharmacy' keys on nothing", () => {
  assert.equal(looseNameKeys(["Pharmacie"], PHARMACY_WORDS).size, 0);
  assert.equal(looseNameKeys(["صيدلية"], PHARMACY_WORDS).size, 0);
  assert.equal(looseNameKeys(["Pharmacy صيدلية"], PHARMACY_WORDS).size, 0);
  assert.equal(looseNameKeys([null, null, null], PHARMACY_WORDS).size, 0);
});

test("looseNameKeys: a key never crosses scripts, so a romanisation is not a match", () => {
  const latin = looseNameKeys(["Pharmacie Bouchekouf"], PHARMACY_WORDS);
  const arabic = looseNameKeys(["صيدلية بوشقوف"], PHARMACY_WORDS);
  assert.deepEqual([...latin], ["la:bouchekouf"]);
  assert.deepEqual([...arabic], ["ar:بوشقوف"]);
  assert.equal([...latin].filter((key) => arabic.has(key)).length, 0);
});

test("looseNameKeys: the Loose key absorbs the spellings one name is written with", () => {
  // taa marbuta / haa and alef maqsura / yaa are the two Loose equivalences.
  assert.deepEqual([...looseNameKeys(["قسنطينة"])], [...looseNameKeys(["قسنطينه"])]);
  assert.deepEqual([...looseNameKeys(["Béjaïa"])], [...looseNameKeys(["BEJAIA"])]);
});

// Neo-Tifinagh is the third script Algeria writes its place names in, and two
// pharmacy records carry it: `40-00024` tags
// `name=ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏصيدلية بوزيان`, with Tifinagh running straight into
// Arabic and no separator between them. A two-script fold puts the Tifinagh into
// `name_ar`, and a Tifinagh-only name reaches neither field.
test("splitByScript: Tifinagh is its own half, never folded into Arabic or Latin", () => {
  assert.deepEqual(splitByScript("ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏصيدلية بوزيان"), {
    ar: "صيدلية بوزيان",
    la: null,
    tfng: "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏ",
  });
  assert.deepEqual(splitByScript("ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⵊⴰⵔⵎⵓⵏ صيدالية جرمون"), {
    ar: "صيدالية جرمون",
    la: null,
    tfng: "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⵊⴰⵔⵎⵓⵏ",
  });
  // All three at once, each half its own script and nothing lost between them.
  assert.deepEqual(splitByScript("Pharmacie Bouziane ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏ صيدلية بوزيان"), {
    ar: "صيدلية بوزيان",
    la: "Pharmacie Bouziane",
    tfng: "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏ",
  });
});

test("splitByScript: a Tifinagh-only name is reported, not dropped", () => {
  assert.deepEqual(splitByScript("ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏ"), {
    ar: null,
    la: null,
    tfng: "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏ",
  });
});

// The positive class, not the absence of one other script: every letter of a half
// must belong to that half's own script. A fold that only checked "no Latin in the
// Arabic half" passed Tifinagh straight through.
test("splitByScript: every half holds only its own script's letters", () => {
  const TESTS = { ar: ARABIC_LETTER, la: LATIN_LETTER, tfng: TIFINAGH_LETTER };
  const values = [
    "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏصيدلية بوزيان",
    "Pharmacie Bouziane ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏ صيدلية بوزيان",
    "Pharmacie bouchekouf صيدلية بوشقوف",
    "Mahria;مهرية",
    "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ Pharmacie",
  ];
  for (const value of values) {
    const halves = splitByScript(value);
    for (const script of SCRIPTS) {
      const half = halves[script];
      if (!half) continue;
      for (const character of half) {
        const foreign = SCRIPTS.filter((other) => other !== script && TESTS[other].test(character));
        assert.deepEqual(
          foreign,
          [],
          `${JSON.stringify(value)}: ${script} half ${JSON.stringify(half)} holds ${JSON.stringify(character)} (${foreign})`,
        );
      }
    }
  }
});

test("looseNameKeys: a Tifinagh name keys on its own script, matching no romanisation", () => {
  const tifinagh = looseNameKeys(["ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏ"], PHARMACY_WORDS);
  const latin = looseNameKeys(["Pharmacie Bouziane"], PHARMACY_WORDS);
  const arabic = looseNameKeys(["صيدلية بوزيان"], PHARMACY_WORDS);
  assert.ok([...tifinagh].every((key) => key.startsWith("tfng:")));
  assert.ok([...tifinagh].every((key) => !latin.has(key) && !arabic.has(key)));
  // The Tifinagh word for "pharmacy" is dropped like its Arabic and Latin twins,
  // so the key is the name and not the category.
  assert.deepEqual([...looseNameKeys(["ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ"], PHARMACY_WORDS)], []);
});

// stripLeadingMarks removes the combining marks a name may open with and NOTHING
// else. The class it replaces was `[\u0300-\u036F\u0610-\u064B\u061A-\u0670...]`,
// whose second and third ranges each span the whole Arabic letter block, so it ate
// the first Arabic word of 822 of 3,795 pharmacy names: 156 lost a surname and three
// were cut mid-word at ڨ, which is U+06A8 and happens to fall outside the ranges
// (private tracker #291).
test("stripLeadingMarks: a pure-Arabic name is returned whole", () => {
  // The four records the ticket names, as the source tags them.
  assert.equal(stripLeadingMarks("مربوح الهادي"), "مربوح الهادي");
  assert.equal(stripLeadingMarks("فلاڨ شبرة الجيلالي"), "فلاڨ شبرة الجيلالي");
  assert.equal(stripLeadingMarks("سبيڨة ربيحة"), "سبيڨة ربيحة");
  assert.equal(stripLeadingMarks("بوڨرزي رملة"), "بوڨرزي رملة");
  // And the shapes around them: one word, the definite article, a Latin name.
  assert.equal(stripLeadingMarks("صيدلية"), "صيدلية");
  assert.equal(stripLeadingMarks("الشفاء"), "الشفاء");
  assert.equal(stripLeadingMarks("Pharmacie Bouchekouf"), "Pharmacie Bouchekouf");
  assert.equal(stripLeadingMarks("ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏ"), "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏ");
});

test("stripLeadingMarks: leading combining marks are still removed", () => {
  // A harakat, a superscript alef, a Latin combining acute, a Quranic stop mark,
  // and an Arabic honorific, each leading a real name.
  assert.equal(stripLeadingMarks("\u064Eمربوح"), "مربوح");
  assert.equal(stripLeadingMarks("\u0670صيدلية"), "صيدلية");
  assert.equal(stripLeadingMarks("\u0301Pharmacie"), "Pharmacie");
  assert.equal(stripLeadingMarks("\u06D6بوشقوف"), "بوشقوف");
  assert.equal(stripLeadingMarks("\u0610الشفاء"), "الشفاء");
  // A run of them, and marks that are not leading, which stay where they are.
  assert.equal(stripLeadingMarks("\u064E\u064F\u0651مربوح"), "مربوح");
  assert.equal(stripLeadingMarks("بِجَايَة"), "بِجَايَة");
  // Not a string, and a value that is only marks.
  assert.equal(stripLeadingMarks(null), null);
  assert.equal(stripLeadingMarks("\u064E\u064F"), "");
});

// The split buffers a character that belongs to no script until it knows which run
// it falls in. Between two runs that buffer is the separator and trails the run
// that closes; at the very start there is no earlier run, so it must lead the one
// opening. Treating both the same dropped a leading number.
test("splitByScript: a leading script-neutral run is kept, not dropped", () => {
  assert.equal(splitByScript("24 ساعة Pharmacie").ar, "24 ساعة");
  assert.deepEqual(splitByScript("24 ساعة Pharmacie"), {
    ar: "24 ساعة",
    la: "Pharmacie",
    tfng: null,
  });
  // Leading punctuation is still a separator and still trimmed off the edge.
  assert.deepEqual(splitByScript("(صيدلية) Pharmacie"), {
    ar: "صيدلية",
    la: "Pharmacie",
    tfng: null,
  });
  // And the number stays with the Latin run when that is where it sits.
  assert.equal(splitByScript("Pharmacie 3806 صيدلية").la, "Pharmacie 3806");
});

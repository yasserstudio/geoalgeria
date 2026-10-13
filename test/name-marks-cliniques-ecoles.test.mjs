// Guards the leading-mark stripper the @geoalgeria/cliniques and
// @geoalgeria/ecoles generators run every OpenStreetMap name through.
//
// The bug class this exists for: `cleanName` drops the combining marks a
// mis-tagged name may open with, and the obvious shorthand for that character
// class is a trap. `[ؐ-ً]` and `[ؚ-ٰ]` each span the whole
// Arabic letter block, so a generator carrying them strips not the marks but
// every Arabic letter up to the first space, that is the first word of the name.
// @geoalgeria/pharmacies shipped exactly that class over 3,795 records (private
// tracker #291).
//
// What makes it a silent bug is that the broken class and the correct one render
// identically in a terminal: both read `[̀-ͯؐ-ًؚ-ٰٟۖ-ۭ]`, because
// the ranges reorder visually. Only the codepoints tell them apart. So the two
// generators now import the one class from scripts/lib/name-script.mjs instead of
// each carrying a literal nobody can read, and these tests assert the property
// the class must have rather than its spelling.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LEAD_MARKS, stripLeadingMarks } from "../scripts/lib/name-script.mjs";
import { cleanName as cleanCliniqueName } from "../packages/cliniques/scripts/fetch.mjs";
import { cleanName as cleanEcoleName } from "../packages/ecoles/scripts/fetch.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES = [
  ["cliniques", cleanCliniqueName],
  ["ecoles", cleanEcoleName],
];

test("a name written entirely in Arabic keeps every word", () => {
  // Each of these is a real naming pattern in these two datasets: the type word
  // leads and the name follows, so losing the first word loses the type, and a
  // one-word name is lost outright.
  const names = [
    "عيادة متعددة الخدمات الشفاء",
    "قاعة العلاج حي النصر",
    "مدرسة ابتدائية الشهيد محمد بوضياف",
    "متوسطة مربوح الهادي",
    "ثانوية الأمير عبد القادر",
    "مستوصف",
  ];
  for (const [pkg, cleanName] of PACKAGES) {
    for (const name of names) {
      assert.equal(cleanName(name), name, `${pkg} cut a word off ${name}`);
    }
  }
});

test("leading combining marks are still stripped", () => {
  const cases = [
    ["ًعيادة الشفاء", "عيادة الشفاء"], // fathatan, the common mis-tag
    ["ّْمدرسة النور", "مدرسة النور"], // sukun + shadda
    ["ٰمدرسة النور", "مدرسة النور"], // superscript alef
    ["̀́École Primaire", "École Primaire"], // Latin combining marks
    ["۟قاعة العلاج", "قاعة العلاج"], // Quranic small high rounded zero
  ];
  for (const [pkg, cleanName] of PACKAGES) {
    for (const [raw, want] of cases) {
      assert.equal(cleanName(raw), want, `${pkg} mishandled ${JSON.stringify(raw)}`);
    }
  }
});

test("a name is never cut mid-word at a letter outside the Arabic block", () => {
  // ڨ (U+06A8) sits past U+064A, so the broken class stopped at it and left a
  // name opening on a bare consonant instead of eating the whole word.
  for (const [pkg, cleanName] of PACKAGES) {
    assert.equal(cleanName("فلاڨ شبرة الجيلالي"), "فلاڨ شبرة الجيلالي", `${pkg} cut at ڨ`);
    assert.equal(cleanName("ڨمار"), "ڨمار", `${pkg} cut at a leading ڨ`);
  }
});

test("the shared class matches no letter of any script", () => {
  // The property the broken class violated, asserted directly rather than only
  // through the names above: a letter is never a leading mark.
  for (const letter of "ءابتثجحخدذرزسشصضطظعغفقكلمنهويڨٱےAZaz") {
    assert.equal(LEAD_MARKS.test(letter), false, `LEAD_MARKS matches the letter ${letter}`);
    assert.equal(stripLeadingMarks(letter), letter);
  }
});

test("neither generator keeps a leading-mark class of its own", () => {
  // The class cannot be proof-read, so it may not be copied: a local literal is
  // how the three copies drifted in the first place.
  for (const pkg of ["cliniques", "ecoles"]) {
    const source = readFileSync(join(ROOT, "packages", pkg, "scripts", "fetch.mjs"), "utf-8");
    assert.match(source, /stripLeadingMarks/, `${pkg} does not use the shared stripLeadingMarks`);
    assert.match(source, /name-script\.mjs"/, `${pkg} does not import scripts/lib/name-script.mjs`);
    assert.doesNotMatch(source, /LEAD_MARKS\s*=/, `${pkg} declares its own leading-mark class`);
  }
});

test("over the committed captures, cleanName removes no letter", () => {
  // The whole corpus, not a sample: whatever cleanName drops off the front of a
  // real name tag is marks and whitespace, never a letter. This is the assertion
  // that fails on the broken class, on 2,075 cliniques tags and 6,598 ecoles ones.
  for (const [pkg, cleanName] of PACKAGES) {
    const capture = JSON.parse(readFileSync(join(ROOT, "sources", pkg, "osm.json"), "utf-8"));
    for (const element of capture.elements ?? []) {
      for (const [tag, value] of Object.entries(element.tags ?? {})) {
        if (tag !== "name" && !tag.startsWith("name:")) continue;
        if (typeof value !== "string") continue;
        const cleaned = cleanName(value);
        if (cleaned === null) continue;
        const trimmed = value.replace(/\s+/g, " ").trim();
        assert.ok(trimmed.endsWith(cleaned), `${pkg} ${element.type}/${element.id} reordered ${tag}`);
        const removed = trimmed.slice(0, trimmed.length - cleaned.length);
        assert.doesNotMatch(
          removed,
          /\p{L}/u,
          `${pkg} ${element.type}/${element.id} lost the letters ${JSON.stringify(removed)} off ${tag}`,
        );
      }
    }
  }
});

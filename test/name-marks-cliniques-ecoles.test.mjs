// Guards the leading-mark stripper the @geoalgeria/cliniques and
// @geoalgeria/ecoles generators run every OpenStreetMap name through.
//
// The bug class this exists for: `cleanName` drops the combining marks a
// mis-tagged name may open with, and the obvious shorthand for that character
// class is a trap. `[ؐ-ً]` and `[ؚ-ٰ]` each span the whole
// Arabic letter block, so a generator carrying them strips not the marks but
// every Arabic letter up to the first space, that is the first word of the name.
// @geoalgeria/pharmacies shipped exactly that class and cut short 1,029 of its
// 3,795 names (private tracker #291).
//
// What makes it a silent bug is that the broken class and the correct one render
// identically in a terminal: both read `[̀-ͯؐ-ًؚ-ٰٟۖ-ۭ]`, because
// the ranges reorder visually. Only the codepoints tell them apart. So the two
// generators now import the one class from scripts/lib/name-script.mjs instead of
// each carrying a literal nobody can read, and these tests assert the property
// the class must have rather than its spelling.

import { test } from "node:test";
import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, sep } from "node:path";
import { LEAD_MARKS, stripLeadingMarks } from "../scripts/lib/name-script.mjs";
import { withoutEmDash } from "../scripts/lib/no-em-dash.mjs";
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

test("the shared class matches no base letter, over every codepoint it could", () => {
  // The property the broken class violated, asserted exhaustively rather than
  // over a sample: across U+0300 to U+06FF, which spans the combining
  // diacriticals and the whole Arabic block, nothing the class matches is a
  // letter a reader reads as part of a word.
  //
  // "Base letter" and not \p{L}: the class holds U+06E5 and U+06E6, the Arabic
  // small waw and small yeh, which Unicode files as Lm. They are modifier
  // letters written above the line, so they behave as marks here and are
  // stripped on purpose. What must never match is a letter with a form of its
  // own, that is Lu, Ll, Lt or Lo.
  const BASE_LETTER = /[\p{Lu}\p{Ll}\p{Lt}\p{Lo}]/u;
  let matched = 0;
  for (let cp = 0x0300; cp <= 0x06ff; cp++) {
    const character = String.fromCodePoint(cp);
    const name = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
    if (!LEAD_MARKS.test(character)) {
      // Not a mark, so it survives untouched wherever it stands.
      assert.equal(stripLeadingMarks(character), character, `${name} was stripped and is not in the class`);
      continue;
    }
    matched++;
    assert.doesNotMatch(character, BASE_LETTER, `LEAD_MARKS matches the base letter ${name}`);
  }
  // A floor, so a class edited down to nothing would not pass this vacuously.
  assert.ok(matched > 100, `the class matched only ${matched} codepoints in the range`);

  // And the Arabic letter block itself, the thing the broken class swallowed,
  // named explicitly so a reader of this test sees what is at stake.
  for (let cp = 0x0621; cp <= 0x064a; cp++) {
    const letter = String.fromCodePoint(cp);
    assert.equal(LEAD_MARKS.test(letter), false, `LEAD_MARKS matches Arabic letter U+${cp.toString(16)}`);
    assert.equal(stripLeadingMarks(letter), letter);
  }
});

test("the two generators take the class from the shared module", () => {
  for (const pkg of ["cliniques", "ecoles"]) {
    const source = readFileSync(join(ROOT, "packages", pkg, "scripts", "fetch.mjs"), "utf-8");
    assert.match(source, /stripLeadingMarks/, `${pkg} does not use the shared stripLeadingMarks`);
    assert.match(source, /name-script\.mjs"/, `${pkg} does not import scripts/lib/name-script.mjs`);
  }
});

// A generator that is allowed to still carry its own class, and why. Dated, so an
// entry cannot quietly become permanent.
const OWN_CLASS_ALLOWED = new Map([]);

test("no generator outside scripts/lib declares a leading-mark class of its own", () => {
  // The whole tree, not the two packages this branch touches: the class cannot be
  // proof-read, because one that swallows the Arabic letter block renders exactly
  // like the marks-only one, so a local copy is a defect wherever it appears. Two
  // signals, either of which is a copy: a binding named LEAD_MARKS, or an anchored
  // character class holding an Arabic-range mark, which is what such a stripper
  // always looks like however it is named.
  //
  // Deliberately NOT a plain search for a mark range: these generators legitimately
  // fold marks mid-string (cliniques strips Latin accents after NFD, and normalizes
  // Arabic hamza and alef variants). It is the leading-mark stripper that belongs in
  // one place.
  const LEADING_CLASS = /\/\^\[([^\]\n]*)\]\+?\//g;
  const ARABIC_RANGE = /[؀-ۿ]/;
  const offenders = [];
  for (const file of globSync("packages/*/scripts/*.mjs", { cwd: ROOT }).sort()) {
    const source = readFileSync(join(ROOT, file), "utf-8");
    const reasons = [];
    if (/LEAD_MARKS\s*=/.test(source)) reasons.push("declares LEAD_MARKS");
    for (const [literal, body] of source.matchAll(LEADING_CLASS)) {
      if (ARABIC_RANGE.test(body)) reasons.push(`carries the anchored class ${literal}`);
    }
    if (!reasons.length) continue;
    const allowed = OWN_CLASS_ALLOWED.get(file.split(sep).join("/"));
    if (allowed) continue;
    offenders.push(`${file}: ${reasons.join("; ")}`);
  }
  assert.deepEqual(
    offenders,
    [],
    `import stripLeadingMarks from scripts/lib/name-script.mjs instead:\n${offenders.join("\n")}`,
  );
});

test("every allowlisted generator still exists and still carries its own class", () => {
  // So an entry cannot outlive what it excuses. Once #283 lands, pharmacies has no
  // class of its own, this fails, and the entry is deleted.
  for (const [file, reason] of OWN_CLASS_ALLOWED) {
    assert.match(reason, /^\d{4}-\d{2}-\d{2}: /, `${file} has an undated allowlist reason`);
    const path = join(ROOT, ...file.split("/"));
    const source = readFileSync(path, "utf-8");
    assert.ok(
      /LEAD_MARKS\s*=/.test(source),
      `${file} no longer declares a class of its own, so drop its allowlist entry (${reason})`,
    );
  }
});

// The non-mark characters a leading-mark stripper may legitimately remove, named
// one by one: the end of ayah, the start of rub el hizb, the small waw and small
// yeh, and the place of sajdah. Unicode files these as Cf, So and Lm rather than
// M, so a \p{M} test alone would reject them.
//
// Written out here rather than taken from LEAD_MARKS on purpose. Asserting that
// what was removed is a member of the class under test is circular: feed the
// broken class in and the Arabic letters it ate become "members", so the
// assertion passes over every one of the 21,409 name tags and the test has no
// teeth at all. This set and \p{M} are an independent statement of what a mark is.
const STRIPPABLE_NON_MARKS = new Set(["۝", "۞", "ۥ", "ۦ", "۩"]);

test("over the committed captures, cleanName removes only marks and whitespace", () => {
  // The whole corpus, not a sample. Every character cleanName drops off the front
  // of a real name tag has to be whitespace or a mark. That is stricter than "no
  // letter": it also catches a stripper that ate a digit, a hamza or a bracket.
  //
  // Put the broken class back and this fails on 1,950 of the 4,920 cliniques name
  // tags and 6,399 of the 16,489 ecoles ones.
  for (const [pkg, cleanName] of PACKAGES) {
    const capture = JSON.parse(readFileSync(join(ROOT, "sources", pkg, "osm.json"), "utf-8"));
    for (const element of capture.elements ?? []) {
      for (const [tag, value] of Object.entries(element.tags ?? {})) {
        if (tag !== "name" && !tag.startsWith("name:")) continue;
        if (typeof value !== "string") continue;
        const cleaned = cleanName(value);
        if (cleaned === null) continue;
        // Folded the way cleanName folds it: both packages also swap a dash a
        // mapper typed as a separator, which is an interior rewrite, not a
        // prefix strip. Everything below still only tolerates a prefix being
        // removed, so the stripper keeps its teeth.
        const trimmed = withoutEmDash(value.replace(/\s+/g, " ").trim());
        assert.ok(trimmed.endsWith(cleaned), `${pkg} ${element.type}/${element.id} reordered ${tag}`);
        const removed = trimmed.slice(0, trimmed.length - cleaned.length);
        for (const character of removed) {
          const isMark = /\s/.test(character) || /\p{M}/u.test(character) || STRIPPABLE_NON_MARKS.has(character);
          assert.ok(
            isMark,
            `${pkg} ${element.type}/${element.id} lost U+${character
              .codePointAt(0)
              .toString(16)
              .toUpperCase()
              .padStart(4, "0")} off ${tag}, which is not a mark: ` +
              `${JSON.stringify(trimmed)} became ${JSON.stringify(cleaned)}`,
          );
        }
      }
    }
  }
});

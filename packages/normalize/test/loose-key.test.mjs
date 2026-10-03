// The Loose key, and the one-pass call the release generator makes.
//
// Everything here goes through the published entry point and the exported corpus.
// The Loose key is the Conservative key plus exactly two equivalences, so most of
// what is asserted below is what the loose tier must *not* do.

import { test } from "node:test";
import assert from "node:assert/strict";

import { conservativeKey, looseKey, searchKeys, tokenize } from "../index.js";
import { corpus } from "../fixtures/corpus.js";

const ALEF_MAQSURA = "ى";
const TAA_MARBUTA = "ة";

for (const [index, kase] of corpus.entries()) {
  test(`corpus[${index}] loose: ${kase.note}`, () => {
    assert.equal(looseKey(kase.input), kase.loose);
  });
}

test("searchKeys agrees with the individual functions for every corpus input", () => {
  for (const kase of corpus) {
    const keys = searchKeys(kase.input);
    assert.deepEqual(keys, {
      conservative: conservativeKey(kase.input),
      loose: looseKey(kase.input),
      tokens: tokenize(kase.input),
      looseDiffers: kase.conservative !== kase.loose,
    }, `searchKeys disagreed for ${JSON.stringify(kase.input)}`);
  }
});

test("searchKeys returns the corpus keys, the corpus tokens and the corpus diff flag", () => {
  for (const kase of corpus) {
    const keys = searchKeys(kase.input);
    assert.equal(keys.conservative, kase.conservative);
    assert.equal(keys.loose, kase.loose);
    assert.deepEqual(keys.tokens, [...kase.tokens]);
    assert.equal(keys.looseDiffers, kase.conservative !== kase.loose);
  }
});

test("the corpus carries a case where the two keys differ and a case where they do not", () => {
  assert.ok(corpus.some((kase) => kase.conservative !== kase.loose), "no case where a loose rule fires");
  assert.ok(corpus.some((kase) => kase.conservative === kase.loose), "no case where the two keys agree");
});

// The whole claim of the loose tier: it adds two letter equivalences and nothing
// else. Character for character, the two keys may differ only where the
// Conservative key holds alef maqsura or taa marbuta.
test("the Loose key differs from the Conservative key only at alef maqsura and taa marbuta", () => {
  for (const kase of corpus) {
    const conservative = [...conservativeKey(kase.input)];
    const loose = [...looseKey(kase.input)];
    assert.equal(loose.length, conservative.length, `the loose key changed length for ${JSON.stringify(kase.input)}`);
    for (const [at, character] of conservative.entries()) {
      if (loose[at] === character) continue;
      assert.ok(
        (character === ALEF_MAQSURA && loose[at] === "ي") || (character === TAA_MARBUTA && loose[at] === "ه"),
        `${JSON.stringify(kase.input)} folded ${JSON.stringify(character)} to ${JSON.stringify(loose[at])}`,
      );
    }
  }
});

test("both keys are fixed points: keying a key returns it unchanged", () => {
  for (const kase of corpus) {
    const loose = looseKey(kase.input);
    assert.equal(looseKey(loose), loose, `the loose key is not idempotent for ${JSON.stringify(kase.input)}`);
    assert.equal(conservativeKey(loose), loose, `the conservative key moved a loose key for ${JSON.stringify(kase.input)}`);
  }
});

test("the loose key is stable across repeated calls in one process", () => {
  for (const kase of corpus) {
    assert.equal(looseKey(kase.input), looseKey(kase.input));
  }
});

// The declined rules, asserted as behaviour rather than trusted as prose.
test("the Arabic definite article survives both keys", () => {
  for (const name of ["الوادي", "الجزائر", "البليدة", "العاصمة"]) {
    assert.ok(conservativeKey(name).startsWith("ال"), `the conservative key dropped the article of ${name}`);
    assert.ok(looseKey(name).startsWith("ال"), `the loose key dropped the article of ${name}`);
  }
  for (const kase of corpus) {
    if (!kase.conservative.startsWith("ال")) continue;
    assert.ok(kase.loose.startsWith("ال"), `the corpus expects the article stripped from ${JSON.stringify(kase.input)}`);
  }
});

test("no Latin transliteration of an Arabic name is generated", () => {
  for (const name of ["بجاية", "قسنطينة", "الجزائر"]) {
    for (const key of [conservativeKey(name), looseKey(name)]) {
      assert.ok(!/[a-z0-9]/.test(key), `${name} produced Latin characters: ${JSON.stringify(key)}`);
    }
  }
});

// The declared output character set: a space, ASCII lower-case letters, ASCII
// digits, and the Arabic letters of the base block that no table folds away. A
// case that carries a character no table names is exempt, because such a
// character is passed through by rule rather than dropped.
const OUTPUT_ALPHABET = /^[a-z0-9 ء-ي]*$/u;

for (const [index, kase] of corpus.entries()) {
  if (kase.proves.includes("any.pass-through")) continue;
  test(`corpus[${index}] keys stay inside the declared output alphabet`, () => {
    for (const key of [conservativeKey(kase.input), looseKey(kase.input)]) {
      assert.ok(OUTPUT_ALPHABET.test(key), `${JSON.stringify(kase.input)} produced ${JSON.stringify(key)}`);
    }
  });
}

test("a character outside every declared range is passed through, not dropped", () => {
  const cases = corpus.filter((kase) => kase.proves.includes("any.pass-through"));
  assert.ok(cases.length >= 2, "the corpus must carry a pass-through case inside and outside the declared ranges");
  for (const kase of cases) {
    assert.ok(!OUTPUT_ALPHABET.test(kase.conservative), `${JSON.stringify(kase.input)} is not a pass-through case`);
    assert.equal(conservativeKey(kase.input), kase.conservative);
  }
  // The Berber Latin gamma, outside every declared block, and a Cyrillic letter
  // that no rule of this package will ever have an opinion about. The Cyrillic
  // capital keeps its case: lower-casing a letter no table names would mean
  // asking the engine for its case pair, which is the dependency the package
  // refuses, so a script it declares nothing about passes through as written.
  assert.equal(conservativeKey("Tamaziɣt"), "tamaziɣt");
  assert.equal(conservativeKey("Алжир"), "Алжир");
});

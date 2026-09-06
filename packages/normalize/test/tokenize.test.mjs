// The tokenizer, and the separator set it splits on.
//
// The token list is what the full-text index is built from, so it is part of the
// contract rather than an implementation detail: the release generator asserts
// that SQLite's own tokenizer splits a key exactly where `tokenize` splits the
// text it came from. That test belongs to the generator; the exact separator set
// it holds against is declared here.

import { test } from "node:test";
import assert from "node:assert/strict";

import { conservativeKey, looseKey, tokenize } from "../index.js";
import { corpus } from "../fixtures/corpus.js";

for (const [index, kase] of corpus.entries()) {
  test(`corpus[${index}] tokens: ${kase.note}`, () => {
    assert.deepEqual(tokenize(kase.input), [...kase.tokens]);
  });
}

test("each key is its token list joined by single spaces", () => {
  for (const kase of corpus) {
    assert.equal(tokenize(kase.input).join(" "), conservativeKey(kase.input));
    assert.equal(looseKey(kase.input).split(" ").filter(Boolean).length, kase.tokens.length);
  }
});

test("no token is empty and no token holds a space", () => {
  for (const kase of corpus) {
    for (const token of tokenize(kase.input)) {
      assert.ok(token.length > 0, `an empty token from ${JSON.stringify(kase.input)}`);
      assert.ok(!token.includes(" "), `a token holding a space from ${JSON.stringify(kase.input)}`);
    }
  }
});

test("text with no letters tokenizes to nothing", () => {
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize("   "), []);
  assert.deepEqual(tokenize(" - '"), []);
});

// The exact separator set. Whitespace, the apostrophe variants a keyboard or a
// transliteration produces, the hyphen and dash variants, and punctuation. Every
// codepoint below ends a token; anything else is either folded, removed, or part
// of one. The punctuation rows are a sample of each range rather than all of it,
// and the range test below holds the rest.
const SEPARATORS = [
  [0x0009, "tab"],
  [0x000a, "line feed"],
  [0x000b, "line tabulation"],
  [0x000c, "form feed"],
  [0x000d, "carriage return"],
  [0x0020, "space"],
  [0x00a0, "no-break space"],
  [0x1680, "ogham space mark"],
  [0x2000, "en quad"],
  [0x2001, "em quad"],
  [0x2002, "en space"],
  [0x2003, "em space"],
  [0x2004, "three-per-em space"],
  [0x2005, "four-per-em space"],
  [0x2006, "six-per-em space"],
  [0x2007, "figure space"],
  [0x2008, "punctuation space"],
  [0x2009, "thin space"],
  [0x200a, "hair space"],
  [0x2028, "line separator"],
  [0x2029, "paragraph separator"],
  [0x202f, "narrow no-break space"],
  [0x205f, "medium mathematical space"],
  [0x3000, "ideographic space"],
  [0x0027, "apostrophe"],
  [0x0060, "grave accent, typed as an apostrophe"],
  [0x02bc, "modifier letter apostrophe"],
  [0x2018, "left single quotation mark"],
  [0x2019, "right single quotation mark"],
  [0x002d, "hyphen-minus"],
  [0x2010, "hyphen"],
  [0x2011, "non-breaking hyphen"],
  [0x2012, "figure dash"],
  [0x2013, "en dash"],
  [0x2014, "em dash"],
  [0x2015, "horizontal bar"],
  [0x002c, "comma"],
  [0x002e, "full stop"],
  [0x003a, "colon"],
  [0x003f, "question mark"],
  [0x0028, "left parenthesis"],
  [0x005b, "left square bracket"],
  [0x007e, "tilde"],
  [0x0022, "quotation mark"],
  [0x00ab, "left guillemet"],
  [0x00bb, "right guillemet"],
  [0x060c, "Arabic comma"],
  [0x061b, "Arabic semicolon"],
  [0x061f, "Arabic question mark"],
  [0x06d4, "Arabic full stop"],
  [0x2026, "horizontal ellipsis"],
  [0x2039, "single left-pointing angle quotation mark"],
];

// The punctuation ranges in full, so the sample above is not the whole promise.
const PUNCTUATION_RANGES = [
  [0x0021, 0x0026], [0x0028, 0x002c], [0x002e, 0x002f],
  [0x003a, 0x0040], [0x005b, 0x005f], [0x007b, 0x007e],
  [0x2016, 0x2017], [0x201a, 0x2027], [0x2030, 0x205e],
];

test("every codepoint of the declared punctuation ranges ends a token", () => {
  for (const [first, last] of PUNCTUATION_RANGES) {
    for (let code = first; code <= last; code++) {
      assert.deepEqual(
        tokenize(`sidi${String.fromCodePoint(code)}bel`),
        ["sidi", "bel"],
        `U+${code.toString(16).padStart(4, "0").toUpperCase()} did not end a token`,
      );
    }
  }
});

test("no key carries punctuation", () => {
  for (const kase of corpus) {
    for (const [first, last] of PUNCTUATION_RANGES) {
      for (const character of conservativeKey(kase.input)) {
        const code = character.codePointAt(0);
        assert.ok(code < first || code > last, `${JSON.stringify(kase.input)} kept ${JSON.stringify(character)}`);
      }
    }
  }
});

for (const [code, name] of SEPARATORS) {
  test(`U+${code.toString(16).padStart(4, "0").toUpperCase()} (${name}) ends a token`, () => {
    assert.deepEqual(tokenize(`sidi${String.fromCodePoint(code)}bel`), ["sidi", "bel"]);
  });
}

test("letters, digits and the marks that are removed do not end a token", () => {
  assert.deepEqual(tokenize("sidibel"), ["sidibel"]);
  assert.deepEqual(tokenize("cite20"), ["cite20"]);
  assert.deepEqual(tokenize("sidi\u00adbel"), ["sidibel"]);
  assert.deepEqual(tokenize("بَجاية"), ["بجاية"]);
});

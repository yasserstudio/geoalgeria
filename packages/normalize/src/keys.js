// The keys and the tokenizer.
//
// The Conservative key is the strict fold every consumer must reproduce byte for
// byte. It resolves the ways one name gets written (presentation forms, alef and
// hamza variants, tatweel, combining marks, digit shapes, separator variants,
// case) and folds nothing that changes which letter a reader sees.
//
// The Loose key is that key plus exactly two equivalences, alef maqsura with yaa
// and taa marbuta with haa, so a match they cause can be ranked below an exact
// one instead of being indistinguishable from it.
//
// Both keys are the token list joined by single spaces. Word boundaries survive,
// so a partial last word still completes and a query is never matched against one
// long run of letters.

import { FOLD, LOOSE, REMOVED, SEPARATORS } from "./tables.js";

const UPPER_A = 0x41;
const UPPER_Z = 0x5a;
const TO_LOWER = 0x20;
const SPACE = " ";

/**
 * The words a name folds to, in order. This is the split the full-text index is
 * built from: a separator ends a word, a removed character is invisible and ends
 * nothing, and everything else belongs to the word it is in.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  const tokens = [];
  let token = "";

  for (const character of text) {
    const code = character.codePointAt(0);

    if (REMOVED.has(code)) continue;

    if (SEPARATORS.has(code)) {
      if (token) tokens.push(token);
      token = "";
      continue;
    }

    const folded = FOLD.get(code);
    if (folded !== undefined) {
      token += folded;
      continue;
    }

    // Named by no table: lower-cased when it is an ASCII capital, and otherwise
    // passed through as it stands rather than dropped.
    token += code >= UPPER_A && code <= UPPER_Z ? String.fromCharCode(code + TO_LOWER) : character;
  }

  if (token) tokens.push(token);
  return tokens;
}

/** The Loose tier, over a key the Conservative fold has already produced. */
function loosen(key) {
  let loose = "";
  for (const character of key) {
    loose += LOOSE.get(character.codePointAt(0)) ?? character;
  }
  return loose;
}

/**
 * The Conservative key for a name.
 *
 * @param {string} text
 * @returns {string}
 */
export function conservativeKey(text) {
  return tokenize(text).join(SPACE);
}

/**
 * The Loose key for a name: the Conservative key with the two loose equivalences
 * applied. Every loose fold is one letter for one letter, so the two keys always
 * hold the same words in the same places.
 *
 * @param {string} text
 * @returns {string}
 */
export function looseKey(text) {
  return loosen(conservativeKey(text));
}

/**
 * Both keys, the tokens and whether a loose rule actually changed anything, from
 * one pass over the text. This is the call the Content release generator makes,
 * so that building an index does not fold the same name three times.
 *
 * @param {string} text
 * @returns {{ conservative: string, loose: string, tokens: string[], looseDiffers: boolean }}
 */
export function searchKeys(text) {
  const tokens = tokenize(text);
  const conservative = tokens.join(SPACE);
  const loose = loosen(conservative);
  return { conservative, loose, tokens, looseDiffers: loose !== conservative };
}

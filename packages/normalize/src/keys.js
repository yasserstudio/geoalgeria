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

import { FOLD, LOOSE, LOOSE_RULE_OF_CODE, REMOVED, RULE_OF_CODE, SEPARATORS } from "./tables.js";

const UPPER_A = 0x41;
const UPPER_Z = 0x5a;
const TO_LOWER = 0x20;
const SPACE = " ";

/**
 * Records that a Rule fired, once, in the order the Rules first fired. `applied`
 * is undefined unless a caller asked for the record through `explain`, so the key
 * path pays nothing for it: there is no second implementation to disagree with.
 *
 * @param {string[] | undefined} applied
 * @param {string | undefined} id
 */
function fired(applied, id) {
  if (applied !== undefined && id !== undefined && !applied.includes(id)) applied.push(id);
}

/**
 * The words a name folds to, in order. This is the split the full-text index is
 * built from: a separator ends a word, a removed character is invisible and ends
 * nothing, and everything else belongs to the word it is in.
 *
 * @param {string} text
 * @param {string[]} [applied] internal: the Rule ids that fired, filled by `explain`
 * @returns {string[]}
 */
export function tokenize(text, applied) {
  const tokens = [];
  let token = "";

  for (const character of text) {
    const code = character.codePointAt(0);

    if (REMOVED.has(code)) {
      fired(applied, RULE_OF_CODE.get(code));
      continue;
    }

    if (SEPARATORS.has(code)) {
      fired(applied, RULE_OF_CODE.get(code));
      // A separator with no word open is a leading, repeated or trailing one: it
      // collapses into the boundary already there rather than opening a token.
      if (token) tokens.push(token);
      else fired(applied, "any.whitespace");
      token = "";
      continue;
    }

    const folded = FOLD.get(code);
    if (folded !== undefined) {
      fired(applied, RULE_OF_CODE.get(code));
      token += folded;
      continue;
    }

    // Named by no table: lower-cased when it is an ASCII capital, and otherwise
    // passed through as it stands rather than dropped. Passing a character through
    // changes nothing, so `any.pass-through` never fires; a corpus case proves it
    // by that character surviving into the key.
    if (code >= UPPER_A && code <= UPPER_Z) {
      fired(applied, "any.case");
      token += String.fromCharCode(code + TO_LOWER);
      continue;
    }
    token += character;
  }

  if (token) tokens.push(token);
  return tokens;
}

/**
 * The Loose tier, over a key the Conservative fold has already produced.
 *
 * @param {string} key
 * @param {string[]} [applied]
 */
function loosen(key, applied) {
  let loose = "";
  for (const character of key) {
    const code = character.codePointAt(0);
    const looser = LOOSE.get(code);
    if (looser === undefined) {
      loose += character;
      continue;
    }
    fired(applied, LOOSE_RULE_OF_CODE.get(code));
    loose += looser;
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
 * One pass over the text, optionally recording which Rules fired. `searchKeys` and
 * `explain` are this function, so the record cannot disagree with the keys it was
 * taken from.
 *
 * @param {string} text
 * @param {string[]} [applied]
 */
function keysOf(text, applied) {
  const tokens = tokenize(text, applied);
  const conservative = tokens.join(SPACE);
  const loose = loosen(conservative, applied);
  return { conservative, loose, tokens, looseDiffers: loose !== conservative };
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
  return keysOf(text);
}

/**
 * The keys, plus the ids of the Rules that fired to produce them, in the order
 * they ran. A Rule is in the list when it changed at least one codepoint or ended
 * at least one word; a name no Rule touches returns an empty list, and so do the
 * Rules that state a fold this package does not apply.
 *
 * This is how a loose match says what made it loose, which is what lets a ranking
 * place it below an exact one and lets a reviewer see which names a proposed
 * change to a Rule would move.
 *
 * @param {string} text
 * @returns {{ conservative: string, loose: string, tokens: string[], looseDiffers: boolean, applied: ReadonlyArray<string> }}
 */
export function explain(text) {
  const applied = [];
  return { ...keysOf(text, applied), applied: Object.freeze(applied) };
}

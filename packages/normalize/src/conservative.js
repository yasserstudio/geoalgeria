// The Conservative key: the strict fold every consumer must reproduce byte for
// byte. It resolves the ways one name gets written (presentation forms, alef and
// hamza variants, tatweel, combining marks, digit shapes, separator variants,
// case) and folds nothing that changes which letter a reader sees. Taa marbuta
// and alef maqsura stay as written; folding those is the Loose key's tier.

import { FOLD, REMOVED, SEPARATORS } from "./tables.js";

const UPPER_A = 0x41;
const UPPER_Z = 0x5a;
const TO_LOWER = 0x20;

/**
 * The Conservative key for a name: the folded tokens, joined by single spaces.
 * Word boundaries survive, so a partial last word still completes and a query is
 * never matched against one long run of letters.
 *
 * @param {string} text
 * @returns {string}
 */
export function conservativeKey(text) {
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

    // Outside every table: lower-cased when it is an ASCII capital, and otherwise
    // passed through as it stands rather than dropped.
    token += code >= UPPER_A && code <= UPPER_Z ? String.fromCharCode(code + TO_LOWER) : character;
  }

  if (token) tokens.push(token);
  return tokens.join(" ");
}

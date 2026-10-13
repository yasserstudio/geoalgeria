// Splitting a bilingual place name by script, and the name keys a generator
// de-duplicates on.
//
// OpenStreetMap contributors routinely write one tag as both languages at once:
// `name=Pharmacie bouchekouf صيدلية بوشقوف`, or `name:ar=Mahria;مهرية`. A router
// that asks only "does this string contain an Arabic letter" then files the whole
// mixed string under `name_ar`, Latin words and all, which is how 28 pharmacy
// records shipped a mostly-Latin `name_ar` (private tracker #256).
//
// splitByScript cuts such a value at the script boundary and hands back the two
// halves, taking nothing that is not in the source: no transliteration, no
// translation, no invented word. A value written in one script comes back with the
// other half null, which is the normal case.
//
// nameKeys turns those halves into the keys a conservative de-duplication pass
// compares. They are Loose keys from @geoalgeria/normalize, one per script, so the
// same pharmacy written "Pharmacie Bouchekouf صيدلية بوشقوف" and "بوشقوف" six
// metres away meets on `ar:بوشقوف` instead of failing an exact string comparison.
// The schema package is imported by relative path for the same reason the rest of
// scripts/lib does: these are build-time tools, not package code.

import { looseKey, tokenize } from "../../packages/normalize/index.js";

/** Arabic letters and Arabic-Indic digits, as a script test for one character.
 *  Letters only: combining marks and Arabic punctuation are separators. */
export const ARABIC_LETTER = /[ء-ي٠-٩ٱ-ۓ۰-۹ۺ-ۿ]/;

/** Latin letters, accented forms included (Latin-1 Supplement through Latin
 *  Extended Additional), as a script test for one character. */
export const LATIN_LETTER = /[A-Za-zÀ-ɏḀ-ỿ]/;

/** Whitespace, punctuation and symbols at either end of a split half: the
 *  separator that stood between the two scripts, never part of either name. */
const EDGE_SEPARATORS = /^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu;

const scriptOf = (character) =>
  ARABIC_LETTER.test(character) ? "ar" : LATIN_LETTER.test(character) ? "la" : null;

/**
 * Split a possibly mixed-script name into its Arabic and Latin halves.
 *
 * A value written in one script is returned verbatim under that script, because
 * there is nothing to split and a name is never edited for tidiness: `"24 ساعة"`
 * keeps its number and `ك.` its full stop. Only a value that really holds both
 * scripts is cut, and then a character that is neither script (a digit, a space, a
 * comma) belongs to the run it sits inside, so "Pharmacie 3806 صيدلية" keeps the
 * number with the Latin half while the separator between the two halves is
 * dropped. Several runs of one script join with a single space, in order.
 *
 * @param {unknown} value
 * @returns {{ar: string|null, la: string|null}} each half, or null where absent
 */
export function splitByScript(value) {
  if (typeof value !== "string") return { ar: null, la: null };
  const hasArabic = ARABIC_LETTER.test(value);
  const hasLatin = LATIN_LETTER.test(value);
  if (!hasArabic && !hasLatin) return { ar: null, la: null };
  if (!hasArabic || !hasLatin) return { ar: hasArabic ? value : null, la: hasLatin ? value : null };

  const runs = [];
  let script = null;
  let text = "";
  let pending = "";
  for (const character of value) {
    const next = scriptOf(character);
    if (next === null) {
      pending += character;
      continue;
    }
    if (script === next) {
      text += pending + character;
      pending = "";
      continue;
    }
    if (script !== null) runs.push({ script, text: text + pending });
    script = next;
    text = character;
    pending = "";
  }
  if (script !== null) runs.push({ script, text: text + pending });

  const half = (want) => {
    const parts = runs
      .filter((run) => run.script === want)
      .map((run) => run.text.replace(EDGE_SEPARATORS, ""))
      .filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  };
  return { ar: half("ar"), la: half("la") };
}

/** The words that say "pharmacy" rather than which pharmacy. A name key drops
 *  them, so "Pharmacie Bouchekouf" and "بوشقوف" both key on the family name and a
 *  record tagged only `name=Pharmacie` keys on nothing at all. */
export const PHARMACY_WORDS = new Set(
  ["pharmacie", "pharmacy", "pharmacia", "officine", "صيدلية", "الصيدلية"].map(looseKey),
);

/**
 * The name keys a de-duplication pass compares, as `"<script>:<Loose key>"`.
 *
 * Every value is split by script first, so a mixed-script tag contributes one key
 * per language instead of one key no other spelling can match. `ignoredWords` are
 * dropped token by token (already folded to Loose keys), and a half left with no
 * token at all contributes no key: two records both tagged just "Pharmacie" are
 * not evidence of anything.
 *
 * @param {Array<unknown>} values      the record's name fields, best first
 * @param {Set<string>} [ignoredWords] Loose keys of the words to drop
 * @returns {Set<string>} the keys, possibly empty
 */
export function nameKeys(values, ignoredWords = new Set()) {
  const keys = new Set();
  for (const value of values) {
    const halves = splitByScript(value);
    for (const script of ["ar", "la"]) {
      const half = halves[script];
      if (!half) continue;
      const tokens = tokenize(half)
        .map(looseKey)
        .filter((token) => token && !ignoredWords.has(token));
      if (tokens.length) keys.add(`${script}:${tokens.join(" ")}`);
    }
  }
  return keys;
}

// Splitting a multilingual place name by script, and the Loose name keys a merge
// compares (CONTEXT.md: "Double mapping", "Loose name key").
//
// OpenStreetMap contributors routinely write more than one language into one tag:
// `name=Pharmacie bouchekouf صيدلية بوشقوف`, `name:ar=Mahria;مهرية`, or
// `name=ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ ⵏ ⴱⵓⵣⵢⴰⵏصيدلية بوزيان` with no separator at all. A router that
// asks only "does this string contain an Arabic letter" then files the whole mixed
// string under `name_ar`, Latin words and all, which is how 28 pharmacy records
// shipped a mostly-Latin `name_ar` (private tracker #256).
//
// splitByScript cuts such a value at each script boundary and hands back one half
// per script, taking nothing that is not in the source: no transliteration, no
// translation, no invented word. A value written in one script comes back with the
// other halves null, which is the normal case.
//
// Three scripts are named, because Algeria writes its place names in three.
// Tifinagh is reported on its own half and is never folded into `ar` or `la`: a
// Tamazight name is not an Arabic name and not a French one. A generator with
// nowhere to put it keeps it on the raw display name rather than dropping it.
//
// looseNameKeys turns those halves into the keys a merge compares. They are Loose
// keys from @geoalgeria/normalize, one per script, so the same pharmacy written
// "Pharmacie Bouchekouf صيدلية بوشقوف" and "بوشقوف" six metres away meets on
// `ar:بوشقوف` instead of failing an exact string comparison. @geoalgeria/normalize
// is imported by relative path for the same reason the rest of scripts/lib imports
// a workspace package that way: these are build-time tools, not package code.

import { looseKey, tokenize } from "../../packages/normalize/index.js";

/** Arabic letters and Arabic-Indic digits, as a script test for one character.
 *  Letters only: combining marks and Arabic punctuation are separators. */
export const ARABIC_LETTER = /[ء-ي٠-٩ٱ-ۓ۰-۹ۺ-ۿ]/;

/** Latin letters, accented forms included (Latin-1 Supplement through Latin
 *  Extended Additional), as a script test for one character. The Berber Latin
 *  letters live in these ranges too, so Tamazight written in Latin is Latin. */
export const LATIN_LETTER = /[A-Za-zÀ-ɏḀ-ỿ]/;

/** Neo-Tifinagh letters (the Tifinagh block), the script Tamazight is written in
 *  on Algerian signage and in OpenStreetMap's `name` and `name:ber` tags. */
export const TIFINAGH_LETTER = /[ⴰ-⵿]/;

/** The scripts a name is split into. `tfng` is Tifinagh's ISO 15924 code. */
export const SCRIPTS = ["ar", "la", "tfng"];

const TESTS = { ar: ARABIC_LETTER, la: LATIN_LETTER, tfng: TIFINAGH_LETTER };

/** Whitespace, punctuation and symbols at either end of a split half: the
 *  separator that stood between two scripts, never part of either name. */
const EDGE_SEPARATORS = /^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu;

/** Which of SCRIPTS this one character belongs to, or null for a character that is
 *  none of them (a digit, a space, a comma, a script this fold does not name). */
export const scriptOf = (character) => SCRIPTS.find((script) => TESTS[script].test(character)) ?? null;

/**
 * Split a possibly multi-script name into one half per script.
 *
 * A value written in a single script is returned verbatim under that script,
 * because there is nothing to split and a name is never edited for tidiness:
 * `24 ساعة` keeps its number and `ك.` its full stop. Only a value that really holds
 * more than one script is cut, and then a character belonging to no script (a
 * digit, a space, a comma) belongs to the run it sits inside, so
 * "Pharmacie 3806 صيدلية" keeps the number with the Latin half while the separator
 * between the halves is dropped. Several runs of one script join with a single
 * space, in the order they appear.
 *
 * @param {unknown} value
 * @returns {{ar: string|null, la: string|null, tfng: string|null}} each half, or
 *          null where that script is absent
 */
export function splitByScript(value) {
  const empty = { ar: null, la: null, tfng: null };
  if (typeof value !== "string") return empty;

  const present = SCRIPTS.filter((script) => TESTS[script].test(value));
  if (!present.length) return empty;
  if (present.length === 1) return { ...empty, [present[0]]: value };

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
  return { ar: half("ar"), la: half("la"), tfng: half("tfng") };
}

/** The words that say "pharmacy" rather than which pharmacy, in each script a
 *  pharmacy is named in. A Loose name key drops them, so "Pharmacie Bouchekouf"
 *  and "بوشقوف" both key on the family name and a record tagged only
 *  `name=Pharmacie` keys on nothing at all. */
export const PHARMACY_WORDS = new Set(
  ["pharmacie", "pharmacy", "pharmacia", "officine", "صيدلية", "الصيدلية", "ⵜⴰⴼⴰⵔⵎⴰⵙⵉⵜ"].map(looseKey),
);

/**
 * The Loose name keys a merge compares, as `"<script>:<Loose key>"`.
 *
 * Every value is split by script first, so a multi-script tag contributes one key
 * per language instead of one key no other spelling can match. `ignoredWords` are
 * dropped token by token (already folded to Loose keys), and a half left with no
 * token at all contributes no key: two records both tagged just "Pharmacie" are not
 * evidence of anything.
 *
 * @param {Array<unknown>} values      the record's name fields, best first
 * @param {Set<string>} [ignoredWords] Loose keys of the words to drop
 * @returns {Set<string>} the keys, possibly empty
 */
export function looseNameKeys(values, ignoredWords = new Set()) {
  const keys = new Set();
  for (const value of values) {
    const halves = splitByScript(value);
    for (const script of SCRIPTS) {
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

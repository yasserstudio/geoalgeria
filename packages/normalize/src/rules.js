// The Rules, by their stable identifiers.
//
// Every fold the package applies has a name here, and a corpus case proves it.
// The identifiers are the durable part: a review record, a corpus case and a
// caller asking which Rule made a match all hold on to the same string, so a fold
// may be re-implemented but an id is not renamed.
//
// `rules`, at the end of this file, is the reviewed table the package publishes:
// each Rule with the codepoint sequences it maps, read out of the tables the key
// path actually runs, the sentence a speaker who is not a programmer can argue
// with, and the record of who signed that sentence off and when. It is published
// so that someone who reads the language and not the code can open a pull request
// against one of these equivalences.

import { RULE_ENTRIES } from "./tables.js";

// Class:
//   canonical     resolves how one name was written, without changing a letter
//   conservative  merges spellings a reader accepts as the same letter
//   loose         the extra tier, applied only by the Loose key

/**
 * The review record every Rule in the initial table carries. The Owner is the
 * reviewer of record: the equivalences below are the ones this project asserts
 * about Algerian names, and a Rule added later carries the record of its own
 * review, which is what the validator gate checks for.
 */
const REVIEW = Object.freeze({ reviewedBy: "yasserstudio", reviewedAt: "2026-09-06" });

/**
 * @typedef {{
 *   id: string,
 *   class: "canonical" | "conservative" | "loose",
 *   script: "arab" | "latn" | "any",
 *   why: string,
 *   reviewed: { reviewedBy: string, reviewedAt: string },
 * }} FoldRule
 */

/** @type {ReadonlyArray<FoldRule>} */
export const FOLD_RULES = Object.freeze([
  {
    id: "ar.presentation-forms-b",
    class: "canonical",
    script: "arab",
    why: "The positional shapes of Arabic Presentation Forms-B draw the letters of the Arabic block, so a name copied out of a PDF folds back to the letters it is written with.",
    reviewed: REVIEW,
  },
  {
    id: "ar.presentation-forms-a",
    class: "canonical",
    script: "arab",
    why: "The alef wasla and alef maqsura shapes of Arabic Presentation Forms-A are the same letters as their Arabic block originals.",
    reviewed: REVIEW,
  },
  {
    id: "ar.lam-alef-ligature",
    class: "canonical",
    script: "arab",
    why: "The lam-alef ligature is one glyph for two letters, so it folds to lam followed by bare alef and a search for either letter still reaches the name.",
    reviewed: REVIEW,
  },
  {
    id: "ar.tatweel",
    class: "canonical",
    script: "arab",
    why: "Tatweel stretches a letter for typesetting and says nothing about the name, so a padded spelling must reach the same key as an unpadded one.",
    reviewed: REVIEW,
  },
  {
    id: "ar.marks",
    class: "canonical",
    script: "arab",
    why: "Harakat, shadda, sukun, the superscript alef, the high hamza and the Quranic annotation marks are vocalisation a source may or may not have written, and nobody types them into a search box.",
    reviewed: REVIEW,
  },
  {
    id: "latn.combining-marks",
    class: "canonical",
    script: "latn",
    why: "A decomposed accent is the same spelling as a precomposed one, so removing the combining marks makes the two meet without asking the runtime to normalise anything.",
    reviewed: REVIEW,
  },
  {
    id: "any.invisible",
    class: "canonical",
    script: "any",
    why: "The soft hyphen, the zero-width characters, the bidi marks and the byte order mark are invisible on screen, so they are removed rather than allowed to split or change a name.",
    reviewed: REVIEW,
  },
  {
    id: "ar.alef-variants",
    class: "conservative",
    script: "arab",
    why: "Alef with hamza above, with hamza below, with madda and with wasla are written for the same letter and are routinely typed as bare alef.",
    reviewed: REVIEW,
  },
  {
    id: "ar.waw-hamza",
    class: "conservative",
    script: "arab",
    why: "Hamza carried on waw is an orthographic habit of one source rather than a different letter to search for.",
    reviewed: REVIEW,
  },
  {
    id: "ar.yaa-hamza",
    class: "conservative",
    script: "arab",
    why: "Hamza carried on yaa is an orthographic habit of one source rather than a different letter to search for.",
    reviewed: REVIEW,
  },
  {
    id: "ar.indic-digits",
    class: "conservative",
    script: "arab",
    why: "Which digits a keyboard produces must not change which places exist, so Arabic-Indic digits are the ASCII digits they count as.",
    reviewed: REVIEW,
  },
  {
    id: "ar.extended-indic-digits",
    class: "conservative",
    script: "arab",
    why: "The Eastern Arabic-Indic digits are the same numbers in a second set of shapes, and a source that uses them names the same place.",
    reviewed: REVIEW,
  },
  {
    id: "latn.accents",
    class: "conservative",
    script: "latn",
    why: "A French name is typed without its accents far more often than with them, so the accented letters of Latin-1 Supplement fold to their base letter.",
    reviewed: REVIEW,
  },
  {
    id: "latn.extended-a",
    class: "conservative",
    script: "latn",
    why: "Latin Extended-A holds the same idea one block further out, the macrons and carons of transliterated spellings and the French oe ligature, and they fold to the letters they are written over.",
    reviewed: REVIEW,
  },
  {
    id: "latn.extended-b",
    class: "conservative",
    script: "latn",
    why: "The accented letters of Latin Extended-B, among them the caron on g that Berber Latin spellings use, fold to their base letter; the letters of that block that are letters in their own right keep their own letter and only lose their capital.",
    reviewed: REVIEW,
  },
  {
    id: "any.separators",
    class: "conservative",
    script: "any",
    why: "A name is one query whether it was written with an apostrophe, a hyphen, a dash or a space, so every one of those ends a word instead of joining or splitting the key differently.",
    reviewed: REVIEW,
  },
  {
    id: "any.punctuation",
    class: "conservative",
    script: "any",
    why: "A comma, a full stop, a bracket or a quotation mark is around a name rather than in it, in either script, so it ends a word instead of riding into the key: a key never carries punctuation, and the full-text tokenizer that builds a catalog splits exactly where this package splits.",
    reviewed: REVIEW,
  },
  {
    id: "any.whitespace",
    class: "conservative",
    script: "any",
    why: "Repeated and leading separators are typing, not naming: a separator that meets no open word adds nothing to the key, so the key is the words joined by one space and a partial last word can still complete.",
    reviewed: REVIEW,
  },
  {
    id: "any.case",
    class: "conservative",
    script: "any",
    why: "Case is never a distinction between two places, and lower case is what both the browser index and the full-text tokenizer already produce. Case folding reaches the ASCII capitals and every capital a table names; lower-casing a letter no table names would mean asking the engine for its case pair, which is exactly the dependency this package refuses.",
    reviewed: REVIEW,
  },
  {
    id: "any.pass-through",
    class: "conservative",
    script: "any",
    why: "A character no table names is kept as it stands rather than dropped, because a name is better searchable by a letter this package has no opinion about than silently shortened.",
    reviewed: REVIEW,
  },
  {
    id: "ar.alef-maqsura-yaa",
    class: "loose",
    script: "arab",
    why: "Alef maqsura and yaa are written either way for the same final vowel, often by the same source, but the two are still different letters, so the equivalence belongs to the tier a match can be ranked down for.",
    reviewed: REVIEW,
  },
  {
    id: "ar.taa-marbuta-haa",
    class: "loose",
    script: "arab",
    why: "A name ending in taa marbuta is commonly typed with haa, and the reverse, but a reader does see two letters, so the equivalence belongs to the tier a match can be ranked down for.",
    reviewed: REVIEW,
  },
]);

/**
 * The Rules the key path applies by construction rather than from a table of
 * codepoints: whitespace collapsing, ASCII case folding, and keeping a character
 * no table names. Listed so that "every fold is a table or one of these" is a
 * closed statement a test can hold.
 *
 * @type {ReadonlyArray<string>}
 */
export const RULES_WITHOUT_A_TABLE = Object.freeze(["any.whitespace", "any.case", "any.pass-through"]);

/**
 * The two Rules that were considered and refused. They are recorded with their
 * reasons so that adding one later is an argument with a decision rather than a
 * question asked fresh by someone who never saw it.
 *
 * @type {ReadonlyArray<FoldRule & { class: "declined" }>}
 */
export const DECLINED_RULES = Object.freeze([
  {
    id: "ar.definite-article",
    class: "declined",
    script: "arab",
    why: "The Arabic definite article is never stripped, in either key. Whether a name carrying the article and a name without it are the same place is a fact about that place, not about the script, so it belongs to that place's own alias with its own source.",
    reviewed: REVIEW,
  },
  {
    id: "latn.transliteration",
    class: "declined",
    script: "any",
    why: "No Latin transliteration of an Arabic name is generated, and no Arabic form of a Latin name. A spelling that no source supplies is a fabricated name, and the products publish names rather than invent them.",
    reviewed: REVIEW,
  },
]);

/**
 * The Rules that state a fold the package does *not* apply. They can never appear
 * in an `explain` record, because nothing fires: a corpus case proves one of them
 * by the character, or the article, surviving into the expected keys.
 *
 * @type {ReadonlyArray<string>}
 */
export const NON_FIRING_RULES = Object.freeze([
  "any.pass-through",
  ...DECLINED_RULES.map((rule) => rule.id),
]);

/**
 * The codepoint sequences of the Rules that have no table of their own: the three
 * the key path applies by construction, and the two it declines. A table-backed
 * Rule takes its sequences from the table itself, so only these five are written
 * out here.
 */
const UNTABLED_SEQUENCES = new Map([
  // Two spaces become one; the same collapse trims a leading or trailing one.
  ["any.whitespace", [["\u0020\u0020", "\u0020"]]],
  // The ASCII capitals. Every other capital is lower-cased by the table that folds
  // it, which is why the key path never asks the engine for a letter's case pair.
  ["any.case", Array.from({ length: 26 }, (_, i) => [String.fromCharCode(0x41 + i), String.fromCharCode(0x61 + i)])],
  // A Rule about every codepoint no table names cannot list them, so it states the
  // one the corpus proves it with: the Berber Latin gamma, kept as it stands.
  ["any.pass-through", [["\u0263", "\u0263"]]],
  // Declined: the fold that is not applied, so what was refused is as legible as
  // what was accepted. The article stays, and no Latin spelling is invented.
  ["ar.definite-article", [["\u0627\u0644", ""]]],
  ["latn.transliteration", [["\u0648\u0647\u0631\u0627\u0646", "ouahran"]]],
]);

/** A Rule, with its sequences read out of the table it is, and frozen. */
function reviewedRule(rule) {
  const entries = RULE_ENTRIES.get(rule.id) ?? UNTABLED_SEQUENCES.get(rule.id);
  if (!entries) throw new Error(`${rule.id} has neither a table nor a written sequence`);
  return Object.freeze({
    id: rule.id,
    class: rule.class,
    script: rule.script,
    from: Object.freeze(entries.map(([from]) => from)),
    to: Object.freeze(entries.map(([, to]) => to)),
    why: rule.why,
    // Not spread into a fresh object unconditionally: a Rule with no review record
    // must reach the table without one, so the validator gate sees the absence
    // rather than an empty record this line invented.
    reviewed: rule.reviewed && Object.freeze({ ...rule.reviewed }),
  });
}

/**
 * The reviewed table, frozen, in the order the key path applies it and the two
 * declined Rules last. This is the package's answer to "what does GeoAlgeria
 * assert about Algerian names": every Rule, the exact codepoint sequences it maps
 * from and to, why, and who reviewed it.
 *
 * @type {ReadonlyArray<{
 *   id: string,
 *   class: "canonical" | "conservative" | "loose" | "declined",
 *   script: "arab" | "latn" | "any",
 *   from: ReadonlyArray<string>,
 *   to: ReadonlyArray<string>,
 *   why: string,
 *   reviewed: { reviewedBy: string, reviewedAt: string },
 * }>}
 */
export const rules = Object.freeze([...FOLD_RULES, ...DECLINED_RULES].map(reviewedRule));

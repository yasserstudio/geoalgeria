// The Rules, by their stable identifiers.
//
// Every fold the package applies has a name here, and a corpus case proves it.
// The identifiers are the durable part: a review record, a corpus case and, from
// the next release, a caller asking which Rule made a match all hold on to the
// same string, so a fold may be re-implemented but an id is not renamed.
//
// The reviewed table this catalogue becomes, with a reviewer and a date per Rule,
// is the next release's work. What is fixed here is the id, the class, the script
// and the sentence a speaker who is not a programmer can argue with.
//
// Class:
//   canonical     resolves how one name was written, without changing a letter
//   conservative  merges spellings a reader accepts as the same letter
//   loose         the extra tier, applied only by the Loose key

/**
 * @typedef {{
 *   id: string,
 *   class: "canonical" | "conservative" | "loose",
 *   script: "arab" | "latn" | "any",
 *   why: string,
 * }} FoldRule
 */

/** @type {ReadonlyArray<FoldRule>} */
export const FOLD_RULES = Object.freeze([
  {
    id: "ar.presentation-forms-b",
    class: "canonical",
    script: "arab",
    why: "The positional shapes of Arabic Presentation Forms-B draw the letters of the Arabic block, so a name copied out of a PDF folds back to the letters it is written with.",
  },
  {
    id: "ar.presentation-forms-a",
    class: "canonical",
    script: "arab",
    why: "The alef wasla and alef maqsura shapes of Arabic Presentation Forms-A are the same letters as their Arabic block originals.",
  },
  {
    id: "ar.lam-alef-ligature",
    class: "canonical",
    script: "arab",
    why: "The lam-alef ligature is one glyph for two letters, so it folds to lam followed by bare alef and a search for either letter still reaches the name.",
  },
  {
    id: "ar.tatweel",
    class: "canonical",
    script: "arab",
    why: "Tatweel stretches a letter for typesetting and says nothing about the name, so a padded spelling must reach the same key as an unpadded one.",
  },
  {
    id: "ar.marks",
    class: "canonical",
    script: "arab",
    why: "Harakat, shadda, sukun, the superscript alef, the high hamza and the Quranic annotation marks are vocalisation a source may or may not have written, and nobody types them into a search box.",
  },
  {
    id: "latn.combining-marks",
    class: "canonical",
    script: "latn",
    why: "A decomposed accent is the same spelling as a precomposed one, so removing the combining marks makes the two meet without asking the runtime to normalise anything.",
  },
  {
    id: "any.invisible",
    class: "canonical",
    script: "any",
    why: "The soft hyphen, the zero-width characters, the bidi marks and the byte order mark are invisible on screen, so they are removed rather than allowed to split or change a name.",
  },
  {
    id: "ar.alef-variants",
    class: "conservative",
    script: "arab",
    why: "Alef with hamza above, with hamza below, with madda and with wasla are written for the same letter and are routinely typed as bare alef.",
  },
  {
    id: "ar.waw-hamza",
    class: "conservative",
    script: "arab",
    why: "Hamza carried on waw is an orthographic habit of one source rather than a different letter to search for.",
  },
  {
    id: "ar.yaa-hamza",
    class: "conservative",
    script: "arab",
    why: "Hamza carried on yaa is an orthographic habit of one source rather than a different letter to search for.",
  },
  {
    id: "ar.indic-digits",
    class: "conservative",
    script: "arab",
    why: "Which digits a keyboard produces must not change which places exist, so Arabic-Indic digits are the ASCII digits they count as.",
  },
  {
    id: "ar.extended-indic-digits",
    class: "conservative",
    script: "arab",
    why: "The Eastern Arabic-Indic digits are the same numbers in a second set of shapes, and a source that uses them names the same place.",
  },
  {
    id: "latn.accents",
    class: "conservative",
    script: "latn",
    why: "A French name is typed without its accents far more often than with them, so the accented letters of Latin-1 Supplement fold to their base letter.",
  },
  {
    id: "latn.extended-a",
    class: "conservative",
    script: "latn",
    why: "Latin Extended-A holds the same idea one block further out, the macrons and carons of transliterated spellings and the French oe ligature, and they fold to the letters they are written over.",
  },
  {
    id: "latn.extended-b",
    class: "conservative",
    script: "latn",
    why: "The accented letters of Latin Extended-B, among them the caron on g that Berber Latin spellings use, fold to their base letter; the letters of that block that are letters in their own right are left alone.",
  },
  {
    id: "any.separators",
    class: "conservative",
    script: "any",
    why: "A name is one query whether it was written with an apostrophe, a hyphen, a dash or a space, so every one of those ends a word instead of joining or splitting the key differently.",
  },
  {
    id: "any.whitespace",
    class: "conservative",
    script: "any",
    why: "Repeated, leading and trailing whitespace is typing, not naming, so the key is the tokens joined by one space and a partial last word can still complete.",
  },
  {
    id: "any.case",
    class: "conservative",
    script: "any",
    why: "Case is never a distinction between two places, and lower case is what both the browser index and the full-text tokenizer already produce.",
  },
  {
    id: "any.pass-through",
    class: "conservative",
    script: "any",
    why: "A character no table names is kept as it stands rather than dropped, because a name is better searchable by a letter this package has no opinion about than silently shortened.",
  },
  {
    id: "ar.alef-maqsura-yaa",
    class: "loose",
    script: "arab",
    why: "Alef maqsura and yaa are written either way for the same final vowel, often by the same source, but the two are still different letters, so the equivalence belongs to the tier a match can be ranked down for.",
  },
  {
    id: "ar.taa-marbuta-haa",
    class: "loose",
    script: "arab",
    why: "A name ending in taa marbuta is commonly typed with haa, and the reverse, but a reader does see two letters, so the equivalence belongs to the tier a match can be ranked down for.",
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
 * @type {ReadonlyArray<{ id: string, class: "declined", script: "arab" | "latn" | "any", why: string }>}
 */
export const DECLINED_RULES = Object.freeze([
  {
    id: "ar.definite-article",
    class: "declined",
    script: "arab",
    why: "The Arabic definite article is never stripped, in either key. Whether a name carrying the article and a name without it are the same place is a fact about that place, not about the script, so it belongs to that place's own alias with its own source.",
  },
  {
    id: "latn.transliteration",
    class: "declined",
    script: "any",
    why: "No Latin transliteration of an Arabic name is generated, and no Arabic form of a Latin name. A spelling that no source supplies is a fabricated name, and the products publish names rather than invent them.",
  },
]);

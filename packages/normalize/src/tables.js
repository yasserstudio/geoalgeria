// The codepoint tables the Conservative key is made of.
//
// The package owns these outright. It does not ask the host runtime to decompose,
// case fold or classify anything, because a published catalog's keys must not
// change when the engine ships a new Unicode version, and because the folders
// this package replaces disagreed with each other precisely where they leaned on
// the engine's tables. Everything below is an explicit list, and a codepoint no
// list names is passed through unchanged.
//
// Blocks covered, by their Unicode range:
//   U+0300..U+036F  Combining Diacritical Marks (the marks a decomposed spelling carries)
//   U+0600..U+06FF  Arabic (letters, harakat, tatweel, Arabic-Indic digits)
//   U+FB50..U+FDFF  Arabic Presentation Forms-A (the letter forms Algerian names use)
//   U+FE70..U+FEFF  Arabic Presentation Forms-B (positional letter shapes and ligatures)

/** Every codepoint from `from` to `to` inclusive. */
function range(from, to) {
  const codes = [];
  for (let code = from; code <= to; code++) codes.push(code);
  return codes;
}

/**
 * Removed outright: they carry no letter of their own, so a key that kept them
 * would split on how a Source happened to vocalise or pad a name.
 */
export const REMOVED = new Set([
  ...range(0x0300, 0x036f), // combining diacritical marks, so a decomposed spelling meets its precomposed twin
  0x0640, //                   tatweel, the elongation padding
  ...range(0x064b, 0x065f), // harakat, shadda, sukun, and the combining hamza and madda a decomposed alef carries
  0x0670, //                   superscript alef
  ...range(0x200b, 0x200f), // zero-width space, the joiners, and the bidi marks
  ...range(0xfe70, 0xfe7f), // the harakat again, in their Presentation Forms-B shapes
  0xfeff, //                   byte order mark
]);

/**
 * Word boundaries: whitespace, and the apostrophe and hyphen variants a keyboard
 * or a Source may produce for the same name.
 */
export const SEPARATORS = new Set([
  0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, // tab, the line breaks, space
  0x00a0, 0x1680, ...range(0x2000, 0x200a), 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, // the other spaces
  0x0027, 0x0060, 0x2018, 0x2019, //               apostrophe, grave accent, the curly single quotes
  0x002d, ...range(0x2010, 0x2014), //             hyphen-minus, hyphen, non-breaking hyphen, figure dash, en dash, long dash
]);

/**
 * Latin letters that carry an accent in French place names, folded to their base
 * letter and to lower case in one step. Uppercase forms map straight to the
 * lower-case base, so case folding needs no second pass.
 */
const LATIN = [
  [0x00e0, "a"], [0x00e2, "a"], [0x00e4, "a"], // à â ä
  [0x00e7, "c"], //                               ç
  [0x00e8, "e"], [0x00e9, "e"], [0x00ea, "e"], [0x00eb, "e"], // è é ê ë
  [0x00ee, "i"], [0x00ef, "i"], //                î ï
  [0x00f4, "o"], [0x00f6, "o"], //                ô ö
  [0x00f9, "u"], [0x00fb, "u"], [0x00fc, "u"], // ù û ü
  [0x00c0, "a"], [0x00c2, "a"], [0x00c4, "a"], // À Â Ä
  [0x00c7, "c"], //                               Ç
  [0x00c8, "e"], [0x00c9, "e"], [0x00ca, "e"], [0x00cb, "e"], // È É Ê Ë
  [0x00ce, "i"], [0x00cf, "i"], //                Î Ï
  [0x00d4, "o"], [0x00d6, "o"], //                Ô Ö
  [0x00d9, "u"], [0x00db, "u"], [0x00dc, "u"], // Ù Û Ü
];

/**
 * Arabic letters that are written more than one way for the same sound. Alef and
 * its hamza and madda variants, and hamza carried on waw or yaa, all reduce to
 * the bare letter: the variant is an orthographic habit, not a different letter
 * to search for. Taa marbuta and alef maqsura are deliberately absent, they are
 * the Loose key's tier.
 */
const ARABIC = [
  [0x0622, "ا"], // آ alef with madda
  [0x0623, "ا"], // أ alef with hamza above
  [0x0625, "ا"], // إ alef with hamza below
  [0x0671, "ا"], // ٱ alef wasla
  [0x0624, "و"], // ؤ waw with hamza
  [0x0626, "ي"], // ئ yaa with hamza
];

/**
 * Arabic Presentation Forms-B (U+FE70..U+FEFF), the positional shapes some
 * Sources and a good deal of copied PDF text carry, folded back to the base
 * letter each shape draws. Each row is [first, last, base] over the block's
 * isolated, final, initial and medial forms in that order; the base is already
 * the conservative letter, so alef and hamza variants land on the bare letter
 * here too. U+FEF5..U+FEFC are the lam-alef ligatures, one glyph for two letters.
 */
const FORMS_B = [
  [0xfe80, 0xfe80, "ء"],
  [0xfe81, 0xfe84, "ا"], // آ and أ, isolated and final
  [0xfe85, 0xfe86, "و"], // ؤ
  [0xfe87, 0xfe88, "ا"], // إ
  [0xfe89, 0xfe8c, "ي"], // ئ
  [0xfe8d, 0xfe8e, "ا"],
  [0xfe8f, 0xfe92, "ب"],
  [0xfe93, 0xfe94, "ة"],
  [0xfe95, 0xfe98, "ت"],
  [0xfe99, 0xfe9c, "ث"],
  [0xfe9d, 0xfea0, "ج"],
  [0xfea1, 0xfea4, "ح"],
  [0xfea5, 0xfea8, "خ"],
  [0xfea9, 0xfeaa, "د"],
  [0xfeab, 0xfeac, "ذ"],
  [0xfead, 0xfeae, "ر"],
  [0xfeaf, 0xfeb0, "ز"],
  [0xfeb1, 0xfeb4, "س"],
  [0xfeb5, 0xfeb8, "ش"],
  [0xfeb9, 0xfebc, "ص"],
  [0xfebd, 0xfec0, "ض"],
  [0xfec1, 0xfec4, "ط"],
  [0xfec5, 0xfec8, "ظ"],
  [0xfec9, 0xfecc, "ع"],
  [0xfecd, 0xfed0, "غ"],
  [0xfed1, 0xfed4, "ف"],
  [0xfed5, 0xfed8, "ق"],
  [0xfed9, 0xfedc, "ك"],
  [0xfedd, 0xfee0, "ل"],
  [0xfee1, 0xfee4, "م"],
  [0xfee5, 0xfee8, "ن"],
  [0xfee9, 0xfeec, "ه"],
  [0xfeed, 0xfeee, "و"],
  [0xfeef, 0xfef0, "ى"],
  [0xfef1, 0xfef4, "ي"],
  [0xfef5, 0xfefc, "لا"], // the lam-alef ligatures, over all four alef variants
];

/**
 * Arabic Presentation Forms-A (U+FB50..U+FDFF) is mostly Persian and Urdu letters
 * and whole-word ligatures, none of which occur in Algerian place names. The two
 * rows below are the ones that do: the alef wasla and alef maqsura letter forms.
 * A codepoint elsewhere in the block passes through, and extending this table is
 * a deliberate act with a version bump behind it.
 */
const FORMS_A = [
  [0xfb50, 0xfb51, "ا"], // ٱ alef wasla, isolated and final
  [0xfbe8, 0xfbe9, "ى"], // ى alef maqsura, initial and medial
];

/** Codepoint to the string it folds to. */
export const FOLD = new Map([
  ...LATIN,
  ...ARABIC,
  ...range(0x0660, 0x0669).map((code, digit) => [code, String(digit)]), // Arabic-Indic digits
  ...range(0x06f0, 0x06f9).map((code, digit) => [code, String(digit)]), // Eastern Arabic-Indic digits
  ...[...FORMS_B, ...FORMS_A].flatMap(([first, last, base]) => range(first, last).map((code) => [code, base])),
]);

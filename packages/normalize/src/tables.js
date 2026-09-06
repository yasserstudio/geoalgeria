// The codepoint tables the keys are made of.
//
// The package owns these outright. It does not ask the host runtime to decompose,
// case fold or classify anything, because a published catalog's keys must not
// change when the engine ships a new Unicode version, and because the folders
// this package replaces disagreed with each other precisely where they leaned on
// the engine's tables. Everything below is an explicit list, and a codepoint no
// list names is passed through unchanged.
//
// Every table carries the id of the Rule it is, and `src/rules.js` says what that
// Rule asserts. A test holds the two together, so a table cannot be added without
// a Rule and a Rule cannot exist without a corpus case.
//
// Blocks covered, by their Unicode range:
//   U+0000..U+007F  ASCII (case folding, the apostrophe and hyphen separators, digits)
//   U+0080..U+00FF  Latin-1 Supplement (every accented letter, upper and lower case)
//   U+0100..U+017F  Latin Extended-A (the whole block, macrons, carons, the oe ligature)
//   U+0180..U+024F  Latin Extended-B (its accented letters; its own letters stay letters)
//   U+0300..U+036F  Combining Diacritical Marks (the marks a decomposed spelling carries)
//   U+0600..U+06FF  Arabic (letters, harakat, tatweel, Arabic-Indic digits)
//   U+0750..U+077F  Arabic Supplement (letters of other Arabic-script languages, no marks)
//   U+08A0..U+08FF  Arabic Extended-A (letters, and the marks at the end of the block)
//   U+FB50..U+FDFF  Arabic Presentation Forms-A (the letter forms Algerian names use)
//   U+FE70..U+FEFF  Arabic Presentation Forms-B (positional letter shapes and ligatures)
//
// Two of those blocks are covered by having nothing to do. Arabic Supplement is
// letters of other Arabic-script languages and carries no marks and no variant of
// an Arabic letter, and the letters of Arabic Extended-A are the same: like the
// Arabic block's own extra letters (peh, tcheh, veh, ng), they are letters in
// their own right, so they pass through and a name written with one is found by
// that letter. Whether such a letter stands for another one in a given name is a
// statement about that name, not about the script, and belongs to its alias.

/** Every codepoint from `from` to `to` inclusive. */
function range(from, to) {
  const codes = [];
  for (let code = from; code <= to; code++) codes.push(code);
  return codes;
}

/** Each `[first, last, base]` row expanded to one entry per codepoint. */
function spans(rows) {
  return rows.flatMap(([first, last, base]) => range(first, last).map((code) => [code, base]));
}

/**
 * Removed outright: they carry no letter of their own, so a key that kept them
 * would split on how a source happened to vocalise or pad a name.
 */
const REMOVE_GROUPS = [
  {
    id: "latn.combining-marks",
    codes: range(0x0300, 0x036f), // so a decomposed spelling meets its precomposed twin
  },
  {
    id: "ar.tatweel",
    codes: [0x0640], // the elongation padding
  },
  {
    id: "ar.marks",
    codes: [
      ...range(0x0610, 0x061a), // the Arabic honorific and annotation marks
      ...range(0x064b, 0x065f), // harakat, shadda, sukun, and the combining hamza and madda a decomposed alef carries
      0x0670, //                   superscript alef
      0x0674, //                   high hamza, the mark the precomposed high-hamza letters below decompose into
      ...range(0x06d6, 0x06ed), // the Quranic annotation marks, which a copied register entry can carry
      ...range(0x08d3, 0x08ff), // the marks at the end of Arabic Extended-A, and the ayah separator beside them
      ...range(0xfe70, 0xfe7f), // the Presentation Forms-B shapes of the harakat, and the tail fragment beside them
    ],
  },
  {
    id: "any.invisible",
    codes: [
      0x00ad, //                   soft hyphen, a printing hint that is invisible on screen
      ...range(0x200b, 0x200f), // zero-width space, the joiners, and the bidi marks
      0xfeff, //                   byte order mark
    ],
  },
];

/**
 * Word boundaries: whitespace, and the apostrophe and hyphen variants a keyboard
 * or a source may produce for the same name.
 */
const SEPARATOR_GROUP = {
  id: "any.separators",
  codes: [
    0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x0020, // tab, the line breaks, space
    0x00a0, 0x1680, ...range(0x2000, 0x200a), 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, // the other spaces
    0x0027, 0x0060, 0x02bc, 0x2018, 0x2019, //       apostrophe, grave accent, the transliteration apostrophe, the curly single quotes
    0x002d, ...range(0x2010, 0x2015), //             hyphen-minus, hyphen, non-breaking hyphen, figure dash, en dash, long dash, horizontal bar
  ],
};

/**
 * The letters of Latin-1 Supplement (U+00C0..U+00FF), folded to their base letter
 * and to lower case in one step. Uppercase forms map straight to the lower-case
 * base, so case folding needs no second pass and no letter of this block can reach
 * a key still capitalised. The first block is what French place names use; the rest
 * of the range follows so the declared block is covered rather than sampled.
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
  [0x00e1, "a"], [0x00e3, "a"], [0x00e5, "a"], [0x00e6, "ae"], // á ã å æ
  [0x00ec, "i"], [0x00ed, "i"], //                ì í
  [0x00f0, "d"], [0x00f1, "n"], //                ð ñ
  [0x00f2, "o"], [0x00f3, "o"], [0x00f5, "o"], [0x00f8, "o"], // ò ó õ ø
  [0x00fa, "u"], //                               ú
  [0x00fd, "y"], [0x00ff, "y"], //                ý ÿ
  [0x00fe, "th"], [0x00df, "ss"], //              þ ß
  [0x00c1, "a"], [0x00c3, "a"], [0x00c5, "a"], [0x00c6, "ae"], // Á Ã Å Æ
  [0x00cc, "i"], [0x00cd, "i"], //                Ì Í
  [0x00d0, "d"], [0x00d1, "n"], //                Ð Ñ
  [0x00d2, "o"], [0x00d3, "o"], [0x00d5, "o"], [0x00d8, "o"], // Ò Ó Õ Ø
  [0x00da, "u"], //                               Ú
  [0x00dd, "y"], //                               Ý
  [0x00de, "th"], //                              Þ
];

/**
 * Latin Extended-A (U+0100..U+017F) in full. Every codepoint of the block is a
 * letter of the Latin alphabet carrying a diacritic, or a ligature of two of
 * them, so the whole block folds to base letters in `[first, last, base]` runs,
 * upper and lower case together. Algerian material reaches this block through
 * transliterated spellings with macrons and carons, and through the French oe
 * ligature at U+0152.
 */
const LATIN_EXT_A = [
  [0x0100, 0x0105, "a"], //  Ā ā Ă ă Ą ą
  [0x0106, 0x010d, "c"], //  Ć ć Ĉ ĉ Ċ ċ Č č
  [0x010e, 0x0111, "d"], //  Ď ď Đ đ
  [0x0112, 0x011b, "e"], //  Ē ē Ĕ ĕ Ė ė Ę ę Ě ě
  [0x011c, 0x0123, "g"], //  Ĝ ĝ Ğ ğ Ġ ġ Ģ ģ
  [0x0124, 0x0127, "h"], //  Ĥ ĥ Ħ ħ
  [0x0128, 0x0131, "i"], //  Ĩ ĩ Ī ī Ĭ ĭ Į į İ ı
  [0x0132, 0x0133, "ij"], // Ĳ ĳ
  [0x0134, 0x0135, "j"], //  Ĵ ĵ
  [0x0136, 0x0138, "k"], //  Ķ ķ ĸ
  [0x0139, 0x0142, "l"], //  Ĺ ĺ Ļ ļ Ľ ľ Ŀ ŀ Ł ł
  [0x0143, 0x014b, "n"], //  Ń ń Ņ ņ Ň ň ŉ Ŋ ŋ
  [0x014c, 0x0151, "o"], //  Ō ō Ŏ ŏ Ő ő
  [0x0152, 0x0153, "oe"], // Œ œ
  [0x0154, 0x0159, "r"], //  Ŕ ŕ Ŗ ŗ Ř ř
  [0x015a, 0x0161, "s"], //  Ś ś Ŝ ŝ Ş ş Š š
  [0x0162, 0x0167, "t"], //  Ţ ţ Ť ť Ŧ ŧ
  [0x0168, 0x0173, "u"], //  Ũ ũ Ū ū Ŭ ŭ Ů ů Ű ű Ų ų
  [0x0174, 0x0175, "w"], //  Ŵ ŵ
  [0x0176, 0x0178, "y"], //  Ŷ ŷ Ÿ
  [0x0179, 0x017e, "z"], //  Ź ź Ż ż Ž ž
  [0x017f, 0x017f, "s"], //  ſ long s
];

/**
 * Latin Extended-B (U+0180..U+024F), the accented letters and the digraph
 * ligatures. The rest of the block is letters in their own right rather than
 * accented Latin letters: the open e and the gamma that Berber Latin uses, the
 * hooked and barred consonants of African orthographies, the tone letters. They
 * are not folded, because folding them would assert that a Berber letter is a
 * French one, which is a claim about a name and not about the script, and their
 * lower-case forms live outside the declared blocks anyway. The caron on g, which
 * Berber Latin does write over a Latin letter, is here.
 */
const LATIN_EXT_B = [
  [0x01a0, 0x01a1, "o"], //  Ơ ơ
  [0x01af, 0x01b0, "u"], //  Ư ư
  [0x01c4, 0x01c6, "dz"], // Ǆ ǅ ǆ
  [0x01c7, 0x01c9, "lj"], // Ǉ ǈ ǉ
  [0x01ca, 0x01cc, "nj"], // Ǌ ǋ ǌ
  [0x01cd, 0x01ce, "a"], //  Ǎ ǎ
  [0x01cf, 0x01d0, "i"], //  Ǐ ǐ
  [0x01d1, 0x01d2, "o"], //  Ǒ ǒ
  [0x01d3, 0x01dc, "u"], //  Ǔ ǔ Ǖ ǖ Ǘ ǘ Ǚ ǚ Ǜ ǜ
  [0x01de, 0x01e1, "a"], //  Ǟ ǟ Ǡ ǡ
  [0x01e2, 0x01e3, "ae"], // Ǣ ǣ
  [0x01e4, 0x01e7, "g"], //  Ǥ ǥ Ǧ ǧ
  [0x01e8, 0x01e9, "k"], //  Ǩ ǩ
  [0x01ea, 0x01ed, "o"], //  Ǫ ǫ Ǭ ǭ
  [0x01ee, 0x01ef, "z"], //  Ǯ ǯ
  [0x01f0, 0x01f0, "j"], //  ǰ
  [0x01f1, 0x01f3, "dz"], // Ǳ ǲ ǳ
  [0x01f4, 0x01f5, "g"], //  Ǵ ǵ
  [0x01f8, 0x01f9, "n"], //  Ǹ ǹ
  [0x01fa, 0x01fb, "a"], //  Ǻ ǻ
  [0x01fc, 0x01fd, "ae"], // Ǽ ǽ
  [0x01fe, 0x01ff, "o"], //  Ǿ ǿ
  [0x0200, 0x0203, "a"], //  Ȁ ȁ Ȃ ȃ
  [0x0204, 0x0207, "e"], //  Ȅ ȅ Ȇ ȇ
  [0x0208, 0x020b, "i"], //  Ȉ ȉ Ȋ ȋ
  [0x020c, 0x020f, "o"], //  Ȍ ȍ Ȏ ȏ
  [0x0210, 0x0213, "r"], //  Ȑ ȑ Ȓ ȓ
  [0x0214, 0x0217, "u"], //  Ȕ ȕ Ȗ ȗ
  [0x0218, 0x0219, "s"], //  Ș ș
  [0x021a, 0x021b, "t"], //  Ț ț
  [0x021e, 0x021f, "h"], //  Ȟ ȟ
  [0x0226, 0x0227, "a"], //  Ȧ ȧ
  [0x0228, 0x0229, "e"], //  Ȩ ȩ
  [0x022a, 0x0231, "o"], //  Ȫ ȫ Ȭ ȭ Ȯ ȯ Ȱ ȱ
  [0x0232, 0x0233, "y"], //  Ȳ ȳ
];

/**
 * Arabic letters that are written more than one way for the same sound. Alef and
 * its hamza and madda variants, and hamza carried on waw or yaa, all reduce to
 * the bare letter: the variant is an orthographic habit, not a different letter
 * to search for. The high-hamza letters at U+0675..U+0678 are the precomposed
 * spellings of the same thing. Taa marbuta and alef maqsura are deliberately
 * absent, they are the Loose key's tier.
 */
const ALEF_VARIANTS = [
  [0x0622, "ا"], // آ alef with madda
  [0x0623, "ا"], // أ alef with hamza above
  [0x0625, "ا"], // إ alef with hamza below
  [0x0671, "ا"], // ٱ alef wasla
  [0x0672, "ا"], // ٲ alef with wavy hamza above
  [0x0673, "ا"], // ٳ alef with wavy hamza below
  [0x0675, "ا"], // ٵ high hamza alef
];

const WAW_HAMZA = [
  [0x0624, "و"], // ؤ waw with hamza
  [0x0676, "و"], // ٶ high hamza waw
];

const YAA_HAMZA = [
  [0x0626, "ي"], // ئ yaa with hamza
  [0x0678, "ي"], // ٸ high hamza yaa
];

/**
 * Arabic Presentation Forms-B (U+FE70..U+FEFF), the positional shapes some
 * sources and a good deal of copied PDF text carry, folded back to the base
 * letter each shape draws. Each row is [first, last, base] over the block's
 * isolated, final, initial and medial forms in that order; the base is already
 * the conservative letter, so alef and hamza variants land on the bare letter
 * here too.
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
];

/** U+FEF5..U+FEFC, one glyph for lam and alef, over all four alef variants. */
const LAM_ALEF = [[0xfef5, 0xfefc, "لا"]];

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

/** Each fold table, under the id of the Rule it is. */
const FOLD_GROUPS = [
  { id: "ar.presentation-forms-b", entries: spans(FORMS_B) },
  { id: "ar.presentation-forms-a", entries: spans(FORMS_A) },
  { id: "ar.lam-alef-ligature", entries: spans(LAM_ALEF) },
  { id: "ar.alef-variants", entries: ALEF_VARIANTS },
  { id: "ar.waw-hamza", entries: WAW_HAMZA },
  { id: "ar.yaa-hamza", entries: YAA_HAMZA },
  { id: "ar.indic-digits", entries: range(0x0660, 0x0669).map((code, digit) => [code, String(digit)]) },
  { id: "ar.extended-indic-digits", entries: range(0x06f0, 0x06f9).map((code, digit) => [code, String(digit)]) },
  { id: "latn.accents", entries: LATIN },
  { id: "latn.extended-a", entries: spans(LATIN_EXT_A) },
  { id: "latn.extended-b", entries: spans(LATIN_EXT_B) },
];

/**
 * The Loose tier: the two pairs a speaker may spell either way. Applied to the
 * Conservative key's own output, so a name reaching them as a presentation form
 * or a decomposed spelling is folded here too.
 */
const LOOSE_GROUPS = [
  { id: "ar.alef-maqsura-yaa", entries: [[0x0649, "ي"]] }, // ى
  { id: "ar.taa-marbuta-haa", entries: [[0x0629, "ه"]] }, //  ة
];

/** Removed before anything else looks at them. */
export const REMOVED = new Set(REMOVE_GROUPS.flatMap((group) => group.codes));

/** Word boundaries. */
export const SEPARATORS = new Set(SEPARATOR_GROUP.codes);

/** Codepoint to the string it folds to, in the Conservative key. */
export const FOLD = new Map(FOLD_GROUPS.flatMap((group) => group.entries));

/** Codepoint to the string it folds to, only in the Loose key. */
export const LOOSE = new Map(LOOSE_GROUPS.flatMap((group) => group.entries));

/** The Rule ids the tables above stand for, so a test can hold them against the catalogue. */
export const TABLE_RULE_IDS = Object.freeze(
  [...REMOVE_GROUPS, SEPARATOR_GROUP, ...FOLD_GROUPS, ...LOOSE_GROUPS].map((group) => group.id),
);

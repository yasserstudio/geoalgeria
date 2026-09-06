// The Golden corpus for the Conservative key.
//
// Every case is one input and the exact key it must produce, with a note naming
// the rule it proves. The corpus is the contract: the package's own tests, and
// later every consumer that builds an index, assert against this array rather
// than against hand-written cases of their own.
//
// Inputs are real Algerian place names, or synthetic strings built from them.
// Codepoints that are invisible on screen, or that a text editor would happily
// rewrite (combining marks, presentation forms, separator variants), are written
// as escapes so a reader can see what a case is actually about.

/** @type {ReadonlyArray<{ input: string, conservative: string, note: string }>} */
export const corpus = Object.freeze([
  // Latin: precomposed accents on the letters French place names use.
  {
    input: "Béjaïa",
    conservative: "bejaia",
    note: "Latin precomposed accents fold to their base letter and the key is lower case",
  },
  {
    input: "Bejaia",
    conservative: "bejaia",
    note: "the unaccented spelling of the same name reaches the same key",
  },
  {
    input: "Béjäia",
    conservative: "bejaia",
    note: "Bejaia written decomposed: combining marks U+0300 to U+036F are stripped",
  },
  {
    input: "Aïn Témouchent",
    conservative: "ain temouchent",
    note: "two accented letters in one name, the word boundary preserved",
  },
  {
    input: "Aïn Témouchent",
    conservative: "ain temouchent",
    note: "Ain Temouchent written decomposed reaches the same key",
  },
  {
    input: "Bordj Bou Arréridj",
    conservative: "bordj bou arreridj",
    note: "three words survive as three words",
  },
  {
    input: "Sidi Bel Abbès",
    conservative: "sidi bel abbes",
    note: "the grave accent folds",
  },
  {
    input: "SÉTIF",
    conservative: "setif",
    note: "an uppercase accented letter folds and the key case folds to lower",
  },
  {
    input: "Ghardaïa",
    conservative: "ghardaia",
    note: "the diaeresis folds",
  },
  {
    input: "Aïn Defla",
    conservative: "ain defla",
    note: "an accent inside the first word of a two-word name",
  },
  {
    input: "Tlemcen",
    conservative: "tlemcen",
    note: "a name no rule touches passes through, lower cased",
  },
  {
    input: "Constantine",
    conservative: "constantine",
    note: "a plain ASCII name loses nothing",
  },

  // Latin: apostrophe, hyphen and whitespace variants.
  {
    input: "El M'Ghair",
    conservative: "el m ghair",
    note: "the ASCII apostrophe is a separator, not a letter",
  },
  {
    input: "El M’Ghair",
    conservative: "el m ghair",
    note: "the curly apostrophe U+2019 a phone keyboard produces is the same separator",
  },
  {
    input: "M‘Sila",
    conservative: "m sila",
    note: "the left single quotation mark U+2018 is a separator",
  },
  {
    input: "M`Sila",
    conservative: "m sila",
    note: "the grave accent U+0060, typed as an apostrophe, is a separator",
  },
  {
    input: "Sidi-Bel-Abbes",
    conservative: "sidi bel abbes",
    note: "the ASCII hyphen is a separator",
  },
  {
    input: "Sidi‐Bel‑Abbes",
    conservative: "sidi bel abbes",
    note: "hyphen U+2010 and non-breaking hyphen U+2011 are the same separator",
  },
  {
    input: "Alger–Centre—Rue‒Didouche",
    conservative: "alger centre rue didouche",
    note: "en dash U+2013, long dash U+2014 and figure dash U+2012 are separators",
  },
  {
    input: "   Oran    El   Bahia  ",
    conservative: "oran el bahia",
    note: "leading, trailing and repeated whitespace collapses to single spaces",
  },
  {
    input: "Oran El\tBahia",
    conservative: "oran el bahia",
    note: "a non-breaking space and a tab are whitespace like any other",
  },
  {
    input: "",
    conservative: "",
    note: "the empty string keys to the empty string",
  },
  {
    input: "   ",
    conservative: "",
    note: "whitespace alone keys to the empty string",
  },

  // Arabic: combining marks and tatweel.
  {
    input: "بِجَايَة",
    conservative: "بجاية",
    note: "harakat U+064B to U+0652 are removed",
  },
  {
    input: "بجاية",
    conservative: "بجاية",
    note: "the same name without harakat reaches the same key",
  },
  {
    input: "الجـــزائر",
    conservative: "الجزاير",
    note: "tatweel U+0640 is removed, and yaa with hamza folds to yaa",
  },
  {
    input: "تيزي وزو",
    conservative: "تيزي وزو",
    note: "an Arabic name no rule touches passes through with its word boundary",
  },
  {
    input: "مُحَمَّدِيَّة",
    conservative: "محمدية",
    note: "shadda U+0651 and the vowels around it are removed",
  },
  {
    input: "رحمٰن",
    conservative: "رحمن",
    note: "superscript alef U+0670 is removed with the other Arabic combining marks",
  },

  // Arabic: alef and hamza variants.
  {
    input: "أدرار",
    conservative: "ادرار",
    note: "alef with hamza above U+0623 folds to bare alef",
  },
  {
    input: "إدرار",
    conservative: "ادرار",
    note: "alef with hamza below U+0625 folds to bare alef",
  },
  {
    input: "آدرار",
    conservative: "ادرار",
    note: "alef with madda U+0622 folds to bare alef",
  },
  {
    input: "ٱدرار",
    conservative: "ادرار",
    note: "alef wasla U+0671 folds to bare alef",
  },
  {
    input: "أدرار",
    conservative: "ادرار",
    note: "Adrar written decomposed: hamza above U+0654 is stripped from the alef",
  },
  {
    input: "مسؤول",
    conservative: "مسوول",
    note: "waw with hamza U+0624 folds to waw",
  },
  {
    input: "بئر العاتر",
    conservative: "بير العاتر",
    note: "yaa with hamza U+0626 folds to yaa",
  },

  // Arabic: presentation forms.
  {
    input: "ﺃﺩﺭﺍﺭ",
    conservative: "ادرار",
    note: "Adrar in Arabic Presentation Forms-B folds back to the base letters",
  },
  {
    input: "ﺍﻟﺠﺰﺍﺋﺮ",
    conservative: "الجزاير",
    note: "Alger in Arabic Presentation Forms-B, initial, medial and final shapes together",
  },
  {
    input: "ﻻﻟﺔ",
    conservative: "لالة",
    note: "the lam-alef ligature U+FEFB decomposes into lam and bare alef",
  },
  {
    input: "ﭐدرار",
    conservative: "ادرار",
    note: "alef wasla in Arabic Presentation Forms-A folds to bare alef",
  },

  // Arabic: the loose tier is NOT applied by the Conservative key.
  {
    input: "قسنطينة",
    conservative: "قسنطينة",
    note: "taa marbuta stays taa marbuta, folding it to haa is the Loose key",
  },
  {
    input: "مصطفى",
    conservative: "مصطفى",
    note: "alef maqsura stays alef maqsura, folding it to yaa is the Loose key",
  },

  // Digits.
  {
    input: "حي ٣٤٥ وهران",
    conservative: "حي 345 وهران",
    note: "Arabic-Indic digits U+0660 to U+0669 fold to ASCII digits",
  },
  {
    input: "حي ۳۴۵ وهران",
    conservative: "حي 345 وهران",
    note: "Eastern Arabic-Indic digits U+06F0 to U+06F9 fold to ASCII digits",
  },
  {
    input: "Cité 20 Août 1955",
    conservative: "cite 20 aout 1955",
    note: "ASCII digits pass through beside folded Latin letters",
  },

  // Mixed script.
  {
    input: "Wilaya الجزائر 16",
    conservative: "wilaya الجزاير 16",
    note: "a mixed Latin and Arabic name keeps both scripts and its word boundaries",
  },
]);

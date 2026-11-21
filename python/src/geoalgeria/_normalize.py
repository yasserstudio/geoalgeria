"""The Conservative key, the Loose key and the tokenizer, ported from `@geoalgeria/normalize`.

A port of `packages/normalize/src/tables.js` and `src/keys.js`, table for table
and in the same order, so a Python index agrees with every other GeoAlgeria index
character for character. Like the npm package it asks the runtime to decompose,
case fold or classify nothing: every fold is an explicit codepoint here, and a
codepoint no table names passes through unchanged. The tests prove it against the
Golden corpus and against the npm keys of every Basic Multilingual Plane codepoint,
so a change to either side that the other did not make fails.
"""
from __future__ import annotations

from typing import Dict, Iterable, List, Tuple


def _range(first: int, last: int) -> List[int]:
    return list(range(first, last + 1))


def _spans(rows: Iterable[Tuple[int, int, str]]) -> List[Tuple[int, str]]:
    return [(code, base) for first, last, base in rows for code in _range(first, last)]


# Removed outright: latn.combining-marks, ar.tatweel, ar.marks, any.invisible.
_REMOVED = (
    _range(0x0300, 0x036F)
    + [0x0640]
    + _range(0x0610, 0x061A) + _range(0x064B, 0x065F) + [0x0670, 0x0674]
    + _range(0x06D6, 0x06ED) + _range(0x08D3, 0x08FF) + _range(0xFE70, 0xFE7F)
    + [0x00AD] + _range(0x200B, 0x200F) + [0xFEFF]
)

# Word boundaries: any.separators, then any.punctuation.
_SEPARATORS = (
    [0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x0020]
    + [0x00A0, 0x1680] + _range(0x2000, 0x200A) + [0x2028, 0x2029, 0x202F, 0x205F, 0x3000]
    + [0x0027, 0x0060, 0x02BC, 0x2018, 0x2019]
    + [0x002D] + _range(0x2010, 0x2015)
    + _range(0x0021, 0x0026) + _range(0x0028, 0x002C) + [0x002E, 0x002F]
    + _range(0x003A, 0x0040) + _range(0x005B, 0x005F) + _range(0x007B, 0x007E)
    + [0x00AB, 0x00BB, 0x060C, 0x061B, 0x061F, 0x06D4]
    + _range(0x2016, 0x2017) + _range(0x201A, 0x2027) + _range(0x2030, 0x205E)
)

_LATIN = [  # latn.accents, Latin-1 Supplement
    (0x00E0, "a"), (0x00E2, "a"), (0x00E4, "a"), (0x00E7, "c"),
    (0x00E8, "e"), (0x00E9, "e"), (0x00EA, "e"), (0x00EB, "e"),
    (0x00EE, "i"), (0x00EF, "i"), (0x00F4, "o"), (0x00F6, "o"),
    (0x00F9, "u"), (0x00FB, "u"), (0x00FC, "u"),
    (0x00C0, "a"), (0x00C2, "a"), (0x00C4, "a"), (0x00C7, "c"),
    (0x00C8, "e"), (0x00C9, "e"), (0x00CA, "e"), (0x00CB, "e"),
    (0x00CE, "i"), (0x00CF, "i"), (0x00D4, "o"), (0x00D6, "o"),
    (0x00D9, "u"), (0x00DB, "u"), (0x00DC, "u"),
    (0x00E1, "a"), (0x00E3, "a"), (0x00E5, "a"), (0x00E6, "ae"),
    (0x00EC, "i"), (0x00ED, "i"), (0x00F0, "d"), (0x00F1, "n"),
    (0x00F2, "o"), (0x00F3, "o"), (0x00F5, "o"), (0x00F8, "o"),
    (0x00FA, "u"), (0x00FD, "y"), (0x00FF, "y"), (0x00FE, "th"), (0x00DF, "ss"),
    (0x00C1, "a"), (0x00C3, "a"), (0x00C5, "a"), (0x00C6, "ae"),
    (0x00CC, "i"), (0x00CD, "i"), (0x00D0, "d"), (0x00D1, "n"),
    (0x00D2, "o"), (0x00D3, "o"), (0x00D5, "o"), (0x00D8, "o"),
    (0x00DA, "u"), (0x00DD, "y"), (0x00DE, "th"),
]

_LATIN_EXT_A = [  # latn.extended-a, the whole block
    (0x0100, 0x0105, "a"), (0x0106, 0x010D, "c"), (0x010E, 0x0111, "d"),
    (0x0112, 0x011B, "e"), (0x011C, 0x0123, "g"), (0x0124, 0x0127, "h"),
    (0x0128, 0x0131, "i"), (0x0132, 0x0133, "ij"), (0x0134, 0x0135, "j"),
    (0x0136, 0x0138, "k"), (0x0139, 0x0142, "l"), (0x0143, 0x014B, "n"),
    (0x014C, 0x0151, "o"), (0x0152, 0x0153, "oe"), (0x0154, 0x0159, "r"),
    (0x015A, 0x0161, "s"), (0x0162, 0x0167, "t"), (0x0168, 0x0173, "u"),
    (0x0174, 0x0175, "w"), (0x0176, 0x0178, "y"), (0x0179, 0x017E, "z"),
    (0x017F, 0x017F, "s"),
]

_LATIN_EXT_B = [  # latn.extended-b, the accented letters and digraph ligatures
    (0x01A0, 0x01A1, "o"), (0x01AF, 0x01B0, "u"), (0x01C4, 0x01C6, "dz"),
    (0x01C7, 0x01C9, "lj"), (0x01CA, 0x01CC, "nj"), (0x01CD, 0x01CE, "a"),
    (0x01CF, 0x01D0, "i"), (0x01D1, 0x01D2, "o"), (0x01D3, 0x01DC, "u"),
    (0x01DE, 0x01E1, "a"), (0x01E2, 0x01E3, "ae"), (0x01E4, 0x01E7, "g"),
    (0x01E8, 0x01E9, "k"), (0x01EA, 0x01ED, "o"), (0x01EE, 0x01EF, "z"),
    (0x01F0, 0x01F0, "j"), (0x01F1, 0x01F3, "dz"), (0x01F4, 0x01F5, "g"),
    (0x01F8, 0x01F9, "n"), (0x01FA, 0x01FB, "a"), (0x01FC, 0x01FD, "ae"),
    (0x01FE, 0x01FF, "o"), (0x0200, 0x0203, "a"), (0x0204, 0x0207, "e"),
    (0x0208, 0x020B, "i"), (0x020C, 0x020F, "o"), (0x0210, 0x0213, "r"),
    (0x0214, 0x0217, "u"), (0x0218, 0x0219, "s"), (0x021A, 0x021B, "t"),
    (0x021E, 0x021F, "h"), (0x0226, 0x0227, "a"), (0x0228, 0x0229, "e"),
    (0x022A, 0x0231, "o"), (0x0232, 0x0233, "y"),
]

# The capitals of the Berber Latin letters, to their own lower-case forms.
_LATIN_EXT_B_CASE = [
    (0x0186, "ɔ"), (0x018E, "ǝ"), (0x018F, "ə"), (0x0190, "ɛ"), (0x0194, "ɣ"),
]

_ALEF, _WAW, _YAA = "ا", "و", "ي"

_FORMS_B = [  # ar.presentation-forms-b, isolated, final, initial and medial shapes
    (0xFE80, 0xFE80, "ء"), (0xFE81, 0xFE84, _ALEF), (0xFE85, 0xFE86, _WAW),
    (0xFE87, 0xFE88, _ALEF), (0xFE89, 0xFE8C, _YAA), (0xFE8D, 0xFE8E, _ALEF),
    (0xFE8F, 0xFE92, "ب"), (0xFE93, 0xFE94, "ة"), (0xFE95, 0xFE98, "ت"),
    (0xFE99, 0xFE9C, "ث"), (0xFE9D, 0xFEA0, "ج"), (0xFEA1, 0xFEA4, "ح"),
    (0xFEA5, 0xFEA8, "خ"), (0xFEA9, 0xFEAA, "د"), (0xFEAB, 0xFEAC, "ذ"),
    (0xFEAD, 0xFEAE, "ر"), (0xFEAF, 0xFEB0, "ز"), (0xFEB1, 0xFEB4, "س"),
    (0xFEB5, 0xFEB8, "ش"), (0xFEB9, 0xFEBC, "ص"), (0xFEBD, 0xFEC0, "ض"),
    (0xFEC1, 0xFEC4, "ط"), (0xFEC5, 0xFEC8, "ظ"), (0xFEC9, 0xFECC, "ع"),
    (0xFECD, 0xFED0, "غ"), (0xFED1, 0xFED4, "ف"), (0xFED5, 0xFED8, "ق"),
    (0xFED9, 0xFEDC, "ك"), (0xFEDD, 0xFEE0, "ل"), (0xFEE1, 0xFEE4, "م"),
    (0xFEE5, 0xFEE8, "ن"), (0xFEE9, 0xFEEC, "ه"), (0xFEED, 0xFEEE, _WAW),
    (0xFEEF, 0xFEF0, "ى"), (0xFEF1, 0xFEF4, _YAA),
]

_FOLD: Dict[int, str] = dict(
    _spans(_FORMS_B)
    + _spans([(0xFB50, 0xFB51, _ALEF), (0xFBE8, 0xFBE9, "ى")])  # ar.presentation-forms-a
    + _spans([(0xFEF5, 0xFEFC, "لا")])  # ar.lam-alef-ligature
    + [(c, _ALEF) for c in (0x0622, 0x0623, 0x0625, 0x0671, 0x0672, 0x0673, 0x0675)]  # ar.alef-variants
    + [(0x0624, _WAW), (0x0676, _WAW)]  # ar.waw-hamza
    + [(0x0626, _YAA), (0x0678, _YAA)]  # ar.yaa-hamza
    + [(0x0660 + d, str(d)) for d in range(10)]  # ar.indic-digits
    + [(0x06F0 + d, str(d)) for d in range(10)]  # ar.extended-indic-digits
    + _LATIN
    + _spans(_LATIN_EXT_A)
    + _spans(_LATIN_EXT_B) + _LATIN_EXT_B_CASE
)

# The Loose tier: ar.alef-maqsura-yaa and ar.taa-marbuta-haa, over the Conservative key.
_LOOSE = {0x0649: _YAA, 0x0629: "ه"}

# One lookup per codepoint: None removes it, " " ends a word, anything else is its fold.
_TABLE: Dict[int, "str | None"] = {**_FOLD, **{c: " " for c in _SEPARATORS}, **{c: None for c in _REMOVED}}
_TABLE.update({c: chr(c + 0x20) for c in range(0x41, 0x5B)})  # any.case, ASCII capitals only


def tokenize(text: str) -> List[str]:
    """The words a name folds to, in order: the split a full-text index is built from."""
    tokens: List[str] = []
    token = ""
    for character in text:
        folded = _TABLE.get(ord(character), character)
        if folded is None:
            continue
        if folded == " ":
            if token:
                tokens.append(token)
            token = ""
            continue
        token += folded
    if token:
        tokens.append(token)
    return tokens


def conservative_key(text: str) -> str:
    """The Conservative key: the strict fold every GeoAlgeria index reproduces byte for byte."""
    return " ".join(tokenize(text))


def loose_key(text: str) -> str:
    """The Loose key: the Conservative key with alef maqsura read as yaa and taa marbuta as haa."""
    return conservative_key(text).translate(_LOOSE)

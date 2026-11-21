import pytest

import geoalgeria as g


def test_every_golden_corpus_case_byte_for_byte(golden):
    assert len(golden["corpus"]) > 50
    for case in golden["corpus"]:
        note = f"{case['input']!r}: {case['note']}"
        assert g.conservative_key(case["input"]) == case["conservative"], note
        assert g.loose_key(case["input"]) == case["loose"], note
        assert g.tokenize(case["input"]) == case["tokens"], note


def test_every_codepoint_folds_as_npm_does(npm_keys):
    # Each codepoint between two letters, so a removed character ("ab"), a word
    # boundary ("a b"), a fold and a pass-through all key differently. Every
    # Basic Multilingual Plane codepoint but the surrogates, plus a sample of the
    # supplementary planes.
    codes = [c for c in range(0x10000) if not 0xD800 <= c <= 0xDFFF]
    codes += [0x10000, 0x1D400, 0x1F600, 0x20000, 0xE0001, 0x10FFFF]
    texts = [f"a{chr(c)}b" for c in codes]
    expected = npm_keys(texts)
    mismatches = [
        (hex(c), (g.conservative_key(t), g.loose_key(t)), want)
        for c, t, want in zip(codes, texts, expected)
        if (g.conservative_key(t), g.loose_key(t)) != want
    ]
    assert mismatches == []


def test_keys_of_real_names_agree_with_npm(npm_keys):
    names = [r[k] for r in g.wilayas() + g.communes() for k in ("name_fr", "name_ar") if r.get(k)]
    names += ["  Sidi--Bel   Abbès  ", "﻿آدرار‏", "قُسَنْطِينَة", "ﻻﻏﻮﺍﻁ", "١٢٣ ۴۵۶"]
    assert [(g.conservative_key(n), g.loose_key(n)) for n in names] == npm_keys(names)


def test_normalize_is_a_deprecated_alias_of_the_conservative_key():
    with pytest.warns(DeprecationWarning, match="conservative_key"):
        assert g.normalize("Béjaïa") == g.conservative_key("Béjaïa") == "bejaia"

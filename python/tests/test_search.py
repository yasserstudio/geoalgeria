import math

import pytest

import geoalgeria as g
from geoalgeria._search import match_class


def brief(result):
    """The fields the shared fixture compares."""
    out = {"type": result["type"], "code": result["code"], "match": result["match"]}
    if "matched" in result:
        out["matched"] = result["matched"]
    return out


def test_every_match_case_in_the_golden_corpus(golden):
    assert golden["matchCases"]
    for case in golden["matchCases"]:
        assert match_class(case["query"], case["name"]) == case["class"], f"{case['id']}: {case['note']}"


def test_every_case_in_the_shared_expectations_file(expectations):
    assert len(expectations["cases"]) >= 24
    for case in expectations["cases"]:
        got = [brief(r) for r in g.search(case["query"], **case["options"])]
        head = got if case["complete"] else got[: len(case["results"])]
        assert head == case["results"], f"{case['id']}: {case['query']!r} ({case['note']})"


def test_full_results_agree_with_npm_search(npm_search):
    # Every field of every result, not only the leading ones, for every current
    # name, the first letters of each, every Former name and a few odd queries.
    history = g._name_history()
    names = [r[k] for r in g.wilayas() + g.dairas() + g.communes() for k in ("name_fr", "name_ar") if r.get(k)]
    names += [n for e in history["wilayas"] + history["communes"] for n in e["former_names_fr"] + e["former_names_ar"]]
    queries = sorted(set(names)) + sorted({n[:k] for n in names for k in (1, 2, 3)})
    queries += ["ain d", "AÏN  ", "-", "1", "١", "sidi bel", "عين الدفلي", "el"]
    calls = [[q, {"limit": 100000}] for q in queries]
    calls += [[q, {"types": t}] for q in ("oran", "a", "ع") for t in (["wilaya"], ["daira", "commune"], [])]
    want = npm_search(calls)
    got = [g.search(q, **o) for q, o in calls]
    mismatches = [(c, w[:3], r[:3]) for c, w, r in zip(calls, want, got) if w != r]
    assert mismatches == [], f"{len(mismatches)} of {len(calls)} calls differ"


def test_a_result_carries_exactly_the_published_fields():
    fields = {"type", "code", "name_fr", "name_ar", "wilaya_code", "match"}
    assert set(g.search("oran")[0]) == fields
    former = g.search("Lemcene")[0]
    assert set(former) == fields | {"matched"} and former["matched"] == "former"
    wilaya = g.search("Oran", types=["wilaya"])[0]
    assert wilaya["wilaya_code"] == wilaya["code"] == 31


def test_limit_and_types_arguments():
    assert len(g.search("a", limit=None)) == len(g.search("a", limit=math.inf)) > 10
    assert g.search("a", limit=0) == g.search("a", limit=-5) == []
    assert g.search("oran", types=("daira",)) == g.search("oran", types=["daira"])
    assert g.search(None) == []
    with pytest.raises(ValueError, match="unknown type 'town'"):
        g.search("oran", types=["town"])
    with pytest.raises(TypeError):
        g.search("oran", types="wilaya")


def test_results_are_fresh_objects():
    g.search("oran")[0]["name_fr"] = "x"
    assert g.search("oran")[0]["name_fr"] != "x"


def test_the_readme_example_runs():
    import doctest
    from pathlib import Path

    readme = Path(__file__).resolve().parents[1] / "README.md"
    result = doctest.testfile(str(readme), module_relative=False, globs={"geoalgeria": g})
    assert result.attempted and not result.failed

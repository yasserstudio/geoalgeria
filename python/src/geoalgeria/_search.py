"""`search()`: ranked Wilayas, Dairas and Communes, ported from `packages/dataset/search.js`.

The Match class comes from the Conservative and Loose keys alone, and the ranking
is the npm package's: class, then type, then the Conservative key of the French
name, then code. The tests hold this file to the shared expectations fixture and
to the npm `search()` itself, field for field.
"""
from __future__ import annotations

import math
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from ._normalize import conservative_key, loose_key

CLASS_RANK = {"exact": 0, "prefix": 1, "loose": 2}
TYPE_RANK = {"wilaya": 0, "daira": 1, "commune": 2}

Keys = List[Tuple[str, str]]


def _classify(q: str, ql: str, n: str, nl: str) -> str:
    if q == n:
        return "exact"
    if n.startswith(q):
        return "prefix"
    if ql == nl or nl.startswith(ql):
        return "loose"
    return "none"


def match_class(query: str, name: str) -> str:
    """What a query and a name amount to: "exact", "prefix", "loose" or "none"."""
    q, n = conservative_key(query), conservative_key(name)
    if q == "":
        return "exact" if n == "" else "none"
    return _classify(q, loose_key(query), n, loose_key(name))


def _keys(names: Iterable[Any]) -> Keys:
    return [(conservative_key(n), loose_key(n)) for n in names if isinstance(n, str) and n != ""]


def _best(q: str, ql: str, keys: Keys) -> Optional[str]:
    """The best Match class any of a record's names gives, or None."""
    found = None
    for c, l in keys:
        cls = _classify(q, ql, c, l)
        if cls != "none" and (found is None or CLASS_RANK[cls] < CLASS_RANK[found]):
            found = cls
    return found


def build_index(wilayas: Sequence[dict], dairas: Sequence[dict], communes: Sequence[dict],
                name_history: dict) -> List[dict]:
    former_wilayas = {e["code"]: e for e in name_history["wilayas"]}
    former_communes = {e["code_commune"]: e for e in name_history["communes"]}

    def entry(kind: str, code: int, record: dict, former: Optional[dict]) -> dict:
        wilaya_code = record.get("wilaya_code")
        return {
            "type": kind,
            "code": code,
            "name_fr": record["name_fr"],
            "name_ar": record.get("name_ar"),
            "wilaya_code": code if wilaya_code is None else wilaya_code,
            # JavaScript compares strings by UTF-16 code unit; big-endian UTF-16
            # bytes compare the same way.
            "order": conservative_key(record["name_fr"]).encode("utf-16-be"),
            "current": _keys([record.get("name_fr"), record.get("name_ar")]),
            "former": _keys(former["former_names_fr"] + former["former_names_ar"]) if former else [],
        }

    return (
        [entry("wilaya", w["code"], w, former_wilayas.get(w["code"])) for w in wilayas]
        + [entry("daira", d["id"], d, None) for d in dairas]
        + [entry("commune", c["code_commune"], c, former_communes.get(c["code_commune"])) for c in communes]
    )


def search(index: List[dict], query: Any, limit: Optional[float] = 10,
           types: Optional[Iterable[str]] = None) -> List[Dict[str, Any]]:
    if types is not None:
        if isinstance(types, (str, bytes)) or not isinstance(types, Iterable):
            raise TypeError("search: types must be a list of type names")
        types = list(types)
        for kind in types:
            if kind not in TYPE_RANK:
                raise ValueError(f"search: unknown type {kind!r}, expected one of {', '.join(TYPE_RANK)}")
    text = "" if query is None else str(query)
    q = conservative_key(text)
    if q == "":
        return []
    ql = loose_key(text)

    hits = []
    for e in index:
        if types is not None and e["type"] not in types:
            continue
        current = _best(q, ql, e["current"])
        former = _best(q, ql, e["former"])
        # A Former name counts only when it does better than every current name.
        use_former = former is not None and (current is None or CLASS_RANK[former] < CLASS_RANK[current])
        match = former if use_former else current
        if match is not None:
            hits.append((e, match, use_former))

    hits.sort(key=lambda h: (CLASS_RANK[h[1]], TYPE_RANK[h[0]["type"]], h[0]["order"], h[0]["code"]))

    if limit is not None:
        limit = max(0, limit)
        if limit != math.inf:
            hits = hits[: int(limit)]
    results = []
    for e, match, use_former in hits:
        result = {key: e[key] for key in ("type", "code", "name_fr", "name_ar", "wilaya_code")}
        result["match"] = match
        if use_former:
            result["matched"] = "former"
        results.append(result)
    return results

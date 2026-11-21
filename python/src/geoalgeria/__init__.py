"""Algeria's 69 Wilayas, 551 Dairas and 1,541 Communes, from the GeoAlgeria open dataset.

    >>> import geoalgeria
    >>> geoalgeria.wilaya(31)["name_fr"]
    'Oran'
    >>> geoalgeria.search("ورقلة")[0]["name_fr"]
    'Ouargla'
"""
from __future__ import annotations

import copy
import json
import warnings
from functools import lru_cache
from importlib import resources
from typing import Any, Dict, Iterable, List, Optional

from . import _search
from ._normalize import conservative_key, loose_key, tokenize

__all__ = [
    "wilayas", "wilaya", "communes", "commune", "dairas", "lineage", "search", "normalize",
    "conservative_key", "loose_key", "tokenize", "DATA_VERSION",
]
__version__ = "0.2.0"

Record = Dict[str, Any]


def _read(name: str) -> str:
    return resources.files(__package__).joinpath("data", name).read_text(encoding="utf-8")


DATA_VERSION: str = _read("VERSION").strip()


@lru_cache(maxsize=None)
def _wilayas() -> List[Record]:
    return json.loads(_read("wilayas.json"))


@lru_cache(maxsize=None)
def _communes() -> List[Record]:
    return json.loads(_read("communes.json"))


@lru_cache(maxsize=None)
def _dairas() -> List[Record]:
    return json.loads(_read("dairas.json"))


@lru_cache(maxsize=None)
def _lineage() -> Record:
    return json.loads(_read("wilaya-lineage.json"))


@lru_cache(maxsize=None)
def _name_history() -> Record:
    return json.loads(_read("name-history.json"))


@lru_cache(maxsize=None)
def _index() -> List[Record]:
    return _search.build_index(_wilayas(), _dairas(), _communes(), _name_history())


def wilayas() -> List[Record]:
    """All 69 wilayas, ordered by code."""
    return [dict(w) for w in _wilayas()]


def wilaya(code: int | str) -> Optional[Record]:
    """One wilaya by code (31, "31" or "031"), or None."""
    code = int(code)
    return next((dict(w) for w in _wilayas() if w["code"] == code), None)


def communes(wilaya_code: int | str | None = None) -> List[Record]:
    """All 1,541 communes, or those of one wilaya."""
    rows = _communes()
    if wilaya_code is not None:
        rows = [c for c in rows if c["wilaya_code"] == int(wilaya_code)]
    return [dict(c) for c in rows]


def commune(code: int | str) -> Optional[Record]:
    """One commune by its official code (3101 or "3101"), or None."""
    code = int(code)
    return next((dict(c) for c in _communes() if c["code_commune"] == code), None)


def dairas(wilaya_code: int | str | None = None) -> List[Record]:
    """All 551 audited Dairas, or those of one wilaya, each with its member communes, seat commune, kind, and Daira audit status and citation."""
    rows = _dairas()
    if wilaya_code is not None:
        rows = [d for d in rows if d["wilaya_code"] == int(wilaya_code)]
    return copy.deepcopy(rows)


def lineage() -> Record:
    """The Wilaya lineage: for each of the 69 wilayas, the wilaya it belonged to on the
    58-wilaya and 48-wilaya maps, plus the commune transfers and exceptions, with citations.

    Each commune repeats its wilaya's two codes as wilaya_code_58 and wilaya_code_48.
    """
    return copy.deepcopy(_lineage())


def search(query: str, limit: Optional[float] = 10, types: Optional[Iterable[str]] = None) -> List[Record]:
    """Ranked Wilayas, Dairas and Communes for what a person typed, in French or Arabic.

    Names are folded to their Conservative and Loose keys, so accents, harakat,
    hamza forms and case do not matter. Each result is
    {"type", "code", "name_fr", "name_ar", "wilaya_code", "match"}, where "match"
    is the Match class: "exact", then "prefix" (the name starts with the query,
    the last word may be part typed), then "loose" (equal or prefix once alef
    maqsura reads as yaa and taa marbuta as haa). Within a class, Wilayas come
    before Dairas before Communes, then by French name and code. A result found
    by a Former name only also carries "matched": "former".

    limit caps the results (None for all); types keeps only some of
    "wilaya", "daira" and "commune".
    """
    return _search.search(_index(), query, limit=limit, types=types)


def normalize(text: str) -> str:
    """Deprecated since 0.2.0: use conservative_key(), the fold every GeoAlgeria index shares."""
    warnings.warn("geoalgeria.normalize() is deprecated, use conservative_key()", DeprecationWarning, stacklevel=2)
    return conservative_key(text)

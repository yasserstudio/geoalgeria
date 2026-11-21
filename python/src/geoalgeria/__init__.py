"""Algeria's 69 wilayas, 551 Dairas and 1,541 communes, from the GeoAlgeria open dataset.

    >>> import geoalgeria
    >>> geoalgeria.wilaya(31)["name_fr"]
    'Oran'
    >>> geoalgeria.search("ورقلة")[0]["name_fr"]
    'Ouargla'
"""
from __future__ import annotations

import copy
import json
import re
import unicodedata
from functools import lru_cache
from importlib import resources
from typing import Any, Dict, List, Optional

from ._normalize import conservative_key, loose_key, tokenize

__all__ = [
    "wilayas", "wilaya", "communes", "commune", "dairas", "lineage", "search", "normalize",
    "conservative_key", "loose_key", "tokenize", "DATA_VERSION",
]
__version__ = "0.1.0"

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
    """All 551 audited Dairas, or those of one wilaya, each with its Daira audit status and citation."""
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


_ARABIC_MARKS = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ]")
_ARABIC_LETTERS = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})


def normalize(text: str) -> str:
    """Fold case, Latin accents, Arabic diacritics and letter variants for matching."""
    text = _ARABIC_MARKS.sub("", text).translate(_ARABIC_LETTERS)
    text = "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))
    return re.sub(r"[^\w]+", " ", text.casefold()).strip()


def search(query: str, limit: int = 10) -> List[Record]:
    """Find wilayas and communes by French or Arabic name, accents and harakat optional.

    Each result has a "type" of "wilaya" or "commune". Exact names rank first,
    then names that start with the query, then names that contain it.
    """
    q = normalize(query)
    if not q:
        return []
    scored = []
    for kind, rows in (("wilaya", _wilayas()), ("commune", _communes())):
        for r in rows:
            names = [normalize(r.get(k) or "") for k in ("name_fr", "name_ar", "name_en")]
            if q in names:
                rank = 0
            elif any(n.startswith(q) for n in names):
                rank = 1
            elif any(q in n for n in names):
                rank = 2
            else:
                continue
            scored.append((rank, 0 if kind == "wilaya" else 1, {"type": kind, **r}))
    scored.sort(key=lambda s: (s[0], s[1]))
    return [s[2] for s in scored[:limit]]

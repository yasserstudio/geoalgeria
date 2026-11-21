import json
import sys
from pathlib import Path

import geoalgeria as g

HERE = Path(__file__).resolve().parents[1]
DATASET = HERE.parent / "packages" / "dataset" / "data"


def test_bundled_data_is_what_build_data_derives():
    # The package ships a copy of packages/dataset; a dataset change that was not
    # copied over with build_data.py fails here, before it can reach PyPI.
    sys.path.insert(0, str(HERE))
    try:
        import build_data
    finally:
        sys.path.remove(str(HERE))
    for path, text in build_data.derive().items():
        assert (HERE / path).read_text(encoding="utf-8") == text, f"{path} is stale: run build_data.py"


def test_communes_carry_their_58_and_48_wilaya_map_codes():
    oran = g.commune(3101)
    assert (oran["wilaya_code"], oran["wilaya_code_58"], oran["wilaya_code_48"]) == (31, 31, 31)
    # Birtouta moved from Blida (9) to Algiers (16) in 1997; the 48-wilaya map is read with that applied.
    birtouta = g.commune(1634)
    assert (birtouta["wilaya_code_58"], birtouta["wilaya_code_48"]) == (16, 16)
    assert all(isinstance(c["wilaya_code_58"], int) and isinstance(c["wilaya_code_48"], int) for c in g.communes())
    assert all(c["wilaya_code_48"] <= 48 and c["wilaya_code_58"] <= 58 for c in g.communes())


def test_lineage_is_the_npm_wilaya_lineage():
    lineage = g.lineage()
    assert lineage == json.loads((DATASET / "wilaya-lineage.json").read_text(encoding="utf-8"))
    assert len(lineage["wilayas"]) == 69
    lineage["wilayas"][0]["code"] = 0
    assert g.lineage()["wilayas"][0]["code"] == 1


def test_dairas_are_the_audited_records():
    dairas = g.dairas()
    assert dairas == json.loads((DATASET / "dairas.json").read_text(encoding="utf-8"))
    assert len(dairas) == 551
    assert sum(d["commune_count"] for d in dairas) == 1541
    oran = g.dairas("031")
    assert oran and all(d["wilaya_code"] == 31 for d in oran)
    assert oran == [d for d in dairas if d["wilaya_code"] == 31]
    assert g.dairas(99) == []
    oran[0]["audit"]["status"] = "x"
    assert g.dairas(31)[0]["audit"]["status"] != "x"

import geoalgeria as g


def test_counts():
    assert len(g.wilayas()) == 69
    assert len(g.communes()) == 1541
    assert g.DATA_VERSION


def test_lookup():
    assert g.wilaya("031")["name_fr"] == "Oran"
    assert g.wilaya(99) is None
    adrar = g.commune(101)
    assert adrar["name_fr"] == "Adrar" and adrar["postal_code"] == "01000"
    assert all(c["wilaya_code"] == 16 for c in g.communes(16))


def test_dairas_cover_every_commune():
    assert sum(len(d["communes"]) for d in g.dairas()) == 1541


def test_search_arabic_and_french():
    assert g.search("ورقلة")[0]["name_fr"] == "Ouargla"
    assert g.search("وَرْقْلَة")[0]["name_fr"] == "Ouargla"
    assert g.search("ouargla")[0]["type"] == "wilaya"
    assert g.search("bejaia")[0]["name_fr"] == "Béjaïa"
    assert g.search("") == []


def test_records_are_copies():
    g.wilaya(1)["name_fr"] = "x"
    assert g.wilaya(1)["name_fr"] == "Adrar"

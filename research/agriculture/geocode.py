#!/usr/bin/env python3
"""Geocode the normalized MADR records into the final @geoalgeria/agriculture schema.

Strategy (honest, sante-style geo_precision):
  1. address → commune match within the wilaya (Arabic token/substring) → commune centroid.
  2. fallback → wilaya chief-town commune centroid → wilaya_centroid.
  3. best-effort upgrade to a precise Wikidata point for named entities (guarded;
     skipped with --no-net or on any network failure — the baseline still stands).

Emits package-ready records (sante schema + agriculture contact fields):
  data/agriculture.json, csv/agriculture.csv, geojson/agriculture.geojson, metadata.json
written under packages/agriculture/data (created by the scaffold step).
"""
import csv, json, re, sys, unicodedata, urllib.parse, urllib.request
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).parent
REPO = ROOT.parents[1]
DATA = REPO / "packages/dataset/data"
OUT = REPO / "packages/agriculture/data"
# Precise-point (Wikidata) upgrade is OFF by default: these admin offices are
# poorly disambiguated in WD and their names embed place names, so matching
# produced false positives (e.g. INRAA → Q262 "Algeria", a Sahara centroid).
# Honest baseline = commune / wilaya-capital centroid. Opt in with --wikidata to
# experiment. Precise OSM/WD points are tracked as a future enrichment.
USE_WIKIDATA = "--wikidata" in sys.argv
NO_NET = "--no-net" in sys.argv or not USE_WIKIDATA
GENERATED_AT = "2026-06-30"

TYPE_LABELS = {
    "dsa": ("Direction des Services Agricoles", "مديرية المصالح الفلاحية"),
    "conservation_forets": ("Conservation des Forêts", "محافظة الغابات"),
    "institut_recherche": ("Institut technique et de recherche scientifique", "معهد تقني ومركز بحث علمي"),
    "centre_formation": ("Institut et centre de formation", "معهد ومركز التكوين"),
    "chambre_agriculture": ("Chambre d'Agriculture", "الغرفة الفلاحية"),
    "office_public": ("Office économique public", "ديوان اقتصادي عمومي"),
    "groupe_public": ("Complexe / Groupe public", "مجمع عمومي"),
}


def ar_norm(s):
    # Deliberately does NOT strip the leading article (unlike normalize.py's
    # ar_norm): here we substring-match commune names inside an address, where
    # the "ال" is part of the surrounding text.
    s = (s or "").strip()
    s = re.sub(r"[ـً-ْ]", "", s)
    s = s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ٱ", "ا")
    s = s.replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    return re.sub(r"\s+", " ", s).strip()


def slugify(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s


def load_communes():
    by_wilaya = defaultdict(list)
    for f in ("communes_w1_w23.json", "communes_w24_w48.json", "communes_w49_w69.json"):
        for c in json.loads((DATA / f).read_text(encoding="utf-8")):
            if isinstance(c.get("latitude"), (int, float)) and isinstance(c.get("longitude"), (int, float)):
                by_wilaya[c["wilaya_code"]].append(c)
    return by_wilaya


def wilaya_capital(communes, wilaya_fr):
    """Chief-town commune: name matches the wilaya, else lowest code_commune."""
    want = slugify(wilaya_fr)
    for c in communes:
        if slugify(c["name_fr"]) == want:
            return c
    return min(communes, key=lambda c: c.get("code_commune") or 10**9)


def match_commune(address, communes):
    """Longest commune whose normalized AR name appears in the (normalized) address."""
    a = ar_norm(address)
    if not a:
        return None
    best = None
    for c in communes:
        n = ar_norm(c["name_ar"])
        # skip 1-2 char names (too short to be a confident whole-token match)
        if len(n) >= 3 and re.search(rf"(^|\s){re.escape(n)}(\s|$)", a):
            if best is None or len(n) > len(ar_norm(best["name_ar"])):
                best = c
    return best


# ---- best-effort Wikidata upgrade ---------------------------------------------
def wikidata_points():
    if NO_NET:
        return []
    q = """SELECT ?item ?itemLabel ?arLabel ?coord WHERE {
      VALUES ?cls { wd:Q31855 wd:Q1664720 wd:Q327333 wd:Q270791 wd:Q43229 }
      ?item wdt:P31/wdt:P279* ?cls ; wdt:P17 wd:Q262 ; wdt:P625 ?coord .
      OPTIONAL { ?item rdfs:label ?arLabel FILTER(LANG(?arLabel)="ar") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
    } LIMIT 2000"""
    url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode(
        {"query": q, "format": "json"})
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "GeoAlgeria-agriculture/1.0 (gorthidz@gmail.com)",
            "Accept": "application/sparql-results+json"})
        with urllib.request.urlopen(req, timeout=40) as r:
            rows = json.load(r)["results"]["bindings"]
    except Exception as e:
        print(f"  [wikidata] skipped ({e})", file=sys.stderr)
        return []
    pts = []
    for b in rows:
        m = re.search(r"Point\(([-\d.]+) ([-\d.]+)\)", b["coord"]["value"])
        if not m:
            continue
        lng, lat = float(m.group(1)), float(m.group(2))
        if not (18 <= lat <= 38 and -9 <= lng <= 12):
            continue
        labels = [b.get("itemLabel", {}).get("value", ""), b.get("arLabel", {}).get("value", "")]
        pts.append({
            "qid": b["item"]["value"].rsplit("/", 1)[-1],
            "lat": lat, "lng": lng,
            "norms": [ar_norm(x) for x in labels if x] + [slugify(x) for x in labels if x],
        })
    print(f"  [wikidata] {len(pts)} Algerian org points", file=sys.stderr)
    return pts


def wd_match(rec, pts):
    """Match a named record to a Wikidata point by token overlap (conservative)."""
    keys = [ar_norm(rec["name_ar"] or ""), slugify(rec["name_fr"] or "")]
    keys = [k for k in keys if len(k) >= 6]
    if not keys:
        return None
    for p in pts:
        for k in keys:
            for n in p["norms"]:
                if len(n) >= 6 and (k in n or n in k):
                    return p
    return None


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "csv").mkdir(exist_ok=True)
    (OUT / "geojson").mkdir(exist_ok=True)
    norm_recs = json.loads((ROOT / "normalized.json").read_text(encoding="utf-8"))
    by_wilaya = load_communes()
    wd_pts = wikidata_points()

    out = []
    for r in norm_recs:
        wc, wfr, war = r["code_wilaya"], r["wilaya_fr"], r["wilaya_ar"]
        communes = by_wilaya.get(wc, [])
        t = r["type"]
        # derive bilingual names
        if t == "dsa":
            name_fr = f"Direction des Services Agricoles de {wfr}"
            name_ar = f"مديرية المصالح الفلاحية لولاية {war}"
        elif t == "conservation_forets":
            name_fr = f"Conservation des Forêts de {wfr}"
            name_ar = r["name_ar"]
        elif t == "chambre_agriculture":
            name_fr = f"Chambre d'Agriculture de {wfr}"
            name_ar = f"الغرفة الفلاحية لولاية {war}"
        else:                                   # named entities
            name_ar = r["name_ar"]
            name_fr = None
        name = name_fr or name_ar

        # geocode
        lat = lng = None
        commune = commune_code = None
        precision, source = "none", "madr"
        wikidata = None
        cm = match_commune(r["address"], communes)
        if cm:
            commune, commune_code = cm["name_fr"], cm["code_commune"]
            lat, lng, precision = cm["latitude"], cm["longitude"], "commune_centroid"
        elif communes:
            # No commune in the address: place at the wilaya chief-town centroid,
            # but leave commune/commune_code null — a non-null commune then always
            # means an address-matched commune (see geo_precision).
            cap = wilaya_capital(communes, wfr)
            lat, lng, precision = cap["latitude"], cap["longitude"], "wilaya_centroid"
        # WD upgrade for named entities
        if name_ar and t not in ("dsa", "conservation_forets", "chambre_agriculture"):
            p = wd_match({"name_ar": name_ar, "name_fr": name_fr}, wd_pts)
            if p:
                lat, lng, precision = p["lat"], p["lng"], "wikidata_point"
                wikidata, source = p["qid"], "madr+wikidata"

        out.append({
            "name": name, "name_ar": name_ar, "name_fr": name_fr,
            "type": t,
            "type_label_fr": TYPE_LABELS[t][0], "type_label_ar": TYPE_LABELS[t][1],
            "sector": "public",
            "abbreviation": r["abbreviation"],
            "wilaya": wfr, "wilaya_ar": war, "wilaya_code": f"{wc:02d}",
            "commune": commune, "commune_code": commune_code,
            "lat": lat, "lng": lng,
            "address": r["address"], "phone": r["phone"], "fax": r["fax"],
            "source": source, "geo_precision": precision,
            "wikidata": wikidata, "osm_id": None,
            "_wc": wc,
        })

    # stable ids: {wilaya_code}-{type}-{seq}, ordered by name within group
    # (`name or ""` guards against a null name in a future source refresh).
    out.sort(key=lambda r: (r["_wc"], r["type"], r["name"] or ""))
    seq = defaultdict(int)
    groups = defaultdict(list)
    for r in out:
        k = (r["wilaya_code"], r["type"])
        seq[k] += 1
        r["id"] = f"{r['wilaya_code']}-{r['type']}-{seq[k]:02d}"
        groups[k].append(r)
    # when several rows in a (wilaya, type) share one derived display name
    # (e.g. a public group and its filiales), disambiguate with the abbreviation
    for rs in groups.values():
        counts = Counter(r["name"] for r in rs)
        for r in rs:
            if counts[r["name"]] > 1 and r["abbreviation"]:
                r["name"] = f"{r['name']} ({r['abbreviation']})"
    # globally-unique slug (id is the canonical key; slug is the URL key)
    seen = set()
    for r in sorted(out, key=lambda r: r["id"]):
        base = slugify(r["name_fr"] or r["abbreviation"] or r["name"] or r["id"]) or r["id"]
        s, i = base, 2
        while s in seen:
            s, i = f"{base}-{i}", i + 1
        seen.add(s)
        r["slug"] = s

    cols = ["id", "name", "name_ar", "name_fr", "type", "type_label_fr", "type_label_ar",
            "sector", "abbreviation", "wilaya", "wilaya_ar", "wilaya_code", "commune",
            "commune_code", "lat", "lng", "address", "phone", "fax", "source",
            "geo_precision", "wikidata", "osm_id", "slug"]
    final = [{k: r[k] for k in cols} for r in sorted(out, key=lambda r: (r["wilaya_code"], r["id"]))]

    (OUT / "agriculture.json").write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding="utf-8")
    with open(OUT / "csv/agriculture.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f); w.writerow(cols)
        for r in final:
            w.writerow([r[k] for k in cols])
    fc = {"type": "FeatureCollection", "features": [
        {"type": "Feature",
         "geometry": {"type": "Point", "coordinates": [r["lng"], r["lat"]]},
         "properties": {k: r[k] for k in cols if k not in ("lat", "lng")}}
        for r in final if r["lat"] is not None]}
    (OUT / "geojson/agriculture.geojson").write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")

    # metadata
    # full geo_precision vocabulary, 0-filled, so metadata.by_geo_precision is a
    # complete Record over the GeoPrecision type (matches the sante convention).
    GEO_VOCAB = ["wikidata_point", "commune_centroid", "wilaya_centroid", "none"]
    by_type = defaultdict(int)
    by_prec = {k: 0 for k in GEO_VOCAB}
    wset = set()
    for r in final:
        by_type[r["type"]] += 1; by_prec[r["geo_precision"]] += 1; wset.add(r["wilaya_code"])
    used_wd = by_prec["wikidata_point"] > 0
    meta = {
        "source": "Ministry of Agriculture, Rural Development and Fisheries (MADR) institutional directory (madr.gov.dz / fr.madr.gov.dz), geocoded against the geoalgeria commune set"
                  + (" + Wikidata (CC0)" if used_wd else ""),
        "origin": "https://madr.gov.dz/contact/دليل-الهاتف/, https://fr.madr.gov.dz/contact/annuaire/"
                  + (", https://www.wikidata.org" if used_wd else ""),
        "license": "MADR directory: factual public-sector listing."
                   + (" Wikidata data is CC0." if used_wd else "") + " See README for attribution.",
        "agriculture": len(final),
        "by_type": dict(sorted(by_type.items())),
        "by_sector": {"public": len(final)},
        "by_geo_precision": by_prec,
        "wilayas_covered": len(wset),
        "geocoded": sum(1 for r in final if r["lat"] is not None),
        "linkage_note": "Names + wilaya + address + phone/fax are from the MADR directory, which carries no coordinates. Commune is matched from the address against the geoalgeria commune set within the wilaya; coordinates are that commune's centroid, or the wilaya chief-town centroid when the address has no recognizable commune (see geo_precision)."
                        + (" A few are upgraded to a precise Wikidata point." if used_wd else ""),
        "coverage_note": f"{len(final)} agriculture-sector institutions across 7 MADR networks (DSA, Conservations des Forêts, technical/research institutes, training centres, Chambres d'Agriculture, public offices, public groups). DSA covers all 58 wilayas; Conservations des Forêts and Chambres use the pre-2019 48-wilaya division. Names + wilaya are official; coordinates are best-effort (mostly commune/wilaya centroid).",
        "generated_at": GENERATED_AT,
    }
    (OUT / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"emitted {len(final)} records → {OUT}")
    print("  by_type:", dict(sorted(by_type.items())))
    print("  by_geo_precision:", dict(sorted(by_prec.items())))
    print("  wilayas_covered:", len(wset), " geocoded:", meta["geocoded"])


if __name__ == "__main__":
    main()

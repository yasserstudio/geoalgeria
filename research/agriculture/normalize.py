#!/usr/bin/env python3
"""Normalize + clean the 7 MADR annuaire CSVs into one unified dataset.

- maps each row's Arabic wilaya token to the official code_wilaya / name_ar / name_fr
  (from the base `geoalgeria` package's wilayas.json), via Arabic normalization
  plus an explicit alias map for the source's typos/spelling variants;
- attaches bilingual network labels + type + sector;
- fixes the Conservations des Forêts mislabels (Batna→Annaba, Sétif→Saïda) by
  deriving the conservation name from the canonical wilaya;
- trims phone/fax to digits, empty -> null.

Output: normalized.json (+ normalized.csv for eyeballing).
"""
import csv, json, re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
REPO = ROOT.parents[1]
WILAYAS = REPO / "packages/dataset/data/wilayas.json"


def ar_norm(s: str) -> str:
    # Strips the leading article "ال" — deliberate, for wilaya-name matching.
    # (geocode.py's ar_norm keeps it, because it substring-matches inside addresses.)
    s = (s or "").strip()
    s = s.replace("ـ", "")                       # tatweel
    s = re.sub(r"[ً-ْ]", "", s)             # harakat
    s = re.sub(r"^ال", "", s)                          # leading article
    s = s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ٱ", "ا")
    s = s.replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    s = re.sub(r"\s+", " ", s).strip()
    return s


# Source token (raw) -> official code_wilaya, for residuals normalization can't bridge.
ALIASES = {
    "عين تيموشنت": 46, "عين تموشنت": 46,
    "إن صالح": 53, "ان صالح": 53,
    "إن قزام": 54, "ان قزام": 54,
    "تمراست": 11,                       # typo: Tamanrasset
    "ايليزي": 33, "غليزي": 33,          # typo: Illizi
    "عنلبة": 23,                        # typo: Annaba
    "بجابة": 6,                          # typo: Béjaïa
    "عين دفلة": 44, "عين الدفلة": 44,   # Aïn Defla (missing ل/ى)
    "الواد": 39, "الوادي": 39,          # El Oued
    "تيبسة": 12, "تيبسه": 12,           # typo: Tébessa
}

# filename -> network metadata + column layout (col index for each logical field)
NETWORKS = {
    "01-dsa.csv": dict(
        slug="direction-services-agricoles",
        ar="مديرية المصالح الفلاحية", fr="Direction des Services Agricoles",
        type="dsa", cols=dict(address=1, phone=2, fax=3), name=None),
    "02-conservations-forets.csv": dict(
        slug="conservation-forets",
        ar="محافظة الغابات", fr="Conservation des Forêts",
        type="conservation_forets", cols=dict(address=2, phone=3, fax=4),
        name="derive_forets"),
    "03-instituts-recherche.csv": dict(
        slug="institut-technique-recherche",
        ar="معهد تقني / بحث علمي", fr="Institut technique et de recherche scientifique",
        type="institut_recherche", cols=dict(abbr=1, name=2, phone=3, fax=4)),
    "04-instituts-formation.csv": dict(
        slug="institut-centre-formation",
        ar="معهد / مركز تكويني", fr="Institut et centre de formation",
        type="centre_formation", cols=dict(abbr=1, name=2, phone=3)),
    "05-chambres-agriculture.csv": dict(
        slug="chambre-agriculture",
        ar="الغرفة الفلاحية", fr="Chambre d'Agriculture",
        type="chambre_agriculture", cols=dict(address=1, phone=2, fax=3), name=None),
    "06-operateurs-publics.csv": dict(
        slug="operateur-economique-public",
        ar="متعامل اقتصادي عمومي", fr="Opérateur économique public",
        type="office_public", cols=dict(abbr=1, name=2, address=3, phone=4, fax=5)),
    "07-complexes.csv": dict(
        slug="complexe-public",
        ar="مجمع عمومي", fr="Complexe / Groupe public",
        type="groupe_public", cols=dict(abbr=1, name=2, address=3, phone=4, fax=5)),
}


def load_wilayas():
    raw = json.loads(WILAYAS.read_text(encoding="utf-8"))
    arr = raw.get("wilayas") or next(v for v in raw.values() if isinstance(v, list))
    by_norm, by_code = {}, {}
    for w in arr:
        if w.get("code", 0) > 58:          # MADR data predates the 2025 reform
            continue
        by_code[w["code"]] = w
        by_norm[ar_norm(w["name_ar"])] = w
    return by_norm, by_code


def clean_num(s):
    s = re.sub(r"\D", "", s or "")
    return s or None


def resolve_wilaya(token, by_norm, by_code):
    t = (token or "").strip()
    if t in ALIASES:
        return by_code[ALIASES[t]]
    return by_norm.get(ar_norm(t))


def main():
    by_norm, by_code = load_wilayas()
    records, unresolved = [], []
    for fname, meta in NETWORKS.items():
        with open(ROOT / "csv" / fname, encoding="utf-8") as fh:
            rdr = csv.reader(fh); next(rdr)
            for row in rdr:
                if not row or not row[0].strip():
                    continue
                w = resolve_wilaya(row[0], by_norm, by_code)
                if not w:
                    unresolved.append((fname, row[0]))
                    continue
                c = meta["cols"]
                # name
                if meta.get("name") == "derive_forets":
                    name_ar = f"محافظة الغابات {w['name_ar']}"
                elif "name" in c:
                    name_ar = (row[c["name"]].strip() or None) if c["name"] < len(row) else None
                else:
                    name_ar = None
                rec = {
                    "source": "madr",
                    "network": meta["slug"],
                    "network_ar": meta["ar"],
                    "network_fr": meta["fr"],
                    "type": meta["type"],
                    "sector": "public",
                    "code_wilaya": w["code"],
                    "wilaya_ar": w["name_ar"],
                    "wilaya_fr": w["name_fr"],
                    "name_ar": name_ar,
                    "abbreviation": (row[c["abbr"]].strip() or None) if "abbr" in c and c["abbr"] < len(row) else None,
                    "address": (row[c["address"]].strip() or None) if "address" in c and c["address"] < len(row) else None,
                    "phone": clean_num(row[c["phone"]]) if "phone" in c and c["phone"] < len(row) else None,
                    "fax": clean_num(row[c["fax"]]) if "fax" in c and c["fax"] < len(row) else None,
                    "raw_wilaya": row[0].strip(),
                }
                records.append(rec)

    (ROOT / "normalized.json").write_text(
        json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    with open(ROOT / "normalized.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        cols = ["network", "type", "code_wilaya", "wilaya_fr", "name_ar",
                "abbreviation", "address", "phone", "fax"]
        w.writerow(cols)
        for r in records:
            w.writerow([r[k] for k in cols])

    # coverage report
    cov = defaultdict(set)
    for r in records:
        cov[r["network"]].add(r["code_wilaya"])
    print(f"normalized {len(records)} records (unresolved: {len(unresolved)})")
    for slug, codes in cov.items():
        print(f"  {slug:34s} {len([r for r in records if r['network']==slug]):3d} recs · {len(codes):2d} wilayas")
    if unresolved:
        print("UNRESOLVED:", unresolved)


if __name__ == "__main__":
    main()

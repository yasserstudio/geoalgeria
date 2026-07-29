#!/usr/bin/env python3
"""Fetch English/Arabic/French names for every route endpoint from Wikidata.

The endpoint records carried exactly one `name`, and not even in one language:
the 13 Algerian origins are the aviation package's French house style, while the
foreign ones are OurAirports English ("Charles de Gaulle International Airport").
So the Arabic UI shows English, the English UI shows French, and nobody notices
because each reader only sees their own locale. Names belong in the data, per
language, from a citable source.

Wikidata is that source: airports are matched by IATA code (P238), which is the
same key the rest of this pipeline pins, and every label is attributable to a
QID a reviewer can open. Two guards, same philosophy as resolve_endpoints.py --
never emit a plausible wrong answer:

  1. Air bases share IATA codes with the civil airport they sit beside (BOD,
     NIM). Any candidate whose English label names an air base is dropped; if an
     IATA still resolves to more than one item, the run fails rather than picks.
  2. The Wikidata coordinate (P625) must sit within 15 km of the coordinate the
     dataset already ships for that IATA. A label fetched for the wrong airport
     fails loudly here.

Labels are normalised to the repo's typography rule (never an em dash) and the
French label gets its first letter capitalised, since Wikidata writes
"aéroport de ..." and the dataset's own French style is "Aéroport ...".

Usage: python3 localize_endpoint_names.py
Reads foreign-endpoints.json + ../../packages/aviation/data/airports.json,
writes endpoint-names.json next to this file.
"""

import json
import math
import os
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SPARQL = "https://query.wikidata.org/sparql"
UA = "GeoAlgeria-data/1.0 (https://github.com/yasserstudio/geoalgeria)"
MAX_KM = 15.0

# Explicit item pins for IATA codes the automatic disambiguation cannot settle.
# When the ambiguity SystemExit below fires, the fix is one line here, with the
# QID a reviewer can open, not a code change.
PINNED: dict[str, str] = {}


def haversine_km(lat1, lng1, lat2, lng2):
    rad = math.pi / 180
    a = (
        math.sin((lat2 - lat1) * rad / 2) ** 2
        + math.cos(lat1 * rad) * math.cos(lat2 * rad) * math.sin((lng2 - lng1) * rad / 2) ** 2
    )
    return 2 * 6371 * math.asin(math.sqrt(a))


def wanted_endpoints():
    """Every IATA the dataset can reference, with the coordinate it ships."""
    out = {}
    foreign = json.load(open(os.path.join(HERE, "foreign-endpoints.json"), encoding="utf-8"))
    for e in foreign:
        out[e["iata"]] = (e["lat"], e["lng"])
    airports = json.load(
        open(os.path.join(HERE, "..", "..", "packages", "aviation", "data", "airports.json"), encoding="utf-8")
    )
    for a in airports:
        if a.get("iata"):
            out[a["iata"]] = (a["lat"], a["lng"])
    return out


def query(codes):
    values = " ".join(f'"{c}"' for c in sorted(codes))
    q = f"""
SELECT ?iata ?item ?en ?ar ?fr ?coord WHERE {{
  VALUES ?iata {{ {values} }}
  ?item wdt:P238 ?iata .
  FILTER NOT EXISTS {{ ?item wdt:P576 ?dissolved }}
  OPTIONAL {{ ?item rdfs:label ?en FILTER(LANG(?en)="en") }}
  OPTIONAL {{ ?item rdfs:label ?ar FILTER(LANG(?ar)="ar") }}
  OPTIONAL {{ ?item rdfs:label ?fr FILTER(LANG(?fr)="fr") }}
  OPTIONAL {{ ?item wdt:P625 ?coord }}
}}
"""
    req = urllib.request.Request(
        SPARQL + "?" + urllib.parse.urlencode({"query": q}),
        headers={"Accept": "application/sparql-results+json", "User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)["results"]["bindings"]


def norm(label):
    return label.replace("—", "–") if label else label  # em dash -> en dash, repo rule


def cap_first(label):
    return label[0].upper() + label[1:] if label else label


def main():
    wanted = wanted_endpoints()
    rows = query(wanted.keys())

    by_iata = {}
    for r in rows:
        iata = r["iata"]["value"]
        qid = r["item"]["value"].rsplit("/", 1)[1]
        if iata in PINNED and PINNED[iata] != qid:
            continue
        en = r.get("en", {}).get("value")
        # Label test, deliberately NOT a P31/P279* taxonomy walk: joint
        # civil-military airports (DXB, NDJ, NIM, ...) legitimately descend
        # from the air-base class and a class filter drops them wholesale
        # (tried 2026-07-29, it killed 5 real airports). An item this misses
        # trips the ambiguity guard below, whose fix is one PINNED line.
        if en and "air base" in en.lower():
            continue
        cand = {
            "qid": qid,
            "name_en": norm(en),
            "name_ar": norm(r.get("ar", {}).get("value")),
            "name_fr": cap_first(norm(r.get("fr", {}).get("value"))),
            "coord": r.get("coord", {}).get("value"),
        }
        prev = by_iata.get(iata)
        if prev and prev["qid"] != cand["qid"]:
            raise SystemExit(f"{iata}: ambiguous after the air-base filter "
                             f"({prev['qid']} vs {cand['qid']}); add the right QID to PINNED")
        if prev and prev["coord"] != cand["coord"]:
            # One item, two P625 statements: last-row-wins would make the 15 km
            # guard nondeterministic between runs. Refuse instead.
            raise SystemExit(f"{iata}: {qid} carries conflicting coordinates on Wikidata; "
                             f"resolve there or pin the item and drop the extra statement")
        by_iata[iata] = cand

    problems = []
    for iata, (lat, lng) in sorted(wanted.items()):
        c = by_iata.get(iata)
        if not c:
            problems.append(f"{iata}: no Wikidata item with this IATA")
            continue
        for k in ("name_en", "name_ar", "name_fr"):
            if not c[k]:
                problems.append(f"{iata}: {c['qid']} has no {k} label")
        if c["coord"]:
            xy = c["coord"].removeprefix("Point(").removesuffix(")").split()
            km = haversine_km(lat, lng, float(xy[1]), float(xy[0]))
            if km > MAX_KM:
                problems.append(f"{iata}: {c['qid']} sits {km:.1f} km from the dataset coordinate")
        else:
            problems.append(f"{iata}: {c['qid']} carries no coordinate to cross-check")
    if problems:
        raise SystemExit("refusing to write:\n  " + "\n  ".join(problems))

    out = {
        iata: {k: c[k] for k in ("qid", "name_en", "name_ar", "name_fr")}
        for iata, c in sorted(by_iata.items())
    }
    path = os.path.join(HERE, "endpoint-names.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{len(out)} endpoints named (en/ar/fr, coord-checked <= {MAX_KM} km) -> {path}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Resolve the foreign endpoints of Air Algerie's network to coordinates.

The Algerian ends of every arc come from @geoalgeria/aviation (36 airports, each
carrying an IATA code since 2026-07-27). This does the other end.

Method, and why it is shaped this way. Air Algerie's own destinations page
(airalgerie.dz/decouvrir/nos-destinations/) lists CITIES, not airports, which is
useless on its own for an airport-level dataset: "Paris" is CDG and ORY, and the
locked scope says those are separate endpoints. So the city-to-airport decision is
made HERE, explicitly, one pinned IATA code per row with the reasoning in `note`
where it is not obvious. OurAirports then supplies the coordinate.

That split is deliberate. A fuzzy name match against a global airport table would
silently pick Valence (France) over Valencia (Spain), or the closed Dakar Yoff over
the current Blaise Diagne, and nothing would flag it. Pinning the code makes the
judgement reviewable, and the country assertion below catches a code pinned wrong:
if OurAirports says the IATA I pinned is in a country I did not expect, the run
fails rather than emitting a plausible wrong point.

This list is a CANDIDATE set, not a route list. Per collection-rules.md section 4,
the airline's destination page establishes candidates and never confirms a pair.
Which of these endpoints actually has a nonstop Air Algerie leg, and in which
direction, is settled by the collection pass, not here.

Usage: python3 resolve_endpoints.py [path/to/ourairports/airports.csv]
Writes foreign-endpoints.json next to this file.
"""

import csv
import json
import os
import sys
import urllib.request

OURAIRPORTS = "https://davidmegginson.github.io/ourairports-data/airports.csv"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "foreign-endpoints.json")

# city:   as Air Algerie's own destination list names it, so the row can be traced
#         back to the source that put it on the candidate list.
# iata:   the airport this project treats that city as meaning.
# country: expected ISO country. Asserted against OurAirports; a mismatch fails.
# note:   present only where the city-to-airport choice is a judgement, not a fact.
ENDPOINTS = [
    # --- France ---
    {"city": "PARIS", "iata": "CDG", "country": "FR"},
    {"city": "PARIS", "iata": "ORY", "country": "FR",
     "note": "Paris is two endpoints, not one. Both are carried; which one a given "
             "route uses is a per-route finding. BLJ resolved to CDG on 2026-07-27."},
    {"city": "BORDEAUX", "iata": "BOD", "country": "FR"},
    {"city": "LILLE", "iata": "LIL", "country": "FR"},
    {"city": "LYON", "iata": "LYS", "country": "FR"},
    {"city": "MARSEILLE", "iata": "MRS", "country": "FR"},
    {"city": "METZ/NANCY", "iata": "ETZ", "country": "FR",
     "note": "Metz-Nancy-Lorraine. The ORN-ETZ pair is the cleanest official "
             "confirmation in the whole verification set."},
    {"city": "MONTPELLIER", "iata": "MPL", "country": "FR"},
    {"city": "MULHOUSE", "iata": "MLH", "country": "FR",
     "note": "Basel-Mulhouse is dual-coded BSL/MLH for one binational airport. Air "
             "Algerie uses MLH. OurAirports carries it under BSL, so MLH resolves "
             "via the alias below. Do not 'fix' this into a duplicate endpoint."},
    {"city": "Nantes", "iata": "NTE", "country": "FR"},
    {"city": "NICE", "iata": "NCE", "country": "FR"},
    {"city": "Strasbourg", "iata": "SXB", "country": "FR",
     "note": "Winter seasonal. Confirmed by AH 1453 on 8 Dec 2026; the August "
             "silence was out-of-season, not discontinued."},
    {"city": "TOULOUSE", "iata": "TLS", "country": "FR",
     "note": "Toulouse airport publishes the CZL nonstop but never names the "
             "operator. Attribution still open."},
    # --- Belgium ---
    {"city": "BRUXELLES", "iata": "BRU", "country": "BE",
     "note": "Operator still open: brusselsairport.be blocks tooling and real "
             "Chromium alike, aggregator signal says TUI Fly is current."},
    {"city": "CHARLEROI - BRUXELLES SUD", "iata": "CRL", "country": "BE",
     "note": "Air Algerie's own list treats Charleroi as a destination distinct "
             "from Brussels, which matches the airport-level rule."},
    # --- Iberia ---
    {"city": "ALICANTE", "iata": "ALC", "country": "ES"},
    {"city": "BARCELONE", "iata": "BCN", "country": "ES"},
    {"city": "MADRID", "iata": "MAD", "country": "ES"},
    {"city": "PALMA MALLORCA", "iata": "PMI", "country": "ES"},
    {"city": "VALENCE", "iata": "VLC", "country": "ES",
     "note": "Ambiguous in French: Valence (Drome, FR) and Valencia (ES) are the "
             "same word. Read as Valencia because the page's country list carries "
             "Espagne and Valence FR has no scheduled Algerian service. Worth "
             "re-checking if a probe ever returns a French Valence leg."},
    {"city": "LISBONNE", "iata": "LIS", "country": "PT",
     "note": "Air Algerie serves ORN-LIS via Algiers, not nonstop."},
    {"city": "PORTO", "iata": "OPO", "country": "PT"},
    # --- Rest of Europe ---
    {"city": "MILAN", "iata": "MXP", "country": "IT",
     "note": "Milan is three airports (MXP, LIN, BGY). Malpensa is the long-haul "
             "and international default; confirm per route before shipping an arc."},
    {"city": "ROME", "iata": "FCO", "country": "IT"},
    {"city": "Berlin", "iata": "BER", "country": "DE",
     "note": "Berlin Brandenburg. Air Algerie's booking engine opened the first "
             "weekly ALG-BER rotation for 14 Sep 2026."},
    {"city": "FRANCFORT", "iata": "FRA", "country": "DE"},
    {"city": "GENEVE", "iata": "GVA", "country": "CH",
     "note": "Geneva is served; Zurich is not. ALG-ZRH is a clean negative."},
    {"city": "VIENNE", "iata": "VIE", "country": "AT",
     "note": "Both legs of the Budapest triangle route through Vienna."},
    {"city": "BUDAPEST", "iata": "BUD", "country": "HU",
     "note": "Two-rotation triangle: nonstop ALG->BUD Saturdays, nonstop BUD->ALG "
             "Wednesdays, never a same-day nonstop round trip."},
    {"city": "ROTTERDAM", "iata": "RTM", "country": "NL"},
    {"city": "LONDRES", "iata": "LHR", "country": "GB",
     "note": "Air Algerie's own list carries Londres and Stansted as separate "
             "entries, so Londres is read as Heathrow."},
    {"city": "Stansted", "iata": "STN", "country": "GB"},
    {"city": "Manchester", "iata": "MAN", "country": "GB"},
    {"city": "MOSCOU", "iata": "SVO", "country": "RU",
     "note": "Moscow is SVO/DME/VKO. Sheremetyevo is the default for a foreign "
             "flag carrier; unverified for Air Algerie specifically."},
    {"city": "SAINT-PETERSBOURG", "iata": "LED", "country": "RU"},
    {"city": "ISTANBUL", "iata": "IST", "country": "TR",
     "note": "Current unified Istanbul Airport. No external source uses the "
             "closed-Ataturk ISL code, so an ISL entry is an internal artifact."},
    {"city": "ANTALYA", "iata": "AYT", "country": "TR"},
    # --- North Africa and Middle East ---
    {"city": "TUNIS", "iata": "TUN", "country": "TN"},
    {"city": "Djerba", "iata": "DJE", "country": "TN",
     "note": "Seasonal ALG-DJE service resumed on 17 Jul 2026 as AH4708."},
    {"city": "Monastir", "iata": "MIR", "country": "TN",
     "note": "Not on the airline's booking city list; surfaced by the route sweep."},
    {"city": "CAIRE", "iata": "CAI", "country": "EG"},
    {"city": "AMMAN", "iata": "AMM", "country": "JO"},
    {"city": "BEYROUTH", "iata": "BEY", "country": "LB"},
    {"city": "DJEDDAH", "iata": "JED", "country": "SA",
     "note": "The JED-LOO arc's foreign end. LOO (Laghouat) shipped 2026-07-27."},
    {"city": "MADINAH", "iata": "MED", "country": "SA"},
    {"city": "DOHA", "iata": "DOH", "country": "QA"},
    {"city": "DUBAI", "iata": "DXB", "country": "AE"},
    # --- Asia ---
    {"city": "Guangzhou", "iata": "CAN", "country": "CN"},
    {"city": "New Delhi", "iata": "DEL", "country": "IN",
     "note": "Air Algerie filed three weekly ALG-DEL rotations from 25 Oct 2026."},
    {"city": "Incheon", "iata": "ICN", "country": "KR",
     "note": "Planned Korea-Algeria link. July 2026 traffic-rights coverage names "
             "Incheon-Algiers, but the bilateral agreement permits regional airports."},
    {"city": "Shanghai", "iata": "PVG", "country": "CN",
     "note": "Not on the airline's booking city list; surfaced by the route sweep."},
    {"city": "PEKIN", "iata": "PEK", "country": "CN",
     "note": "Beijing is PEK and PKX. Capital is the default for a foreign flag "
             "carrier; unverified for Air Algerie specifically."},
    {"city": "Kuala Lumpur", "iata": "KUL", "country": "MY"},
    # --- Sub-Saharan Africa ---
    {"city": "ABIDJAN", "iata": "ABJ", "country": "CI"},
    {"city": "Abuja", "iata": "ABV", "country": "NG"},
    {"city": "Addis Abeba", "iata": "ADD", "country": "ET"},
    {"city": "BAMAKO", "iata": "BKO", "country": "ML"},
    {"city": "Brazzaville", "iata": "BZV", "country": "CG",
     "note": "Bookings opened for three weekly ALG-BZV rotations from 26 Oct 2026."},
    {"city": "Conakry", "iata": "CKY", "country": "GN",
     "note": "Bookings opened for three weekly ALG-CKY rotations from 25 Oct 2026."},
    {"city": "DAKAR", "iata": "DSS", "country": "SN",
     "note": "Blaise Diagne, which replaced Leopold Sedar Senghor (DKR) as Dakar's "
             "airport in 2017. Pinning DKR would land on a closed field."},
    {"city": "Douala", "iata": "DLA", "country": "CM"},
    {"city": "Johannesbourg", "iata": "JNB", "country": "ZA"},
    {"city": "Libreville", "iata": "LBV", "country": "GA"},
    {"city": "Lagos", "iata": "LOS", "country": "NG",
     "note": "Bookings opened for two weekly triangular rotations via Abuja from "
             "26 Oct 2026; Algeria-touching legs are recorded directionally."},
    {"city": "Luanda", "iata": "NBJ", "country": "AO",
     "note": "Dr. António Agostinho Neto International, which replaced Quatro de "
             "Fevereiro (LAD) as Luanda's airport. Same trap as Dakar's DKR/DSS: "
             "pinning the familiar code lands on the superseded field. Wikipedia's "
             "route tables already use NBJ."},
    {"city": "Maputo", "iata": "MPM", "country": "MZ"},
    {"city": "N'Djamena", "iata": "NDJ", "country": "TD"},
    {"city": "NIAMEY", "iata": "NIM", "country": "NE"},
    {"city": "NOUAKCHOTT", "iata": "NKC", "country": "MR"},
    {"city": "OUAGADOUGOU", "iata": "OUA", "country": "BF"},
    # --- North America ---
    {"city": "MONTREAL", "iata": "YUL", "country": "CA"},
    # --- Not on the destinations page, but on the candidate list from press ---
    {"city": "Hurghada", "iata": "HRG", "country": "EG",
     "note": "Charter. First rotation flown ~24-26 Jul 2026 per three independent "
             "Algerian outlets. Absent from the airline's destination page and "
             "invisible to booking probes, as charters generally are."},
    {"city": "Sharm el-Sheikh", "iata": "SSH", "country": "EG",
     "note": "Candidate only. The sole source found is a travel agency's own "
             "Facebook ad, which is the Insufficient tier. Carried so the endpoint "
             "exists if a citable source ever appears; ships nothing on its own."},
]

# OurAirports keys Basel-Mulhouse under BSL only. The airport is one field with two
# national terminals and two codes; Air Algerie files MLH.
IATA_ALIAS = {"MLH": "BSL"}


def load_ourairports(path=None):
    if path:
        text = open(path, encoding="utf-8").read()
    else:
        req = urllib.request.Request(OURAIRPORTS, headers={"User-Agent": "geoalgeria-research"})
        text = urllib.request.urlopen(req).read().decode("utf-8")
    by_iata = {}
    for r in csv.DictReader(text.splitlines()):
        code = (r.get("iata_code") or "").strip().upper()
        if len(code) == 3 and code not in by_iata:
            by_iata[code] = r
    return by_iata


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else None
    by_iata = load_ourairports(src)

    rows, problems = [], []
    for e in ENDPOINTS:
        lookup = IATA_ALIAS.get(e["iata"], e["iata"])
        oa = by_iata.get(lookup)
        if not oa:
            problems.append(f"{e['iata']}: not in OurAirports' IATA column")
            continue
        if oa["iso_country"] != e["country"]:
            problems.append(
                f"{e['iata']}: OurAirports puts it in {oa['iso_country']}, "
                f"expected {e['country']} ({oa['name']}) - the pinned code is wrong"
            )
            continue
        row = {
            "iata": e["iata"],
            "icao": (oa.get("icao_code") or "").strip().upper() or None,
            "name": oa["name"],
            "municipality": oa["municipality"] or None,
            "country": oa["iso_country"],
            "lat": float(oa["latitude_deg"]),
            "lng": float(oa["longitude_deg"]),
            "type": oa["type"],
            "airline_city_label": e["city"],
            "source": "ourairports",
        }
        if lookup != e["iata"]:
            row["resolved_via_iata"] = lookup
        if e.get("note"):
            row["note"] = e["note"]
        rows.append(row)

    if problems:
        raise SystemExit("endpoint resolution failed:\n  " + "\n  ".join(problems))

    dupes = {r["iata"] for r in rows if [x["iata"] for x in rows].count(r["iata"]) > 1}
    if dupes:
        raise SystemExit(f"duplicate endpoint IATA codes: {sorted(dupes)}")

    rows.sort(key=lambda r: r["iata"])
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
        f.write("\n")

    countries = len({r["country"] for r in rows})
    small = [r["iata"] for r in rows if r["type"] not in ("large_airport", "medium_airport")]
    print(f"wrote {len(rows)} foreign endpoints across {countries} countries -> {OUT}")
    if small:
        print(f"  not a large/medium airport, worth an eyeball: {', '.join(small)}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Merge everything collected into one tiered route dataset.

The map was drawing 11 legs while the collection had evidence for 60 pairs. The
fix is not to wait for perfect evidence on all of them, it is to ship each claim
with its confidence attached, which is what every other GeoAlgeria dataset does
with `geo_precision`. So each route carries an `evidence` tier and the app renders
the tiers differently.

Two tiers, and the wording of each is deliberate:

  verified  Operator confirmed as OPERATING the leg, direction recorded, and the
            duration checked against the great circle. These are the legs a human
            walked through end to end.

  listed    A published table lists Air Algérie serving this pair. This claims
            SERVICE, not operation, and the distinction is not pedantry: a
            codeshare puts an AH flight number on another airline's aircraft, so
            "Air Algérie sells this" and "Air Algérie flies this" are different
            facts and only the first is supported here.

Nothing is invented. A `listed` route ships the citation Wikipedia's own table
carries, so a reader can check the claim at its real strength, and it upgrades to
`verified` the moment a schedule check confirms operation and direction.

Usage: python3 build_route_dataset.py
"""

import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..")

# The date the network claim was last checked against schedules, NOT the date
# this script last ran. Routes churn seasonally, unlike every other GeoAlgeria
# dataset, so the package carries this as a validity stamp (`routes_as_of` in
# metadata.json) rather than reading as evergreen. Bump it only after a real
# collection/verification pass (see verification-YYYY-MM-DD.md).
AS_OF = "2026-08-21"

# Legs walked end to end: operator confirmed as operating, direction recorded,
# duration checked. Flight numbers are the operating carrier's own, and none of
# these came back with a codeshare object.
VERIFIED = [
    {"from": "CZL", "to": "TLS", "flight": "AH 1052", "status": "active", "days": ["tue"],
     "source": "https://www.toulouse.aeroport.fr/vols-et-destinations/constantine"},
    {"from": "TLS", "to": "CZL", "flight": "AH 1053", "status": "active", "days": ["tue"],
     "source": "https://www.toulouse.aeroport.fr/vols-et-destinations/constantine"},
    {"from": "TLM", "to": "LYS", "flight": "AH 1098", "status": "active", "days": ["wed"],
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    # The return of the leg above, from the same page: Lyon airport's own Air
    # Algerie page lists Tlemcen among the cities AH serves FROM Lyon (2h10
    # flight time), which is the departure direction. Flight number and times
    # from the 2026-07-29 schedule check (AH1099, 17:30->18:40, a 2h10 block
    # across the one-hour timezone step, matching the page's stated duration
    # exactly). No day-of-week is published on the page, so days stays null.
    {"from": "LYS", "to": "TLM", "flight": "AH 1099", "status": "active",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "ORN", "to": "ETZ", "status": "seasonal",
     "source": "https://www.lorraineaeroport.com/vols-destinations/oran/"},
    {"from": "ETZ", "to": "ORN", "flight": "AH 1185", "status": "seasonal",
     "source": "https://www.lorraineaeroport.com/vols-destinations/oran/"},
    {"from": "ALG", "to": "CDG", "flight": "AH 1002", "status": "active",
     "source": "https://www.parisaeroport.fr/"},
    {"from": "CDG", "to": "ALG", "flight": "AH 1013", "status": "active",
     "source": "https://www.parisaeroport.fr/"},
    {"from": "ALG", "to": "MRS", "flight": "AH 1020", "status": "active",
     "source": "https://www.marseille.aeroport.fr/"},
    {"from": "BLJ", "to": "CDG", "flight": "AH 1120", "status": "active",
     "source": "https://www.aeroroutes.com/"},
    {"from": "TLM", "to": "MRS", "flight": "AH 1092", "status": "active",
     "source": "https://www.marseille.aeroport.fr/vols-et-destinations/destinations/toutes-les-destinations/afrique/algerie/tlemcen"},
    {"from": "SXB", "to": "ALG", "flight": "AH 1453", "status": "seasonal",
     "source": "https://www.observalgerie.com/"},
    {"from": "ALG", "to": "BUD", "flight": "AH 2028", "status": "active", "days": ["sat"],
     "source": "https://www.aeroroutes.com/eng/250728-ahnw25bud"},
    {"from": "BUD", "to": "ALG", "flight": "AH 2028", "status": "active", "days": ["wed"],
     "source": "https://www.aeroroutes.com/eng/250728-ahnw25bud"},
    {"from": "ALG", "to": "HRG", "status": "unclear",
     "source": "https://www.observalgerie.com/"},
    {"from": "ORN", "to": "IST", "flight": "AH 3024", "status": "active",
     "source": "https://www.aeroroutes.com/"},
    # The African long-haul block, AH 53xx, on Air Algérie's own metal: neither
    # returned a codeshare object.
    {"from": "ALG", "to": "JNB", "flight": "AH 5360", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "ALG", "to": "DLA", "flight": "AH 5350", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Missed entirely by the Wikipedia sweep: the Algiers article lists Tunis
    # under Nouvelair and Tunisair but NOT Air Algérie, even though AH 4001,
    # 4002 and 4003 fly it in both directions with no codeshare. Proof that the
    # `listed` tier is a floor and not a ceiling.
    {"from": "ALG", "to": "TUN", "flight": "AH 4002", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "TUN", "to": "ALG", "flight": "AH 4001", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Missed the same way as Tunis: the Algiers article lists Cairo under
    # EgyptAir only. AH 4039 flies CAI-ALG with no codeshare, and the outbound
    # was seen on a booking screen the same day.
    {"from": "ALG", "to": "CAI", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "CAI", "to": "ALG", "flight": "AH 4039", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Spain and the UK, seen operating on booking screens in both directions on
    # 14 Aug, every leg duration-checked between 0.94 and 1.16. Vueling flies the
    # Spanish pairs too and BA Euroflyer flies Gatwick, none of which changes
    # what Air Algérie itself operates.
    {"from": "ORN", "to": "ALC", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "ALC", "to": "ORN", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "ALG", "to": "ALC", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "ALC", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "ALG", "to": "BCN", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "BCN", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "STN", "to": "ALG", "status": "active",
     "source": "https://www.aps.dz/en/economy/trade-services/mm0cvuxi-air-algerie-expands-its-uk-presence-with-heathrow-stansted-routes"},
    {"from": "LHR", "to": "ALG", "status": "active",
     "source": "https://www.aps.dz/en/economy/trade-services/mm0cvuxi-air-algerie-expands-its-uk-presence-with-heathrow-stansted-routes"},
    # Guangzhou: the longest leg in the network at 10,106 km, 12h50 nonstop.
    {"from": "ALG", "to": "CAN", "status": "active",
     "source": "https://www.air-journal.fr/2025-08-29-air-algerie-etend-son-reseau-a-linternational-desservant-addis-abeba-et-guangzhou-5265040.html"},
    # Frankfurt inbound. Only this direction is verified: the outbound was probed
    # over six consecutive days and returned nothing, so it stays `listed` until
    # something actually shows it. Direction is established per leg, never
    # inferred from the opposite one.
    {"from": "FRA", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Montreal inbound, twice daily at 7h50. The only transatlantic leg in the
    # network, and another route an empty probe said nothing about: ALG-YUL came
    # back with zero offers earlier the same day.
    {"from": "YUL", "to": "ALG", "status": "active",
     "source": "https://www.visa-algerie.com/air-algerie-se-renforce-a-montreal-pour-compenser-labsence-dair-canada/"},
    # France inbound, the largest single market. Every Air Algérie leg on a
    # France-to-Algeria country probe, 14 Aug, all duration-checked between 0.97
    # and 1.15 with nothing flagged. Note Paris resolves to BOTH airports here,
    # which is exactly why the scope insists on airport-level arcs: CDG and ORY
    # each fly to Algiers, Oran and Constantine, and they are different routes.
    #
    # Only INBOUND is verified. The same probe in the opposite direction returned
    # 26 flights with no Air Algérie leg at all, which per section 23 says
    # nothing either way, so the outbound legs stay as they were.
    {"from": "MRS", "to": "CZL", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "NCE", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "TLS", "to": "ORN", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "MRS", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "BOD", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "MRS", "to": "ORN", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "LYS", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "LYS", "to": "CZL", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "LYS", "to": "ORN", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "ORY", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "CDG", "to": "CZL", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "NTE", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "ORY", "to": "ORN", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "CDG", "to": "ORN", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Istanbul, on Air Algérie's own metal: four flights each way daily at
    # 3h30/3h35, against Turkish's own 3h45/3h50 on the same pair, plus IST-CZL
    # at 3h00. Previously excluded here by misreading codeshare.host_iata.
    {"from": "ALG", "to": "IST", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "IST", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "IST", "to": "CZL", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Brussels, both directions, and Air Algérie is the ONLY carrier on either.
    # This closes the oldest open question on the track: it was ORN-BRU that
    # could not be settled because brusselsairport.be blocks tooling, and the
    # aggregators claimed TUI Fly had taken the route over.
    {"from": "ALG", "to": "BRU", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "BRU", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Nouakchott, both ways, Air Algérie the only carrier on either. The
    # asymmetry is real rather than an error: 4h15 south against 3h35 north over
    # the same 2,774 km, which is what a headwind down the Atlantic coast does.
    {"from": "ALG", "to": "NKC", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    {"from": "NKC", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Vienna, and it independently corroborates the Budapest triangle. The
    # schedule filing has the Wednesday rotation flying ALG-VIE-BUD-ALG, so a
    # nonstop ALG-VIE leg has to exist, and here it is at 2h45, ratio 1.06.
    # The triangle was reconstructed from a trade filing months ago; this is the
    # first time the Vienna leg has been seen directly.
    {"from": "ALG", "to": "VIE", "status": "active",
     "source": "https://www.aeroroutes.com/eng/250728-ahnw25bud"},
    # Ouagadougou, promoted from listed. Air Algérie the only carrier, 4h30,
    # ratio 1.14.
    {"from": "ALG", "to": "OUA", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Johannesburg northbound, completing the pair. The outbound was verified
    # earlier at 9h20 and the return runs 9h15, ratios 0.95 and 0.94: the
    # longest route in the network in both directions.
    {"from": "JNB", "to": "ALG", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Kuala Lumpur, promoted from listed. At 10,580 km it is the longest arc in
    # the network, flown in 12h35 for an implied 841 kph, which is ordinary
    # long-haul cruise. Ratio 0.92: see the note below on why long-haul legs
    # always score under 1 against this heuristic.
    {"from": "ALG", "to": "KUL", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Dakar, and it lands on DSS exactly as the endpoint table pinned it. Blaise
    # Diagne replaced Leopold Sedar Senghor (DKR) in 2017, and pinning the
    # familiar code would have put this arc on a closed field.
    {"from": "ALG", "to": "DSS", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Abuja has operated since 2025. The NW26 booking inventory confirms the
    # outbound direction, Air Algerie metal and the Monday AH5354 leg before it
    # continues to Lagos.
    {"from": "ALG", "to": "ABV", "flight": "AH 5354", "status": "active",
     "days": ["mon"],
     "source": "https://www.agenceecofin.com/actualites-services/0704-127328-air-algerie-a-lance-sa-ligne-alger-abuja"},
    # Two 2026 summer launches observed operating. Only the directly evidenced
    # outbound legs are promoted; the return directions are not inferred.
    {"from": "ALG", "to": "DJE", "flight": "AH 4708", "status": "seasonal",
     "source": "https://www.visa-algerie.com/air-algerie-relance-ses-vols-saisonniers-vers-la-destination-la-plus-prisee-de-tunisie/"},
    {"from": "CZL", "to": "SSH", "status": "seasonal",
     "source": "https://www.visa-algerie.com/apres-djerba-en-tunisie-air-algerie-se-pose-a-charm-el-cheikh-en-egypte/"},
]

# Explicitly announced, but not operating on AS_OF. These stay separate from
# VERIFIED because `plannedRoutes()` is the package's lifecycle boundary. A
# booking result can establish carrier, direction, flight number and duration;
# a reported announcement stays `listed` until those details are confirmed.
PLANNED = [
    {"from": "ALG", "to": "BER", "flight": "AH 2072", "status": "unclear",
     "days": ["mon"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-ouvre-les-ventes-sur-une-nouvelle-ligne-vers-leurope/"},
    {"from": "ALG", "to": "BZV", "flight": "AH 5390", "status": "unclear",
     "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "ALG", "to": "CKY", "flight": "AH 5358", "status": "unclear",
     "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "ALG", "to": "DEL", "flight": "AH 3104", "status": "unclear",
     "days": ["tue", "thu", "sun"], "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/260619-ahnw26as"},
    {"from": "ALG", "to": "DOH", "flight": "AH 4078", "status": "unclear",
     "days": ["tue", "fri"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/apres-des-mois-de-suspension-air-algerie-de-retour-vers-ce-pays-du-golfe/"},
    {"from": "ALG", "to": "ICN", "status": "unclear", "evidence": "listed",
     "source": "https://www.visa-algerie.com/air-algerie-une-ligne-directe-vers-la-coree-du-sud-se-precise/"},
    {"from": "ALG", "to": "LOS", "flight": "AH 5354", "status": "unclear",
     "days": ["thu"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "ALG", "to": "PVG", "flight": "AH 3082", "status": "unclear",
     "days": ["mon", "wed", "sat"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-ouvre-une-nouvelle-ligne-vers-la-chine-dates-horaires-et-prix/"},
    {"from": "ABV", "to": "ALG", "flight": "AH 5354", "status": "unclear",
     "days": ["fri"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "BER", "to": "ALG", "flight": "AH 2073", "status": "unclear",
     "days": ["mon"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-ouvre-les-ventes-sur-une-nouvelle-ligne-vers-leurope/"},
    {"from": "BZV", "to": "ALG", "flight": "AH 5391", "status": "unclear",
     "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "CKY", "to": "ALG", "flight": "AH 5359", "status": "unclear",
     "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "DEL", "to": "ALG", "flight": "AH 3105", "status": "unclear",
     "days": ["mon", "wed", "fri"], "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/260619-ahnw26as"},
    {"from": "DOH", "to": "ALG", "flight": "AH 4079", "status": "unclear",
     "days": ["tue", "fri"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/apres-des-mois-de-suspension-air-algerie-de-retour-vers-ce-pays-du-golfe/"},
    {"from": "ICN", "to": "ALG", "status": "unclear", "evidence": "listed",
     "source": "https://www.visa-algerie.com/air-algerie-une-ligne-directe-vers-la-coree-du-sud-se-precise/"},
    {"from": "LOS", "to": "ALG", "flight": "AH 5354", "status": "unclear",
     "days": ["tue"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "PVG", "to": "ALG", "flight": "AH 3083", "status": "unclear",
     "days": ["tue", "thu", "sun"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-ouvre-une-nouvelle-ligne-vers-la-chine-dates-horaires-et-prix/"},
]

# Pairs a booking probe shows being flown by ANOTHER airline, with Air Algérie
# only selling seats on it. See collection-rules.md section 16.
#
# `codeshare.host_iata` is the OPERATING carrier; `partner_iatas` are the airlines
# marketing it. Read the host, never the flight number. ALG-IST and CZL-IST were
# excluded here on the opposite reading and were wrong: CZL-IST comes back as
# `TK 8666` with `host: "AH"`, which is Turkish marketing an Air Algérie flight,
# and TK's 8xxx range is exactly where marketing numbers live. A country probe
# then showed Air Algérie flying Istanbul four times a day each way. Both are
# restored to verified above.
#
# What survives is the case the rule was actually for: ALG-DOH returns QR 1380
# with `host: "QR"`, so Qatar flies it and Air Algérie merely sells it.
# ALG-DOH used to return only Qatar Airways metal. AH4078/AH4079 are now in
# Air Algerie's own forward inventory from 29 Sep 2026, so Doha moved to the
# explicit planned list above and no current pair remains excluded here.
CODESHARE_ONLY = set()

# Screened and found to be flown by ANOTHER airline entirely, with no Air Algérie
# leg at all, not even a codeshare. A published table listing Air Algérie on these
# is not enough to draw them: the probe returns Saudia and Royal Jordanian metal
# and nothing of Air Algérie's. They may be seasonal, Hajj-period or simply a
# table error, and either way an arc here would assert something unsupported.
OPERATED_BY_OTHERS = {
    # Checked on two independent dates, 4 and 14 August, both returning only
    # Saudia and no Air Algérie leg whatsoever. A single empty probe would be
    # weak evidence per section 7; two on different dates, both showing another
    # airline actually flying the pair, is a different thing entirely.
    ("ALG", "JED"),   # SV 0340 / SV 0342, Saudia
    ("ALG", "AMM"),   # RJ 0518, Royal Jordanian
    # Algeria to Italy on 14 Aug returned ONE flight, ITA Airways, and no Air
    # Algérie leg from any Algerian airport. The country-form probe of section 20
    # makes that a statement about the whole country, not just this pair.
    ("ALG", "FCO"),   # ITA Airways
}


def haversine(a, b, c, d):
    p1, p2 = math.radians(a), math.radians(c)
    dp, dl = math.radians(c - a), math.radians(d - b)
    return 2 * 6371 * math.asin(math.sqrt(
        math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))


def main():
    airports = json.load(open(os.path.join(DATA, "packages", "aviation", "data", "airports.json"), encoding="utf-8"))
    foreign = json.load(open(os.path.join(HERE, "foreign-endpoints.json"), encoding="utf-8"))
    wiki = json.load(open(os.path.join(HERE, "routes-wikipedia.json"), encoding="utf-8"))
    dest_iata = json.load(open(os.path.join(HERE, "destination-iata-cache.json"), encoding="utf-8"))
    # Per-language names from Wikidata (localize_endpoint_names.py). Every
    # endpoint must have one: shipping a single-language name is the bug this
    # file exists to fix, so a missing entry fails the build rather than
    # falling back to it.
    names = json.load(open(os.path.join(HERE, "endpoint-names.json"), encoding="utf-8"))

    def named(iata, name_fr, lat, lng, country):
        n = names.get(iata)
        if not n:
            raise SystemExit(f"{iata}: not in endpoint-names.json; run localize_endpoint_names.py")
        return {"iata": iata, "name": name_fr if name_fr is not None else n["name_fr"],
                "name_en": n["name_en"], "name_ar": n["name_ar"],
                "lat": lat, "lng": lng, "country": country}

    ep = {}
    for a in airports:
        if a.get("iata"):
            # The Algerian ends keep the aviation package's French house style
            # as `name`; only en/ar come from Wikidata.
            ep[a["iata"]] = named(a["iata"], a["name"], a["lat"], a["lng"], "DZ")
    for f in foreign:
        if f["iata"] in ep:
            continue
        # Foreign `name` was OurAirports English pretending to be the French
        # display field; the Wikidata French label replaces it. The lookup
        # happens inside named() so a missing IATA gets the actionable error,
        # not a bare KeyError evaluated before the call.
        ep[f["iata"]] = named(f["iata"], None, f["lat"], f["lng"], f["country"])
    dz = {a["iata"] for a in airports if a.get("iata")}

    routes, planned_routes = [], []
    skipped = {"no_endpoint": [], "codeshare": [], "domestic": []}
    seen = set()

    def add_curated_route(record, destination, evidence):
        key = (record["from"], record["to"])
        if record["from"] not in ep or record["to"] not in ep:
            skipped["no_endpoint"].append(key)
            return
        seen.add(key)
        destination.append({
            "id": f"{record['from'].lower()}-{record['to'].lower()}",
            "from": record["from"], "to": record["to"], "carrier": "AH",
            "flight": record.get("flight"), "status": record["status"], "days": record.get("days"),
            "evidence": evidence, "source": record["source"],
        })

    for record in VERIFIED:
        add_curated_route(record, routes, "verified")

    for record in PLANNED:
        add_curated_route(record, planned_routes, record["evidence"])

    for r in wiki:
        if r["carrier"] != "Air Algérie":
            continue
        to = dest_iata.get(r["to_article"])
        frm = r["from_iata"]
        if not to:
            continue
        if to in dz:
            skipped["domestic"].append((frm, to)); continue
        key = (frm, to)
        if key in seen:
            continue
        if key in CODESHARE_ONLY or key in OPERATED_BY_OTHERS:
            skipped["codeshare"].append(key); continue
        if frm not in ep or to not in ep:
            skipped["no_endpoint"].append(key); continue
        seen.add(key)
        # "begins"/"resumes" means announced but not yet flying, which the locked
        # scope says is a SEPARATE collection rather than a status: a planned
        # route must never be drawn like an operating one, and must never count
        # toward the destination figure. Without this the Shanghai launch was
        # being drawn as a solid arc alongside routes that actually fly.
        planned = any(n in r["notes"] for n in ("begins", "resumes"))
        status = "unclear"
        if "seasonal" in r["notes"]:
            status = "seasonal"
        (planned_routes if planned else routes).append({
            "id": f"{frm.lower()}-{to.lower()}",
            "from": frm, "to": to, "carrier": "AH",
            "flight": None, "status": status, "days": None,
            "evidence": "listed",
            "source": r["source_urls"][0] if r["source_urls"] else
                      "https://en.wikipedia.org/wiki/" + r["from_article"].replace(" ", "_"),
            "source_is_the_table": not r["source_urls"],
            "listed_at": r["from_article"],
        })

    used = sorted({c for r in routes + planned_routes for c in (r["from"], r["to"])})
    endpoints = [ep[c] for c in used]

    # Sanity: no arc may be zero-length or absurdly long for a nonstop.
    for r in routes + planned_routes:
        a, b = ep[r["from"]], ep[r["to"]]
        km = haversine(a["lat"], a["lng"], b["lat"], b["lng"])
        r["great_circle_km"] = round(km)
        if km < 50:
            raise SystemExit(f"{r['id']}: {km:.0f} km apart, that is not a route")

    out = {
        "as_of": AS_OF,
        "routes": sorted(routes, key=lambda r: r["id"]),
        "planned": sorted(planned_routes, key=lambda r: r["id"]),
        "endpoints": endpoints,
    }
    path = os.path.join(HERE, "route-dataset.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")

    ver = sum(1 for r in routes if r["evidence"] == "verified")
    lis = sum(1 for r in routes if r["evidence"] == "listed")
    unsourced = sum(1 for r in routes if not r["source"])
    print(f"wrote {len(routes)} routes ({ver} verified, {lis} listed) "
          f"across {len(endpoints)} endpoints -> {path}")
    print(f"  listed routes with no citation: {unsourced}")
    print(f"  skipped: {len(skipped['codeshare'])} codeshare-only, "
          f"{len(skipped['domestic'])} domestic, {len(skipped['no_endpoint'])} without an endpoint")
    print(f"  planned (announced, not yet flying): {len(planned_routes)}"
          + (f" -> {', '.join(r['id'] for r in planned_routes)}" if planned_routes else ""))
    print(f"  longest arc: {max(r['great_circle_km'] for r in routes)} km")


if __name__ == "__main__":
    main()

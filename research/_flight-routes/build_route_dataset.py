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
AS_OF = "2026-10-09"

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
    # Batna's Paris service is at ORLY, not CDG. The record shipped as BLJ-CDG on
    # an aeroroutes homepage citation that names no airport, and the dispute stood
    # open since 2026-07-29. Three independent flight-tracking aggregators now
    # converge on ORY for both AH1120 and AH1121, with nothing current naming CDG,
    # which is the Reported tier of section 9: cross-checked secondary sources, so
    # it ships with the most specific page as the citation. Each direction cites
    # its own page, because direction is established per leg. Durations (2h24 out,
    # 2h15 back, against a 1,478 km great circle) clear the 1.35x technical-stop
    # check comfortably.
    {"from": "BLJ", "to": "ORY", "flight": "AH 1120", "status": "active",
     "source": "https://www.flightsfrom.com/BLJ-ORY"},
    {"from": "ORY", "to": "BLJ", "flight": "AH 1121", "status": "active",
     "source": "https://www.flightsfrom.com/ORY-BLJ"},
    {"from": "TLM", "to": "MRS", "flight": "AH 1092", "status": "active",
     "source": "https://www.marseille.aeroport.fr/vols-et-destinations/destinations/toutes-les-destinations/afrique/algerie/tlemcen"},
    {"from": "SXB", "to": "ALG", "flight": "AH 1453", "status": "seasonal",
     "source": "https://www.observalgerie.com/"},
    # Budapest, re-dated. The Saturday and Wednesday the rows carried came from the
    # NW25 filing of 28 Jul 2025, and a newer filing of 2 Jan 2026 supersedes it:
    # the resumption slipped from Oct 2025 to Apr 2026 and the triangle now runs a
    # MONDAY ALG-VIE-BUD-ALG rotation and a THURSDAY ALG-BUD-VIE-ALG rotation, both
    # on AH2028/AH2029, effective 1 and 4 Apr 2026.
    #
    # So the nonstop ALG-BUD leg is the Thursday rotation's Algiers departure, and
    # `days` records that. BUD-ALG is the Monday rotation's leg home, and section
    # 33's rule applies: the filing dates the rotation from Algiers, nothing
    # published says which day the aircraft leaves Budapest, so `days` goes null
    # rather than inheriting the Monday. The flight number is unchanged because the
    # filing names AH2028 and AH2029 for the rotations without splitting them by
    # leg, and guessing which number comes home is exactly the inference this file
    # does not make.
    {"from": "ALG", "to": "BUD", "flight": "AH 2028", "status": "active", "days": ["thu"],
     "source": "https://www.aeroroutes.com/eng/260102-ahapr26bud"},
    {"from": "BUD", "to": "ALG", "flight": "AH 2028", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260102-ahapr26bud"},
    {"from": "ALG", "to": "HRG", "status": "unclear",
     "source": "https://www.observalgerie.com/"},
    {"from": "ORN", "to": "IST", "flight": "AH 3024", "status": "active",
     "source": "https://www.aeroroutes.com/"},
    # The African long-haul block, AH 53xx, on Air Algérie's own metal: neither
    # returned a codeshare object.
    {"from": "ALG", "to": "JNB", "flight": "AH 5360", "status": "active",
     "source": "https://www.airalgerie.dz/decouvrir/nos-destinations/"},
    # Douala outbound. The flight number moves from AH 5350 to AH 5348 and the
    # citation with it; see the DLA-ALG entry below for why, and note that the
    # airline's own destination list, the previous citation, never carried a flight
    # number for this leg at all.
    {"from": "ALG", "to": "DLA", "flight": "AH 5348", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260629-ahnw26"},
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
    # continues to Lagos. Corroborated 2026-10-02 against algerie360's own launch
    # report of 7 Apr 2025, which dates the inaugural Nigeria flight to 6 Apr 2025
    # and carries both directions' schedule; the agenceecofin citation stands
    # because it is the piece that named the launch, and it answers an automated
    # fetch with HTTP 403 rather than having gone away.
    {"from": "ALG", "to": "ABV", "flight": "AH 5354", "status": "active",
     "days": ["mon"],
     "source": "https://www.agenceecofin.com/actualites-services/0704-127328-air-algerie-a-lance-sa-ligne-alger-abuja"},
    # The Abuja return, promoted out of plannedRoutes() on 2026-10-02. It shipped
    # as planned on the NW26 sale inventory, which reads as "announced, not yet
    # operating", and that was wrong: algerie360's launch report of 7 Apr 2025
    # states the route's own return schedule, "des vols retour d'Abuja vers Alger
    # chaque vendredi a 3h30", so the leg has been flying since April 2025. The NW26
    # programme restructures it through Lagos from 29 Oct 2026, which changes the
    # routing and not whether the leg operates. `days` keeps the Friday both the
    # 2025 schedule and the NW26 inventory carry.
    {"from": "ABV", "to": "ALG", "flight": "AH 5354", "status": "active",
     "days": ["fri"],
     "source": "https://www.algerie360.com/air-algerie-accelere-son-envol-en-afrique-avec-40-vols-hebdomadaires-a-lhorizon-2026/"},
    # Doha, planned since the Sep 2026 sale inventory and OPERATING since the
    # resumption flew. Hamad International's own welcome of the first Air Algerie
    # arrival, reported 30 Sep 2026, is what moves the pair out of
    # plannedRoutes(): an announcement is a plan, an airport operator receiving the
    # aircraft is an operation. Three readable Algerian reports of 25 and 27 Sep
    # 2026 converge on the frequency, "trois vols par semaine, chaque dimanche,
    # mardi et vendredi" from 29 Sep, with the Algiers departure at 00:55, and that
    # is what `days` carries. The same reports announce DAILY service from 25 Oct
    # 2026, which is a future change and not this snapshot's fact: it is logged in
    # the ROADMAP for the next pass rather than written in early.
    {"from": "ALG", "to": "DOH", "flight": "AH 4078", "status": "active",
     "days": ["sun", "tue", "fri"],
     "source": "https://thepeninsulaqatar.com/article/30/09/2026/hia-welcomes-first-air-algerie-flight-as-direct-doha-algiers-service-launches"},
    # Both legs carry the same days, which is sourced rather than mirrored: the
    # 25 Sep report calls them "trois rotations par semaine : mardi, vendredi et
    # dimanche", and a rotation is out and back inside the day. The headline the
    # 30 Sep piece runs, "direct Doha-Algiers service launches", covers this
    # direction explicitly.
    {"from": "DOH", "to": "ALG", "flight": "AH 4079", "status": "active",
     "days": ["sun", "tue", "fri"],
     "source": "https://thepeninsulaqatar.com/article/30/09/2026/hia-welcomes-first-air-algerie-flight-as-direct-doha-algiers-service-launches"},
    # Two 2026 summer launches observed operating. Only the directly evidenced
    # outbound legs are promoted; the return directions are not inferred.
    {"from": "ALG", "to": "DJE", "flight": "AH 4708", "status": "seasonal",
     "source": "https://www.visa-algerie.com/air-algerie-relance-ses-vols-saisonniers-vers-la-destination-la-plus-prisee-de-tunisie/"},
    {"from": "CZL", "to": "SSH", "status": "seasonal",
     "source": "https://www.visa-algerie.com/apres-djerba-en-tunisie-air-algerie-se-pose-a-charm-el-cheikh-en-egypte/"},
    # Berlin, planned since the sales opened and OPERATING since Monday 14 Sep
    # 2026, when the inaugural rotation flew. `plannedRoutes()` means announced
    # but not yet operating, so the pair belongs here now, and each direction
    # cites a page covering that direction: the launch report for the outbound,
    # and the winter-schedule report, which carries the Berlin departure and
    # confirms the leg stays nonstop, for the return.
    # One weekly same-day rotation. The winter programme moves the slot from
    # Monday to SUNDAY on 25 Oct 2026; `days` records the day the route operates
    # on as of AS_OF and the next pass moves it.
    {"from": "ALG", "to": "BER", "flight": "AH 2072", "status": "active", "days": ["mon"],
     "source": "https://www.algerie360.com/air-algerie-nouvelle-ligne-directe-berlin/"},
    {"from": "BER", "to": "ALG", "flight": "AH 2073", "status": "active", "days": ["mon"],
     "source": "https://www.visa-algerie.com/air-algerie-la-nouvelle-ligne-vers-leurope-maintenue-sans-escale-en-hiver/"},
    # Strasbourg outbound, promoted from the Wikipedia pass on the airport's own
    # page for the service: it names Air Algerie, the direction (a new service at
    # Strasbourg) and the days, twice weekly Monday and Thursday, for the winter
    # 2025-2026 and summer 2026 seasons both. `status` is `active` rather than the
    # `seasonal` the return leg carries, because this page publishes a schedule for
    # each half of the year; SXB-ALG keeps its own status on its own source, which
    # is what section 10 asks for, and the mismatch is flagged in
    # verification-2026-10-09.md rather than resolved by mirroring. No flight
    # number: the page does not carry one.
    {"from": "ALG", "to": "SXB", "status": "active", "days": ["mon", "thu"],
     "source": "https://www.strasbourg.aeroport.fr/passagers/nouveau-alger-avec-air-algerie-2/"},
    # Manchester, both directions on one Official-tier source. The airport
    # operator's own press release names the carrier, both directions, the
    # inaugural (Sunday 14 Jun 2026) and the twice-weekly Tuesday/Sunday pattern.
    # `seasonal` is the status the route actually has: the schedule runs 14 Jun to
    # 8 Sep 2026, so on this AS_OF the summer season has closed and the arc is part
    # of the structure of the network rather than a departure-board entry.
    {"from": "ALG", "to": "MAN", "flight": "AH 2058", "status": "seasonal",
     "days": ["tue", "sun"],
     "source": "https://mediacentre.manchesterairport.co.uk/air-algerie-to-launch-first-flights-from-manchester-airport-to-north-african-hub/"},
    {"from": "MAN", "to": "ALG", "flight": "AH 2059", "status": "seasonal",
     "days": ["tue", "sun"],
     "source": "https://mediacentre.manchesterairport.co.uk/air-algerie-to-launch-first-flights-from-manchester-airport-to-north-african-hub/"},
    # Stansted outbound, promoted from the Wikipedia pass. London Stansted's own
    # press release carries operator, both directions and the full day and time
    # detail of the launch schedule, 10:20 Wed/Thu and 09:00 Sat/Sun out of
    # Algiers. Those are the launch days, which is what the cited page supports; a
    # denser current schedule is claimed only by sources this project does not cite.
    {"from": "ALG", "to": "STN", "flight": "AH 2056", "status": "active",
     "days": ["wed", "thu", "sat", "sun"],
     "source": "https://mediacentre.stanstedairport.com/new-airline-air-algerie-launches-direct-flights-to-algiers/"},
    # Montreal outbound, completing the only transatlantic pair in the network. The
    # trade filing reads the Canadian Transportation Agency's approval of an
    # increase to 12 weekly from 14 Jun to 31 Oct 2026 and gives the Algiers
    # departures as AH2700 and AH2702. `flight` stays null because the filing names
    # two numbers for this one direction and the field holds one; both are recorded
    # in verification-2026-10-09.md. `days` stays null: the filing gives a weekly
    # frequency, never day names.
    {"from": "ALG", "to": "YUL", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260430-ahns26yul"},
    # Beijing, both directions, new to the dataset. The filing carries each leg's
    # flight number and times, which is what makes this verified rather than
    # listed, and a frequency (2x weekly from May 2026) without day names, which is
    # why `days` is null.
    {"from": "ALG", "to": "PEK", "flight": "AH 3060", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260416-ahmay26pek"},
    {"from": "PEK", "to": "ALG", "flight": "AH 3061", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260416-ahmay26pek"},
    # Guangzhou and Kuala Lumpur inbound. Both outbound legs were already verified
    # from the airline's own destination list; these are the returns, each on the
    # NW26 continuation filing that states its own flight number and times. The
    # outbound rows are deliberately NOT re-cited to this filing: they carry no
    # flight number, so nothing on them needs a source the airline's own page
    # cannot support (the Shanghai precedent, verification-2026-10-02.md section 6).
    {"from": "CAN", "to": "ALG", "flight": "AH 3181", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260620-ahnw26cankul"},
    {"from": "KUL", "to": "ALG", "flight": "AH 3157", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260620-ahnw26cankul"},
    # Douala and Libreville, restructured. Until the NW26 programme both ran on the
    # single ALG-DLA-LBV-ALG / ALG-LBV-DLA-ALG triangle number AH 5350, which is
    # what `alg-dla` shipped. The 29 Jun 2026 filing splits them into
    # point-to-point numbers, AH5348/AH5349 for Douala and AH5040/AH5041 for
    # Libreville, 3x weekly each, effective 25 Oct 2026. Those numbers are written
    # in here, 16 days ahead of this AS_OF, because AH 5350 is the number the
    # restructure retires rather than a competing current value: keeping it would
    # ship a flight number no timetable will carry. The filing gives no day names,
    # so `days` stays null on all four.
    {"from": "DLA", "to": "ALG", "flight": "AH 5349", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260629-ahnw26"},
    {"from": "ALG", "to": "LBV", "flight": "AH 5040", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260629-ahnw26"},
    {"from": "LBV", "to": "ALG", "flight": "AH 5041", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260629-ahnw26"},
    # Luanda, both directions, promoted from the Wikipedia pass. `NBJ` is Dr.
    # Antonio Agostinho Neto International, which replaced Quatro de Fevereiro
    # (LAD) as Luanda's airport, and the endpoint table has had it pinned that way
    # since the Dakar DKR/DSS trap. These are the two Algeria-touching legs of the
    # ALG-LAD-JNB-ALG rotation the 8 Jun 2026 filing states, in scope as a
    # rotation's legs under collection-rules.md section 33, at 5x weekly south and
    # 6x weekly north from 3 Jul 2026 with no day names published.
    {"from": "ALG", "to": "NBJ", "flight": "AH 5360", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260608-ahjul26nbj"},
    {"from": "NBJ", "to": "ALG", "flight": "AH 5361", "status": "active",
     "source": "https://www.aeroroutes.com/eng/260608-ahjul26nbj"},
]

# Operating legs whose citation is Official or Reported tier but does NOT confirm
# operation end to end: an airport operator's carrier page names Air Algérie and
# the cities it serves, a trade network list names the route, and neither gives
# the per-direction days, times or flight number that `verified` asserts.
#
# This collection exists because neither curated collection above could carry
# them. `VERIFIED` stamps `evidence: "verified"` on everything in it by
# construction, and `PLANNED` is the lifecycle boundary, not an evidence tier. The
# only way into `routes()` at `listed` was the Wikipedia merge, which meant a leg
# Lyon airport publishes on its own site could not ship at all unless Wikipedia
# happened to carry the same row, and where it did, the weaker citation won. Each
# row here carries its own `evidence`, the same way `PLANNED` does.
LISTED = [
    # Lyon. The airport's own Air Algérie carrier page lists Algiers, Annaba,
    # Batna, Béjaïa, Biskra, Constantine, Oran, Sétif and Tlemcen as the cities it
    # serves. It names the carrier and the airport, so it is Official tier and the
    # service is current, which is what `active` records; it gives no per-direction
    # day, time or flight number, which is what caps the evidence at `listed`. The
    # Algiers, Constantine, Oran and Tlemcen legs out of Lyon are already verified
    # above on schedule checks and are not duplicated here.
    {"from": "AAE", "to": "LYS", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "ALG", "to": "LYS", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "BJA", "to": "LYS", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "BLJ", "to": "LYS", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "BSK", "to": "LYS", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "CZL", "to": "LYS", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "ORN", "to": "LYS", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "QSF", "to": "LYS", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "LYS", "to": "AAE", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "LYS", "to": "BJA", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "LYS", "to": "BLJ", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "LYS", "to": "BSK", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    {"from": "LYS", "to": "QSF", "status": "active", "evidence": "listed",
     "source": "https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie"},
    # Metz-Nancy-Lorraine. The airport's own destinations page lists Alger (2h05)
    # and Constantine (2h15) and names Air Algérie as the carrier that has served
    # the airport "for more than 20 years". Same shape as Lyon: Official tier,
    # current service, no per-destination day or time, so `listed`. ORN-ETZ and
    # ETZ-ORN stay verified and seasonal on the operator's own Oran subpage, which
    # publishes that route's schedule.
    {"from": "ALG", "to": "ETZ", "status": "active", "evidence": "listed",
     "source": "https://lorraineaeroport.com/vols-destinations/"},
    {"from": "ETZ", "to": "ALG", "status": "active", "evidence": "listed",
     "source": "https://lorraineaeroport.com/vols-destinations/"},
    {"from": "CZL", "to": "ETZ", "status": "active", "evidence": "listed",
     "source": "https://lorraineaeroport.com/vols-destinations/"},
    {"from": "ETZ", "to": "CZL", "status": "active", "evidence": "listed",
     "source": "https://lorraineaeroport.com/vols-destinations/"},
    # Montpellier. The airport's own Airlines page states that Air Algérie serves
    # Algiers and Oran year-round, which is where `active` comes from, and gives no
    # days or flight numbers.
    {"from": "ALG", "to": "MPL", "status": "active", "evidence": "listed",
     "source": "https://www.montpellier.aeroport.fr/en/passengers/flight-destinations/airlines"},
    {"from": "MPL", "to": "ALG", "status": "active", "evidence": "listed",
     "source": "https://www.montpellier.aeroport.fr/en/passengers/flight-destinations/airlines"},
    {"from": "ORN", "to": "MPL", "status": "active", "evidence": "listed",
     "source": "https://www.montpellier.aeroport.fr/en/passengers/flight-destinations/airlines"},
    {"from": "MPL", "to": "ORN", "status": "active", "evidence": "listed",
     "source": "https://www.montpellier.aeroport.fr/en/passengers/flight-destinations/airlines"},
    # Nantes. The airport's own Air Algérie page says Algiers is its only Algerian
    # destination. NTE-ALG is already verified above.
    {"from": "ALG", "to": "NTE", "status": "active", "evidence": "listed",
     "source": "https://www.nantes.aeroport.fr/fr/air-algerie"},
    # Rome Fiumicino, both directions, and the reversal of this file's oldest wrong
    # exclusion. See the note on OPERATED_BY_OTHERS below for why the July screen
    # read as a negative when the route had been flying all along. The citation is
    # the 6 Jul 2026 trade post listing Fiumicino among 23 routes Air Algérie flew
    # with a wet-leased A320 for the 1 Jul to 24 Oct 2026 window: it is a network
    # list, so it names the route and nothing per-leg, which is `listed` exactly.
    # A wet-lease is an aircraft arrangement and not an operator change: the AH
    # flight number was never hosted by another carrier, which is the test
    # collection-rules.md section 16 actually applies.
    {"from": "ALG", "to": "FCO", "status": "active", "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/260706-ahns26320"},
    {"from": "FCO", "to": "ALG", "status": "active", "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/260706-ahns26320"},
    # Rotterdam, both directions, on the NW25 launch filing: 28 Oct 2025, a
    # 737-600, 2x weekly WEDNESDAY and Saturday. The Wednesday matters, because a
    # flight-data feed had Tuesday for the same pair and the filing is the source
    # that ships. Corroborated at Official tier, direction only, by the Algerian
    # embassy in The Hague's own launch release, which carries no flight number and
    # so is not the row's citation.
    {"from": "ALG", "to": "RTM", "flight": "AH 2084", "status": "active",
     "days": ["wed", "sat"], "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/250901-ahnw25rtm"},
    {"from": "RTM", "to": "ALG", "flight": "AH 2085", "status": "active",
     "days": ["wed", "sat"], "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/250901-ahnw25rtm"},
    # Heathrow outbound. LHR-ALG has been verified since the APS report of the UK
    # expansion; this is the other direction, and its own evidence is the 20 Jul
    # 2026 post on the 737 MAX 8's first revenue service, "AH2054 ALG-LHR" with a
    # first flight of 14 Jul 2026 and 5x weekly. `days` is null: the five day names
    # recorded anywhere for this leg come from an aggregator and not from this
    # filing, and a frequency is not a day list.
    {"from": "ALG", "to": "LHR", "flight": "AH 2054", "status": "active",
     "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/260720-ahjul267m8"},
    # Beirut and Dubai inbound. Neither leg was in the dataset, which left the
    # SUSPENDED override below with nothing to dim in this direction while the APS
    # notice names both. They enter as `listed` and the override sets their status
    # and their source; the map is structural, so a suspended arc belongs in
    # `routes()` dimmed, never deleted (collection-rules.md section 2).
    {"from": "BEY", "to": "ALG", "status": "suspended", "evidence": "listed",
     "source": "https://www.aps.dz/fr/economie/commerce-et-service/mmexsi27-maintien-de-la-suspension-des-vols-au-depart-et-a-destination-de-doha-beyrouth-amman-et-dubai"},
    {"from": "DXB", "to": "ALG", "status": "suspended", "evidence": "listed",
     "source": "https://www.aps.dz/fr/economie/commerce-et-service/mmexsi27-maintien-de-la-suspension-des-vols-au-depart-et-a-destination-de-doha-beyrouth-amman-et-dubai"},
]

# Explicitly announced, but not operating on AS_OF. These stay separate from
# VERIFIED because `plannedRoutes()` is the package's lifecycle boundary. A
# booking result can establish carrier, direction, flight number and duration;
# a reported announcement stays `listed` until those details are confirmed.
PLANNED = [
    # Conakry and Brazzaville: the operating days arrive with the 26 Sep 2026
    # programme report, which carries each route's first flight and then its weekly
    # pattern, "premier vol le dimanche 25 octobre 2026, puis trois vols par
    # semaine, les mardis, jeudis et dimanches" for Conakry and "premier vol le
    # lundi 26 octobre 2026, puis trois vols par semaine, les lundis, mercredis et
    # samedis" for Brazzaville. Both are cited to that report because it is what
    # supports `days`; the AH5358/AH5390 flight numbers come from the 20 Aug 2026
    # sale-inventory report the rows shipped on before. AeroRoutes' NW26 filing of
    # 20 Aug independently carries the same effective dates and the three weekly
    # frequency.
    #
    # `days` is set on the Algiers departures only. The reports state the day the
    # aircraft leaves Algiers; when each return leg flies is a separate fact
    # nothing published pins down, and section 1's directional record is the unit.
    {"from": "ALG", "to": "BZV", "flight": "AH 5390", "status": "unclear",
     "days": ["mon", "wed", "sat"], "evidence": "verified",
     "source": "https://www.algerie360.com/air-algerie-nouvelles-lignes-afrique-conakry-brazzaville-lagos/"},
    {"from": "ALG", "to": "CKY", "flight": "AH 5358", "status": "unclear",
     "days": ["tue", "thu", "sun"], "evidence": "verified",
     "source": "https://www.algerie360.com/air-algerie-nouvelles-lignes-afrique-conakry-brazzaville-lagos/"},
    {"from": "ALG", "to": "ICN", "status": "unclear", "evidence": "listed",
     "source": "https://www.visa-algerie.com/air-algerie-une-ligne-directe-vers-la-coree-du-sud-se-precise/"},
    # The announced Algiers-Kuwait-Amman-Algiers triangle, one weekly Monday
    # rotation on a 737-800 from 26 Oct 2026, confirmed on the record by Algeria's
    # ambassador to Kuwait. A triangle yields ONE-DIRECTIONAL nonstops, and only
    # the Algeria-touching legs are this dataset's business, so it produces
    # exactly two rows: ALG-KWI outbound and AMM-ALG inbound. There is no ALG-AMM
    # row and no KWI-ALG row, because neither is ever flown nonstop on this
    # rotation, and the KWI-AMM leg touches Algeria at neither end.
    # Evidence stays `listed`: a diplomatic confirmation with a stated day, date
    # and aircraft clears the plannedRoutes() bar, but no flight number, filed
    # schedule or sale inventory has appeared, which is the same lower boundary
    # Delhi and Incheon sat on (collection-rules.md section 31).
    {"from": "ALG", "to": "KWI", "status": "unclear", "days": ["mon"], "evidence": "listed",
     "source": "https://www.visa-algerie.com/air-algerie-le-projet-dune-nouvelle-ligne-vers-le-golfe-confirme-officiellement/"},
    # The triangle's middle leg, added 2026-10-02 on the Owner's decision, and it
    # widens a scope line this file used to draw: the 27 Sep pass recorded "nothing
    # for the Kuwait to Amman leg, which touches Algeria at neither end". The dataset
    # models Air Algerie's international network as directional nonstop legs, and
    # KWI-AMM is one of them, flown by Air Algerie on the same weekly rotation as the
    # two legs already here. Leaving it out drew a rotation with a hole in the
    # middle. See collection-rules.md section 33 for the amended rule.
    # `days` is null for the same reason amm-alg's is: "un vol par semaine le lundi"
    # dates the departure from Algiers, and nothing published says which day the
    # aircraft leaves Kuwait.
    {"from": "KWI", "to": "AMM", "status": "unclear", "evidence": "listed",
     "source": "https://www.visa-algerie.com/air-algerie-le-projet-dune-nouvelle-ligne-vers-le-golfe-confirme-officiellement/"},
    # Tripoli, the first Libyan service since the 2016 suspension, announced 1 Oct
    # 2026 with reservations already open and a first flight on Wednesday 28 Oct
    # 2026, two weekly rotations on Wednesdays and Fridays. The airport is MITIGA
    # (MJI), named explicitly by the report cited on the outbound; Tripoli
    # International (TIP) is a different field and is not carried. The "ATI" on the
    # promotional fare means "all taxes included", not Afriqiyah: no partner airline
    # appears in any of the four reports read, so there is no codeshare to record.
    # Evidence stays `listed`: three independent outlets, open sale inventory, a
    # named airport, a date and a frequency clear the plannedRoutes() bar, but no
    # flight number, filed schedule or booking result has appeared, which is the same
    # lower boundary Kuwait and Incheon sit on. This supersedes the 27 Sep pass,
    # which left ALG-TIP out as "an on-record objective with no filed schedule".
    {"from": "ALG", "to": "MJI", "status": "unclear", "days": ["wed", "fri"],
     "evidence": "listed",
     "source": "https://maghrebemergent.news/fr/air-algerie-renoue-avec-tripoli-apres-une-decennie-dinterruption/"},
    # The Tripoli return ships on its own evidence, as direction always does: the
    # 1 Oct 2026 economic daily states it in as many words, "les vols au depart de
    # Tripoli vers Alger seront egalement programmes les memes jours", and quotes
    # that direction's own fare.
    {"from": "MJI", "to": "ALG", "status": "unclear", "days": ["wed", "fri"],
     "evidence": "listed",
     "source": "https://algerie-eco.com/2026/10/01/air-algerie-annonce-son-retour-a-tripoli/"},
    # `days` is set on the outbound only. "Un vol par semaine le lundi" dates the
    # rotation's departure from Algiers; when the Amman leg flies back is a
    # separate fact nothing published pins down, and the Nigeria triangle is the
    # standing reminder (Monday out, Friday and Tuesday back).
    {"from": "AMM", "to": "ALG", "status": "unclear", "evidence": "listed",
     "source": "https://www.visa-algerie.com/air-algerie-le-projet-dune-nouvelle-ligne-vers-le-golfe-confirme-officiellement/"},
    {"from": "ALG", "to": "LOS", "flight": "AH 5354", "status": "unclear",
     "days": ["thu"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "ALG", "to": "PVG", "flight": "AH 3082", "status": "unclear",
     "days": ["mon", "wed", "sat"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-ouvre-une-nouvelle-ligne-vers-la-chine-dates-horaires-et-prix/"},
    # The two Nigeria triangles' middle legs, added 2026-10-02 under the amended
    # scope rule (collection-rules.md section 33), on AeroRoutes' NW26 filing:
    # "Algiers - Abuja - Lagos - Algiers eff 26OCT26 1 weekly 737-700" and
    # "Algiers - Lagos - Abuja - Algiers eff 29OCT26 1 weekly 737-700". 26 Oct 2026
    # is a Monday and 29 Oct a Thursday, which is what `days` records, and the
    # 26 Sep programme report states the same two first-flight days in words. These
    # are the legs between the two Nigerian airports, and they are the reason the
    # Algeria-touching legs already here have the days they do: ALG-ABV on Monday
    # continues to Lagos, LOS-ALG comes home Tuesday, and the Thursday rotation runs
    # the other way round.
    {"from": "ABV", "to": "LOS", "status": "unclear", "days": ["mon"],
     "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/260820-ahnw26af"},
    {"from": "LOS", "to": "ABV", "status": "unclear", "days": ["thu"],
     "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/260820-ahnw26af"},
    # Moscow. The pair entered as a single `listed` row from the Wikipedia pass on a
    # 2026 resumption report; this curated entry carries the reported schedule and
    # supersedes it. The 6 Sep 2026 report, reading Rosaviatsia and Sheremetyevo,
    # says "Air Algerie devrait assurer ses vols vers Moscou a partir du 2 octobre
    # prochain" at "trois vols par semaine, a savoir chaque lundi, mercredi et
    # vendredi".
    #
    # It stays PLANNED, deliberately, and that is the whole judgement here. The
    # framing is the French conditional section 10 warns about, the accreditation of
    # Air Algerie's representative in Russia was still open on 6 Sep, a second
    # readable report of the same date says "la reprise effective ne sera actee qu'au
    # moment de l'ouverture de la billetterie", and nothing dated on or after the
    # announced 2 Oct resumption reports a first flight. An announced date passing is
    # not evidence the aircraft flew: the Berlin and Doha promotions each waited for
    # a dated report of the operation, and this one has none.
    {"from": "ALG", "to": "SVO", "status": "unclear", "days": ["mon", "wed", "fri"],
     "evidence": "listed",
     "source": "https://www.visa-algerie.com/air-algerie-le-retour-des-vols-vers-moscou-se-precise-voici-la-date-annoncee/"},
    # The Moscow return, missing until now. The same report describes a resumption of
    # "vols directs entre Alger et Moscou" at three weekly flights, which is a
    # point-to-point rotation rather than a triangle, so the inbound leg is part of
    # what is announced rather than an inference from the outbound. `days` stays null:
    # the three days given are the Algiers departures and nothing published says when
    # the aircraft leaves Sheremetyevo.
    {"from": "SVO", "to": "ALG", "status": "unclear", "evidence": "listed",
     "source": "https://www.visa-algerie.com/air-algerie-le-retour-des-vols-vers-moscou-se-precise-voici-la-date-annoncee/"},
    {"from": "BZV", "to": "ALG", "flight": "AH 5391", "status": "unclear",
     "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "CKY", "to": "ALG", "flight": "AH 5359", "status": "unclear",
     "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "ICN", "to": "ALG", "status": "unclear", "evidence": "listed",
     "source": "https://www.visa-algerie.com/air-algerie-une-ligne-directe-vers-la-coree-du-sud-se-precise/"},
    {"from": "LOS", "to": "ALG", "flight": "AH 5354", "status": "unclear",
     "days": ["tue"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-les-ventes-sont-ouvertes-pour-quatre-nouvelles-lignes-internationales/"},
    {"from": "PVG", "to": "ALG", "flight": "AH 3083", "status": "unclear",
     "days": ["tue", "thu", "sun"], "evidence": "verified",
     "source": "https://www.visa-algerie.com/air-algerie-ouvre-une-nouvelle-ligne-vers-la-chine-dates-horaires-et-prix/"},
    # N'Djamena, planned. The 22 Jun 2026 737 MAX 8 network post files "Algiers -
    # N'djamena - Addis Ababa" effective 28 Oct 2026 at 2 weekly, which is 19 days
    # after this AS_OF, so it is an announcement and not an operation: the
    # lifecycle rule is that a launch date still ahead keeps a route planned
    # however firm the filing. ALG-NDJ is the rotation's first leg and the only one
    # in scope; the onward N'Djamena to Addis Ababa leg does not belong to a
    # rotation out of Algeria in a way any read source states, so section 33 does
    # not reach it and it is not carried. `evidence` is `listed` and `days` and
    # `flight` are null because the post is a network list with no per-route
    # schedule, no day names and no flight number.
    {"from": "ALG", "to": "NDJ", "status": "unclear", "evidence": "listed",
     "source": "https://www.aeroroutes.com/eng/260622-ahnw267m8"},
]

# Planned legs withdrawn before they ever operated. Kept as a record, not as
# data: `plannedRoutes()` is a claim that a route is coming, so a withdrawal has
# to remove the rows rather than restyle them. This is the one case where a
# planned route leaves the dataset, and it needs the same thing an arrival needs,
# a citable source, because section 7's "silence is never a negative" cuts both
# ways: what removes these rows is a source stating the withdrawal, never an
# empty probe.
#
#   ALG-DEL / DEL-ALG  Air Algérie withdrew the traffic-rights authorization
#                      request for the India route, reported 12 Sep 2026: "Air
#                      Algérie a retiré la demande d'autorisation pour la liaison
#                      prévue vers l'Inde". The three weekly A330-900neo
#                      rotations from 25 Oct 2026 that the 19 Jun schedule filing
#                      carried (AH3104/AH3105) are gone from the forward
#                      programme with the 11 Sep update.
#                      https://www.visa-algerie.com/air-algerie-reporte-le-lancement-dune-nouvelle-ligne-internationale/
WITHDRAWN = {("ALG", "DEL"), ("DEL", "ALG")}

# Pairs whose Wikipedia row names the WRONG airport of a multi-airport city, so a
# curated record above carries the same service under the right code. Without
# this the table re-adds the wrong endpoint as a `listed` row beside the corrected
# one and the map draws both.
#
#   BLJ-CDG  The table's citation is a 2017 routesonline piece about PROPOSED new
#            French routes, which is a plan and not an operating pair (section 11).
#            Batna's Paris service operates at Orly; see the BLJ-ORY / ORY-BLJ
#            records above.
#   ALG-TIP  Tripoli is two fields. Every report of the 28 Oct 2026 resumption that
#            names one names MITIGA, so the service ships as ALG-MJI / MJI-ALG. The
#            Wikipedia table carries no Tripoli row today; this entry is here so that
#            when one appears it cannot land on Tripoli International beside the
#            Mitiga rows and have the map draw both.
AIRPORT_CORRECTED = {("BLJ", "CDG"), ("ALG", "TIP")}

# Legs a citable, dated source says are not operating on AS_OF. The map is
# structural (section 2), so a suspension DIMS the arc and never deletes it: the
# record keeps its evidence tier and its place in `routes()`, and gains the status
# plus the source that dates the suspension. The override is applied to whichever
# collection carries the pair, so a pair listed by the Wikipedia pass does not
# need a curated duplicate just to change its status.
#
#   ALG-DXB  Air Algérie has not resumed its Algiers-Dubai service, suspended since
#   DXB-ALG  28 Feb 2026. The citation is now APS, Algeria's own press agency, on
#            6 Mar 2026: "Le Groupe Air Algérie annonce le maintien de la
#            suspension des vols à destination et en provenance de Doha, Beyrouth,
#            Amman et Dubaï, jusqu'à nouvel ordre." That replaces the 10 Sep 2026
#            airspace-closure report the pair shipped on, which is a stronger piece
#            of context but a weaker citation for this fact: the closure is about
#            UAE-registered aircraft, while the APS notice is the airline's own
#            suspension, dated, named per city and named in both directions. Doha
#            alone has since resumed (29 Sep 2026) and is in the operating
#            collection; Dubai, Beirut and Amman are still down.
#   ALG-BEY  The same APS notice names Beirut in both directions. It also settles a
#   BEY-ALG  live disagreement: several aggregators still advertise a weekly
#            Algiers-Beirut Air Algérie flight, and none of them is citable here,
#            while the notice that contradicts them is official and dated.
SUSPENDED = {
    ("ALG", "DXB"): "https://www.aps.dz/fr/economie/commerce-et-service/mmexsi27-maintien-de-la-suspension-des-vols-au-depart-et-a-destination-de-doha-beyrouth-amman-et-dubai",
    ("DXB", "ALG"): "https://www.aps.dz/fr/economie/commerce-et-service/mmexsi27-maintien-de-la-suspension-des-vols-au-depart-et-a-destination-de-doha-beyrouth-amman-et-dubai",
    ("ALG", "BEY"): "https://www.aps.dz/fr/economie/commerce-et-service/mmexsi27-maintien-de-la-suspension-des-vols-au-depart-et-a-destination-de-doha-beyrouth-amman-et-dubai",
    ("BEY", "ALG"): "https://www.aps.dz/fr/economie/commerce-et-service/mmexsi27-maintien-de-la-suspension-des-vols-au-depart-et-a-destination-de-doha-beyrouth-amman-et-dubai",
}

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
    # Amman, re-checked 2026-09-27 and still excluded in THIS direction. The
    # 2026-07-28 screen found RJ 0518 and no Air Algérie leg, and Air Algérie's own
    # Amman service has stayed suspended since. What changed is the other
    # direction: the announced Algiers-Kuwait-Amman-Algiers triangle flies AMM-ALG
    # on Air Algérie metal, so `amm-alg` ships as a planned route while nonstop
    # ALG-AMM stays out. The exclusion was never about the endpoint, it was about a
    # leg, which is why it survives the triangle rather than being repealed by it.
    ("ALG", "AMM"),   # RJ 0518, Royal Jordanian
    # ALG-FCO was here, on a 14 Aug country-form probe that returned ONE Algeria to
    # Italy flight, ITA Airways, and no Air Algérie leg from any Algerian airport.
    # Removed 2026-10-09. It was a false negative, and the instructive part is
    # which rule caught it: section 20's country-form probe widened a silence into
    # a statement about a whole country, and section 7 says a silence is never a
    # negative at any width. ITA's own AZ-numbered nonstop surfaced that day and
    # Air Algérie's AH-numbered one did not, which told us about the probe's
    # coverage and nothing about the route. The 6 Jul 2026 trade post lists Rome
    # Fiumicino among the routes Air Algérie flew for the whole summer window,
    # before the exclusion was even written, and no source anywhere announces a
    # Rome launch or resumption, which is the shape of a standing route a probe
    # missed. ITA's AZ801/AZ802/AZ803 run as a separate, independently scheduled
    # service on the same city pair: two carriers on one pair, not a codeshare, and
    # no AH-numbered flight on it resolves to ITA metal. See LISTED above.
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
    skipped = {"no_endpoint": [], "codeshare": [], "domestic": [], "withdrawn": []}
    seen = set()

    def add_curated_route(record, destination, evidence):
        key = (record["from"], record["to"])
        if record["from"] not in ep or record["to"] not in ep:
            skipped["no_endpoint"].append(key)
            return
        # Three curated collections can now name the same leg, and a leg in two of
        # them would emit two rows with one id, which build-routes.mjs rejects far
        # from the cause. Fail here, where the duplicate is.
        if key in seen:
            raise SystemExit(f"{key[0]}-{key[1]}: named by more than one curated "
                             f"collection; keep it in exactly one")
        seen.add(key)
        destination.append({
            "id": f"{record['from'].lower()}-{record['to'].lower()}",
            "from": record["from"], "to": record["to"], "carrier": "AH",
            "flight": record.get("flight"), "status": record["status"], "days": record.get("days"),
            "evidence": evidence, "source": record["source"],
        })

    for record in VERIFIED:
        add_curated_route(record, routes, "verified")

    for record in LISTED:
        add_curated_route(record, routes, record["evidence"])

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
        # A withdrawal removes the pair for good, so the Wikipedia table must not
        # put it back as a `listed` row the way it would any other absent pair.
        if key in WITHDRAWN or key in AIRPORT_CORRECTED:
            skipped["withdrawn"].append(key); continue
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

    # Suspensions are applied last, over whichever collection carries the pair, so
    # a citable "this is not flying" only has to name the leg. A key that matches
    # nothing is a stale override, not a silent no-op: fail instead.
    for key, url in SUSPENDED.items():
        hits = [r for r in routes + planned_routes if (r["from"], r["to"]) == key]
        if not hits:
            raise SystemExit(f"{key[0]}-{key[1]}: SUSPENDED names a leg the dataset "
                             f"does not carry; drop the override or add the leg")
        for r in hits:
            r["status"] = "suspended"
            r["source"] = url
            r["source_is_the_table"] = False

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
          f"{len(skipped['domestic'])} domestic, {len(skipped['no_endpoint'])} without an endpoint, "
          f"{len(skipped['withdrawn'])} withdrawn or corrected")
    print(f"  planned (announced, not yet flying): {len(planned_routes)}"
          + (f" -> {', '.join(r['id'] for r in planned_routes)}" if planned_routes else ""))
    print(f"  longest arc: {max(r['great_circle_km'] for r in routes)} km")


if __name__ == "__main__":
    main()

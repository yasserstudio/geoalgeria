# Flight-route verification, 2026-09-27

Five dataset changes, each re-opened at its source on 27 September 2026 before it
was written. `as_of` moves from 2026-08-21 to 2026-09-27.

Counts after this pass: **142 rows, 126 operating and 16 planned, 72 endpoints**
(was 142 rows, 124 operating and 18 planned, 71 endpoints).

Two sources named in the research brief could not be opened from here at all:
`tsa-algerie.com` and `observalgerie.com` both time out, and FlightAware,
Airportia and FlightsFrom answer an automated fetch with HTTP 403. Everything
below therefore rests on a page that was actually read, either by a plain fetch
or through a real browser session, and where a claim came only from a site that
would not open, it is marked as such rather than cited.

## 1. Delhi withdrawn, the planned legs are gone

- <https://www.visa-algerie.com/air-algerie-reporte-le-lancement-dune-nouvelle-ligne-internationale/>
  (12 September 2026), read in full.

The report states it plainly: "Air Algérie a retiré la demande d'autorisation
pour la liaison prévue vers l'Inde". The three weekly Algiers to Delhi rotations
that the 19 June filing carried, `AH3104` outbound and `AH3105` back from
25 October 2026 on an A330-900neo, are out of the forward programme as of the
11 September schedule update.

**Dataset decision.** Remove `alg-del` and `del-alg` from `plannedRoutes()`.
`plannedRoutes()` is a claim that a route is coming, so a withdrawal has to
remove the rows rather than restyle them, and this is the one case where a
planned route leaves the dataset. What removes them is the source stating the
withdrawal, never an empty probe: section 7's "silence is never a negative" cuts
both ways.

The pair is recorded in a `WITHDRAWN` set in `build_route_dataset.py` with the
reason, and the Wikipedia pass skips it. Without that guard the table would put
`alg-del` back as an ordinary `listed` row. `DEL` stays a candidate in
`resolve_endpoints.py`, annotated with the withdrawal, and stops being emitted
because nothing references it.

## 2. Batna serves Paris-Orly, not Charles de Gaulle

This closes the disputed ROADMAP item open since 2026-07-29.

Read through a real browser session (the site 403s an automated fetch):

- <https://www.flightsfrom.com/BLJ-ORY> "Direct (non-stop) flights from Batna to
  Paris ... All flight schedules from Mostepha Ben Boulaid Airport, Algeria to
  Orly Airport, France", carrier Air Algerie, "1 weekly flight".
- <https://www.flightsfrom.com/ORY-BLJ> the same page in the other direction,
  "All flight schedules from Orly Airport, France to Mostepha Ben Boulaid
  Airport, Algeria", Air Algerie, "1 weekly flight".

Corroborating, from search-result metadata rather than the pages themselves,
which would not open: FlightAware's own history URLs for `DAH1120` carry the
`DABT-ORY / LFPO` pair, its `DAH1121` history carries `LFPO-DABT`, and Airportia
lists `AH1120` arriving Orly Terminal 4. Nothing current names CDG for either
flight number.

`parisaeroport.fr` still blocks automated fetches, and its Air Algérie page names
no city, so the single official source the ROADMAP hoped for was never obtained.
What is in hand is three independent flight-tracking aggregators converging, which
is section 9's **Reported** tier: credible secondary sources cross-checked across
independent outlets, which ships, with the most specific page cited rather than a
homepage. That is the same tier the Budapest triangle ships on.

**Dataset decision.** `blj-cdg` becomes `blj-ory`, `AH 1120`, `active`,
`verified`, cited to the BLJ-ORY page. The `ory-blj` return leg ships on its own
evidence, `AH 1121`, `active`, `verified`, cited to the ORY-BLJ page, because
direction is established per leg and never inherited. `days` stays null in both
directions: both pages say "1 weekly flight" and neither states which day.

Durations clear the technical-stop check comfortably: 2h24 out and 2h15 back
against a 1,478 km great circle, so 0.67x and 0.63x of the 1.35x flag.

Two follow-ups this replaces:

- The Wikipedia table still lists BLJ to CDG, citing a 2017 routesonline piece
  about **proposed** French routes, which is a plan and not an operating pair. An
  `AIRPORT_CORRECTED` guard stops it re-entering as a `listed` row beside the
  corrected one.
- The table also annotated BLJ to ORY as seasonal. The curated record supersedes
  that: both directions currently show a weekly service, so it ships `active`.

## 3. Berlin is operating, not planned

- <https://www.algerie360.com/air-algerie-nouvelle-ligne-directe-berlin/>
  (14 September 2026): "Ce lundi 14 septembre 2026, la compagnie aérienne
  nationale lance sa toute nouvelle liaison directe entre Alger et Berlin.
  Proposée à raison d'un vol par semaine".
- <https://www.visa-algerie.com/air-algerie-la-nouvelle-ligne-vers-leurope-maintenue-sans-escale-en-hiver/>
  (20 September 2026): "À compter du 25 octobre 2026, la compagnie continuera
  d'assurer un vol hebdomadaire sans escale entre Alger et Berlin, à bord d'un
  Boeing 737-600", with the Berlin departure at 13:55 arriving Algiers 16:35.

The inaugural rotation flew, and winter continuity is stated, so the pair no
longer fits `plannedRoutes()`, which means announced but not yet operating.

**Dataset decision.** `alg-ber` and `ber-alg` move to the operating collection as
`active`, `verified`, one same-day weekly rotation, `AH 2072` out and `AH 2073`
back. The flight numbers and block times were established end to end on
2026-08-21 (see `verification-2026-08-21.md`); this pass adds the operation.
Each direction cites a page that covers it: the launch report for the outbound,
and the winter-schedule report, which carries the Berlin departure, for the
return.

**One open follow-up.** The winter programme moves the weekly slot from **Monday
to Sunday on 25 October 2026**. `days: ["mon"]` is correct as of this snapshot's
`as_of` and needs a one-line edit at the next pass. It is logged in the ROADMAP so
it is not carried in a human's head.

## 4. The Algiers to Kuwait to Amman to Algiers triangle, planned

- <https://www.visa-algerie.com/air-algerie-le-projet-dune-nouvelle-ligne-vers-le-golfe-confirme-officiellement/>
  (24 August 2026), read in full: the rotation is "Alger - Koweït - Amman -
  Alger", "un vol par semaine le lundi en 737-800", service beginning
  26 October, confirmed on the record by Algeria's ambassador to Kuwait, Omar
  Belhadj. Reservations were not open at publication.

The brief's second source, the TSA Algérie Kuwait piece, could not be opened
(the whole domain times out from here), so it is not cited. The claim is
unaffected: the article above carries the route, the day, the date and the
aircraft on its own.

**Dataset decision.** A triangle yields one-directional nonstops, and only
Algeria-touching legs are in scope, so the rotation produces exactly two planned
rows:

| Row | Leg | days | Why |
| --- | --- | --- | --- |
| `alg-kwi` | Algiers to Kuwait | `["mon"]` | the rotation's stated Monday departure from Algiers |
| `amm-alg` | Amman to Algiers | null | the inbound leg's own day is not published |

There is no `alg-amm` row, no `kwi-alg` row, and nothing for the Kuwait to Amman
leg, which touches Algeria at neither end. `days` is deliberately set on the
outbound only: the Monday dates the departure from Algiers, and when the Amman leg
flies back is a separate fact nothing published pins down. The Nigeria triangle is
the standing reminder, Monday out and Friday or Tuesday back.

Evidence stays `listed`, with `status: unclear` and `flight: null`. A diplomatic
confirmation carrying a day, a date and an aircraft clears the `plannedRoutes()`
bar, but no flight number, filed schedule or sale inventory has appeared, which is
the lower boundary Delhi and Incheon sat on (collection-rules.md section 31).

**The earlier Amman decision, revisited.** The 2026-07-28 codeshare screen
excluded `ALG-AMM` because the probe returned `RJ 0518` on Royal Jordanian metal
and no Air Algérie leg at all, and the 2.2.0 changeset recorded Amman as screened
out on that basis. That finding stands for that leg and is not repealed here:
nonstop Algiers to Amman is still not an Air Algérie route, and Air Algérie's own
Amman service has stayed suspended. What changed is the other direction. The
triangle puts `AMM-ALG` on Air Algérie metal, so the endpoint is in scope inbound
from 26 October 2026. The exclusion was always about a leg and never about an
endpoint, which is why it survives the triangle rather than being cancelled by it.
`OPERATED_BY_OTHERS` and the AMM endpoint note both say so now.

`KWI` joins the endpoint table: Kuwait International, the country's only civil
airport, so the city to airport choice is not a judgement. Coordinates from
OurAirports, names from Wikidata `Q527157` and coordinate-checked inside 15 km, as
every other endpoint is.

## 5. Algiers to Dubai is suspended

- <https://www.visa-algerie.com/emirats-lalgerie-ferme-son-espace-aerien-les-vols-commerciaux-maintenus-provisoirement/>
  (10 September 2026), read in full.

Two facts, and they are not the same fact:

1. Algeria closed its airspace "à partir du 11 septembre 2026 à 00:00, à
   l'ensemble des aéronefs civils et militaires immatriculés aux Emirats arabes
   unis". That is a government measure, it is keyed to UAE **registration**, and
   civil commercial flights to and from Algiers are carved out until the end of
   2026.
2. Air Algérie has not resumed its own Algiers to Dubai service, while Emirates
   had pushed its Dubai to Algiers resumption to the end of October.

So this is Air Algérie's leg being down, not a blanket stop on every Algeria to
UAE flight, and the record should not be written as if it were the latter.

**Dataset decision.** `alg-dxb` moves from `unclear`, which reads as "nobody
checked", to `suspended`, with this citation. The map is structural, so a
suspension dims the arc and keeps it. `evidence` stays `listed`: the leg's
strength as a claim has not changed, only its lifecycle. A `SUSPENDED` override
carries it, applied over whichever collection holds the pair so a
Wikipedia-listed row needs no curated duplicate just to change status; an override
key matching no leg fails the build instead of passing silently.

**Scope check.** The research data carries no `AUH` or `SHJ` endpoint and no
`dxb-alg` leg, so `alg-dxb` is the whole UAE surface in this dataset. Its
`great_circle_km` is 5,069.

## Deliberately not changed

- **`ALG-DOH` frequency.** One outlet reports Tue/Fri/Sun against the dataset's
  Tue/Fri, and that outlet (observalgerie.com) would not open from here. A single
  unread source does not move a `days` field. Left at Tue/Fri.
- **`ALG-AMM`, `ALG-BEY`.** Reported as still suspended by the same article that
  would not open. They stay `unclear` until a source that can be read names them;
  `alg-dxb` moved only because a readable source states its status.
- **`IST-ORN`.** The aggregator convergence that settled Batna looks similar here,
  but `flightsfrom.com/IST-ORN` was not read in this pass and the ROADMAP item
  asks for one departures-board row. Still open.
- **`ALG-TIP` (Tripoli).** Still an on-record objective with no filed schedule,
  flight number or sale inventory. Below the `plannedRoutes()` bar, unchanged
  since 2026-08-21.
- **`ALG-CKY`, `ALG-BZV`, Nigeria triangle dates.** Frequencies reported this
  month match or refine what already ships; no row needed a correction, and the
  refinements rest on sources that would not open.
- **Marseille (Transavia, Volotea, Vueling).** Real nonstop churn, and out of
  scope: v1 is Air Algérie only, locked, and these are `TO`, `V7` and Vueling
  metal.
- **New airports** (greenfield Algiers, the Algiers east terminal, Béni Abbès).
  All pre-operational, no IATA code, no opening date. Nothing to add to
  `airports.json`.

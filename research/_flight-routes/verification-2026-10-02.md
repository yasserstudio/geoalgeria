# Flight-route verification, 2026-10-02

The winter 2026-2027 programme pass. Every change below was re-opened at its source
on 2 October 2026 before it was written, and each source's publication date is
recorded with it. `as_of` moves from 2026-09-27 to 2026-10-02.

Counts after this pass: **148 rows, 129 operating and 19 planned, 73 endpoints**
(was 142 rows, 126 operating and 16 planned, 72 endpoints).

**Sources that still cannot be opened from here.** `tsa-algerie.com` and
`observalgerie.com` both time out, exactly as on 27 September, and
`agenceecofin.com` and `flightsfrom.com` answer an automated fetch with HTTP 403.
Three of the briefed sources sit on those domains. Nothing below rests on a page
that was not read: where a claim came only from a site that would not open, a
readable source carrying the same fact was found and cited instead, or the change
was not made.

**The lifecycle rule this pass runs on.** A route whose launch date is still ahead
stays `planned`, however firm the announcement, and a route leaves
`plannedRoutes()` only on a dated report that it actually flew. Doha and Abuja
cleared that bar; Moscow did not, although its announced date is today.

## 1. Tripoli Mitiga, planned, with the endpoint it needs

- <https://maghrebemergent.news/fr/air-algerie-renoue-avec-tripoli-apres-une-decennie-dinterruption/>
  (**1 October 2026**), read in full: "le premier vol est programme le 28 octobre
  depuis l'aeroport international d'Alger vers l'aeroport de Mitiga, a Tripoli. La
  desserte doit etre assuree a raison de deux vols par semaine, les mercredis et
  vendredis."
- <https://algerie-eco.com/2026/10/01/air-algerie-annonce-son-retour-a-tripoli/>
  (**1 October 2026**), read in full: the return direction in as many words, "les
  vols au depart de Tripoli vers Alger seront egalement programmes les memes
  jours", with that direction's own fare from 243.60 euros.
- <https://www.visa-algerie.com/air-algerie-reprend-une-destination-maghrebine-date-frequence-et-prix/>
  (**1 October 2026**): first flight Wednesday 28 October, two weekly, "les
  reservations etant d'ores et deja ouvertes", 37,503 DA one way.
- <https://www.maghrebemergent.com/air-algerie-sapprete-a-relier-le-monde-avec-cinq-nouvelles-destinations-des-2026/>
  (**1 July 2026**): the earliest read statement of the frequency, twice weekly on
  Wednesdays and Fridays on a 737-600.

**Dataset decision.** `alg-mji` and `mji-alg` enter `plannedRoutes()`,
`days: ["wed", "fri"]`, `status: unclear`, `evidence: listed`, each cited to a page
covering its own direction. Direction is established per leg and never inherited,
which is why the return cites the economic daily rather than the outbound's report.

This supersedes the 27 September "deliberately not changed" item, which left
Tripoli out as "an on-record objective with no filed schedule, flight number or
sale inventory". Open sale inventory, a dated first flight, a named airport and a
published frequency clear the `plannedRoutes()` bar. `evidence` stays `listed`
rather than `verified` because no flight number, filed schedule or booking result
has appeared, the same lower boundary Kuwait and Incheon sit on.

**The airport is Mitiga, not Tripoli International.** Tripoli is two fields, and
every report that names one names Mitiga, so `MJI` is the pinned code and `TIP` is
not carried. The Wikipedia table has no Tripoli row today; `("ALG", "TIP")` joins
`AIRPORT_CORRECTED` anyway, so that when one appears it cannot land on the wrong
field beside the Mitiga rows and have the map draw both. That is the Batna mistake,
and the guard belongs in the generator rather than in anyone's memory.

**"ATI" on the promotional fare is not a carrier.** It means *all taxes included*,
not Afriqiyah Airways. No partner airline appears in any of the four reports read,
so there is no codeshare to record and nothing to screen.

`MJI` joins the endpoint table by the standing method: pinned in
`resolve_endpoints.py` with the city-to-airport reasoning inline, coordinate from
OurAirports (`HLLM`, 32.89177 / 13.287878, asserted to be in `LY`), names from
Wikidata `Q45000` (`Aeroport de Mitiga` / `Mitiga International Airport` /
`مطار إمعيتيقة الدولي`), coordinate-cross-checked at 1.0 km, well inside the 15 km
guard.

## 2. Doha is operating, not planned

- <https://thepeninsulaqatar.com/article/30/09/2026/hia-welcomes-first-air-algerie-flight-as-direct-doha-algiers-service-launches>
  (**30 September 2026**), read in full: "Air Algerie on Wednesday launched direct
  flights between Doha and Algiers", reporting Hamad International Airport's
  welcome of the first Air Algerie arrival.
- <https://www.visa-algerie.com/air-algerie-accelere-sur-le-qatar-avec-des-vols-quotidiens-des-octobre/>
  (**27 September 2026**): "trois vols par semaine, chaque dimanche, mardi et
  vendredi" from 29 September, "le decollage se fera toujours a 00h55", and "a
  partir du 25 octobre prochain, des vols quotidiens vers Doha".
- <https://algerie-eco.com/2026/09/27/air-algerie-reprise-des-vols-vers-doha-mardi-prochain/>
  (**27 September 2026**): the same three days and the same 00:55 departure,
  independently.
- <https://www.visa-algerie.com/air-algerie-de-retour-a-doha-au-qatar-date-et-prix/>
  (**25 September 2026**): "a partir de mardi prochain 29 septembre", "trois
  rotations par semaine : mardi, vendredi et dimanche".

**Dataset decision.** `alg-doh` and `doh-alg` move into the operating collection as
`active`, `verified`, `days: ["sun", "tue", "fri"]`, keeping `AH 4078` and
`AH 4079`.

What moved them is an airport operator receiving the aircraft, not an airline
announcing a date. The 27 September pass had the resumption as a plan; the 30
September report has it as a flight that happened.

**Both legs carry the same days, and that is sourced rather than mirrored.** The
25 September report calls them "trois rotations par semaine", and a rotation is out
and back inside the day; the 30 September headline covers the Doha-Algiers
direction explicitly.

**The daily service from 25 October is not written in.** It is a future change, and
`as_of` is a snapshot date. Logged in the ROADMAP for the release-day pass.

This also closes the 27 September "deliberately not changed" item on Doha's
frequency, which stayed at Tue/Fri because the only outlet reporting three days
could not be opened. Three readable sources now converge on Sun/Tue/Fri.

## 3. Conakry and Brazzaville, days on the Algiers departures

- <https://www.algerie360.com/air-algerie-nouvelles-lignes-afrique-conakry-brazzaville-lagos/>
  (**26 September 2026**), read in full: "Alger-Conakry (Guinee) : premier vol le
  dimanche 25 octobre 2026, puis trois vols par semaine, les mardis, jeudis et
  dimanches" and "Alger-Brazzaville (Republique du Congo) : premier vol le lundi
  26 octobre 2026, puis trois vols par semaine, les lundis, mercredis et samedis".
- <https://www.aeroroutes.com/eng/260820-ahnw26af> (**20 August 2026**): the trade
  filing, "Algiers - Conakry eff 25OCT26 3 weekly 737 MAX 8" and "Algiers -
  Brazzaville eff 26OCT26 3 weekly 737 MAX 8", independently carrying both
  effective dates and the frequency.

**Dataset decision.** `alg-cky` gains `days: ["tue", "thu", "sun"]` and `alg-bzv`
gains `days: ["mon", "wed", "sat"]`, both re-cited to the 26 September report
because that is the page supporting `days`. The `AH 5358` and `AH 5390` flight
numbers come from the 20 August sale-inventory report the rows shipped on, which
the generator comment records.

`cky-alg` and `bzv-alg` keep `days: null`. The reports state the day the aircraft
leaves Algiers; when each return leg flies is a separate fact nothing published
pins down. Both stay planned: the launch dates are three weeks out.

A note on the brief that produced this change: it named these routes "Chengdu".
The dataset's `CKY` is **Conakry** (Ahmed Sekou Toure International, Guinea).
Chengdu is `CTU`/`TFU` and is not in this network at all, announced or otherwise.
The IATA code is the key the whole pipeline pins, so Conakry is what was changed.

## 4. The two Nigeria triangles, with their middle legs

- <https://www.aeroroutes.com/eng/260820-ahnw26af> (**20 August 2026**): "Algiers -
  Abuja - Lagos - Algiers eff 26OCT26 1 weekly 737-700" and "Algiers - Lagos -
  Abuja - Algiers eff 29OCT26 1 weekly 737-700".
- <https://www.algerie360.com/air-algerie-nouvelles-lignes-afrique-conakry-brazzaville-lagos/>
  (**26 September 2026**): "Alger-Abuja-Lagos (Nigeria) : premier vol le lundi
  26 octobre 2026. Une rotation dans le sens inverse, Alger-Lagos-Abuja, demarre le
  jeudi 29 octobre, soit deux vols par semaine vers le Nigeria."
- <https://www.algerie360.com/air-algerie-accelere-son-envol-en-afrique-avec-40-vols-hebdomadaires-a-lhorizon-2026/>
  (**7 April 2025**), read in full: Air Algerie "a inaugure son premier vol a
  destination du Nigeria" on 6 April 2025 to Abuja, weekly, departing Algiers
  Sundays at 19:30 with the return from Abuja to Algiers on Fridays at 03:30.

26 October 2026 is a Monday and 29 October a Thursday, which is what the two
triangles' `days` record, and the days the dataset already carried on the
Algeria-touching legs fit them exactly: Monday out through Abuja, home from Lagos
on the Tuesday; Thursday out through Lagos, home from Abuja on the Friday.

**Dataset decision, two parts.**

`abv-los` (`days: ["mon"]`) and `los-abv` (`days: ["thu"]`) enter
`plannedRoutes()`, `listed`, cited to the trade filing. These are the legs between
the two Nigerian airports, and carrying them is a scope change recorded as
section 33 of `collection-rules.md`.

`abv-alg` **leaves** `plannedRoutes()` and ships as `active`, `verified`,
`days: ["fri"]`, cited to the 7 April 2025 launch report, which states that
direction's own schedule. It had shipped as planned on the NW26 sale inventory,
which reads as "announced, not yet operating", and that was wrong: the leg has
been flying since April 2025. The winter programme restructures it through Lagos
from 29 October, which changes the routing and not whether the leg operates.

`alg-abv` is unchanged and stays `active`. The brief asked whether it really
operates, because its citation is a launch piece that answers an automated fetch
with 403. It does: the 7 April 2025 report above corroborates the same inaugural
flight from a page that opens. The agenceecofin citation stands, because it is the
piece that named the launch and it has not gone away, it merely blocks robots, the
same situation the Batna pages are cited under.

`alg-los` and `los-alg` are unchanged and stay planned: Lagos itself has no service
before 26 October.

## 5. The Kuwait-Amman middle leg

- <https://www.visa-algerie.com/air-algerie-le-projet-dune-nouvelle-ligne-vers-le-golfe-confirme-officiellement/>
  (**24 August 2026**), re-read and its date pinned: "Air Algerie prevoit d'ajouter
  a partir du 26 octobre le Koweit a sa ligne vers Amman (Jordanie), sous forme
  d'une liaison triangulaire Alger - Koweit - Amman - Alger. Cette ligne sera
  assuree a raison d'un vol par semaine le lundi en 737-800."
- <https://www.maghrebemergent.com/air-algerie-sapprete-a-relier-le-monde-avec-cinq-nouvelles-destinations-des-2026/>
  (**1 July 2026**): "Des le 26 octobre 2026, la nouvelle liaison Alger - Koweit -
  Amman - Alger sera operee chaque lundi avec un Boeing 737-800", an independent
  outlet carrying the same rotation, day, date and aircraft.

**Dataset decision.** `kwi-amm` enters `plannedRoutes()`, `listed`,
`status: unclear`, `days: null`. The day is null for the same reason `amm-alg`'s
is: "un vol par semaine le lundi" dates the departure from Algiers, and nothing
published says which day the aircraft leaves Kuwait.

`alg-kwi` and `amm-alg` are unchanged, and `kwi-alg`, `alg-amm` and `amm-kwi` still
do not exist, because the rotation never flies them nonstop. Three rows, not four
and not six.

The 27 September pass recorded "nothing for the Kuwait to Amman leg, which touches
Algeria at neither end". That line is amended, not overruled by silence: see
section 33 of `collection-rules.md`.

## 6. Shanghai, verified and left alone

- <https://www.visa-algerie.com/air-algerie-ouvre-une-nouvelle-ligne-vers-la-chine-dates-horaires-et-prix/>
  (**15 August 2026**), re-read: launch "a partir du 26 octobre 2026", `AH3082` out
  of Algiers at 13:00 arriving the next day, `AH3083` leaving China at midday,
  "tous les lundis, mercredis et samedis", on an A330-900neo.
- <https://algerie-eco.com/2026/08/26/air-algerie-sept-nouvelles-lignes-prevues-avant-fin-2026/>
  (**26 August 2026**): "Pour Shanghai, le lancement est prevu le 26 octobre 2026.
  La ligne sera operee trois fois par semaine avec un Airbus A330-900neo."

**No change.** The brief asked for the citation to be refreshed to the 26 August
piece. It is not, deliberately: the shipped rows carry flight numbers and
per-direction days, and only the 15 August report supports those fields. Swapping
in a source that carries neither would make the record's own citation stop
covering it. The 26 August report corroborates the launch date and the frequency,
and is recorded here as the cross-check it is. Both legs stay planned; the launch
is three weeks out.

## 7. Moscow stays planned, and gains its return leg

- <https://www.visa-algerie.com/air-algerie-le-retour-des-vols-vers-moscou-se-precise-voici-la-date-annoncee/>
  (**6 September 2026**), read in full: "Air Algerie devrait assurer ses vols vers
  Moscou a partir du 2 octobre prochain", at "trois vols par semaine, a savoir
  chaque lundi, mercredi et vendredi".
- <https://www.algerie360.com/vols-alger-moscou-air-algerie-reprise-2026/>
  (**6 September 2026**), read in full: the resumption is for "l'automne 2026" with
  no date, is conditional on the accreditation of Air Algerie's representative in
  Russia, and "la reprise effective ne sera actee qu'au moment de l'ouverture de la
  billetterie".
- `observalgerie.com`'s 6 September piece on the same subject could not be opened
  and is not cited.

**Dataset decision. `alg-svo` stays planned**, and gains
`days: ["mon", "wed", "fri"]` plus the 6 September citation, as a curated row that
supersedes the `listed` row the Wikipedia pass produced from an August resumption
report.

The brief asked for the resumption to be verified before any flip, and it does not
verify. Three things point the same way: the framing is the French conditional that
section 10 excludes as evidence of a route, a second readable report of the same
date says the resumption is not settled until ticket sales open, and nothing dated
on or after the announced 2 October resumption reports a first flight. **An
announced date arriving is not an aircraft flying.** Berlin and Doha each waited
for a dated report of the operation, and this one has none. If it flew today, the
release-day pass flips it.

**`svo-alg` is added**, planned, `listed`, `days: null`. The same report describes
the resumption of "vols directs entre Alger et Moscou" at three weekly flights,
and this is a point-to-point rotation rather than a triangle, so the inbound leg is
part of what is announced rather than an inference from the outbound. `days` stays
null because the three days given are the Algiers departures.

## 8. Dubai unchanged

The brief asked whether `observalgerie.com`'s 10 September decree piece dates the
suspension better than the citation in place. It cannot be read from here, so the
question stays open and nothing changed. `alg-dxb` keeps `suspended`, keeps its
`listed` tier, keeps its place in `routes()`, and keeps the 10 September 2026
citation the 27 September pass verified.

## Deliberately not changed

- **Berlin's winter day.** The 27 September pass logged that the winter programme
  moves the weekly slot from Monday to Sunday on 25 October 2026. That is still a
  future change on this snapshot's `as_of`, so `days: ["mon"]` stands and the
  ROADMAP item stays open for the release-day pass.
- **`IST-ORN`.** The aggregator convergence that settled Batna looks similar here
  and `flightsfrom.com` still 403s an automated fetch. Unchanged, still open.
- **Doha's daily service from 25 October**, and **Conakry, Brazzaville, Lagos,
  Abuja, Shanghai, Kuwait, Amman, Tripoli and Moscow as operating routes.** Every
  one has a launch or step-up date later than this `as_of`. They flip when a dated
  report says they flew, not when the calendar reaches the announced date.
- **New Delhi.** Withdrawn 12 September 2026 and guarded by `WITHDRAWN`. Nothing
  in this pass reopens it, and the brief confirms the request stays withdrawn.
- **Seoul Incheon.** Unchanged, still traffic rights without a filed schedule.
- **Amman nonstop from Algiers.** Still excluded in that direction:
  `OPERATED_BY_OTHERS` holds, and the triangle's middle leg does not touch it.

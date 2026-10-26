# Flight-route verification, 2026-10-26

The first-flight pass on the six lines announced for the 25-29 October 2026 window
(tracker #295). One question was asked of each: is there a dated report that the
line actually operated? Every page cited below was opened and read on 26 October
2026, and each one's publication date is recorded with it.

Counts after this pass: **177 rows, 159 operating and 18 planned, 78 endpoints**
(was 177 rows, 157 operating and 20 planned, 78 endpoints). No row is added or
removed; two move from `planned` to operating.

`as_of` does NOT move, and that is deliberate. This pass re-read six announced
lines, not the network. The winter programme turns over on 25 October and brings
changes to rows nobody re-checked here: Berlin's Monday-to-Sunday slot, the Douala
and Libreville returns' NW26 numbers, Doha's announced daily programme and the
Nigeria restructure through Lagos. Stamping 2026-10-26 on the file would claim all
of that was verified. It is the next pass's job, and the ROADMAP items for it stay
open.

**The rule this pass runs on**, unchanged since 2 October: a route leaves
`plannedRoutes()` only on a dated report that the aircraft flew, never because an
announced date arrived. The converse holds just as hard (collection-rules.md
section 7): a line with no report found is left planned with a dated note, never
marked cancelled. Nothing read on 26 October reports any of these lines withdrawn.

**What was searched.** French, Arabic and English, across the Algerian outlets
(APS, observalgerie, visa-algerie, algerie360, TSA, expressdz, Algerie-Eco,
maghrebemergent), the destination-side press (africaguinee, guinee114, the Congolese,
Nigerian, Kuwaiti and Jordanian press), the airport operators and the trade filings.
Air Algérie still publishes no newsroom: airalgerie.dz's `post-sitemap.xml` stops at
April 2026 and its social accounts answer an automated fetch with a login wall, so
the carrier's own page is never the citation here. `lapatrienews.dz` and
`national.cherchellnews.dz` answer an automated fetch with a firewall interstitial
and nothing rests on either.

## 1. Algiers to Conakry, operating

- <https://www.africaguinee.com/transport-aerien-air-algerie-signe-son-grand-retour-en-guinee-apres-45-ans-dabsence/>
  (**26 October 2026, 12:25**), read in full: "L'aeronef assurant ce vol inaugural a
  touche le tarmac de l'Aeroport international Ahmed Sekou Toure de Conakry dans la
  nuit du dimanche 25 au lundi 26 octobre 2026", and "trois liaisons hebdomadaires
  seront assurees entre Alger et Conakry".
- <https://www.guinee114.com/2026/10/26/45-ans-apres-un-avion-dair-algerie-atterrit-en-guinee-reouverture-de-la-ligne-alger-conakry-fruit-dune-victoire-diplomatique/>
  (**26 October 2026**), read in full: "45 ans apres, un vol d'Air Algerie a atterri
  sur le tarmac de l'aeroport Ahmed Sekou Toure de Conakry ce dimanche 25 octobre
  2026". A second, independent report of the same landing.

`alg-cky` moves to the operating collection with `status: "active"`. The landing
report becomes its `source`, which is the shape Abuja's launch piece and Doha's
arrival report already have, and `flight` (`AH 5358`) and `days`
(tue/thu/sun) keep the 21 August sale inventory and the 26 September programme
report behind it in `sources`, together with the carrier's 24 October statement.
Neither Guinean report carries a flight number or a day name, which is exactly why
the citation list exists.

**`cky-alg` stays planned.** Neither report says anything about the Conakry
departure: no date, no time, nobody aboard it. Direction is recorded on its own
evidence (section 1), and a return a reader can reason out is not a return a source
states. **Re-check after 2026-10-27.**

## 2. Algiers to Shanghai, operating

- <https://observalgerie.com/2026/10/26/voyage/air-algerie-inaugure-une-nouvelle-liaison-long-courrier>
  (**26 October 2026, 15:52**), read in full: "Air Algerie a inaugure, ce lundi 26
  octobre 2026, une nouvelle liaison aerienne directe entre Alger et Shanghai, en
  Chine. Le premier vol a ete lance depuis l'aeroport international
  Houari-Boumediene d'Alger". It also carries AH3082 (Algiers 13:00, Shanghai 10:00
  the next day), AH3083 (Shanghai noon, Algiers 20:00) and "les lundis, mercredis et
  samedis".
- <https://www.aps.dz/fr/economie/commerce-et-service/mvp5bhj8-air-algerie-ouvre-une-nouvelle-liaison-vers-shanghai>
  (**26 October 2026, 12:00**), read in full: "Le groupe Air Algerie a inaugure,
  lundi, au depart de l'Aeroport international d'Alger Houari-Boumediene, une
  nouvelle liaison aerienne vers Shanghai, en Chine". Official tier, and nothing
  more: no flight number, no day name, no return leg, so it is an extra entry and
  not the `source`.
- <https://www.expressdz.dz/2026/10/26/air-algerie-inaugure-une-nouvelle-ligne-vers-shanghai-en-chine/>
  (**26 October 2026**), read in full: the same inauguration at Algiers with the
  officials named. Read as a cross-check, not cited: it adds no field.

`alg-pvg` moves to the operating collection with `status: "active"`, keeping
`AH 3082` and mon/wed/sat, and the 15 August China report and the 24 October
statement move behind the first-flight report in `sources`.

**What the row claims, exactly.** The reports are of the Algiers departure. The
observalgerie piece is timed at 15:52, after the 13:00 slot, and puts the first
flight in the past tense; the aircraft is airborne as this ships and is due at
Pudong on the 27th. What the row claims is the leg operating, not a completed block
time, and that is the same claim Berlin's row made on its inaugural day.

**The "first time" claim goes nowhere.** The 21 October news post's line about
Shanghai being linked by Air Algérie for the first time is in no primary source read.
What the carrier's own statement says is that Shanghai becomes the third Chinese city
after Beijing and Guangzhou, which is a copy fact and not a route fact. Nothing in
the dataset carries either.

**`pvg-alg` stays planned.** AH3083's first departure from Pudong cannot precede the
inaugural arrival. **Re-check after 2026-10-28.**

## 3. Algiers to Brazzaville, still planned

- <https://www.algerie360.com/air-algerie-nouvelles-lignes-afrique-conakry-brazzaville-lagos/>
  (**26 September 2026**), the row's standing `source`: "premier vol le lundi 26
  octobre 2026, puis trois vols par semaine, les lundis, mercredis et samedis".
- <https://www.aeroroutes.com/eng/260629-ahnw26> (**29 June 2026**) and
  <https://www.aeroroutes.com/eng/260820-ahnw26af> (**20 August 2026**), both read:
  "Algiers - Brazzaville eff 26OCT26 3 weekly 737 MAX 8".

The first rotation leaves Algiers at 19:00 on Monday 26 October and lands at
Maya-Maya at 01:10 on the 27th. At the time of this pass it has not flown, and
everything found is the announcement in the future tense. `alg-bzv` and `bzv-alg`
are unchanged. **Re-check after 2026-10-27.**

## 4. The Nigeria sectors, still planned, and the trap in them

- <https://www.aeroroutes.com/eng/260820-ahnw26af> (**20 August 2026**), read in
  full: "Algiers - Abuja - Lagos - Algiers eff 26OCT26 1 weekly 737-700" and
  "Algiers - Lagos - Abuja - Algiers eff 29OCT26 1 weekly 737-700". No flight
  numbers and no times on either rotation.

Every report of 25 and 26 October has Air Algérie "opening Lagos" on Monday 26
October, and **none of it is evidence for `alg-los`**. The Monday rotation routes
Algiers to Abuja to Lagos, so its nonstop legs are `alg-abv` (operating since 2025),
`abv-los` and `los-alg`. The nonstop Algiers to Lagos leg belongs to the Thursday
rotation, effective 29 October. A city pair being served from Monday is not this
directional leg operating, which is section 11's booking-list trap wearing a launch
announcement.

So all four stay planned: `abv-los` is flying tonight and no source covers a sector
between two foreign airports; `los-alg` is due out of Lagos on Tuesday the 27th;
`alg-los` and `los-abv` belong to the Thursday rotation. **Re-check `abv-los` after
2026-10-27, `los-alg` after 2026-10-28, `alg-los` and `los-abv` after 2026-10-29.**

`alg-abv` and `abv-alg` were checked for double-counting and are a different fact:
they have operated since April 2025 on their own citations, and the NW26 programme
restructures the routing through Lagos rather than creating the pair.

## 5. The Kuwait-Amman rotation: a filed schedule, still planned

- <https://www.aeroroutes.com/eng/260629-ahnw26> (**29 June 2026**), read in full:
  "Algiers - Kuwait City - Amman - Algiers eff 26OCT26 1 weekly 737-800, AH4064
  ALG1340 - 2105KWI2205 - 0030+1AMM0145+1 - 0500+1ALG", with "Kuwait is a new
  destination, while overall Amman service increases from 2 to 3 weekly".

The 2 October note on these rows said evidence stays `listed` because "no flight
number, filed schedule or sale inventory has appeared". One had, on a page this
generator already cites for the Douala and Libreville returns. The filing states the
operator, every leg, its times and its number, which is what separates `verified`
from `listed`, so it becomes the `source` on all three legs with the ambassador's
on-record confirmation behind it, and:

- `alg-kwi`: `flight` `AH 4064`, `days` mon, as before.
- `kwi-amm`: `flight` `AH 4064`, `days` **mon**, read off "2105KWI2205", the Kuwait
  departure on the same day the rotation leaves Algiers. The previous note said
  nothing published pinned the day down; the filing does.
- `amm-alg`: `flight` `AH 4064`, `days` **tue**, read off "0030+1AMM0145+1", the
  Amman departure on the day after. The caution against mirroring the outbound day
  was right, and the filing answers it rather than overriding it.

`AH 4064` is one number for the whole rotation. The filing never splits it by leg,
so carrying it on each leg is what the filing states; inventing a second number
would be the inference this file does not make (the Douala triangle's case,
section 33).

**All three stay planned.** The first departure was 13:40 on 26 October, Amman is
reached at 00:30 on the 27th and Algiers at 05:00, and no dated report of any leg
operating was found, including in the Kuwaiti and Jordanian press and at the two
airport operators. A filed schedule is not an operation. **Re-check after
2026-10-27.**

## 6. Doha going daily: unchanged

- <https://www.visa-algerie.com/air-algerie-accelere-sur-le-qatar-avec-des-vols-quotidiens-des-octobre/>
  (**27 September 2026**), read in full: "Air Algerie compte effectivement assurer, a
  partir du 25 octobre prochain, des vols quotidiens vers Doha", with the 00:55
  departure and the three weekly Sun/Tue/Fri it replaces.
- <https://www.arabianbusiness.com/business/transport/air-algerie-doha-flights> and
  the Wego travel blog, both read: the same announcement in English, both predating
  25 October, the second a travel blog and Insufficient tier besides.

Everything readable on the seven-weekly schedule predates the date it starts, and
nothing dated on or after 25 October reports the daily programme in effect. An
announced date passing is not evidence, which is the rule Moscow sits on, so
`alg-doh` and `doh-alg` keep `days` sun/tue/fri. Those are reported operating days,
not a claim that the route flies on no others. **Re-check after 2026-11-01.**

## 7. Not touched

Tripoli at Mitiga (28 October) and N'Djamena (28 October) were out of this ticket's
scope and are unchanged, as is every other row in the file. `alg-svo` / `svo-alg`
stay planned and stay first in the re-check queue.

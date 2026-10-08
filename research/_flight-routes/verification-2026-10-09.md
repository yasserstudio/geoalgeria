# Flight-route verification, 2026-10-09

The release-day pass. It is the widest one since 27 July: 29 legs that had no
citable source of their own, or only a Wikipedia row, now ship on an airport
operator's own page or a trade schedule filing, and one exclusion that has stood
since July is reversed. `as_of` moves from 2026-10-02 to 2026-10-09.

Counts after this pass: **177 rows, 157 operating and 20 planned, 78 endpoints**
(was 148 rows, 129 operating and 19 planned, 73 endpoints). Operating evidence is
82 `verified` and 75 `listed`, was 68 and 61. Four arcs are suspended, was one.

**What this pass could and could not use.** The candidate legs came from a sweep
of Air Algerie's network against airport operators' own sites, the AeroRoutes tag
archive read in full for 2026 (23 posts, 1 January to 8 October), and the Algerian
and European press. An external flight-data feed was used only to direct the
search; no value from it is published. Where a leg's only schedule detail came
from that feed or from a single third-party aggregator, the leg ships without the
detail or does not ship at all, which is why several rows below carry a flight
number and no days.

**The two rules this pass leans on hardest.**

- **Section 9's tiers decide the evidence field, and the source has to cover the
  fields the row ships.** An airport operator's carrier page is Official tier and
  names the operator, but it publishes no per-direction day, time or flight
  number, so it supports `listed` and not `verified`. That distinction used to
  have nowhere to live in `routes()`, and section 1 below is the fix.
- **Section 7 cuts both ways, including for a probe of a whole country.** Rome is
  the worked example.

## 1. A third curated collection, so an Official source can ship at `listed`

`build_route_dataset.py` had two curated collections and neither could carry these
legs. `VERIFIED` writes `evidence: "verified"` onto everything in it by
construction, and `PLANNED` is the lifecycle boundary rather than an evidence
tier. The only way a row reached `routes()` at `listed` was the Wikipedia merge.

That had a concrete cost. Lyon airport publishes, on its own site, the nine
Algerian cities Air Algerie serves from Lyon. Five of those legs existed in the
dataset only because Wikipedia's airport articles happened to list them, and they
therefore cited Wikipedia, or a press piece about something else entirely, instead
of the airport operator. Four more could not ship at all. `LISTED` is the new
collection: each row carries its own `evidence`, the way `PLANNED` rows do, and a
duplicate guard now fails the build if two curated collections name one leg,
because that would emit one id twice and surface far from its cause.

`status` on these rows is `active`, not `unclear`. An airport operator's current
carrier page is a present-tense statement that the service runs; `unclear` would
be under-claiming it. What the page does not support, and what therefore stays
null, is `days` and `flight`.

## 2. France, on the airports' own pages

Twenty-two legs. Every one is Official tier, `evidence: listed`, `status: active`.
Nine of them were `listed` rows citing a Wikipedia article or an unrelated press
piece and are re-cited here; thirteen are new.

- <https://www.lyonaeroports.com/en/flight-and-destinations/airlines-tour-operators/air-algerie>,
  Lyon airport's own Air Algerie page: it lists Algiers, Annaba, Batna, Bejaia,
  Biskra, Constantine, Oran, Setif and Tlemcen as the cities the carrier serves.
  - **Re-cited:** `aae-lys`, `alg-lys`, `bja-lys`, `blj-lys`, `bsk-lys`,
    `czl-lys`, `orn-lys`, `qsf-lys`. All eight moved from `unclear` to `active`.
  - **New:** `lys-aae`, `lys-bja`, `lys-blj`, `lys-bsk`, `lys-qsf`.
  - `lys-alg`, `lys-czl`, `lys-orn`, `lys-tlm` and `tlm-lys` already ship
    `verified` on schedule checks and are untouched: a stronger row is never
    replaced by a weaker one.
- <https://lorraineaeroport.com/vols-destinations/>, Metz-Nancy-Lorraine's own
  destinations page: Alger at 2h05 and Constantine at 2h15, with Air Algerie named
  as the carrier that has served the airport "for more than 20 years".
  - **Re-cited:** `czl-etz`, previously a Wikipedia row.
  - **New:** `alg-etz`, `etz-alg`, `etz-czl`.
  - `orn-etz` and `etz-orn` stay `verified` and `seasonal` on the same operator's
    Oran subpage, which publishes that route's schedule. Different destination,
    different page, different tier: that is section 10 working as intended.
- <https://www.montpellier.aeroport.fr/en/passengers/flight-destinations/airlines>,
  Montpellier's own Airlines page: Air Algerie serves Algiers and Oran year-round.
  Year-round is where `active` comes from.
  - **New:** `alg-mpl`, `mpl-alg`, `orn-mpl`, `mpl-orn`. `MPL` joins the endpoint
    table, already pinned.
- <https://www.nantes.aeroport.fr/fr/air-algerie>, Nantes' own Air Algerie page:
  Algiers is its only Algerian destination.
  - **Re-cited:** `alg-nte`, which had been citing a press piece about two
    unrelated new French routes. `nte-alg` is already `verified`.

**Strasbourg is the one France leg that reaches `verified`.**
<https://www.strasbourg.aeroport.fr/passagers/nouveau-alger-avec-air-algerie-2/>
(Official tier) is the airport's own page for the service and names the carrier,
the direction, and the days: twice weekly Monday and Thursday, winter from 1
December 2025 and summer from 30 March to 22 October 2026. `alg-sxb` moves from
`listed`/`unclear` to `verified`/`active` with `days: ["mon", "thu"]`. No flight
number: the page carries none, and the only number recorded for this leg anywhere
came from the flight-data feed.

**One asymmetry is deliberate and is flagged rather than fixed.** `sxb-alg` ships
`seasonal` on an observalgerie citation that cannot be opened from here, while
`alg-sxb` now ships `active` because its page publishes a winter schedule and a
summer one. Direction is recorded per leg on its own evidence, so the return is
not re-statused by inheritance. The next pass should re-read the return's source.

## 3. Rome Fiumicino: an exclusion reversed

- <https://www.aeroroutes.com/eng/260706-ahns26320> (**6 July 2026**), Reported
  tier: "Air Algerie NS26 Leased A320 Operations at Algiers" lists Rome Fiumicino
  among 23 routes flown with a wet-leased Airbus A320 for the window 1 July to 24
  October 2026.
- The full AeroRoutes tag archive for 2026 was read, 23 posts from 1 January to 8
  October. **No post announces a Rome launch or resumption.** That is the shape of
  a standing route, not a new one.

**Dataset decision.** `("ALG", "FCO")` leaves `OPERATED_BY_OTHERS`. `alg-fco` and
`fco-alg` enter `LISTED`, `active`, `evidence: listed`, both cited to the 6 July
post. `listed` and not `verified` because the post is a network list: it names the
route and nothing per-leg, so there is no flight number and no day on these rows.

**Why the exclusion happened, and which rule caught it.** The entry read "Algeria
to Italy on 14 Aug returned ONE flight, ITA Airways, and no Air Algerie leg from
any Algerian airport", and leaned on section 20's country-form probe to make that
a statement about a whole country. Section 7 says a silence is never a negative,
and widening a silence does not change what it is: ITA's own AZ-numbered nonstop
surfaced that day and Air Algerie's AH-numbered one did not, which is a fact about
the probe's coverage. The 6 July post pre-dates the exclusion itself, so the route
was flying while it was being written.

**Codeshare check, because that is what the exclusion claimed.** ITA runs
AZ801/AZ802/AZ803 as a separate, independently scheduled service on the same city
pair, listed with no codeshare linkage to the AH flights. No AH-numbered flight on
this pair resolves to ITA metal in any source read. Two carriers on one pair is
not a codeshare (section 8), and section 16's actual test is reading the host on
the AH flight number, which was never another carrier's.

**The wet-lease is a footnote, not a blocker.** From July to October 2026 the
aircraft and crew came from Avion Express under ACMI. The flight is Air Algerie's
own commercial service under its own flight numbers throughout, which is what
section 16/22's operator attribution turns on; the airframe's owner is a different
question from who operates the service.

`FCO` joins the endpoint table, already pinned.

## 4. Beirut suspended, Dubai re-cited, both to APS

- <https://www.aps.dz/fr/economie/commerce-et-service/mmexsi27-maintien-de-la-suspension-des-vols-au-depart-et-a-destination-de-doha-beyrouth-amman-et-dubai>
  (**6 March 2026**), Official tier, Algeria's own press agency: "Le Groupe Air
  Algerie annonce le maintien de la suspension des vols a destination et en
  provenance de Doha, Beyrouth, Amman et Dubai, jusqu'a nouvel ordre."

**Dataset decision, two parts.**

`alg-bey` moves from `unclear` to `suspended` and `bey-alg` is added, `listed`,
suspended on the same notice. Both directions are named in the notice itself, "a
destination et en provenance", which is why the return does not need its own page.

`alg-dxb`'s citation moves from the 10 September 2026 airspace-closure report to
this notice, and `dxb-alg` is added and suspended alongside it. The closure report
is the better context and the weaker citation: it is about UAE-registered aircraft
and an Emirati carve-out, while the APS notice is Air Algerie's own suspension,
dated, named per city and named in both directions. The brief's condition was
"refresh its source if it is the stronger, dated official source", and it is.

**This also settles a live disagreement about Beirut.** Several aggregators still
advertise a weekly Algiers-Beirut Air Algerie flight. None of them is citable
here, and the source that contradicts them is official and dated. A suspension
dims an arc and never deletes it (section 2), so all four rows stay in `routes()`
with their evidence tier and their place intact.

**Doha is the control case.** The same notice suspended it; it resumed on 29
September 2026 and ships `active` and `verified` from the 2 October pass. The
notice is read as of its date, not as a standing claim.

## 5. The United Kingdom and the Netherlands

- <https://mediacentre.manchesterairport.co.uk/air-algerie-to-launch-first-flights-from-manchester-airport-to-north-african-hub/>,
  Official tier, Manchester Airport's own press release: operator, both
  directions, the inaugural on Sunday 14 June 2026 and a twice-weekly Tuesday and
  Sunday pattern.
  - `alg-man` moves from `listed` to `verified` and gains `AH 2058` and
    `days: ["tue", "sun"]`. `man-alg` is **new**, `verified`, `AH 2059`, same
    days. The release announces the route as a pair rather than a direction, which
    is unusual and is the reason both legs can cite it.
  - Both are `seasonal`. The schedule runs 14 June to 8 September 2026, so on this
    `as_of` the season has closed; the map is structural, so the arc stays.
- <https://mediacentre.stanstedairport.com/new-airline-air-algerie-launches-direct-flights-to-algiers/>,
  Official tier, London Stansted's own press release: operator, both directions,
  and the full day and time detail, 10:20 Wednesday and Thursday and 09:00
  Saturday and Sunday out of Algiers.
  - `alg-stn` moves from `listed`/`unclear` to `verified`/`active`, gains
    `AH 2056` and `days: ["wed", "thu", "sat", "sun"]`. `stn-alg` already ships
    `verified` on the APS report of the UK expansion and is untouched.
  - **These are the launch days and they are what the cited page supports.** A
    denser current schedule for this leg is claimed only by the flight-data feed,
    which cannot be published, so the row carries the days its source states. Flag
    for a schedule-revision check next pass.
- <https://www.aeroroutes.com/eng/260720-ahjul267m8> (**20 July 2026**), Reported
  tier: the 737 MAX 8's first revenue service, "AH2054 ALG-LHR", first flight 14
  July 2026, 5x weekly.
  - `alg-lhr` is **new**, `LISTED`, `active`, `AH 2054`, **`days: null`**. The five
    day names recorded for this leg anywhere come from a third-party aggregator,
    not from this filing, and a weekly frequency is not a day list. `lhr-alg` has
    been `verified` since the APS report and is untouched.
- <https://www.aeroroutes.com/eng/250901-ahnw25rtm>, Reported tier: the NW25
  launch filing, 28 October 2025, a 737-600, 2x weekly **Wednesday** and Saturday.
  - `alg-rtm` and `rtm-alg` are **new**, `LISTED`, `active`, `AH 2084` and
    `AH 2085`, `days: ["wed", "sat"]`.
  - **The Wednesday is the point.** The flight-data feed had Tuesday for the same
    pair. The filing is the source that ships, and on a conflict between a citable
    source and an observation the citable source wins (section 9).
  - Corroborated at Official tier, direction only, by the Algerian embassy in The
    Hague's own launch release, which carries no flight number and so is not the
    row's citation.
  - `RTM` joins the endpoint table, already pinned.

## 6. Long-haul returns and flight numbers, from the NW26 filings

Every row in this section is Reported tier, and every one ships `verified` rather
than `listed` because its filing states the operator, the direction, the flight
number and the times. None of them ships `days`: the filings give weekly
frequencies, never day names.

| Pair | Change | Flight | Source |
| --- | --- | --- | --- |
| `alg-yul` | **new**, active | null, see below | <https://www.aeroroutes.com/eng/260430-ahns26yul> |
| `alg-pek` | **new**, active | `AH 3060` | <https://www.aeroroutes.com/eng/260416-ahmay26pek> |
| `pek-alg` | **new**, active | `AH 3061` | <https://www.aeroroutes.com/eng/260416-ahmay26pek> |
| `can-alg` | **new**, active | `AH 3181` | <https://www.aeroroutes.com/eng/260620-ahnw26cankul> |
| `kul-alg` | **new**, active | `AH 3157` | <https://www.aeroroutes.com/eng/260620-ahnw26cankul> |
| `dla-alg` | **new**, active | `AH 5349` | <https://www.aeroroutes.com/eng/260629-ahnw26> |
| `alg-dla` | flight corrected | `AH 5350` to `AH 5348` | <https://www.aeroroutes.com/eng/260629-ahnw26> |
| `alg-lbv` | promoted from `listed` | `AH 5040` | <https://www.aeroroutes.com/eng/260629-ahnw26> |
| `lbv-alg` | **new**, active | `AH 5041` | <https://www.aeroroutes.com/eng/260629-ahnw26> |
| `alg-nbj` | promoted from `listed` | `AH 5360` | <https://www.aeroroutes.com/eng/260608-ahjul26nbj> |
| `nbj-alg` | **new**, active | `AH 5361` | <https://www.aeroroutes.com/eng/260608-ahjul26nbj> |

**Montreal's flight number is null on purpose.** The 30 April filing reads the
Canadian Transportation Agency's approval of an increase to 12 weekly from 14 June
to 31 October 2026 and names **two** numbers for the outbound, `AH2700` and
`AH2702`, with `AH2701` and `AH2703` coming home. The field holds one number, so
it holds none, and the filing's numbers are recorded here instead. `yul-alg` keeps
its existing `verified` row and its own citation.

**Douala and Libreville: why the number changed, and the snapshot tension.** Both
routes ran on the single triangle number `AH 5350` until the NW26 programme, which
is what `alg-dla` shipped on the airline's own destination list, a page that in
fact carries no flight number for the leg at all. The 29 June filing splits them
into point-to-point numbers, `AH5348`/`AH5349` for Douala and `AH5040`/`AH5041`
for Libreville, 3x weekly each, **effective 25 October 2026**, which is 16 days
after this `as_of`.

This pass writes those numbers in, on the Owner's instruction, and the tension is
worth stating plainly: the 2 October pass declined to write in Doha's 25 October
daily service on the grounds that `as_of` is a snapshot date. The distinction being
drawn here is that `AH 5350` is the number the restructure **retires**, not a
competing current value, so keeping it would ship a flight number that no timetable
will carry by the time anyone reads this release. A frequency change, by contrast,
leaves the old frequency true until the date arrives. If that distinction is not
wanted, the fix is to revert the four flight numbers and not to re-litigate the
snapshot rule.

**Luanda.** `NBJ` is Dr. Antonio Agostinho Neto International, which replaced
Quatro de Fevereiro (`LAD`) as Luanda's airport; the endpoint table has had it
pinned that way since the Dakar `DKR`/`DSS` trap, and it is correct. These are the
two Algeria-touching legs of the `ALG-LAD-JNB-ALG` rotation the 8 June filing
states, in scope under section 33, 5x weekly south and 6x weekly north from 3 July
2026.

**An open question this pass raises and does not answer.** The 8 June filing routes
that rotation through Luanda, which would mean `alg-jnb` and `jnb-alg` are no
longer flown nonstop, while the 22 January filing has them nonstop on
`AH5360`/`AH5361` from 3 February 2026. Nothing read states the nonstop ended, and
section 7 forbids reading that into a silence, so both rows stand unchanged. The
next pass should settle whether the Johannesburg nonstop survives the Luanda
routing. Both legs also keep their existing airline-page citation rather than
gaining the filing's flight numbers: adding a number would force the row onto a
Reported source in place of an Official one, which is the Shanghai precedent
(verification-2026-10-02.md section 6) read the other way round.

## 7. Budapest, re-dated from a newer filing

- <https://www.aeroroutes.com/eng/260102-ahapr26bud> (**2 January 2026**),
  Reported tier: the resumption slips from October 2025 to April 2026, and the
  triangle runs a **Monday** `ALG-VIE-BUD-ALG` rotation and a **Thursday**
  `ALG-BUD-VIE-ALG` rotation, both on `AH2028`/`AH2029`, effective 1 and 4 April
  2026.

The rows carried Saturday and Wednesday from the NW25 filing of 28 July 2025. The
newer filing supersedes it.

**Dataset decision.** `alg-bud` moves to `days: ["thu"]`: the nonstop
Algiers-Budapest leg is the Thursday rotation's departure from Algiers.
`bud-alg`'s `days` goes to **null**: it is the Monday rotation's leg home, and
section 33's rule is that where only the Algiers departure day is published, an
inbound leg stays null rather than inheriting it. Both are re-cited to the 2
January post.

**The flight number is unchanged, deliberately.** The filing names `AH2028` and
`AH2029` for the rotations without splitting them by leg. Deciding which number
comes home is exactly the inference this dataset does not make, so both rows keep
`AH 2028`.

**`alg-vie` is unchanged.** It cites the 2025 filing for the existence of the
Vienna leg, which the newer filing re-confirms; the Vienna leg's own day is not
published in either.

## 8. N'Djamena, planned

- <https://www.aeroroutes.com/eng/260622-ahnw267m8> (**22 June 2026**), Reported
  tier: "Algiers - N'djamena - Addis Ababa" effective 28 October 2026, 2 weekly,
  on a 737 MAX 8. No flight number, no day names, no per-route schedule: it is a
  network list.

**Dataset decision.** `alg-ndj` enters `plannedRoutes()`, `status: unclear`,
`evidence: listed`, `days: null`, `flight: null`. 28 October is 19 days after this
`as_of`, and the lifecycle rule is that a launch date still ahead keeps a route
planned however firm the filing.

**The onward leg is not carried.** Section 33 puts a rotation's middle legs in
scope, and this is a rotation that continues to Addis Ababa rather than returning;
no read source describes the Algeria-touching return, so `ndj-alg`, `ndj-add` and
anything beyond are absent. `NDJ` joins the endpoint table, already pinned.

## Held, and why

Fifty legs out of the 165 the collection pass produced were tiered high enough to
ship. The rest are held, and these are the groups worth naming.

- **Thirty-one legs resting on one third-party schedule aggregator.** Section 9's
  Insufficient tier: a single aggregator is not the airline, an airport operator
  or a regulator, however good its detail is. Seventeen of these legs are missing
  from the dataset entirely (`alg-gva`, `gva-alg`, `alg-lis`, `alg-mad`,
  `mad-alg`, `alg-mxp`, `mxp-alg`, `alg-pmi`, `pmi-alg`, `bcn-orn`, `ist-aae`,
  `ist-orn`, `vie-alg`, `nim-alg`, `dss-alg`, `oua-alg`, `abj-alg`), and the rest
  already ship on other evidence and gain nothing here. This is the
  cheapest win available to the next pass: one independent source per pair, and
  most of them are an airport operator's page away.
- **Fifteen legs on a single press outlet.** Held for a second source, per
  section 9's "cross-checked across independent outlets". Two clusters:
  **Lille**, where `alg-lil` already ships `listed` but `lil-alg`, `czl-lil`,
  `lil-czl`, `lil-orn` and `orn-lil` would be new, and the **Medina and Jeddah
  Hajj 2026 rotations** (`alg-med`, `orn-med`, `aae-med`, `tlm-med`, `tlm-jed`),
  none of which is in the dataset. `add-alg`, `bod-orn` and `tls-alg` are the
  other three.
- **Rome's days and flight numbers.** `AH 2024` and `AH 2025` on Monday, Tuesday,
  Wednesday, Thursday and Saturday are reported by one aggregator only. The route
  ships on the trade post; those fields do not ship at all. The Owner's own
  booking-engine capture of 8 October 2026 independently shows the Thursday
  `AH2024` as direct with no codeshare marker, which is why the route's existence
  is not in doubt, but a private capture is not a `source_url`.
- **Jeddah.** `("ALG", "JED")` **stays** in `OPERATED_BY_OTHERS`. The brief's
  condition was to remove it only if a shipped row needed it, and none does: no
  citable source names an Algiers-to-Jeddah leg, the press pieces found cover
  Algiers-Medina and Hajj charters from Annaba, Batna, Tlemcen, Ouargla and Adrar,
  and the Tlemcen-Jeddah charter rests on a single outlet. No standing Jeddah
  schedule is invented.
- **Niamey's flight numbers.** `alg-nim` ships `listed`/`unclear` with no flight
  number and no days, and `nim-alg` does not exist. One aggregator gives
  `AH 5324` on Monday and `AH 5326` on Wednesday outbound, and pairs the return as
  `AH5324` on Tuesday and `AH5326` on Thursday, which is worth noting only because
  it is not the `AH 5325` a guess would produce. There is no AeroRoutes post for
  Niamey anywhere in the 2026 window, so under "flight numbers only where the
  cited source states them" nothing changes. Flag for the next pass.
- **"LBG" legs.** Not added. Paris-Le Bourget is a business-aviation field with no
  Air Algerie scheduled service, and the giveaway is in the numbers: `TLM-LBG`
  carries `AH1286`, the same number as `TLM-ORY`, and `ALG-LBG` carries `AH1002`,
  `AH1214` and `AH1230`, which are Algiers-CDG flights. Section 11's rule, a stale
  or odd airport code is usually an internal artifact, so suspect the dataset
  before suspecting the world.
- **The `AH1287` Paris duplicate.** Not added either. `CDG-TLM` and `ORY-TLM` both
  carry `AH1287` in the feed, which cannot be true of two different Paris
  airports, and no citable source distinguishes which one Tlemcen connects to.
  Airport-level scope (section 2) means guessing is not available: one of them
  would be a false arc.
- **Sixty-nine legs with no citable source at all**, the Paris cluster most of
  them. parisaeroport.fr is Incapsula-blocked to automated fetching and Marseille's
  destination pages are JavaScript-rendered calendars with no static carrier data,
  so the largest single market in this network still has the thinnest citations.
  That is the standing gap, unchanged by this pass.

## Deliberately not changed

- **`jnb-alg` and `alg-jnb`**, pending the Luanda-routing question in section 6.
- **`sxb-alg`'s `seasonal` status**, pending a readable source for that direction.
- **Berlin's winter day.** The slot moves from Monday to Sunday on 25 October
  2026, still ahead of this `as_of`. The ROADMAP item stays open.
- **Doha's daily service from 25 October**, for the same reason.
- **Moscow.** Still planned. Its announced 2 October resumption date has now
  passed and nothing dated reports a first flight, which is exactly the outcome
  the 2 October pass said would keep it planned.
- **`alg-amm`.** Still in `OPERATED_BY_OTHERS`, although the APS notice names
  Amman among the suspended cities. The exclusion is about a leg that another
  carrier flies, not about the endpoint, and the triangle's `amm-alg` leg is
  planned and untouched. Worth revisiting next pass now that an official notice
  describes Air Algerie's own Amman service as suspended rather than absent.
- **New Delhi**, withdrawn and guarded. The 11 September AeroRoutes post
  corroborates the withdrawal and adds that the filing was pulled before sales
  ever opened.
- **Seoul Incheon**, still traffic rights without a filed schedule.
- **`czl-bsl`.** Still skipped as "without an endpoint", and the alias rule it
  bumps into is left alone: Basel-Mulhouse is one binational field with two codes,
  the Wikipedia table uses `BSL`, Air Algerie files `MLH`, and the endpoint table
  pins `MLH` while resolving its coordinate via `BSL`. The consequence is that
  Constantine-Mulhouse ships under neither code, since nothing curated carries
  `czl-mlh`. That is a real gap rather than a rule to change, and the fix is a
  citable `MLH` source, not a re-pin. The 20 February 2026 filing of the temporary
  `CZL-SXB` substitution during EuroAirport runway works is the thread to pull.

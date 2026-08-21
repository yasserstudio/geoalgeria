# Collection rules: Air Algérie nonstop international routes

The procedure that turns "which pairs does Air Algérie fly nonstop" into the records
`@geoalgeria/aviation`'s `routes()` and `plannedRoutes()` will ship. Written 2026-07-27,
rewritten from scratch after the first version was lost with the session scratchpad.

Read this before collecting anything. Its whole purpose is that a second run reaches the
same answers as the first, and that a reviewer can see why each arc is on the map.

## 1. What is being collected

One record per **directional nonstop leg**, not per city pair. `ALG->BUD` and `BUD->ALG`
are two records, and the Budapest triangle is the reason: Air Algérie flies nonstop
`ALG->BUD` on Saturdays and nonstop `BUD->ALG` on Wednesdays, and never a same-day
nonstop round trip. A pair-shaped dataset cannot express that, and a renderer that draws
one arc per pair will draw a line that nobody can fly on any given day.

Two collections, kept apart:

- **`routes()`** - legs that are flying, seasonal, suspended, or unclear. Solid arcs.
- **`plannedRoutes()`** - announced but not yet operating. Dashed arcs. A **separate
  collection, never a `status` value**, and never counted toward the headline
  destination figure.

## 2. Scope, locked 2026-07-20. Do not re-litigate

- **Air Algérie (`AH`) only** for v1. An all-carriers version is deferred, not rejected.
- **International only.** Algeria-to-Algeria legs are out: 199 pairs down to 122.
- **Airport level, not city level.** `CDG` and `ORY` are separate endpoints and a route
  to one is not a route to the other. Basel-Mulhouse is the exception that proves it:
  dual-coded `BSL`/`MLH`, Air Algérie uses `MLH`, so keep `MLH`, resolve its coordinate
  via `BSL`, and record the alias so nobody later "fixes" it into a duplicate.
- **The map is structural, not a departure board.** It shows the network as it stands
  over time, so a suspension **dims** an arc, it does not delete it. Inclusion test:
  operated within roughly the last 24 months, **or** has a published forward schedule.
  Permanently discontinued routes are excluded.
- Published schedules first. Live ADS-B observation is a later phase and is gated on the
  OpenSky licence check, which has never been run.

## 3. Where files go

**Nothing lands in the session scratchpad.** That is what destroyed the 2026-07-20
collection: 199 pairs, a 33/33 IATA backfill, 60 foreign endpoint coordinates and the
first copy of this file, all written to a session-scoped path that gets cleaned.

| Destination | What goes there |
| --- | --- |
| `data/research/_flight-routes/` (tracked) | Verification tables, this file, probe scripts, method notes |
| `data/.agents/flight-arcs/` (untracked, `.gitignore:72`) | Raw Soar/Duffel query output, working JSON, anything third-party-shaped |

Commit anything that reaches package quality **immediately**, not at the end of a batch.

## 4. The pair list

Start from Air Algérie's own destination list at
<https://airalgerie.dz/decouvrir/nos-destinations/>, which gives the network size and
the destination cities but **not** discrete city pairs, so it establishes candidates and
never confirms one. Cross the Algerian endpoints (the 36 airports in
`packages/aviation/data/airports.json`) against the foreign ones, drop domestic, and the
result is the ~122-pair candidate list. Each pair is then worked through sections 5 to 7
independently in both directions.

## 5. Soar: what it is for, and what it is never for

**Soar is a hypothesis generator and a frequency source. Nothing else.** It never appears
in a `source_url`, and a leg whose only evidence is a Soar query does not ship.

Which pairs an airline flies is a fact and facts are not copyrightable, so no attribution
is owed. The reason to cite elsewhere is that GeoAlgeria's provenance layer *is* the
product: a `source_url` has to point at something a reader can open and use to check the
claim. This is a provenance decision, not a licensing one.

What Soar is genuinely good for, and what nothing else does as cheaply: **reading the
carrier code straight off the leg.** Operator attribution that official pages leave
ambiguous (Toulouse publishes "Vol direct Toulouse to Constantine" with a fare and never
names the airline) is settled by `carrier_iata` on the segment rather than inferred from
an absence of contrary press.

### The query

The server is `soar_flights`, connected over HTTP transport, and its tools register
natively in a new session. Call `soar_search_flights` directly. Do **not** shell out to
`soar.py`; that is a leftover fallback for the one session that added the server.

```jsonc
{
  "origin": "ORN", "destination": "ETZ", "date": "2026-08-12", "passengers": 1,
  "max_connections": 0,        // provider-side nonstop, not post-filtering
  "stops": 0,                  // belt and braces
  "require_origin": ["ORN"],   // mandatory: stops metro expansion answering "Paris" with CDG+ORY
  "require_destination": ["ETZ"],
  "limit": 50
}
```

Keep only slices with `stops == 0` **and exactly one segment**. Read `carrier_iata`,
`flight_number`, `departure` and `duration` off that segment.

`require_origin` / `require_destination` are not optional. Without them, metro expansion
answers "Paris" with CDG and ORY together, which silently destroys the airport-level
distinction section 2 locks in.

Do not lean on the `airlines` filter. Its own description says it is "applied after
search before limit", so it cannot surface an offer the underlying search did not return.

**Authenticate first.** The anonymous tier caps out around 190 queries and then returns
`HTTP 429 Anonymous Soar search hourly limit exceeded` for well over half an hour, so the
window is long or the counter is not a rolling hour. A 122-pair sweep across a calendar
week in both directions is comfortably over a thousand queries. Sign in via `/mcp`.

## 6. The two filters that actually matter

### `stops: 0` does not mean nonstop

It means zero *connections*. A "direct" flight keeps one flight number straight through a
technical or traffic stop, so it comes back as a single segment with `stops: 0` and sails
through the segment filter.

The proof: on Wednesday 2026-08-12, `AH 2028` ALG->BUD reports one segment, `stops: 0`,
and a duration of **4h40** against a ~1,500 km great circle that flies in about 3h. It is
the ALG->VIE->BUD routing. The same flight number BUD->ALG that day is 3h00 and genuinely
nonstop.

**So duration-check every candidate leg:**

```
expected_minutes = great_circle_km / 800 + 30
flag if observed > 1.35 * expected
```

Anything past 1.35x is a probable technical stop until shown otherwise. `probe_week.py`
implements this; `probe_routes.py` does not, which is why it is superseded and kept
rather than deleted.

### Sweep a full calendar week, never two arbitrary dates

Much of this network is 1-2x weekly. The first attempt sampled 2026-08-12 and 2026-11-18,
which are **both Wednesdays**, so a Thu/Sat route was invisible on both dates and every
"no nonstop" line was uninformative rather than negative.

Sweep Monday to Sunday. Then add a second week in the opposite season so seasonal
separates from year-round: a summer week and a winter week. ALG-SXB is the cautionary
case: silent across the whole August week, and confirmed by `AH 1453` on 8 Dec. It is
winter seasonal, and the August silence meant out-of-season, not discontinued.

## 7. Silence is never a negative

A Soar silence justifies leaving a pair `unclear`. It **never** justifies recording a
negative, and never justifies deleting a leg a citable source supports.

Four independent reasons, all observed:

- **Charters are invisible.** ALG-HRG flew its first rotation in late July 2026 and the
  probe returned nothing all week. Charters are not normally sold through the GDS.
- **Coverage has gaps.** ORN-ETZ has an official published 2026 schedule on Lorraine
  airport's own site and the probe is silent in that direction.
- **Offers are volatile.** Run 1 found the Wednesday BUD-ALG nonstop at 180 minutes. Run
  2, about thirty minutes later and covering the same date, did not return it at all.
  Nothing about the schedule changed in between.
- **A full-week sweep can still miss a real weekly route.** This is the one that should
  change how you read a negative. The first probe swept Mon 10 to Sun 16 Aug 2026 and
  found CZL-TLS silent on every day, which was written up as a coverage gap. It was not:
  CZL-TLS runs `AH 1052` on **Tuesdays**, and that week contained Tuesday 11 August. The
  sweep covered the operating day and returned nothing anyway.

So the week sweep raises confidence, it does not make a silence conclusive. Treat "swept
a full week, found nothing" as **`unclear`**, never as a negative. Only a citable source
saying a route ended, or a published forward schedule that omits it, is a negative.

**The `raw_offer_count` vs `result_count` split is the signal to read instead.** A day
with raw offers but zero after filtering is a day the pair *is* sold, just with a
connection: positive evidence the city pair is served and simply has no nonstop that day.
A day with zero raw offers at all is much weaker and may mean nothing. CZL-TLS showed
exactly this shape, connecting offers on the non-operating days and one nonstop on the
Tuesday.

## 8. Carrier codes

| Code | Carrier | Scope |
| --- | --- | --- |
| `AH` | Air Algérie | **in scope** |
| `SF` | Domestic Airlines (ex-Tassili, codes carried over unchanged) | out of scope for v1 |
| `5O` | ASL Airlines France | out, operates nonstop ALG-CDG, an easy false positive |
| `TO` | Transavia France | out, operates TLM-ORY and appears on TLM-LYS |
| `V7` | Volotea | out, operates TLM-MRS alongside Air Algérie |

A pair being flown is not the same fact as Air Algérie flying it. TLM-MRS is flown by
both `AH 1092` and `V7 2679`; TLM-ORY is Transavia only and is excluded despite being a
real nonstop.

## 9. Evidence tiers

Every shipped leg carries an independently citable `source_url`. Tier it:

| Tier | What counts | Ships? |
| --- | --- | --- |
| **Official** | The airline, an airport operator, or a regulator, naming the operator and ideally the schedule. Lorraine airport's 2026 Oran page is the model. | Yes |
| **Reported** | Credible press or trade schedule-filing aggregation, cross-checked across independent outlets. Aeroroutes on the Budapest triangle; three Algerian outlets on ALG-HRG. | Yes, tier recorded |
| **Insufficient** | A single promotional post, one aggregator, a travel agency's own ad. ALG-SSH rests on exactly this and does not ship. | No. Leave `unclear` |

On conflict between a citable source and a Soar observation, **the citable source wins**;
persistent disagreement means `unclear`, not a coin toss.

## 10. Status, direction, and the planned split

`status` is one of `active`, `seasonal`, `suspended`, `unclear`, recorded per directional
leg. Because the map is structural, `suspended` dims and stays; it never deletes.

Direction is not optional and is not symmetric. Record each leg on its own evidence.

Planned routes go in `plannedRoutes()`. The bar is an announcement from the airline or a
regulator with a stated intent to operate. **Rumour and aggregator speculation are out**,
and so is French conditional framing: "devrait" and "pourrait" describe a plan somebody
is imagining, not a route. Advocacy by a local official or a chamber of commerce is not
an announcement.

## 11. Traps that have already produced real errors

- A route in a **booking list is not a nonstop route.** This is how Budapest got in, then
  got wrongly thrown out entirely, before the triangle resolved it.
- A **fare-sale window is not a route-operating window.**
- An **aircraft sighting is not a route** unless it is in revenue service.
- **Triangle rotations yield one-directional nonstops.** Record direction.
- **A carrier rebrand does not transfer every route.** The "11 doubtful ex-Tassili pairs"
  framing was wrong: the documented 2025 Tassili France network was ALG-LYS, BJA-CDG and
  ORN-CDG, and nothing ties Tlemcen, CZL-TLS or BLJ-CDG to the rebrand. The doubt was
  real, its stated cause was not. Check what a source actually says before inheriting its
  framing.
- **A stale airport code is usually an internal artifact.** No external source uses the
  closed-Atatürk `ISL` code for Air Algérie's Istanbul service; everything current says
  `IST`. Suspect the dataset before suspecting the world.

## 12. Working protocol

1. Take a batch of pairs. Sweep a full week per direction, then the opposite-season week
   for anything that came back empty.
2. Write raw output to `data/.agents/flight-arcs/`. Never the scratchpad.
3. Duration-check every surviving leg. Flag anything past 1.35x expected.
4. For each leg that looks real, find the citable source before writing a record. No
   source, no ship: the leg stays `unclear` in the verification table.
5. Append to the verification table in `data/research/_flight-routes/` with pair,
   direction, operator, status, tier, `source_url`, frequency, and a note.
6. **Commit the batch.** Do not accumulate uncommitted work.

## 13. Endpoint coordinates

Algerian endpoints come from `packages/aviation` (36 airports, every one carrying an IATA
code as of 2026-07-27). Foreign endpoints need their own coordinate set, roughly 60 of
them, from OurAirports' public-domain `airports.csv` - the same source the aviation
package already uses, joined on IATA and confirmed by name and country rather than on the
code alone.

`LOO` (Laghouat) was the one Algerian endpoint missing entirely and blocked the JED-LOO
arc. It shipped 2026-07-27 alongside `HRM` and `MZW`.

## 14. How big is "done"? (established 2026-07-27)

**The target is 44 to 57 international routes, not 122.** The 122 figure was a
candidate cross-product of Algerian airports against destination cities. It was
never a claim about how many routes exist, and treating it as the denominator
badly understated progress.

Air Algérie states the network size itself, and **contradicts itself on a single
page**: `airalgerie.dz/decouvrir/nos-destinations/` carries "44 dessertes
internationales et 33 domestiques" in the page body, and "**57** dessertes
internationales et 33 domestiques" in the site-wide nav blurb on the same page.
Both are first-party. Treat the target as a **range, 44 to 57**, and do not quote
either number as exact without saying which part of the page it came from.

This matters because it is the only completeness check available: when the
collection reaches the low forties, the map can honestly claim to be near
complete. An all-carriers dataset would have no such denominator, since nobody
publishes how many carriers fly nonstop from Algeria, which is a strong argument
for keeping v1 to one airline.

**The destination city list is not a route list.** The ~62 foreign cities behind
`nos-destinations` come from the booking form's city picker, which includes every
city sellable with a connection. That is why it lists more cities than the airline
has routes. It is a candidate set only, exactly as section 4 says; it is never
evidence that a nonstop leg exists. `foreign-endpoints.json` is derived from it and
inherits the same caveat: an endpoint in that file has a coordinate, not a route.

**There is no published timetable to shortcut the collection.**
`airalgerie.dz/planifier-et-reserver/programme-des-vols/` is a JavaScript booking
widget: no PDF, no downloadable schedule, no API endpoint in the markup. Checked
2026-07-27. So the network has to be established pair by pair, and the per-airport
destination pages of foreign airports (Lyon, Toulouse, Marseille, Lorraine) remain
the best citable sources, since each names the carriers serving it.

## 15. The airline's own timetable: reachable by hand, defended against automation

Investigated 2026-07-27 with agent-browser, recorded to HAR. Written up so nobody
spends another evening rediscovering it.

`airalgerie.dz/en/plan-your-trip/flight-schedule/` is the right source in
principle. It is first-party and therefore **citable**, unlike Soar, and its own
description promises "the national and international flight schedule (frequency
of flights per week, time) available in real time" - weekly frequency is exactly
what a route record needs, and it would mean **one query per direction instead of
seven**.

The form itself is fully understood, and all four gates below have to be passed
in order or the submit silently does nothing:

1. **Cookie consent must be accepted.** Without it the results area renders
   "Vos paramètres peuvent vous empêcher de voir ce contenu".
2. **`fill` does not work on the airport fields**, which are jQuery UI
   autocompletes. Real keystrokes do (`agent-browser type`), then ArrowDown +
   Enter to take the suggestion. The form keeps hidden inputs `depart` and
   `arrivee` holding plain IATA codes, so state is readable and settable.
   Note it resolves to **metro codes** by default: typing "Paris" gives
   `PAR` / "All Paris Airports", not CDG. Type the airport code explicitly.
3. **The date cannot be set by assigning `.value`.** The picker is easepick,
   living in a **shadow DOM**, and it ignores an input whose value changed
   underneath it. A day element inside `shadowRoot` has to receive a real click
   (`composed: true`).
4. **The trip type must be switched to one-way.** The form defaults to
   `aller-Retour`, which requires an `endDate` nobody filled, so validation
   aborts with no message and no request. This was the actual blocker.

Pass all four and it submits, and that is where it ends:

- It hands off to **Amadeus** at
  `fly.airalgerie.dz/plnext/AirAlgerie/Override.action?EMBEDDED_TRANSACTION=TimeTable&ENC=...`
  where `ENC` is a **~2 KB server-generated encrypted blob** carrying the search.
  There is no URL to construct, so every query must replay the whole form.
- That host is behind **Akamai bot protection** (an obfuscated sensor endpoint
  posting alongside the page load), and the result renders **blank**: zero-length
  body, empty title, no tables.

**Decision: do not automate this.** Reading a public page is one thing;
working around bot protection deployed on an airline's live booking
infrastructure is another, and it is not something this project should build. The
facts are not the problem, the circumvention is. It is also fragile: an encrypted
parameter and an active bot-detection vendor will break any scraper on their
schedule, not ours.

**Use foreign airport destination pages instead.** They are public, unprotected,
official, and each names the carriers serving that airport, so one fetch yields
every Air Algérie route into it. Lorraine and Lyon already produced `official`
tier confirmations this way (ORN-ETZ, TLM-LYS). Roughly 40 airports covers most
of the European network, which is most of the network. Per-airport sourcing also
scales better than per-leg: the citation is the airport's own page.

## 16. Codeshares are tickets, not routes (found 2026-07-27)

Soar's authenticated responses expose a **`codeshare`** object on an offer:

```jsonc
{"carrier_iata": "AH", "flight_number": "3016",
 "codeshare": {"host_iata": "AH", "partner_iatas": ["TK"]}}
```

That changes what a carrier code on a leg proves. `ALG-IST` returns `AH 3016`,
`AH 3014` and `AH 3018` sitting beside Turkish Airlines' own `TK 652`, `TK 654`
and `TK 656` on the same routing and the same duration. An `AH` flight number on
that leg does **not** mean Air Algérie flies it; it can mean Air Algérie sells a
seat on Turkish metal.

**A codeshare must never be drawn as an operated route.** The map claims "Air
Algérie flies this", and a ticket is not a flight. Every leg therefore needs its
`codeshare` field read before it ships, and where the object is present the leg is
either dropped or recorded with the operating carrier rather than the marketing
one.

> **CORRECTION, 2026-07-28. `host_iata` is the OPERATING carrier**, and
> `partner_iatas` are the airlines selling seats on it. This section originally
> read it the other way round and excluded two real Air Algérie routes.
>
> `CZL-IST` returns `carrier_iata: "TK"`, `flight_number: "8666"`, with
> `codeshare: {host_iata: "AH", partner_iatas: ["TK"]}`. That is **Turkish
> marketing an Air Algérie flight**, not Air Algérie selling a Turkish one, and
> TK's 8xxx range is exactly where marketing numbers live. `ALG-IST` likewise:
> `AH 3014` carries no codeshare object at all, and `AH 3016`/`3018` are hosted
> by AH.
>
> A country probe settled it: Air Algérie flies Istanbul **four times a day in
> each direction** at 3h30/3h35, against Turkish's own 3h45/3h50 on the same
> pair, plus `IST-CZL` at 3h00.
>
> So: **read the host, never the flight number.** The exclusions that survive are
> the ones where the host is another airline (`ALG-DOH`, host `QR`) or where no
> Air Algérie leg appears at all (`ALG-JED`, `ALG-AMM`, `ALG-FCO`). The lesson
> that a carrier code does not prove operation still stands; what changed is
> which field answers the question.

This retro-justifies the caution in section 8: reading a carrier code off a leg
settles the *marketing* carrier, which is what a booking system knows. It is
strong evidence but not proof of operation, and the codeshare field is the thing
that tells the two apart. Where it is absent, as on `AH 1002` ALG-CDG or
`AH 1020` ALG-MRS, the leg is Air Algérie's own.

## 17. First authenticated sweep results (2026-07-27)

Soar authenticated: six queries in one burst with no 429, well past the anonymous
five-per-minute ceiling.

| Pair | Finding | Duration check |
| --- | --- | --- |
| `ALG-CDG` | **Air Algérie, many daily**: AH 1002, 1000, 1214, 1534, 1542, 1012, 1230. Air France flies it too (AF 1055/1555/1655/1755/1855), one AF leg codeshared with AH | 150 min vs 133 expected, ratio 1.13 |
| `CDG-ALG` | **Confirmed both directions**: AH 1013, 1233, 1003, 1001, 1215, 1543, 1231, 1535 | 135 min vs 133, ratio 1.02 |
| `ALG-MRS` | **Three carriers**: AH 1020/1024, Transavia TO 7323, Volotea V7 2115/2041 | 90 min vs 88, ratio 1.03 |
| `ALG-IST` | **Codeshare trap**: AH 3014/3016/3018 alongside TK 652/654/656, two of the AH numbers explicitly flagged codeshare with TK | 215 min vs 199, ratio 1.08 |
| `ALG-FRA` | Empty across six consecutive days, zero raw offers, though Wikipedia lists Frankfurt | - |
| `ALG-YUL`, `ALG-DXB` | Empty, zero raw offers, though both are listed | - |

The three empties are exactly why two independent sources exist. Per section 7 a
silence is `unclear`, never a negative, and Montreal and Dubai are both long-haul
routes a booking API might simply not be selling on the sampled date. They stay
`unclear` pending a citable source.

**Cost note for planning.** A full 60-pair sweep across both directions and a
calendar week is ~840 MCP calls, and MCP tool calls cannot be scripted. Use the
adaptive shape instead: two dates per direction first, escalating to a full week
only where both come back empty. That concentrates effort on the pairs where the
answer is actually in doubt.

## 18. Codeshare screening results, first pass (2026-07-28)

Twelve of the highest-risk `listed` routes screened, chosen by great-circle
distance on the reasoning that Air Algérie's own metal realistically covers
Europe, the Maghreb, the Sahel and the near Middle East, so the far ones are where
another airline is likely to be flying.

**Five of twelve should not be drawn as Air Algérie routes.** That is a high
enough error rate that no long-haul `listed` route should reach the map unscreened.

| Pair | Probe | Verdict |
| --- | --- | --- |
| `ALG-JNB` | `AH 5360`, 9h20, no codeshare object | **verified**, ratio 0.95 |
| `ALG-DLA` | `AH 5350`, 5h05, no codeshare object | **verified**, ratio 0.99 |
| `ALG-DOH` | `QR 1380` on Qatar metal, AH as marketing carrier | **codeshare, excluded** |
| `ALG-JED` | `SV 0340` / `SV 0342`, Saudia, no AH leg at all | **flown by another airline, excluded** |
| `ALG-JED` **(2nd date)** | 14 Aug, independently: two flights, both Saudia, still no AH leg | exclusion **corroborated** |
| `ALG-AMM` | `RJ 0518`, Royal Jordanian, no AH leg at all | **flown by another airline, excluded** |
| `ALG-ABJ`, `ALG-BEY`, `ALG-DXB`, `ALG-NBJ`, `ALG-ABV`, `ALG-BKO`, `ALG-NIM` | empty | unresolved, stay `listed` |

Note the third category, which the codeshare rule did not anticipate. `ALG-JED`
and `ALG-AMM` return **no Air Algérie leg whatsoever**, only Saudia and Royal
Jordanian. A published table listing Air Algérie on those pairs is not enough to
draw them. They may be seasonal, Hajj-period, or simply a table error; whichever
it is, an arc would assert something the evidence does not support. So there are
now two exclusion sets, not one: `CODESHARE_ONLY` and `OPERATED_BY_OTHERS`.

Air Algérie's own long-haul African flights appear in an `AH 53xx` block
(`5350` Douala, `5360` Johannesburg), which is a useful smell test but not a rule:
confirm each leg rather than inferring from the number.

**41 `listed` routes remain unscreened**, mostly short-haul France, Spain and the
Maghreb where Air Algérie's own operation is far more likely. They are not
risk-free, though: `ALG-CDG` returned an Air France leg codeshared with AH
alongside Air Algérie's own metal, so European pairs carry codeshares too. The
difference is that there the codeshare sits beside a genuine AH flight rather
than replacing it.

## 19. Wikipedia under-reports Air Algérie on North Africa (found 2026-07-28)

Two independent spot-checks against a live booking screen, two misses, and both
the same shape.

| Pair | What Wikipedia's Algiers table lists | What actually flies |
| --- | --- | --- |
| `ALG-TUN` | Nouvelair, Tunisair | **`AH 4002` out, `AH 4001`/`AH 4003` back**, no codeshare |
| `ALG-CAI` | EgyptAir | **`AH 4039`** CAI-ALG, no codeshare, plus the outbound on a booking screen |

Neither route was in the dataset at all. Both are Air Algérie's own metal, in
both directions, on a `AH 40xx` block that looks like the North Africa network.

**So the `listed` tier is a floor, not a ceiling.** The sweep finds routes
Wikipedia records; it cannot find routes Wikipedia omits, and it omits Air
Algérie on at least two neighbouring-country pairs where a competitor is listed
instead. Any claim that the collection is "most of the network" has to be read
against that, and the honest framing is that the count is a lower bound.

Worth checking next, on the same suspicion: Casablanca, Tripoli, Nouakchott and
the other Maghreb and Sahel pairs, where the same competitor-listed-instead
pattern is most likely.

**Second bug this exposed.** `Tunis Airport` is a Wikipedia **redirect** with no
infobox of its own, so the IATA resolver returned `None` and every Tunis row was
dropped without a word, including the Nouvelair and Tunisair ones. The resolver
now follows `#REDIRECT` before reading the infobox. A destination silently
vanishing is worse than one that fails loudly, and this one vanished.

## 20. Search country to country, not airport to airport (found 2026-07-28)

Soar resolves a country as an origin or destination: `Algeria (any)` to
`Qatar (any)` returns every nonstop between the two, from any Algerian airport.

That is a much better screening probe than a pair query, and it was in front of me
the whole time:

- **One query replaces many.** Screening whether Air Algérie flies anywhere in a
  country takes one call instead of one per Algerian origin. The 41 unscreened
  `listed` routes collapse to roughly 25 country probes.
- **It answers a stronger question.** A pair query says "not on this pair"; a
  country query says "not from anywhere in Algeria". `ALG-DOH` came back Qatar
  Airways only on both, but the country form rules out every other Algerian
  origin at the same time.
- **It cannot be defeated by picking the wrong airport.** Metro codes and
  multi-airport cities stop mattering, which is where `PAR` versus `CDG`
  repeatedly caused trouble.

Corroborations obtained this way, both on 14 August and both independent of the
earlier pair probes:

| Probe | Result | Effect |
| --- | --- | --- |
| Algeria to Qatar | Two flights, **both Qatar Airways**, no Air Algérie | `ALG-DOH` exclusion **corroborated** |
| Algiers to Saudi Arabia | Two flights, **both Saudia**, no Air Algérie | `ALG-JED` exclusion **corroborated** |

Both had been excluded on a single pair probe. Section 7 says one empty result is
weak evidence, so a second independent probe, in a form that also widens the
question, is what makes those exclusions safe rather than presumptuous.

Use the country form first when screening, and fall back to the pair form only to
pin down which airport and which direction.

## 21. The redirect fix was incomplete: a cache is state, not just a speed-up

Section 19 recorded that `Tunis Airport` is a Wikipedia redirect with no infobox,
so the IATA resolver returned `None` and every Tunis row was dropped. The
resolver was fixed to follow `#REDIRECT`.

**That fix did nothing, and the reason is worth writing down.** The resolver
caches its answers to disk, and the cache still held the `None` values from the
run before the fix. A cached wrong answer is indistinguishable from a cached
right one, so the corrected code was never consulted: **49 of 109 destination
articles were still `None`, and every route through them stayed invisible.**

It surfaced because a booking screen showed Air Algérie flying `ALG-ALC` and
`ALG-BCN`, neither of which was in the dataset, and both had been dropped exactly
this way:

```
Alicante–Elche Airport                    -> None   (redirect, poisoned)
Alicante–Elche Miguel Hernández Airport   -> ALC    (real article)
Barcelona–El Prat Airport                 -> None   (redirect, poisoned)
```

Clearing the `None` entries and re-running took resolution from **60/109 to
106/109** and the dataset from 70 routes to 89 in one step.

**Rule: when a resolver is fixed, invalidate the entries it got wrong.** A cache
that only ever adds is a cache that preserves every bug it saw. Cache negative
results with more suspicion than positive ones, or do not cache them at all: a
`None` here means "not found", which is exactly the answer most likely to be the
code's fault rather than the data's.

## 22. Screening results, country-form probes (2026-07-28)

| Probe | Air Algérie legs seen | Effect |
| --- | --- | --- |
| Algeria to Spain | `ORN-ALC` x2, `ALG-ALC` x2, `ALG-BCN` | 5 legs **verified** |
| Spain to Algeria | `ALC-ORN` x2, `ALC-ALG` x2, `BCN-ALG` | return legs **verified** |
| United Kingdom to Algeria | `STN-ALG`, `LHR-ALG` | 2 legs **verified** |
| Algeria to Italy | none: one flight, ITA Airways | `ALG-FCO` **excluded** |
| Algeria to Qatar | none: both Qatar Airways | `ALG-DOH` exclusion corroborated |
| Algiers to Saudi Arabia | none: both Saudia | `ALG-JED` exclusion corroborated |

Every verified leg duration-checked between 0.94 and 1.16 against its great
circle. Vueling flies the Spanish pairs and BA Euroflyer flies Gatwick, neither of
which changes what Air Algérie itself operates.

Rome is the third case of a route a published table lists and no probe supports,
after Jeddah and Amman. The pattern is now clear enough to state: **a `listed`
route to a country with a strong national carrier deserves a country-form probe
before it is drawn.**

## 23. Six empty days did not mean the route was not there

The strongest case yet for section 7, and it is worth stating on its own because
it is more extreme than anything before it.

`ALG-FRA` was probed on **six consecutive days**, 3 to 8 August. Every one came
back with zero offers and zero raw offers. Written up at the time as "unresolved,
stays listed", which was the right call and only just.

A booking screen then showed **Air Algérie flying `FRA-ALG` nonstop in 2h50**,
ratio 1.17. The route is real, Lufthansa flies it too, and six consecutive empty
days said nothing about any of it.

Earlier evidence for this rule was a single week sweep missing a Tuesday-only
route (section 15). This is six days of silence over a route that exists, so:

- **A booking-API silence carries almost no information.** Not "weak evidence",
  close to none. Six samples did not distinguish a real route from a nonexistent
  one.
- **Never convert silence into a negative**, no matter how many empty days
  accumulate. What justifies excluding a route is a probe that returns ANOTHER
  AIRLINE flying it, as with Jeddah, Amman, Doha and Rome, not a probe that
  returns nothing.
- **Direction is established per leg.** `FRA-ALG` is verified and `ALG-FRA`
  stays `listed`, because the evidence is for one direction only. The Budapest
  triangle is the standing reminder that the reverse does not follow.

## 24. ORN-BRU, closed at last (2026-07-28)

The first unresolved question on this track, open since the first session: does
Air Algérie fly Oran to Brussels? It could not be settled because
`brusselsairport.be` returns Access Denied to tooling and to a real browser
alike, and the aggregators claimed TUI Fly had taken the route over.

A country probe answers it, and not by finding the route:

- **Belgium to Algeria returned exactly ONE flight**, `BRU-ALG` on Air Algérie,
  2h35, ratio 1.04.
- **Algeria to Belgium returned exactly ONE flight**, `ALG-BRU` on Air Algérie,
  2h45, ratio 1.11.

Air Algérie is the only carrier on either, so the TUI Fly claim is wrong for
Brussels-Algiers. And **no Belgium-Oran flight exists on any carrier**, which is
what settles the original question. `ORN-BRU` stays out, now on positive evidence
about the whole country rather than on absence.

This is the difference the country form makes, as section 20 argued: an
airport-pair probe returning nothing for `ORN-BRU` would have been another
uninformative silence. A country probe returning a complete list that does not
contain Oran is a fact about the network.

`ALG-BRU` is verified in both directions and enters the dataset for the first
time. Brussels was never a doubtful route; the doubt was always about which
Algerian city.

## 25. Three kinds of absence, and only two are negatives

Country probes for Morocco, Libya, Mali and Niger returned nothing, and the four
do not mean the same thing. This section exists because treating them alike would
be wrong in both directions.

**1. Another airline flies it. A negative.**
`ALG-DOH` (Qatar), `ALG-JED` (Saudia), `ALG-AMM` (Royal Jordanian), `ALG-FCO`
(ITA). The probe returns a complete answer that simply does not include Air
Algérie. Excluded, and the exclusion is evidence-backed.

**2. The route cannot exist, for a reason outside aviation. A negative.**
**Morocco.** There are no direct Algeria-Morocco flights, and the cause is the
closure of Algerian airspace to Moroccan aircraft in September 2021, not a gap in
anyone's data. No Morocco pair is in the dataset and none should be added; if one
ever appears in a published table, that table is out of date rather than ahead of
us. This is the only structural negative on the track, and it needs a citable
source attached before it is ever used to remove something.

**3. Nothing came back, and nothing is known. NOT a negative.**
**Libya, Mali, Niger.** Wikipedia lists Air Algérie on Bamako and Niamey, with
citations, and the probes return nothing at all. Per section 23 that says almost
nothing: six empty days did not disprove Frankfurt, and `ALG-YUL` returned zero
offers on a route flying twice daily. These are also exactly the markets where a
booking API's coverage is thinnest, the same reason the `ALG-HRG` charter was
invisible.

`ALG-BKO` and `ALG-NIM` therefore stay **`listed`**, which is what the tier is
for: a published source says the carrier serves the pair, and nothing has
confirmed or refuted it. Recording them as negatives would be inventing a fact;
promoting them would be inventing a different one.

The distinction in one line: **a negative needs a positive finding behind it**,
either another airline flying the route or a reason it cannot be flown. Silence
is not a finding.

## 26. The Budapest triangle, confirmed on the right days (2026-07-28)

The most contested finding on this track, and now the best supported.

It entered the dataset wrongly, was thrown out entirely, then was reconstructed
from a trade schedule filing as a two-rotation triangle: Wednesday flies
`ALG-VIE-BUD-ALG`, Saturday flies `ALG-BUD-VIE-ALG`. That is why nonstop
`ALG-BUD` exists **only on Saturdays** and nonstop `BUD-ALG` **only on
Wednesdays**, and it is the reason every route in this dataset is directional
rather than pair-shaped.

All of that was inference from a filing. Two independent booking-screen
observations now confirm it:

| Observation | Predicted by the triangle | Match |
| --- | --- | --- |
| `ALG-VIE` nonstop, 2h45 | The Wednesday rotation's first leg must exist | yes |
| `BUD-ALG` nonstop on **Wed 16 Sep 2026**, 3h00 | Wednesday-only, and 180 min was the recorded duration | yes, on both day and duration |

The duration figure had been carried since the first probe and was never
re-measured; it came back identical. And the day is the sharp test: a
Saturday sighting of `BUD-ALG` would have broken the model outright.

Worth stating plainly because it cuts against the caution elsewhere in this file:
**a schedule filing, read carefully, predicted observations months ahead of
seeing them.** Trade filings are `Reported` tier rather than `Official`, but they
model the network better than any booking probe, which only ever answers about
one day at a time.

## 27. The duration heuristic is biased short-haul, and that is fine

`great_circle_km / 800 kph + 30 min` was chosen to catch a technical stop
masquerading as a nonstop, which it does: the Budapest trap showed up at 1.72x.
Worth writing down what it does NOT do, now that the network reaches Kuala
Lumpur.

**Long-haul legs score below 1.0 by construction.** The fixed 30-minute allowance
is a large share of a 90-minute hop and a rounding error on a 12-hour one, and
real cruise exceeds 800 kph. So:

| Leg | km | Observed | Ratio | Implied ground speed |
| --- | --- | --- | --- | --- |
| `ALG-KUL` | 10,580 | 12h35 | **0.92** | 841 kph |
| `ALG-JNB` | 7,463 | 9h20 | 0.95 | 800 kph |
| `ALG-CAN` | 10,106 | 12h50 | 0.98 | 787 kph |
| `MRS-CZL` | 805 | 1h30 | 1.00 | 537 kph |
| `MRS-ALG` | 768 | 1h40 | 1.14 | 461 kph |

A short hop spends proportionally far longer climbing and descending, so its
implied ground speed looks slow and its ratio runs high; a long haul is almost
all cruise. Nothing here is wrong, and no threshold needs adjusting: the test is
one-sided, and only a ratio far ABOVE 1.35 means anything.

The practical rule: **do not read a low ratio as suspicious.** A 12-hour flight
scoring 0.92 is a 12-hour flight, not a data error. And do not tighten the
threshold to catch short-haul anomalies, because `MRS-ALG` at 1.14 is a perfectly
ordinary 768 km flight.

## 28. Probed and not found: an audit trail, not a downgrade

A growing set of `listed` routes have now had a country-form probe run against
them and returned no Air Algérie leg, without any other airline appearing either.
Under section 25 that is category 3, so they stay `listed`. This section records
which, because "nobody has checked" and "checked twice, found nothing" are
different states even when they carry the same tier.

Probed, nothing found, still `listed`:

| Route | Probe |
| --- | --- |
| `ALG-BEY` | Lebanon, and an earlier pair probe |
| `ALG-DXB` | UAE, and two earlier pair probes |
| `ALG-OPO` | Portugal |
| `CZL-MED` | Medina |
| `ALG-ABJ`, `ALG-ABV`, `ALG-BKO`, `ALG-NIM`, `ALG-NBJ` | pair probes |
| `AAE-IST` | pair probe |
| Switzerland (`GVA`, `ZRH`) | country probe; nothing in the dataset either way |
| Côte d'Ivoire (`ALG-ABJ`) | country probe, plus an earlier pair probe |

**Why none of these is demoted.** Two routes on this exact list turned out to be
real: `ALG-FRA` survived six consecutive empty days and `ALG-YUL` returned nothing
on a route flying twice daily, both later confirmed inbound. A booking API not
selling a seat today is not the airline not flying the route, and the Hurghada
charter showed the same thing from the other end.

**Why it is still worth recording.** Effort spent is information. Without this, a
later session re-probes the same pairs and re-learns the same nothing. And if one
of these ever DOES surface, the fact that it was invisible across several probes
is itself worth knowing about the source.

The honest reading of a route on this list: a published table says Air Algérie
serves it, no probe has yet seen it, and neither statement outranks the other.

## 29. Berlin is bookable in both directions, but still planned (2026-08-21)

Air Algérie's own booking results now expose both legs of the new Berlin
rotation for Monday 14 September 2026:

| Route | Flight | Local schedule | Block time |
| --- | --- | --- | --- |
| `ALG-BER` | `AH 2072` | 14:00–18:00 | 3h00 |
| `BER-ALG` | `AH 2073` | 19:00–21:05 | 3h05 |

The booking results name Air Algérie, label both as direct, and show fares for
the launch date. A public schedule report independently says reservations opened
on 20 August, with one Monday rotation per week from 14 September through at
least 19 October. The two legs therefore enter `plannedRoutes()` separately at
the `verified` evidence tier: carrier, direction, flight number and duration are
confirmed, while `planned` remains true because neither leg was operating on the
21 August snapshot date. See `verification-2026-08-21.md` for the receipts and
the decision record.

An independent production search through the official Soar Flights MCP matched
both legs exactly on the same date. Use that search as a live confirmation, not
as the published `source`: offer IDs, fares and expiries are transient, so a
stable public report still belongs in each route record.

## 30. Korea has traffic rights, not a filed schedule (2026-08-21)

The Korea–Algeria bilateral announcement permits up to four weekly passenger and
cargo flights. Contemporary coverage describes an Algiers–Incheon link, but the
agreement itself permits any airport in either country and publishes no launch
date, flight number or operating day.

The map therefore carries `ALG-ICN` and `ICN-ALG` only in `plannedRoutes()` so
they render as dashed arcs. Both stay `listed` / `unclear`, with null flight and
days, until an operator schedule or booking result resolves the remaining
details. Do not promote them to operating routes from traffic rights alone.

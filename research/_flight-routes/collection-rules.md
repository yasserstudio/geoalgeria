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

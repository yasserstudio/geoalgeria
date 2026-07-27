# Flight routes research

Working material for `@geoalgeria/aviation`'s planned `routes()` / `plannedRoutes()`
exports: a nonstop **international** route network for Air Algérie, which becomes the
arcs globe on the app side.

## What is here

| File | What it is |
| --- | --- |
| `collection-rules.md` | **Read this first.** The reproducible procedure: scope, query recipe, the two filters that matter, evidence tiers, and the working protocol. |
| `verification-2026-07-27.md` | Per-pair evidence: tier, source URL, operator, direction and frequency. **Opens with a CURRENT STATUS table that supersedes everything below it**; the tables under it are the historical record, kept because two of them were wrong in instructive ways. |
| `opensky-licence.md` | Why the "observe later" phase is blocked: OpenSky's terms bar commercial use, operational API use, and redistribution. |
| `resolve_endpoints.py` | Resolves Air Algérie's foreign destination cities to specific airports and coordinates. The city-to-airport decision is pinned in the script, one IATA per row, so it is reviewable; OurAirports supplies only the coordinate. |
| `foreign-endpoints.json` | Its output: 64 foreign endpoints across 37 countries. A **candidate** set, not a route list. |
| `soar.py` | Minimal MCP client for the Soar flight-search server (HTTP transport). |
| `probe_routes.py` | First probe. Superseded, kept because its flaws are instructive (see below). |
| `probe_week.py` | Full calendar-week probe with the great-circle duration check. |

## What is deliberately NOT here

Raw Soar/Duffel query responses. Those stay untracked in `.agents/flight-arcs/`.

Soar is a **hypothesis generator and frequency source only**. It is never written into
a record's `source_url`, and a route whose only evidence is a Soar query does not ship.
Which airport pairs an airline flies is a fact and not copyrightable, so no attribution
is owed, but a `source_url` has to point at something that actually verifies the claim,
and the provenance layer is this project's whole product. Committing a third party's
raw query output into a public repo is a different act from recording a fact we
verified elsewhere.

Every shipped arc therefore carries an independently citable source: the airline, an
airport operator, a regulator, or credible press.

## Method notes, learned the hard way

**`stops: 0` does not mean nonstop.** It means zero *connections*. A "direct" flight
keeps one flight number straight through a technical stop and arrives as a single
segment with `stops: 0`. On Wednesday 2026-08-12, `AH 2028` ALG→BUD reported one
segment, zero stops, and a duration of **4h40** against a ~1,500 km great circle that
flies in about 3h: it is the ALG→VIE→BUD routing. The same flight number BUD→ALG that
day is 3h00 and genuinely nonstop.

So every candidate leg gets a duration sanity check against
`great_circle_km / 800 kph + 30 min`, and anything past ~1.35× is treated as a probable
technical stop until shown otherwise. `probe_week.py` does this; `probe_routes.py` does
not, which is why it is superseded rather than deleted.

**Sweep a full calendar week.** The first probe used 2026-08-12 and 2026-11-18, which
are both Wednesdays. Much of this network is 1-2x weekly, so a Thu/Sat route was
invisible on both dates and every "no nonstop" result was uninformative rather than
negative.

**And a full week still is not conclusive.** A later sweep of Mon 10 to Sun 16 Aug found
`CZL-TLS` silent every day. The route runs `AH 1052` on Tuesdays and that week contained
Tuesday 11 August, so the sweep covered the operating day and returned nothing anyway.
`ORN-ETZ` behaves the same way: confirmed by Lorraine airport's own published 2026
schedule, silent to the probe. Read a silence as `unclear`, never as a negative.

**Other traps that have produced real errors:** a booking list is not a route; a
fare-sale window is not a route-operating window; an aircraft sighting is not a route
unless in revenue service; triangle rotations yield one-directional nonstops, so record
direction; French conditional framing ("devrait", "pourrait") is a plan and not an
operating route; advocacy by a local official is not a plan.

## Carrier codes

| Code | Carrier | Scope |
| --- | --- | --- |
| `AH` | Air Algérie | in scope |
| `SF` | Domestic Airlines (ex-Tassili, codes carried over unchanged) | out of scope for v1 |
| `5O` | ASL Airlines France | out of scope, operates nonstop ALG-CDG |
| `TO` | Transavia France | out of scope, operates TLM-ORY |
| `V7` | Volotea | out of scope, operates TLM-MRS |

Reading the carrier code off the leg is what settles operator attribution, rather than
inferring it from the absence of contrary press.

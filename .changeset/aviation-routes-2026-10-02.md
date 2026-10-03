---
"@geoalgeria/aviation": minor
---

Tripoli returns after ten years, Doha and Abuja are operating, and the triangles now carry their middle legs.

A verification pass dated 2 October 2026 works through Air Algérie's winter 2026-2027 programme. The package now carries **129 operating legs and 19 planned ones across 73 endpoints**, up from 126 and 16 across 72. `metadata.routes_as_of` moves to `2026-10-02`; treat the network as a dated snapshot, not an evergreen fact.

**New planned route: Tripoli, the first Libyan service since 2016.** Reservations are open and the first flight is Wednesday 28 October 2026, twice weekly on Wednesdays and Fridays, so `alg-mji` and `mji-alg` enter `plannedRoutes()` with the return leg citing the report that states its own direction. The airport is **Mitiga (`MJI`)**, which is what every report naming one names; Tripoli International (`TIP`) is a different field and is not carried. `MJI` joins the endpoint table with its French, English and Arabic names from Wikidata, coordinate-cross-checked at 1.0 km.

**Doha is an operating route.** Hamad International welcomed the first Air Algérie arrival on 30 September 2026, so `alg-doh` and `doh-alg` leave `plannedRoutes()` for `routes()` as `active`, three weekly on Sundays, Tuesdays and Fridays. The announced step-up to daily service on 25 October 2026 is a later snapshot's fact.

**Abuja's return leg was never planned, it was flying.** `abv-alg` shipped in `plannedRoutes()` on winter sale inventory, which reads as "announced, not yet operating". The route's own launch report dates the inaugural Nigeria flight to 6 April 2025 and gives that direction's Friday schedule, so the leg moves to `routes()` as `active`. The winter programme restructures it through Lagos from 29 October, which changes the routing and not whether the leg operates.

**Triangles now ship their middle legs.** `kwi-amm` (Kuwait to Amman), `abv-los` and `los-abv` (between Abuja and Lagos) are added as planned legs. Until now only the Algeria-touching legs of a rotation shipped, which drew a rotation with a hole in it: an aircraft left Algiers, reappeared at a third airport, and the leg that carried it there was missing. The scope line is amended in `research/_flight-routes/collection-rules.md` section 33. International-only and Air Algérie-only are unchanged, and a foreign-to-foreign leg still enters only through a rotation already in the dataset, never through a sweep.

**Moscow gains its return leg and a schedule, and stays planned.** `svo-alg` is added and `alg-svo` gains `days: ["mon", "wed", "fri"]` from a reported 2 October resumption at three weekly flights. Both stay planned deliberately: the report is written in the French conditional, a second report of the same date makes the resumption conditional on ticket sales opening, and nothing dated on or after the announced date reports a first flight. An announced date arriving is not an aircraft flying.

**Frequencies filled in.** Conakry gains `["tue", "thu", "sun"]` and Brazzaville `["mon", "wed", "sat"]`, both on the Algiers departures only, because that is the direction the published programme states. Shanghai was re-verified and deliberately left as it was: only the source already cited carries its flight numbers and per-direction days.

Every other announced route whose launch date is still ahead stays `planned`, however firm the announcement, and each flips only on a dated report that it flew. Full per-change evidence, including which sources could not be opened and what was deliberately left alone, is in `research/_flight-routes/verification-2026-10-02.md`.

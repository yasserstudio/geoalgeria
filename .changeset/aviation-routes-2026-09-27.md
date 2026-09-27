---
"@geoalgeria/aviation": minor
---

Batna flies to Orly, Berlin now operates, Kuwait and Amman are planned, Delhi is withdrawn and Dubai suspended.

A verification pass dated 27 September 2026 reworks five parts of Air Algérie's international network. The package now carries **126 operating legs and 16 planned ones across 72 endpoints**, the same 142 rows as 2.5.2 with a different and better-sourced shape. `metadata.routes_as_of` moves to `2026-09-27`; treat the network as a dated snapshot, not an evergreen fact.

**Batna's Paris service is at Orly, not Charles de Gaulle.** `blj-cdg` shipped as verified on a citation that named no airport, and the dispute had been open since July. Three independent flight-tracking aggregators place AH1120 and AH1121 at Paris-Orly and nothing current names CDG, so the pair is corrected to `blj-ory` and the missing `ory-blj` return leg ships on its own evidence, each direction citing its own route page. Consumers keying on the id `blj-cdg` will not find it any more, by design: it described the wrong airport.

**Berlin is an operating route.** The inaugural Algiers-Berlin rotation flew on Monday 14 September 2026 and the weekly nonstop is confirmed into the winter programme, so `alg-ber` and `ber-alg` leave `plannedRoutes()` for `routes()` as `active`. The winter schedule moves the weekly slot to Sunday on 25 October 2026, which a later snapshot will carry.

**New planned route: the Algiers-Kuwait-Amman-Algiers triangle**, one weekly Monday rotation from 26 October 2026, confirmed on the record by Algeria's ambassador to Kuwait. A triangle yields one-directional nonstops and only Algeria-touching legs are in scope, so it adds exactly two rows, `alg-kwi` and `amm-alg`, plus `KWI` (Kuwait International) as a new endpoint with its French, English and Arabic names. Nonstop `ALG-AMM` stays excluded: it is still flown by another carrier, and that exclusion was always about a leg rather than an endpoint.

**Delhi is gone.** Air Algérie withdrew the traffic-rights authorization request for the India route, reported 12 September 2026, so `alg-del` and `del-alg` are removed rather than restyled: `plannedRoutes()` is a claim that a route is coming. `DEL` is no longer among the shipped endpoints.

**Algiers-Dubai is suspended, not unclear.** A dated report states Air Algérie has not resumed the service, so `alg-dxb` carries `status: "suspended"` and that citation instead of reading as unchecked. The arc still ships: the network is described structurally, so a suspension dims a route and never deletes it. The wider Algeria-UAE picture is narrower than a blanket stop, Algeria closed its airspace to UAE-registered aircraft from 11 September 2026 with Emirati commercial flights to Algiers carved out until the end of 2026, and this record is about Air Algérie's own leg.

Full per-change evidence, including which sources could not be opened and what was deliberately left alone, is in `research/_flight-routes/verification-2026-09-27.md`.

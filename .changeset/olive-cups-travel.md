---
"@geoalgeria/aviation": minor
---

Air Algérie's nonstop route network, as data you can install.

`routes()` returns 70 directional legs; `plannedRoutes()` returns the announced-but-not-yet-flying ones; `routeEndpoints()` gives both ends of every arc, including the foreign airports `airports()` does not carry; `routesFrom(iata)` gives departures from one airport.

- **Directional, not pair-shaped.** `ALG->BUD` flies nonstop on Saturdays and `BUD->ALG` on Wednesdays, and there is never a same-day nonstop round trip, so they are two records and neither implies the other. A pair-shaped dataset would describe a route nobody can fly on a given day.
- **Every route carries an `evidence` tier.** `verified` means the operator was confirmed as *operating* the leg, with direction and a great-circle duration check. `listed` means a published source lists the carrier serving the pair, which claims *service* rather than operation. Both carry a `source` URL you can open; there are no uncited routes.
- **Codeshares are excluded, not marked.** A codeshare puts an airline's flight number on another airline's aircraft, so shipping one would make this file's central claim false. Screening the highest-risk pairs found five that had to go, including two (`ALG-JED`, `ALG-AMM`) with no Air Algérie leg at all, only Saudia and Royal Jordanian.
- **`routes.json` is a relation file, not a `GeoRecord` collection.** A route links two places rather than being one, so it has no `lat`/`lng`/`geo_precision`; forcing it into that shape would mean picking one end and calling it the record's location. It is excluded from `record_count` and `entities[]` for the same reason, and carries its own `routes` count in the metadata. The GeoJSON draws each route as a **great-circle LineString**, since a straight line in lng/lat space is the wrong path on a globe.

`@geoalgeria/aviation` now covers both halves of the domain: the airports, and what flies between them.

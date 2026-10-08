---
"@geoalgeria/aviation": minor
---

Air Algérie's route network grows to 157 nonstop legs, 29 of them now cited to the airport that publishes the service. Lyon, Metz-Nancy-Lorraine, Montpellier, Nantes, Strasbourg, Manchester, London Stansted and Rotterdam each carry their own page or press release as the source, replacing a Wikipedia article or a press piece about something else, and 20 more legs are planned.

Rome Fiumicino is back. It had been excluded as flown by ITA Airways on the strength of a booking probe that returned no Air Algérie flight, and that was a false negative: a trade filing lists the route for the whole summer 2026 window, before the exclusion was even written, and no source anywhere announces a Rome launch. `alg-fco` and `fco-alg` ship as operating.

Beirut is recorded as suspended in both directions, and Dubai's suspension is re-cited, both to APS's notice of 6 March 2026 naming Air Algérie's own suspension per city and in both directions. A suspension dims an arc and never deletes it, so all four rows stay in `routes()`.

Fourteen legs reach the `verified` tier, most of them the return direction of a long-haul pair that only had its outbound: Beijing both ways, Guangzhou and Kuala Lumpur inbound, Douala, Libreville and Luanda both ways, Montreal outbound. Douala's flight number is corrected from the retired triangle number AH 5350 to the point-to-point AH 5348, and Budapest's days are re-dated from a newer schedule filing: Algiers to Budapest moves to Thursday, and the leg home loses a day it was never published with.

N'Djamena joins `plannedRoutes()` for its 28 October 2026 launch. `metadata.routes_as_of` is 2026-10-09; the full per-pair record is `research/_flight-routes/verification-2026-10-09.md`.

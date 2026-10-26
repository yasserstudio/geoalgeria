---
"@geoalgeria/aviation": minor
---

Every route now ships `sources`, its citation list: an ordered, never-empty array
of plain urls, no url twice, whose first entry is the row's own `source`. The
single-citation field keeps its meaning and its value, and a reader gains the
rest of the provenance instead of losing it.

One row can rest on several documents, which is why the list exists. Air
Algérie's own statement of 24 October 2026 is the best evidence that Conakry,
Brazzaville, Lagos, Shanghai and Tripoli at Mitiga are coming, and when, and it
carries no flight number, no day name and no airport for Tripoli. It joins all
ten of those legs as an extra url, while each row's `source` stays the report
that covers the fields it ships. The statement alone moves nothing: a statement
that a line opens is an announcement, and a leg leaves `plannedRoutes()` only on
a dated report that the aircraft flew.

JSON and the GeoJSON `properties` carry the list as it is; the CSV, a flat table,
carries the urls space-separated in one column next to `source`, the same
encoding the `days` column uses. The decision is recorded in
`docs/adr/0002-per-row-citation-list-for-aviation-routes.md`.

Two of those legs now have that report, and they are the only rows this release
moves. **Algiers to Conakry** is operating: two Guinean outlets of 26 October 2026
have the inaugural aircraft on the tarmac at Ahmed Sékou Touré in the night of
Sunday 25 to Monday 26 October. **Algiers to Shanghai** is operating: APS, Algeria's
press agency, and a second report of 26 October carry the inaugural rotation's
departure from Houari Boumediene that day. Each promoted row cites the report of
the operation first and keeps the announcements behind it. The announced returns
from Conakry and Shanghai, Brazzaville, the Nigeria sectors, Tripoli and the
Kuwait-Amman rotation are all still `planned`, each because no dated report of its
first flight exists yet, never because anything says a line was cancelled.

The Kuwait rotation also gains the flight number and the two departure days the
AeroRoutes NW26 filing of 29 June 2026 states for it, `AH 4064` on all three legs
of one weekly Algiers-Kuwait-Amman-Algiers rotation. It stays `planned`: a filed
schedule is not an operation.

So the counts move by two: 159 nonstop legs and 18 planned ones, 177 rows as
before, no row added or removed. `metadata.routes_as_of` stays at 2026-10-09,
because this release re-read the six announced lines and not the winter schedule
the network turns over to on 25 October.

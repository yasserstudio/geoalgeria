---
"@geoalgeria/aviation": minor
---

Every route now ships `sources`, its citation list: an ordered, never-empty array
whose first entry is the row's own `source`, so the single-citation field keeps
its meaning and its value while the rest of the provenance becomes readable.
Each entry carries `url`, `publisher` in plain English, `date` (the publication
date, `YYYY-MM-DD`, read off the page's own byline, or `null` where no byline
could be read, usually because there is none, as on an airline's or an airport's
destination page) and `supports`, which names what it backs from the closed set
`route`, `status`, `dates`, `flight`, `days`. A row's flight
number and operating days are each backed by at least one entry that says so.

One row can rest on several documents, which is why the list exists. Air
Algérie's own statement of 24 October 2026 is the best evidence that Conakry,
Brazzaville, Lagos, Shanghai and Tripoli at Mitiga are coming, and when, and it
carries no flight number, no day name and no airport for Tripoli. It joins all
ten of those legs as an extra citation supporting the route and its dates, while
each row's `source` stays the report that covers the fields it ships. Every one
of them stays `planned`: a statement that a line opens is an announcement, and a
leg leaves `plannedRoutes()` only on a dated report that the aircraft flew.

JSON and the GeoJSON `properties` carry the list as it is; the CSV, a flat table,
carries the JSON array as a string in one column next to `source`. The decision
is recorded in `docs/adr/0002-per-row-citation-list-for-aviation-routes.md`.

No row is added, removed or otherwise changed: 157 nonstop legs and 20 planned
ones, as before, and `metadata.routes_as_of` stays at 2026-10-09, because this is
provenance and not a re-check of the schedule.

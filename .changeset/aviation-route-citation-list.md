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
that covers the fields it ships. Every one of them stays `planned`: a statement
that a line opens is an announcement, and a leg leaves `plannedRoutes()` only on
a dated report that the aircraft flew.

JSON and the GeoJSON `properties` carry the list as it is; the CSV, a flat table,
carries the urls space-separated in one column next to `source`, the same
encoding the `days` column uses. The decision is recorded in
`docs/adr/0002-per-row-citation-list-for-aviation-routes.md`.

No row is added, removed or otherwise changed: 157 nonstop legs and 20 planned
ones, as before, and `metadata.routes_as_of` stays at 2026-10-09, because this is
provenance and not a re-check of the schedule.

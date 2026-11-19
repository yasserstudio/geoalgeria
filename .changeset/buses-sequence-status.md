---
"@geoalgeria/buses": minor
---

**Stop order now says how far it can be trusted.** `sequence_status` on each Direction and each Station Membership used to be `osm_member_order_unvalidated` everywhere. It now carries the verdict of geometric checks that compare the OpenStreetMap member order with the Direction's drawn path (Stations near the path, in order along it, the first and last near its ends, and no gap in the path), under `docs/adr/0003`:

- `osm_member_order_consistent` – 36 Directions (633 Memberships) pass every check.
- `osm_member_order_inconsistent` – 69 Directions (2,047 Memberships) fail at least one. They are still published, flagged rather than withheld.
- `osm_member_order_unvalidated` – 23 Directions (2 Memberships) have fewer than two Stations, so there is no order to check. The value keeps its meaning.

A Membership always carries its Direction's status. Consistent means the OSM order agrees with the OSM path, not that an Operator confirmed it: no value here claims passenger stop order. The detailed check results stay in the repository (`research/buses/qa/report.json`), not in the package. `SequenceStatus` in the TypeScript types gains the two new values. **If you `switch` over `sequence_status` exhaustively, add a `default` branch**: a later minor release may add `operator_sequence`, for order taken from an Operator's own published stop list.

**OpenStreetMap data refreshed to the 2026-11-19 pull.** The same 76 shapes and 128 Directions ship, and 49 shapes are redrawn to follow mappers' edits. Stations go from 1,603 to 1,599: `osm-node-10035219305`, `osm-node-10035232567` and `osm-node-10035252951` were deleted in OpenStreetMap and `osm-node-10751048813` is no longer tagged as a stop. 382 Stations gain a `name_fr`. Memberships go from 2,685 to 2,682.

**Membership ids are positional.** A Membership id is its Direction plus the member's index in the OpenStreetMap relation, so when mappers add or remove members the same id can name a different stop: 471 ids now point to a different Station and 21 no longer exist. `source_sequence` is positional too: 170 `direction_id` + `source_sequence` pairs now point to a different Station. No combination of Membership fields stays a stable key across OpenStreetMap refreshes. `direction_id` + `station_id` is the steadiest, but loop Directions repeat a Station (11 duplicate pairs), so pair it with `source_sequence` for order and expect to re-key after each refresh.

**Each Line says when its Operator last confirmed it.** Every Line, and its shape (so map features carry it), gains `last_confirmed` (`string | null`, also in `csv/lines.csv`, `BusLine` and `BusShape`): the date of the official Operator source that states the Line. That is the document's own date when it carries one (Sétif 2026-05-26, Laghouat 2026-07-09), otherwise the day it was read or supplied. 107 Lines are dated. The other 77 (76 ETUSA, 1 Mostaganem) are `null`: only Wikipedia or OpenStreetMap name them, so no official Operator source dates them. A null does not mean the Line stopped running. OpenStreetMap refreshes never set or move the date.

A Line has no status field of its own: read it from its Directions. A Line with no Direction (108 of 184) has no geometry yet; the README explains how to derive the rest.

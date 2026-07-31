---
"@geoalgeria/ooredoo": patch
---

Reconcile every store against Ooredoo's own declared wilaya, and correct the five
whose API coordinate is wrong.

The locator API ships each store with a declared wilaya and commune alongside the
coordinate. This package derives `wilaya_code`/`commune` from the coordinate
instead, because the API still files stores under the old 48-wilaya scheme, and
keeps the operator's declaration in `operator_wilaya`. Joining the 572 shipped
records back to the raw pull, 33 disagreed. 25 of those are the wilaya reform and
are correct as shipped: a Timimoun store is tagged Adrar, Ouled Djellal is tagged
Biskra, Bou Saada is tagged M'sila, and so on for every wilaya created in 2019 or
by Decree 26-206.

Of the remaining 8, five have a coordinate that contradicts both the declared
wilaya and the store's own name and address, and are now pinned to their commune's
point (`geo_precision: "approximate"`, `geo_method: "commune_centroid"`):

- `31-001` (ESO000810, "CTE.SEFSSAFA") declared Batna / Sefiane. Its coordinate,
  lat 36.2477 / lng -0.634848, is in the Mediterranean about 50 km off the Oran
  coast. It is the longitude of the adjacent record ESO000811 ("ACHAACHA CENTRE",
  36.2477 / +0.63486) with the sign flipped, so the field is a copy of its
  neighbour rather than a measurement. Now Sefiane, Batna. This supersedes the pin
  to Sidi Ben Yebka (Oran) in the previous unpublished changeset, which followed
  the bad coordinate instead of the declaration.
- `16-001` ("EO TIZI OUZOU 2", address "TIZI OUZOU") declared Tizi Ouzou. Its
  coordinate is central Algiers, 111 km away. Now Tizi Ouzou.
- `16-052` ("EO BEJAIA", address "24, Ch des Cretes - BEJAIA") declared Bejaia. Its
  coordinate is Algiers airport, 0.4 km from "EO AEROPORT INTERNATIONAL". Now
  Bejaia.
- `48-001` ("EO PLATEAU", address "ORAN") declared Oran. Its longitude sign is
  flipped: +0.6983 put it in Relizane, -0.6983 lands in Oran. Now Oran.
- `67-002` ("EO BOUMERDES", address "BOUMERDES") declared Boumerdes. Its latitude
  is exactly one degree south of Boumerdes. Now Boumerdes.

Ids are unchanged. The public `{wilaya}-{seq}` id is assigned before the
correction runs and is never rewritten, so no deep link breaks; the consequence is
that on those five records the id prefix is the wilaya the bad point fell in, not
`wilaya_code`. The id was always meant to be opaque and this is now stated in the
type declaration and the READMEs.

The remaining 3 (`16-039`, `20-003`, `31-002`) are left exactly as shipped. Their
coordinates are real points near a wilaya boundary, and the wilaya outlines put
all three inside the wilaya Ooredoo declares while the nearest-centroid join filed
them one wilaya over. That is a defect in how this package derives the wilaya, not
a bad coordinate, and moving them by pinning a commune would throw away a good
operator point. They are the 3 records the geo-in-boundary gate already reports as
outside their declared wilaya.

Metadata: `precision` moves from 552 exact / 20 approximate to 548 / 24, and the
`coverage_note` now states how many records carry an operator coordinate, how many
are commune pins and why, and that 3 records have a derived wilaya the outlines
disagree with. Record count, bbox, wilaya coverage, dates and every other record
are unchanged. The correction still lives in `COORD_FIX` in `scripts/fetch.mjs`,
keyed by Ooredoo's own store id, so a live re-fetch cannot reimport a bad point and
the build fails if any of those store ids disappears upstream.

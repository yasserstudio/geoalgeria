# The rounded-placeholder sweep (private tracker #288)

`candidates.json` is the committed snapshot behind the sweep of the 15 records that
claimed `geo_precision: "exact"` on a **rounded placeholder** (CONTEXT.md), the 15
that `test/arcminute-exact.test.mjs` allow-listed when PR #285 added the guard. One
entry per record: the published point, the Wikidata P625 statement with its own
declared `precision`, the OpenStreetMap objects found near it with their tags, and a
verdict with its evidence URLs and check dates.

## What the sweep decided

**All 15 keep their point and lose the `exact` claim.** Eleven have no citable source
of their own: the published value is a verbatim copy of an unreferenced Wikidata
P625, most of them from a 2018 bulk GEOnet Names Server import whose "1 arcsecond"
precision is that gazetteer's default flag and not a survey, and no OpenStreetMap
object for the same facility was found near them. Demoting needs no evidence of
absence: it drops a claim the coordinate's own resolution disproves.

Two findings worth keeping:

- `historic-487` (Mosquée Abdallah Ibn Salam) **is not a rounded placeholder**. OSM
  way 237164994 is a genuine four-node building footprint whose node average is
  35.7000268, -0.6500225, about a metre from the published point, so its landing
  within 0.003' of the grid on both axes is the coincidence the rule's false-positive
  rate predicts. It is still `approximate`, for the other reason: an area gives a
  centroid, never a per-facility point.
- `01392` (formation-professionnelle) carries three separate defects that are not
  this ticket's: `wilaya_code` 48 with a commune, السانية / Es Senia, that belongs to
  wilaya 31, an address in Bir El Djir (Oran) that agrees with neither, and a
  longitude whose sign would have to flip for Oran. No source was found to place it,
  so only the precision claim was corrected here. **Settled in #301**: all three are
  one defect, and it is 33 records wide, not one. The portal names the publishing
  directorate on every row, and 01392's is Oran's (`IDDFEP` 31, `IDCommunn` 3105,
  `CodeEtsWilaya` 31641); 32 further Oran rows ship the same unsigned longitude, and
  the builder stamped each one's `wilaya_code` from that coordinate, so the
  attribution agreed with the defect and no containment check could see it. The
  builder now restores the sign when mirroring the axis carries the point into the
  wilaya that published the row, and 01392, whose pair is a whole-arcminute
  placeholder whose mirror falls in the bay of Oran, takes its commune's centroid
  like every other row the portal left unplaced.

## The four candidates this run did NOT act on, and where they now stand

OpenStreetMap does hold an object for four of the records. None of the four moved,
and each is a Review-queue candidate rather than a correction, under ADR 0001:

| record | OSM object | distance | why it was not applied |
| --- | --- | --- | --- |
| `historic-91` Rapidum | node 1212738075 `historic=ruins` `name=Rapidium` | 1.055 km | ADR 0001 rules 3 and 4: the published point is Wikidata's to the metre, so it is a Copied claim and casts no Vote, which leaves the OSM node with no independent Vote at all. Plain-or-no consensus goes to the Review queue, not into a release. |
| `park-25` Belezma | way 324041581 | 3.369 km | A national park is an area: both the published point and the centroid are `approximate`, so the move buys no precision and only churns a published coordinate. |
| `park-29` Djurdjura | way 522229283 | 2.858 km | As above. |
| `park-31` El Kala | relation 5424406 (Wikidata P402 confirms the same object) | 8.151 km | As above. |

**Measured again in #301, and all four stay QUEUED: no action taken.** Each object
was re-read from `api.openstreetmap.org` on 2026-10-27 and is still the same place
under the same tags (the node is version 1 of 2011 and has never been edited; each
park area still carries the record's own `wikidata` QID), and each was run through
`scripts/review/votes.mjs` rather than judged by hand. The engine settles none of
them, and under ADR 0001 rule 5 a queued row keeps its published point until the
Owner rules on it through the review page, so nothing here is closed and nothing
was changed. `review-2026-10-27.json` holds the Candidates, the Claims, the
engine's own answer and the measurement per record, as evidence for the queue
rather than a verdict on it, and `test/arcminute-288-review.test.mjs` re-derives
every outcome from that file.

The reading the sweep's table did not make: for `historic-91` the node is 1.055 km
from the published point, which is inside the 2 km agreement radius, so the two are
one Answer and the published point is the Candidate that Answer ships. The node
confirms the published value instead of replacing it, which is why there is nothing
to move even before the Vote count is reached. For the three parks the centroid is
2.9 to 8.2 km out, so no Claim reaches any Candidate at all and no Candidate takes a
single Vote.

## Method note, and its limit

Overpass was unavailable from the machine that ran this (both public mirrors timed
out, `overpass.openstreetmap.fr` answered 403 "white-listed usages only"), so the
geographic search used `api.openstreetmap.org/api/0.6/map?bbox=`, which returns every
tag of every object in a box and so still searches over all tag values rather than
the `name` tag alone, which is the search bug #285 fixed. That endpoint caps at
50,000 nodes, so a dense box had to be smaller: the radius actually searched is
recorded per record and runs from about 1.1 km around Bouira and Khraissia to about
22 km in the Sahara. A "nothing found" verdict is therefore weaker in a city than in
the desert, which does not weaken any of the 15 demotions and is why no absence is
claimed as a fact anywhere in the file.

---
"geoalgeria": patch
---

Five wilaya capital commune centres corrected from OpenStreetMap, Biskra to Beni-Abbes.

Each of these five communes is a wilaya **chef-lieu**, and each sat 3 to 6 km from the seat of the town it is the capital of:

| Code | Commune | Wilaya | was | now | moved | decided by |
| --- | --- | --- | --- | --- | --- | --- |
| 701 | Biskra | 7 | `5.751048, 34.8` | `5.729074, 34.850882` | 6,003 m | OSM `admin_centre` node |
| 717 | El Kantara | 61 | `5.666831, 35.192365` | `5.709284, 35.223115` | 5,154 m | OSM `admin_centre` node |
| 2501 | Constantine | 25 | `6.642433, 36.365` | `6.608428, 36.364164` | 3,046 m | OSM `admin_centre` node |
| 3201 | El Bayadh | 32 | `1.020278, 33.721667` | `1.018245, 33.684319` | 4,157 m | OSM `admin_centre` node |
| 5201 | Beni-Abbes | 52 | `-2.17, 30.08` | `-2.169031, 30.131743` | 5,754 m | OSM `admin_centre` node, owner-confirmed |

**Every published value is the open one.** All five are the commune's own OpenStreetMap `admin_centre` node, so all five are **ODbL 1.0, (c) OpenStreetMap contributors** and all five count toward the carve-out. Beni-Abbes was raised by the project owner off a proprietary map, and under the rule set the same day that reading may only **confirm** an open source, within 500 m, with the open coordinate shipping. Its reading agrees with the node to 268 m, so the node is what is published and the reading sits in the row as `owner_confirmation`, never as the value. Every row states its source in `decided_by`, and `test/osm-derived-centre-count.test.mjs` reads that field rather than counting ledger rows, so a row that ever ships a non-open value drops out of the carve-out instead of being counted by default.

**Neither guard this package already has could see them.** All five stored centres were *inside* their own commune the whole time, so containment, which is the standing guard since 2.1.2, is blind to them: that is the class issue #167 found by hand in Bethioua. And a seat delta on its own is not a defect, by the decision taken with that guard: the 2026-09-29 audit measured a median disagreement with the `admin_centre` node of 402 m over all 1,537 compared rows, before its own corrections, and a delta says two hand-placed claims about one town disagree, not which one is wrong. **132 non-capital centres are still more than 3 km from their seat and none of them changes here.**

**What makes a capital decidable is that two further claims exist about the same town, and neither is where the correction comes from.** The wilaya's own published point comes from its OpenStreetMap `admin_level=4` relation, a different object from the commune's `admin_level=8` `admin_centre` node. And the `geo_precision: exact` records other packages place inside this commune's own OpenStreetMap outline, selected by point-in-polygon rather than by the commune they name, are hundreds of independently surveyed buildings: pharmacies, schools, mosques, post offices, bank branches. Both put the town at the node:

| Commune | wilaya point to old / new | exact-record median to old / new (n) |
| --- | --- | --- |
| Biskra (701) | 5,799 / 371 m | 5,903 / 348 m (264) |
| El Kantara (717) | 4,789 / 731 m | 5,137 / 211 m (40) |
| Constantine (2501) | 4,150 / 1,746 m | 2,493 / 1,535 m (529) |
| El Bayadh (3201) | 4,602 / 487 m | 4,791 / 730 m (164) |
| Beni-Abbes (5201) | 6,735 / 8,786 m (fails) | 5,628 / 139 m (40) |

Over all 69 capitals that two-claim criterion selects exactly four, and **Beni-Abbes is not one of them**: its wilaya-point leg argues the wrong way, because the wilaya 52 point is 6,735 m from the repudiated centre and 8,786 m from the corrected one. That point is itself about 8.8 km from its capital's town centre, which belongs to #228 and is reported, not changed here.

**So Beni-Abbes was raised by the owner and evidenced by two sources its value does not come from.** The exact-record median of 40 buildings over 16 files is **139 m** from the published node against 5,628 m from the repudiated centre, and the owner's own independent reading is **268 m** from it against 5,690 m. 268 m is inside the 500 m at which two hands stop reading the same place, so the reading and the node are one claim about one town centre; and because it is 5,690 m from the value being repudiated, it corroborates the move rather than merely labelling it. The node ([1573488063](https://www.openstreetmap.org/node/1573488063)) was re-read live on 2026-10-01 and is stored in the row, so every check re-runs offline.

Every row carries its source in `research/_commune-centres/corrections-2026-10-01.json`: its `decided_by`, the OSM relation id, the `admin_centre` node id and that node's own coordinate, the relation's `ref:ONS` and `wikidata`, the Overpass `timestamp_osm_base` (2026-09-29T12:54:47Z), and every independent measurement taken against both the repudiated and the corrected value. All five `admin_centre` nodes were **re-read from the OpenStreetMap node API on 2026-10-01** before anything was written, so each published number was confirmed against the live node and not only against a committed capture. Values are rounded to 6 decimals, the package's resolution, and all five representations change together (`communes_w*.json`, `algeria.json`, `geojson/communes.geojson`, `csv/communes.csv`, `sql/full.sql`).

**The licence carve-out grows with them.** 56 + 189 + 5 from an `admin_centre` node, plus the 6 relation centroids of 2.1.0, is **256 OpenStreetMap-derived commune centres**, so `LICENSE`, `NOTICE`, `dataset-metadata.json`, `data/geojson/communes.metadata.json`, `data/geojson/wilaya-boundaries.metadata.json`, `llms.txt`, `data/README.md`, `index.json` and the READMEs in all three locales now say 256, and 1,285 for the centres that carry no recorded source and over which no ODbL claim is made. `test/osm-derived-centre-count.test.mjs` derives that number from the three ledgers and the shipped data rather than trusting the prose.

The new guard is `test/capital-centre-near-seat.test.mjs`, which fetches nothing. For each of the five it holds all seven carriers to the ledger value, tests the value against the commune outline, and asserts every claim that applies to that row **in both directions**: the corrected centre inside an absolute 2 km ceiling and the repudiated one outside it. A test that only checked the new value would have passed on the old one for three of the four. Which claims apply is read from the row itself, so Beni-Abbes is held to the facility median and to the 500 m confirmation ceiling, and its failing wilaya-point leg is asserted as a failure the ledger has to admit rather than quietly left out. The ledger-shape test refuses any row whose published value is not its own `admin_centre` node, which is how the confirmation rule is enforced rather than remembered. The file also replays the selection over all 69 capitals and requires that it picks exactly the four node-decided rows and excludes Beni-Abbes.

Refs yasserstudio/geoalgeria.com#236.

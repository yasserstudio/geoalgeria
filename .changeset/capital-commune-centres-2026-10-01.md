---
"geoalgeria": patch
---

Four wilaya capital commune centres corrected from OpenStreetMap: Biskra, El Kantara, Constantine and El Bayadh.

Each of these four communes is a wilaya **chef-lieu**, and each sat 3 to 6 km from the seat of the town it is the capital of:

| Code | Commune | Wilaya | was | now | moved |
| --- | --- | --- | --- | --- | --- |
| 701 | Biskra | 7 | `5.751048, 34.8` | `5.729074, 34.850882` | 6,003 m |
| 717 | El Kantara | 61 | `5.666831, 35.192365` | `5.709284, 35.223115` | 5,154 m |
| 2501 | Constantine | 25 | `6.642433, 36.365` | `6.608428, 36.364164` | 3,046 m |
| 3201 | El Bayadh | 32 | `1.020278, 33.721667` | `1.018245, 33.684319` | 4,157 m |

**Neither guard this package already has could see them.** All four stored centres were *inside* their own commune the whole time, so containment, which is the standing guard since 2.1.2, is blind to them: that is the class issue #167 found by hand in Bethioua. And a seat delta on its own is not a defect, by the decision taken with that guard: the 2026-09-29 audit measured a median disagreement with the `admin_centre` node of 402 m over all 1,537 compared rows, before its own corrections, and a delta says two hand-placed claims about one town disagree, not which one is wrong. **132 non-capital centres are still more than 3 km from their seat and none of them changes here.**

**What makes a capital decidable is that two further claims exist about the same town, and neither is where the correction comes from.** The wilaya's own published point comes from its OpenStreetMap `admin_level=4` relation, a different object from the commune's `admin_level=8` `admin_centre` node. And the `geo_precision: exact` records other packages place inside this commune's own OpenStreetMap outline, selected by point-in-polygon rather than by the commune they name, are hundreds of independently surveyed buildings: pharmacies, schools, mosques, post offices, bank branches. Both put the town at the node:

| Commune | wilaya point to old / new | exact-record median to old / new (n) |
| --- | --- | --- |
| Biskra (701) | 5,799 / 371 m | 5,903 / 348 m (264) |
| El Kantara (717) | 4,789 / 731 m | 5,137 / 211 m (40) |
| Constantine (2501) | 4,150 / 1,746 m | 2,493 / 1,535 m (529) |
| El Bayadh (3201) | 4,602 / 487 m | 4,791 / 730 m (164) |

Over all 69 capitals that selects exactly these four. The only other capital more than 3 km from its node is **Beni-Abbes (5201)**, where the two claims disagree: its wilaya point is 8.8 km from the node and 6.7 km from the stored centre. It is left alone rather than corrected on one claim.

Every row carries its source in `research/_commune-centres/corrections-2026-10-01.json`: the OSM relation id, the `admin_centre` node id, the relation's `ref:ONS` and `wikidata`, the Overpass `timestamp_osm_base` (2026-09-29T12:54:47Z) and both independent measurements. Each of the four nodes was **re-read from the OpenStreetMap node API on 2026-10-01** before the value was written, so the published number was confirmed against the live node and not only against a committed capture. New values are the node rounded to 6 decimals, and all five representations change together (`communes_w*.json`, `algeria.json`, `geojson/communes.geojson`, `csv/communes.csv`, `sql/full.sql`).

**The licence carve-out grows with them.** 56 + 189 + 4 from an `admin_centre` node, plus the 6 relation centroids of 2.1.0, is **255 OpenStreetMap-derived commune centres**, so `LICENSE`, `NOTICE`, `dataset-metadata.json`, `data/geojson/communes.metadata.json`, `data/README.md` and the READMEs in all three locales now say 255, and 1,286 for the centres that carry no recorded source and over which no ODbL claim is made. `test/osm-derived-centre-count.test.mjs` derives that number from the three ledgers and the shipped data rather than trusting the prose.

The new guard is `test/capital-centre-near-seat.test.mjs`, which fetches nothing. For each of the four it holds all seven carriers to the ledger value, tests the value against the commune outline, and asserts both independent claims **in both directions**: the corrected centre inside an absolute 2 km ceiling and the repudiated one outside it. A test that only checked the new value would have passed on the old one for three of the four.

Refs yasserstudio/geoalgeria.com#236.

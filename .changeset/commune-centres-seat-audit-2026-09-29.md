---
"geoalgeria": patch
---

174 more commune centres corrected from OpenStreetMap, and the standing guard becomes containment.

2.1.1 corrected 56 centres, and said in the same breath what it could not see: a sweep against the 69 wilaya polygons can only find a centre that leaves its own wilaya, and 68 was all it could nominate. So every one of the **1,541** centres was compared with the `admin_centre` (chef-lieu) node of its own OpenStreetMap `admin_level=8` relation, and then tested against that relation's unsimplified boundary. 1,537 matched a relation; the four that do not exist in OpenStreetMap at all are Souk Oufella (630), Bir Touta (1634), Collo (2110) and Dhayet Bendhahoua (4703).

**215 stored centres were outside their own commune**, which no rule here could have found: the wilaya outlines are simplified to a 3.4 km median vertex gap and a wilaya is enormous, so a centre can be tens of kilometres from its own town, in the wrong commune, and still sit comfortably inside the right wilaya.

**174 of them move**, every one meeting the 2026-09-27 standard in full: the stored point is outside the commune's own boundary, that relation's `admin_centre` node is inside it, inside the declared wilaya, and carries the commune's own name. The largest are Sidi Slimane (3221) 108.7 km, Akabli (119) 107.9 km, Ouled Ahmed Timmi (121) 55.8 km, Tamest (102) 50.6 km and Tit (106) 47.2 km. Wilaya 1 (Adrar) is a recognisable class on its own: Ouled Ahmed Timmi and Tamest held a **positive** longitude where the chef-lieu is west of Greenwich, and Tit held Timekten's longitude to four decimals. Others keep their latitude exactly and lose only the longitude, or the reverse, which is the bad name-based join this project has diagnosed before.

Every row carries its own source in `research/_commune-centres/corrections-2026-09-29.json`: the OSM relation id, the `admin_centre` node id, the relation's `ref:ONS`, the Overpass `timestamp_osm_base` (2026-09-29T12:54:47Z) and the four containment verdicts that decided it. New values are the node coordinate rounded to 6 decimals, the package's existing resolution, and all five representations change together (`communes_w*.json`, `algeria.json`, `geojson/communes.geojson`, `csv/communes.csv`, `sql/full.sql`).

**The licence carve-out grows with them.** 56 + 174 + the 6 relation centroids of 2.1.0 is **236 OpenStreetMap-derived commune centres**, so `LICENSE`, `NOTICE`, `dataset-metadata.json`, `data/geojson/communes.metadata.json`, `data/geojson/wilaya-boundaries.metadata.json`, `data/README.md`, `llms.txt` and the READMEs in all three locales now say 236, and 1,305 for the centres that carry no recorded source and over which no ODbL claim is made. The package stays `MIT AND ODbL-1.0`.

**The standing guard changed rule, not just threshold.** The 1 km seat-distance guard that shipped with 2.1.1 needed 496 pinned exceptions, because it was not measuring an error: our centre and the OSM node are two hand-placed claims about one town and the median disagreement is 402 m. It is replaced by containment: **every commune centre must lie inside its own commune**, in all five representations, with 41 documented exceptions (each a centre still outside its commune on incomplete evidence, with which of the four evidence tests it fails) and 4 communes that have no usable OpenStreetMap geometry to be inside of. The commune outlines are a committed, reduced file rather than a live query, and the reduction is proved: the build refuses to write unless all 1,541 verdicts match the verdict from the unsimplified geometry. The distance to the seat survives as a report, `research/_commune-centres/seat-distance-2026-09-29.md`.

Refs yasserstudio/geoalgeria.com#170.

---
"@geoalgeria/tourisme": minor
---

**Migration.** Five park records leave the package because each one duplicated a national park the package already ships from OpenStreetMap. Their ids are retired for good and forward to the record that carries the park, in the `migrations` map of `packages/tourisme/data/retired-ids.json`: `park-25` to `park-2` (Belezma), `park-26` to `park-7` (Gouraya), `park-27` to `park-3` (Chréa), `park-29` to `park-6` (Djurdjura) and `park-31` to `park-1` (El Kala). If you hold one of the old ids, follow `merged_into`.

**Why.** Each park came in twice: once as its OpenStreetMap boundary, with a measured point, and once as its Wikidata item, with a degree-minute point 0.7 to 7.7 km from the boundary's centre. Owner decision of 2026-10-29: the Wikidata copy merges into the OpenStreetMap record. The merge lives in `packages/tourisme/scripts/build.mjs` (`MERGED_WIKIDATA`), keyed on the Wikidata item, so a rebuild keeps it. Each OpenStreetMap record now also carries the Wikidata item in `refs.wikidata`.

**One cave now exact.** `attraction-842` (grotte du Macchabée, Tizi Ouzou) moves 199 m, from the degree-minute Wikidata point (36.5, 4.3333333) to the cave entrance OpenStreetMap maps as node 3832451091 (36.4990808, 4.3314177), and ships `exact` / `osm`. Two independent sources place it there (ADR 0001): that node and the Wikidata item Q23805261. The correction is recorded in `quality/overrides/tourisme.json` with both sources as its evidence, and the record carries `review_status: "corrected"`.

**Two thermal springs now exact.** `thermal-spring-61` (Hammam Beni Salah) and `thermal-spring-64` (Hammam Zatout), both El Tarf, leave ASAL's two-decimal points for the OpenStreetMap node named after each spring (nodes 1291639449 and 5579190621), 118 m and 468 m away; one open source each, recorded in `quality/overrides/tourisme.json`.

Counts: 4,321 records, down from 4,326; parks 27 from 32. Precision: 4,286 exact, 35 approximate.

---
"@geoalgeria/ferroviaire": minor
---

**Migration.** `16-029` ("Berraki - Le Jardin", OpenStreetMap node 12942126787) leaves the package because it was a second record of the future metro station `16-044` (Jardin, Wikidata Q138494132). Its id is retired for good and forwards to `16-044` in the `migrations` map of `packages/ferroviaire/data/retired-ids.json`, which this package did not have before. `16-044` now carries both ids (`refs.wikidata` and `refs.osm`). If you hold `16-029`, follow `merged_into`.

**Seven stations now exact.** A station merged from Wikidata and OpenStreetMap kept the Wikidata coordinate, and for these it was rounded or shared with a neighbour. Each now ships its own OpenStreetMap object, read from the OpenStreetMap API at a recorded version (`REVIEWED_POINT` in `scripts/fetch.mjs`): `13-010` Souani (way 305835618, which also joins `refs.osm`), `16-040` Mohamed Belarbi, `16-044` Jardin, `31-013` Es Senia, `31-014` Arzew, `45-016` Aïn El Hadjadi and `46-005` Aïn Témouchent. Most move a few metres; Jardin moves 1.3 km, because its Wikidata point was Mohamed Belarbi's to the metre.

**Two OSM links corrected** (`OSM_MATCH_FIX`). Node 9358330035 is Aïn El Hadjadi, but the 150 m merge had linked it to `45-015` Rouïba, whose Wikidata point is a copy of Aïn El Hadjadi's; it now links to `45-016`, and `45-015` loses its `refs.osm`. Rouïba (the Moghrar line halt, not the Algiers station) keeps the copied point and ships `approximate` on purpose. Node 12942126787 now merges into Jardin, as above. The build now stops if one OpenStreetMap object is carried by two records.

Counts: 691 stations from 692, metro 40 from 41. Precision: 689 exact, 2 approximate.

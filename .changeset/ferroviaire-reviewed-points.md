---
"@geoalgeria/ferroviaire": patch
---

**Seven stations now exact.** A station merged from Wikidata and OpenStreetMap kept the Wikidata coordinate, and for these it was rounded or shared with a neighbour. Each now ships its own OpenStreetMap object, read from the OpenStreetMap API at a recorded version (`REVIEWED_POINT` in `scripts/fetch.mjs`): `13-010` Souani (way 305835618, which also joins `refs.osm`), `16-040` Mohamed Belarbi, `16-044` Jardin, `31-013` Es Senia, `31-014` Arzew, `45-016` Aïn El Hadjadi and `46-005` Aïn Témouchent. Most move a few metres; Jardin moves 1.3 km, because its Wikidata point was Mohamed Belarbi's to the metre and OpenStreetMap maps it as its own future line 1 station.

**One OSM link corrected.** OpenStreetMap node 9358330035 is Aïn El Hadjadi, but the 150 m merge had linked it to `45-015` Rouïba, whose Wikidata point is a copy of Aïn El Hadjadi's. The node now links to `45-016`, and `45-015` loses its `refs.osm`. Rouïba (the Moghrar line halt, not the Algiers station) keeps the copied point and ships `approximate` on purpose. Precision: 690 exact, 2 approximate.

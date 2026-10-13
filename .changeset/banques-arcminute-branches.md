---
"@geoalgeria/banques": patch
---

Six bank branches are re-placed off a rounded placeholder.

AGB Laghouat shipped 33.58333, 2.66667, which is 33°35'N 2°40'E written as a decimal: a whole-arcminute cell about 30.9 km southwest of the street its own address names, and it claimed `geo_precision: "exact"`. Five more branches carried the same kind of value: AGB Constantine, AGB Tébessa, BADR Kenadsa, BADR Taghit and BADR Aïn Témouchent.

Four now carry a reviewed OpenStreetMap point for the same bank in the same commune: AGB Constantine, BADR Kenadsa and BADR Aïn Témouchent are `exact` on the branch's own node, AGB Tébessa `approximate` on its building outline. AGB Laghouat and BADR Taghit have no OpenStreetMap object of their bank within 25 km, so they carry their commune's centre as `approximate` with `geo_method: "commune_centroid"`, which is a new value for this package's `GeoMethod` type. All six now publish `commune_code` and `commune`, which were null, plus their review evidence URLs.

`geo_precision` moves from 1,161 `exact` / 164 `approximate` to 1,160 / 165, and the ODbL attribution now covers twelve reviewed OpenStreetMap coordinates rather than eight. Nothing else changes: still 1,704 branches, 1,325 of them geocoded.

Reported as yasserstudio/geoalgeria#267.

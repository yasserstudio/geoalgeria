---
"@geoalgeria/banques": patch
---

Six bank branches are re-placed off a degrees-and-minutes placeholder.

AGB Laghouat shipped 33.58333, 2.66667, which is 33°35'N 2°40'E written as a decimal: a whole-arcminute cell about 30 km southwest of the street its own address names, and it claimed `geo_precision: "exact"`. Five more branches carried the same kind of value: AGB Constantine, AGB Tébessa, BADR Kenadsa, BADR Taghit and BADR Aïn Témouchent.

AGB Tébessa, BADR Kenadsa and BADR Aïn Témouchent now carry a reviewed OpenStreetMap point for the same bank in the same commune, two of them `exact` on the branch's own node and one `approximate` on the building outline. AGB Laghouat, AGB Constantine and BADR Taghit have no OpenStreetMap object of their bank to match, so they carry their commune's centre as `approximate` with `geo_method: "commune_centroid"`, which is a new value for this package's `GeoMethod` type. All six now publish `commune_code` and `commune`, which were null, plus their review evidence URLs.

Reported as yasserstudio/geoalgeria#267. No count changes: still 1,704 branches, 1,325 of them geocoded.

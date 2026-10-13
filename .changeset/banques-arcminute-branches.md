---
"@geoalgeria/banques": minor
---

Branch records widen their types, and six branches are re-placed off a rounded placeholder.

**Read this first if you type the branch records.** Two fields and one union change shape, so a caret-range upgrade can need a code change:

- `Branch.commune_code` and `Branch.commune` go from `null` to `string | null`. They were null on every branch because bank locators publish no commune; six branches now carry a real ONS code and commune name. A validator asserting null, or a type narrowing on it, has to widen.
- `GeoMethod` gains `"commune_centroid"`, alongside `"bank_locator"`, `"osm_node"` and `"osm_way"`. An exhaustive switch over it gains a case.

Nothing is renamed or removed, and no existing value changes meaning.

**Why the six moved.** AGB Laghouat shipped 33.58333, 2.66667, which is 33°35'N 2°40'E written as a decimal: a whole-arcminute cell about 30.9 km southwest of the street its own address names, and it claimed `geo_precision: "exact"`. Five more branches carried the same kind of value: AGB Constantine, AGB Tébessa, BADR Kenadsa, BADR Taghit and BADR Aïn Témouchent.

Four now carry a reviewed OpenStreetMap point for the same bank in the same commune: AGB Constantine, BADR Kenadsa and BADR Aïn Témouchent are `exact` on the branch's own node, AGB Tébessa `approximate` on its building outline. AGB Laghouat and BADR Taghit have no OpenStreetMap object of their bank within 25 km, so they carry their commune's centre as `approximate` with `geo_method: "commune_centroid"`. All six publish their review evidence URLs.

`geo_precision` moves from 1,161 `exact` / 164 `approximate` to 1,160 / 165, and the ODbL attribution now covers twelve reviewed OpenStreetMap coordinates rather than eight. The record set itself is unchanged: still 1,704 branches, 1,325 of them geocoded, no id added or retired.

Reported as yasserstudio/geoalgeria#267.

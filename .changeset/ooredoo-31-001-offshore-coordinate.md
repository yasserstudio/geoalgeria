---
"@geoalgeria/ooredoo": patch
---

Fix one store whose operator coordinate fell in the sea.

Record `31-001` (ESO000810, "CTE.SEFSSAFA") shipped the locator API's own
coordinate, lat 36.2477 / lng -0.634848, a point in the Mediterranean about 50 km
off the Oran coast with no land under it. It now sits on the centroid of the
commune it is filed under, Sidi Ben Yebka (Oran, commune 3122), at
lat 35.82972 / lng -0.394722, and is demoted from `geo_precision: "exact"` /
`geo_method: "operator_api"` to `"approximate"` / `"commune_centroid"`: the data
claims a commune-level placement, not a per-store point.

Nothing else moved. `precision` in the metadata goes from 553 exact / 19
approximate to 552 / 20; the record count, bbox, wilaya coverage and every other
record are unchanged. The correction lives in the generator (`COORD_FIX` in
`scripts/fetch.mjs`, keyed by Ooredoo's own store id), so a future live re-fetch
cannot silently reimport the bad point, and it errors out if that store id ever
disappears upstream. `geo_method` gains `"commune_centroid"` in the published
type declaration.

Note the record's `operator_wilaya` is "Batna", so the store's true location may
not be in Oran at all. The commune pin makes the point agree with the commune the
record ships; it is not a claim to have located the store.

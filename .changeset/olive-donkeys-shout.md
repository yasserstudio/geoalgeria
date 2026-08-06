---
"@geoalgeria/formation-professionnelle": minor
---

Place the 557 establishments takwin.dz publishes without coordinates, taking the dataset from 1,375 of 1,932 geocoded (71%) to 1,920 (99%).

The portal stores a coordinate pair per establishment but leaves one or both axes at the sentinel `0.000000000000000000000000000000` for 557 records: 304 have neither axis, 192 lost only the latitude, 60 only the longitude, and 3 fall outside Algeria. Those are gaps in the ministry's own database rather than in our capture, so no re-pull can close them.

Each is now placed on the centroid of the commune its own record names, joined against the flagship geoalgeria commune set by normalized Arabic name within the record's own wilaya: 510 records, `geo_precision` `"approximate"` and `geo_method` `"commune"`. Where the commune field repeats the wilaya name and no commune of that name exists (31 Algiers records reading `الجزائر`, plus 4 whose seat commune is spelled differently upstream), only the wilaya centroid is claimed: 35 records, `geo_method` `"wilaya"`. Twelve records whose commune name could not be resolved confidently keep their null coordinates rather than being guessed at.

The join is scoped to each record's own wilaya plus the wilayas carved out of it by the 2026 reform, because takwin.dz still publishes the pre-reform 58-wilaya scheme while the flagship commune set uses the 69-wilaya one. Same territory under both schemes, so no match crosses a real boundary.

Independently checked against the source: 241 of the placed records still carry one real axis upstream, and the assigned centroid agrees with it to a median of 0.7 km (p90 6.8 km). The twelve disagreements above 25 km are all bad values in the portal's own surviving axis, including a sign-flipped Oran longitude and Ouargla and Hassi Messaoud holding each other's.

Every existing id and every coordinate the portal did supply is unchanged; 545 records differ, each only by gaining `lat`, `lng`, `geo_precision` and `geo_method`. `geo_method` gains `"commune"` and `"wilaya"` alongside `"takwin"` in the published types.

The package also moves onto the source-store convention: its raw pull is now committed at `sources/formation-professionnelle/takwin-etab.json` and the build replays it offline, since takwin.dz and its ibtikar mirror both answer a non-browser client with a WAF block page.

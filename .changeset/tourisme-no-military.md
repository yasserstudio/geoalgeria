---
"@geoalgeria/tourisme": minor
---

**Migration.** Fourteen records leave the package and their ids are retired for good, never reused and with no forward, because the places were removed rather than merged: `historic-396`, `lodging-1028`, `lodging-1097`, `lodging-1113`, `lodging-1154`, `lodging-1155`, `lodging-1544`, `lodging-1561`, `lodging-251`, `lodging-286`, `lodging-48`, `lodging-605`, `lodging-721` and `lodging-973`. The reserved set ships as `data/retired-ids.json`, which this package did not have before. If you hold one of these ids, it is gone and resolves to nothing by design.

**Military places are out of scope for GeoAlgeria.** Owner decision of 2026-10-29: the project publishes no military location, so the military facilities OpenStreetMap had mapped as tourism points are no longer published. Thirteen of them were on the lodging layer: eleven military hotels (Laghouat, Bechar, Blida, Alger, Djelfa, Constantine, Ouargla, Oran twice, Djanet and Barika), the military housing block in Mascara and the military residential quarter in Oran. The fourteenth, `historic-396`, is current military housing in Chelghoum Laid that upstream had tagged as a historic castle.

Records that only mention a military place are kept, and colonial-era military heritage is kept as heritage: `historic-4`, the former French army camp, and `historic-707`, Bastion 18, both stay, as do the forts, city walls and old barracks the historic layer carries.

Counts: 4,334 records, down from 4,348. Lodging 1,589 from 1,602, historic sites 1,183 from 1,184. Wilaya coverage is unchanged at 69 and every record is still geocoded.

**The exclusion lives in a build, so a refresh cannot undo it.** This package never had a fetcher, which is why hand-edited data files would have been the only way to remove a record. `packages/tourisme/scripts/build.mjs` is new: it re-emits the whole package offline from its committed records through the shared writer, applies `quality/overrides/tourisme.json` as every other package's build does, and holds the exclusion keyed on the OpenStreetMap element rather than on the published id, so a future pull that re-mints ids still keeps these places out.

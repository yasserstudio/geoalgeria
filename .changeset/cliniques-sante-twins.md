---
"@geoalgeria/cliniques": minor
---

**Migration.** Two records are retired for good and listed in `data/retired-ids.json`: `21-00004`, the El Harrouch psychiatric hospital (`node/2239891060`), is now `@geoalgeria/sante` record `21-ehs-01`, and `31-00061`, the Hadj Abed Atika mother-and-child hospital in Oran (`way/293367044`), is now `sante` record `31-ehs-09`. Their places moved to another package rather than into another record here, so the ledger carries no `migrations` entry for them; follow them by OpenStreetMap element into `sante`.

**Why they left.** `sante` merged the French and Arabic Ministry of Health posts of both hospitals into one record each, and the merged records now match these OpenStreetMap elements. An element a `sante` hospital-tier record ships is never republished here. The other way round, the Setif CHU in `sante` now matches the hospital building instead of the unnamed `amenity=clinic` node `node/4077454962` in Ouled Si Ahmed, which ships here again as `19-00013`. 1,917 care facilities, down from 1,918.

The README's statement that every OSM element `sante` references is excluded here was too broad: only the 83 on a hospital are. The 33 EPSP references anchor the entity on one of its proximity facilities, and those facilities stay in this package, as the classifier always intended.

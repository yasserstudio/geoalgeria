---
"@geoalgeria/formation-professionnelle": minor
---

Refresh formation-professionnelle from takwin.dz, retrieved 2026-10-25: 1,963 establishments from 1,932, and 1,961 geocoded from 1,921.

The June capture needed 59 calls, one per training directorate, and the portal had answered every non-browser client with a WAF block page since. This one ran over an Algerian connection, where a single call to the bare `puball` endpoint returns the whole network. 31 establishments are new, 19 the portal no longer lists.

**Far more real coordinates.** The portal had left one or both axes at its sentinel zero for 557 records in June; it now publishes a point for most of them. 1,681 establishments sit on takwin.dz's own point (1,362 before), so the commune-centroid placements drop to 249 from 511 and the wilaya-centroid ones to 31 from 35. Only 2 records are left unplaced, down from 11. The new points are the portal's own, shipped `exact` / `takwin` exactly as the old ones were, except for 15 the number itself disproves (too few decimals, or whole arcminutes with the seconds dropped), which read `approximate`.

**Ids follow places through a spelling change.** The portal corrected the spacing of 1,788 Arabic names, running apart words it had previously run together, without any establishment moving. The id carry key folds a name's spacing away before matching, so 1,769 of those keep the id they shipped under while publishing the corrected spelling; the other 19 belong to records the portal dropped. Spacing is presentation and not identity: the fold removes whitespace, the zero-width characters and the tatweel, and nothing that changes which letter a reader sees.

19 ids are retired and reserved, 50 are new. Of the retired, 18 have a successor under the same code and type whose name the portal rewrote beyond its spacing: 11 gained a ` - ` separator, 4 corrected a letter, 3 dropped or added a trailing qualifier. One, an annexe in Nakhla, is gone from the capture with no successor.

**Type mix.** CFPA 857 (856), private accredited centers 754 (723), annexe CFPA 69 (70); INSFP, DFEP, IEP, IFEP, INFEP and the other annexes unchanged.

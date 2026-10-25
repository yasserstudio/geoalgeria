---
"@geoalgeria/livraison": minor
---

Refresh livraison from all five carrier sources, retrieved 2026-10-25: 411 stop-desks to 447.

Previous pull 2026-06-18. Yalidine 199 rows, Guepex 162, Anderson 103 of 116 cards, Noest 105 of 109, Maystro 38 of 44. 16 carriers, 9 with open desks, 62 wilayas from 61. Every one of the 447 records is `geo_precision: exact` / `geo_method: carrier_relay`, as all 411 were: nothing in this refresh is approximate, so the sector stays single-precision.

**39 added, 3 removed.** The additions are 12 Yalidine desks, 16 Anderson, 7 Noest, 2 Zimou Express, 1 EasyAndSpeed and 1 Guepex, over four months of a source that publishes continuously. The removals were each checked against the live page rather than taken from the diff: `470201` (speedmail, Bounoura) is gone from the Yalidine table, `anderson-33-in-amenas` is gone from Anderson's directory, and `anderson-16-sidi-abdellah` is a rename, not a removal, which the next paragraph covers.

**One id changed hands, and it is the same desk.** Anderson renamed its card from "Sidi Abdellah" to "Sidi Abdellah - Zeralda", and a carded id is minted from the card title, so `anderson-16-sidi-abdellah` retired and `anderson-16-sidi-abdellah-zeralda` appeared 24 m away, same operator, same commune. Nothing is lost from the data, but a consumer keying on the old id loses it, and this package has no forward mechanism to point it at the new one. Recorded as debt on the schedule row: a rename should not re-mint an id.

**No desk changed wilaya or commune, and none left the boundary it joins to**: the accuracy review reports 0 of 447 outside their wilaya and 0 in a non-adjacent one. 44 coordinates moved, 38 of them under 1 km and the carded ones to a median of about 12 m, which is ordinary Maps-link churn. The six over a kilometre are the carriers' own pins: `anderson-56-djanet` 10,039 m, `anderson-6-bejaia` 2,258 m, `320101` El Bayadh 1,623 m, `80102` Béchar 1,407 m (1,477 m closer to the commune centre than it was), `noest-33a` Illizi 1,220 m and `anderson-33-illizi` 1,104 m. Djanet is the largest and was resolved from Anderson's own current link for the same card, in the same wilaya and commune, so it is published as the operator states it and keeps its id.

**Two desks kept the coordinate they already shipped** because their Maps link would not resolve on this run, which is new behaviour: `anderson-25-ali-mendjeli` (its link is now a Plus Code place with no coordinate in it) and `noest-19b` (El Eulma). Before this change both were dropped, which deleted a stop-desk that is still published and retired its id over one failed HTTP request. 15 names and 14 addresses are updated upstream, and 3 Yalidine rows that had lost the brackets around their operator tag parse again.

Also fixes `coverage.json`: its `wilayas[]` are zero-padded `"01".."69"` again, the key `stopdesks.json` carries. The v2 migration moved stop-desks to padded codes and the 2026-07-20 fix converted the committed file by hand without changing the generator, so this refresh would otherwise have put the integers back and broken the join between the two files inside the package.

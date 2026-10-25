---
"@geoalgeria/livraison": minor
---

Refresh livraison from all five carrier sources, retrieved 2026-10-25: 411 stop-desks to 449.

Previous pull 2026-06-18. Yalidine 199 rows, Guepex 162, Anderson 104 of 116 cards, Noest 106 of 114, Maystro 38 of 44. 16 carriers, 9 with open desks, 63 wilayas from 61. Every one of the 449 records is `geo_precision: exact` / `geo_method: carrier_relay`, as all 411 were: nothing here is approximate, so the sector stays single-precision.

**40 added, 2 removed.** The additions are four months of sources that publish continuously, plus three desks the fetcher had been unable to read at all (below). Both removals were checked against the live page rather than inferred from the diff: `470201` (speedmail, Bounoura) is gone from the Yalidine table and `anderson-33-in-amenas` is gone from Anderson's directory.

**Ids follow places.** A carded id is minted from the card's own title, so when Anderson retitled "Sidi Abdellah" to "Sidi Abdellah - Zeralda" the same desk, 24 m away, would have retired `anderson-16-sidi-abdellah` and minted a new id. A new id that lands within 100 m of a disappeared one, same operator and same declared wilaya, now takes that id back, nearest pairing first so the outcome never depends on the order a carrier lists its cards in. A committed desk carries the wilaya its coordinate resolved to, so for the nine carded desks in wilayas the 2026 reform created (`anderson-5-barika` ships `60` against a card still printing 05) "same declared wilaya" reads a reform code as agreeing with the card; comparing the two literally would retire exactly those nine ids on a rename. `anderson-16-sidi-abdellah` keeps its id, and no id in this release changed hands.

**Three desks the fetcher could not previously read are now published.** `noest-14c` (Ksar Chellala) links `google.com/maps?q=35.2121,2.3166` directly, a form the link matcher did not recognise, so the card was skipped entirely. `anderson-8-bechar` links a Maps place by cid alone (`?cid=6725298475309267754`), which names a place without stating where it is; that place's pin is committed with its provenance in `scripts/maps-cid-pins.json` and consulted only as a fallback, so a live resolution always wins. Both are the operator's own pin, so both are `exact`.

**Two desks kept the coordinate they already shipped** because their Maps link would not resolve: `anderson-25-ali-mendjeli`, whose link is now a Plus Code place carrying no coordinate, and `noest-19b` (El Eulma). Before this change they were dropped, which deletes a stop-desk that is still published and retires its id over one failed request.

**No two desks share a point.** Noest's cards 27B (Mostaganem) and 30B (Ouargla) link the same Maps URL, which can only be right for one of them. The wilaya cross-check keeps it for 30B, whose card wilaya matches the pin, and refuses it for 27B, which has no earlier coordinate to fall back on and is omitted with a logged reason. A card whose pin lands in a wilaya other than the one it declares now keeps its committed point where it has one, so a copy-paste slip upstream cannot unpublish a desk that was placed correctly before.

Four Noest cards publish no Maps link at all (03B Aflou, 21B Azzaba, 31D Arzew, 43B Chelghoum Laid). They now reach the carry-over step and are logged rather than silently skipped; none has an earlier coordinate, so all four are omitted.

15 names and 16 addresses are updated upstream, and 3 Yalidine rows that had lost the brackets around their operator tag parse again (two of them also read as a name change, on top of those 15). No desk changed wilaya or commune, and the accuracy review reports 0 of 449 outside their wilaya and 0 in a non-adjacent one. 45 coordinates moved, 39 under a kilometre and the carded ones to a median of about 13 m. The six over a kilometre are the carriers' own pins, the largest `anderson-56-djanet` at 10,039 m, resolved from Anderson's current link for the same card in the same wilaya and commune and published as the operator states it.

Also fixes `coverage.json`: its `wilayas[]` are zero-padded `"01".."69"` again, the key `stopdesks.json` carries. The v2 migration moved stop-desks to padded codes and the 2026-07-20 fix converted the committed file by hand without changing the generator, so this refresh would otherwise have put the integers back and broken the join between the two files inside the package.

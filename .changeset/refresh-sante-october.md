---
"@geoalgeria/sante": patch
---

Refresh sante from the Ministry of Health registry, retrieved 2026-10-25: 661 records, unchanged.

Source: Ministry of Health (sante.gov.dz), WordPress REST API `healthinstitution`, 1,258 posts across French and Arabic. Geocoding layered on from OpenStreetMap (ODbL 1.0) and Wikidata (CC0), both re-pulled the same day. Previous pull 2026-06-27; the registry had been unreachable from outside Algeria since, and this one ran over an Algerian connection.

**The registry is unchanged record for record.** 661 establishments in and 661 out, nothing added, nothing removed, no name touched in either script, no type, wilaya or commune changed, and no id changed hands. 590 bilingual pairs, 28 twin posts recovered, 7 repeat posts merged: the same pairing outcome the June pull produced, so four months of ministry publishing left the register itself as it was. 58 wilayas, 591 geocoded.

**One establishment gains a precise coordinate.** `57-eph-02` (Etablissement Public Hospitalier El Meghaier) moves off the El-M'ghaier commune centroid onto `way/393013773`, 1,331 m away in the same commune, so `geo_precision` goes `approximate` to `exact` and `geo_method` `commune_centroid` to `osm_point`. The element was checked against the OpenStreetMap API directly, not only through the Overpass pull that produced it: visible, `amenity=hospital` with `healthcare=hospital` and `emergency=yes`, named `Hôpital Meghaier`, last edited 2026-08-24, which is why the June refinement pass could not see it. `exact` rises from 133 to 134, `approximate` falls from 458 to 457 and `osm_point` from 119 to 120.

**One more coordinate moves, by 37 m.** `04-eph-06` (Oum El Bouaghi, Ibn Sina) stays `exact` / `osm_point` on the same `relation/12305812`; a member way shifted under a relation whose own tags have not changed since 2021. No other coordinate moved at all, no record changed wilaya or commune, and no other `geo_precision` or `geo_method` changed.

70 establishments remain without a coordinate and 457 sit on a commune centroid.

---
"@geoalgeria/sante": patch
---

Refresh sante from the Ministry of Health registry, retrieved 2026-10-25: the registry is unchanged, and two coordinates move.

Source: Ministry of Health (sante.gov.dz), WordPress REST API `healthinstitution`, 1,258 posts across French and Arabic. Geocoding layered on from OpenStreetMap (ODbL 1.0) and Wikidata (CC0), both re-pulled the same day. Previous pull 2026-06-27; the registry had been unreachable from outside Algeria since, and this one ran over an Algerian connection.

**The registry is unchanged record for record.** It yields the same 661 establishments as the June pull, nothing added, nothing removed, no name touched in either script, no type, wilaya or commune changed, and no id changed hands: 590 bilingual pairs, 28 twin posts recovered, 7 repeat posts merged, 58 wilayas. Four months of ministry publishing left the register itself as it was. (The twin-pair merges released alongside this refresh then fold four pairs, which is why the package ships 657 records; the counts in this entry are this refresh's own changes.)

**One establishment gains a precise coordinate.** `57-eph-02` (Etablissement Public Hospitalier El Meghaier) moves off the El-M'ghaier commune centroid onto `way/393013773`, 1,331 m away in the same commune, so `geo_precision` goes `approximate` to `exact` and `geo_method` `commune_centroid` to `osm_point`. The element was checked against the OpenStreetMap API directly, not only through the Overpass pull that produced it: visible, `amenity=hospital` with `healthcare=hospital` and `emergency=yes`, named `Hôpital Meghaier`, last edited 2026-08-24, which is why the June refinement pass could not see it. One record more is `exact` and one fewer `approximate`, and `osm_point` gains one.

**One more coordinate moves, by 37 m.** `04-eph-06` (EPH Ibn Sina, Oum El Bouaghi) moves from `way/624185601` to `relation/12305812`: OpenStreetMap maps the hospital twice, as a building named "Ibn Sina" and as its grounds named مستشفى إبن سينا, at the same street address, and the re-pull's geocoder now picks the grounds. It stays `exact` / `osm_point`. Because `@geoalgeria/cliniques` excludes the elements sante ships, the building it let go of would have come back there as a clinic called "Ibn Sina"; the cliniques generator now treats a hospital-tagged element within 40 m of a sante hospital's own element, at that element's street and city, as part of the same hospital, so it does not. No other coordinate moved at all, no record changed wilaya or commune, and no other `geo_precision` or `geo_method` changed.

70 establishments remain without a coordinate, as before.

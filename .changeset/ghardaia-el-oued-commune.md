---
"@geoalgeria/gares-routieres": patch
---

Two stations get their commune corrected. Their coordinates were always right.

GHERDAIA is the new gare at Bouhraoua, the northern entrance of Ghardaïa on
the RN1, and it published as "Dhayet Bendhahoua". EL OUED published as
"Bayadha". Neither is a corrupted coordinate: this is the commune join's own
failure mode. Communes carry no polygons in this repo, so `attachCommune`
assigns the nearest commune centre within the containing wilaya, and a station
sitting between two centres can land on the wrong one. GHERDAIA's point is
6.46 km from Dhayet Bendhahoua's centre and 6.57 km from Ghardaïa's; a 110 m
margin renamed it. EL OUED's margin was 200 m.

Both corrections are confirmed twice over. OSM's admin_level-8 boundary places
each point in the corrected commune (Ghardaïa, El-Oued), and each source
record already said so itself: GHERDAIA's address reads "Bouheraoua commune de
ghardaia" and EL OUED's city field reads EL OUED. OSM also maps a
"Gare routière" 100 m from GHERDAIA's point.

GHERDAIA was reader-reported on r/algeria the day the departures map went
public, by someone who knows the geography: the station was being offered to
travellers under the name of a commune whose town sits 8 km away.

Both stations keep their wilaya, so both ids (`47-01`, `39-01`) are unchanged.
Coverage stays at 74 stations and 52 wilayas.

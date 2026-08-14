---
"@geoalgeria/gares-routieres": patch
---

Four stations get their commune corrected. Their coordinates were always right.

GHERDAIA is the new gare at Bouhraoua, the northern entrance of Ghardaïa on
the RN1, and it published as "Dhayet Bendhahoua". EL OUED published as
"Bayadha", BLIDA as "Ouled Yaich", DJAMAA as "Sidi Amrane". None is a
corrupted coordinate: this is the commune join's own failure mode. Communes
carry no polygons in this repo, so `attachCommune` assigns the nearest commune
centre within the containing wilaya, and a station sitting between two centres
can land on the wrong one. GHERDAIA's point is 6.46 km from Dhayet
Bendhahoua's centre and 6.57 km from Ghardaïa's; a 110 m margin renamed the
wilaya capital's station. EL OUED's margin was 200 m, BLIDA's 200 m.

Every correction is confirmed twice over: OSM's admin_level-8 boundary places
each point in the corrected commune, and each source record already said so
itself (GHERDAIA's address reads "Bouheraoua commune de ghardaia", BLIDA's
"Cité Ramoul Blida", DJAMAA's "cité 19 Mars 1962 Djamaa", and every city
field names the corrected commune). An OSM sweep of every knife-edge join
found four more disputes (BISKRA, ALGER, ALI MENDJILI, BOUHNIFIFIA), but
there OSM contradicts the source's own city field too, so they stay as
joined until better evidence exists.

GHERDAIA was reader-reported on r/algeria the day the departures map went
public, by someone who knows the geography: the station was being offered to
travellers under the name of a commune whose town sits 8 km away.

All four stations keep their wilaya, so all four ids (`47-01`, `39-01`,
`09-01`, `57-01`) are unchanged. Coverage stays at 74 stations and 52 wilayas.

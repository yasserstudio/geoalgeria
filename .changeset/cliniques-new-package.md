---
"@geoalgeria/cliniques": major
---

New package `@geoalgeria/cliniques`, Algeria's clinics and proximity-care facilities from OpenStreetMap. 2,059 geocoded records across 66 wilayas, classified by type (polyclinique, salle de soins, centre de santé, maternité, clinique) with bilingual labels, a `sector` flag asserted only on signal, and speciality/address/phone/opening_hours/emergency where the map carries them. This is the OSM community tier of the health sector: the Ministry of Health registry tier (CHU/EPH/EHS/EPSP) is excluded and stays in `@geoalgeria/sante`, so the two must not be summed. Wilaya by point-in-polygon, commune by nearest centroid inside it. JSON, CSV, GeoJSON, TypeScript.

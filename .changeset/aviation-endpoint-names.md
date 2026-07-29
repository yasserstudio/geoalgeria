---
"@geoalgeria/aviation": minor
---

Route endpoints now carry names in three languages, and the route network carries a validity stamp.

- `route-endpoints.json`: every endpoint (both ends of every arc, foreign airports included) gains `name_en` and `name_ar`, matched on Wikidata by IATA code and cross-checked against the shipped coordinate (within 15 km, air bases sharing an IATA excluded). The foreign `name` field, which was OurAirports English pretending to be the French display field, now carries the Wikidata French label; the 13 Algerian origins keep the package's French house style.
- `metadata.routes_as_of`: the date the route network was last checked against schedules. Routes churn seasonally, unlike every other GeoAlgeria dataset, so consumers should treat the network as a dated snapshot rather than an evergreen fact.

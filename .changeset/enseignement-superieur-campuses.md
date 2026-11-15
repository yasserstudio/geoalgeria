---
"@geoalgeria/enseignement-superieur": minor
---

**Campuses.** An institution can now carry an optional `campuses` array: its further campuses, beside the main point in `lat`/`lng`. The record stays one record. A campus has no id of its own and is identified by its OpenStreetMap object in `refs.osm`; it is always `exact`, `geo_method: campus`, in the institution's own wilaya, at least 100 m from the main point, and confirmed by a second Vote under `docs/adr/0001` (only the kind, date and distance of that Vote ship, never the point read). The field is absent, not empty, on an institution with one campus, so nothing changes for the other 170 records.

**Université de Béjaïa (`00016`) is the first.** Its main point stays at Aboudaou. Its Targa Ouzemour campus is added on `way/156235549` (version 8), confirmed by the Owner's reading 137 m away, inside the 500 m ceiling.

**GeoJSON keeps one feature per institution.** The campuses ride in that feature's `properties.campuses`, so the feature count stays 171. A map that wants a point per campus derives them from that property, or from `institutions.json`. The CSV gains a trailing `campuses` column holding the array as JSON, empty on every other row.

Campuses are built from `scripts/seeds/campuses.json`. The build refuses a campus with no name, no OpenStreetMap object, no second Vote, a point outside the institution's wilaya, a point within 100 m of the main one, a duplicate object, or a seed key that matches no record.
